"""Multi-channel alert dispatch module using httpx for Slack, Email (Resend), PagerDuty, Teams, and Webhook."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
from typing import Any

import httpx
from sqlalchemy import text

from gds_api.logging_config import get_logger

logger = get_logger(__name__)


async def dispatch_slack(webhook_url: str, alert_data: dict[str, Any]) -> dict[str, Any]:
    """POST to Slack webhook with blocks."""
    if not webhook_url:
        return {"channel": "slack", "success": False, "error": "No webhook URL provided"}

    rule_name = alert_data.get("rule_name", "Alert Fired")
    severity = str(alert_data.get("severity", "unknown")).upper()
    entity_type = alert_data.get("entity_type", "entity")
    entity_id = alert_data.get("entity_id", "N/A")
    entity_title = alert_data.get("entity_title", "N/A")

    payload = {
        "text": f"[{severity}] {rule_name}: {entity_title}",
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"🚨 [{severity}] {rule_name}"},
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Severity:* {severity}"},
                    {"type": "mrkdwn", "text": f"*Entity:* {entity_type}:{entity_id}"},
                    {"type": "mrkdwn", "text": f"*Title:* {entity_title}"},
                    {"type": "mrkdwn", "text": f"*Condition:* {alert_data.get('condition_field', 'N/A')}"},
                ],
            },
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook_url, json=payload)
            return {
                "channel": "slack",
                "success": resp.is_success,
                "status_code": resp.status_code,
                "response": resp.text,
            }
    except Exception as e:
        logger.warning("Slack dispatch failed", error=str(e))
        return {"channel": "slack", "success": False, "error": str(e)}


async def dispatch_email(to_email: str, subject: str, body: str) -> dict[str, Any]:
    """POST to Resend API (https://api.resend.com/emails) with api_key from env RESEND_API_KEY."""
    if not to_email:
        return {"channel": "email", "success": False, "error": "No recipient email provided"}

    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not resend_api_key:
        logger.warning("RESEND_API_KEY not configured in environment")
        return {"channel": "email", "success": False, "error": "RESEND_API_KEY not configured"}

    recipients = [to_email] if isinstance(to_email, str) else list(to_email)
    payload = {
        "from": os.getenv("ALERT_EMAIL_FROM", "alerts@gds-os.internal"),
        "to": recipients,
        "subject": subject,
        "html": f"<div style='font-family: sans-serif;'>{body}</div>",
    }
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post("https://api.resend.com/emails", json=payload, headers=headers)
            # Surface the provider's own reason. Previously a failed send returned only
            # status_code and response, so callers printing item["error"] reported
            # "FAILED (None)" - a delivery failure with no diagnosable cause. A 403 for an
            # unverified sending domain is exactly the kind of thing this must name.
            result = {
                "channel": "email",
                "success": resp.is_success,
                "status_code": resp.status_code,
                "response": resp.text[:500],
            }
            if not resp.is_success:
                result["error"] = f"HTTP {resp.status_code}: {resp.text[:300]}"
            return result
    except Exception as e:
        logger.warning("Email dispatch failed", error=str(e))
        return {"channel": "email", "success": False, "error": str(e)}


async def dispatch_pagerduty(integration_key: str, alert_data: dict[str, Any]) -> dict[str, Any]:
    """POST to https://events.pagerduty.com/v2/enqueue."""
    if not integration_key:
        return {"channel": "pagerduty", "success": False, "error": "No integration key provided"}

    severity_map = {
        "critical": "critical",
        "high": "error",
        "medium": "warning",
        "low": "info",
        "info": "info",
    }
    raw_sev = str(alert_data.get("severity", "error")).lower()
    pd_severity = severity_map.get(raw_sev, "error")

    rule_name = alert_data.get("rule_name", "Alert Fired")
    entity_title = alert_data.get("entity_title", "Details")

    payload = {
        "routing_key": integration_key,
        "event_action": "trigger",
        "dedup_key": f"{alert_data.get('rule_id')}_{alert_data.get('entity_id')}",
        "payload": {
            "summary": f"[{raw_sev.upper()}] {rule_name}: {entity_title}",
            "source": str(alert_data.get("entity_type", "gds-os")),
            "severity": pd_severity,
            "custom_details": alert_data,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post("https://events.pagerduty.com/v2/enqueue", json=payload)
            return {
                "channel": "pagerduty",
                "success": resp.is_success,
                "status_code": resp.status_code,
                "response": resp.text,
            }
    except Exception as e:
        logger.warning("PagerDuty dispatch failed", error=str(e))
        return {"channel": "pagerduty", "success": False, "error": str(e)}


async def dispatch_teams(webhook_url: str, alert_data: dict[str, Any]) -> dict[str, Any]:
    """POST to Teams webhook with AdaptiveCard."""
    if not webhook_url:
        return {"channel": "teams", "success": False, "error": "No webhook URL provided"}

    rule_name = alert_data.get("rule_name", "Alert Fired")
    severity = str(alert_data.get("severity", "unknown")).upper()
    entity_type = alert_data.get("entity_type", "N/A")
    entity_id = alert_data.get("entity_id", "N/A")
    entity_title = alert_data.get("entity_title", "N/A")

    payload = {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": [
                        {
                            "type": "TextBlock",
                            "size": "Large",
                            "weight": "Bolder",
                            "text": f"🚨 [{severity}] {rule_name}",
                        },
                        {
                            "type": "FactSet",
                            "facts": [
                                {"title": "Severity", "value": severity},
                                {"title": "Entity Type", "value": str(entity_type)},
                                {"title": "Entity ID", "value": str(entity_id)},
                                {"title": "Title", "value": str(entity_title)},
                            ],
                        },
                    ],
                },
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook_url, json=payload)
            return {
                "channel": "teams",
                "success": resp.is_success,
                "status_code": resp.status_code,
                "response": resp.text,
            }
    except Exception as e:
        logger.warning("Teams dispatch failed", error=str(e))
        return {"channel": "teams", "success": False, "error": str(e)}


async def dispatch_webhook(url: str, secret: str, alert_data: dict[str, Any]) -> dict[str, Any]:
    """POST with HMAC-SHA256 signature header X-GDS-Signature."""
    if not url:
        return {"channel": "webhook", "success": False, "error": "No URL provided"}

    body_bytes = json.dumps(alert_data, default=str).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if secret:
        sig = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
        headers["X-GDS-Signature"] = sig

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, content=body_bytes, headers=headers)
            return {
                "channel": "webhook",
                "success": resp.is_success,
                "status_code": resp.status_code,
                "response": resp.text,
            }
    except Exception as e:
        logger.warning("Webhook dispatch failed", error=str(e))
        return {"channel": "webhook", "success": False, "error": str(e)}


async def dispatch_all(
    channels: list[Any], alert_data: dict[str, Any], config: dict[str, Any] | None = None,
    db: Any = None, tenant_id: Any = None, triggered_by: str = "rule",
) -> dict[str, Any]:
    """Route to all channels in parallel with asyncio.gather."""
    if not channels:
        return {"dispatched_count": 0, "results": []}

    cfg = config or {}

    async def _dispatch_channel(ch: Any) -> dict[str, Any]:
        if isinstance(ch, str):
            c_type = ch.lower()
            ch_dict: dict[str, Any] = {}
        elif isinstance(ch, dict):
            c_type = str(ch.get("type") or ch.get("channel") or "").lower()
            ch_dict = ch
        else:
            return {"channel": str(ch), "success": False, "error": "Invalid channel config"}

        if c_type == "slack":
            url = (
                ch_dict.get("webhook_url")
                or ch_dict.get("url")
                or cfg.get("slack_webhook_url")
                or os.getenv("SLACK_WEBHOOK_URL", "")
            )
            return await dispatch_slack(url, alert_data)
        elif c_type == "email":
            to_email = (
                ch_dict.get("to_email")
                or ch_dict.get("email")
                or cfg.get("email_to")
                or os.getenv("ALERT_EMAIL_TO", "")
            )
            subj = ch_dict.get("subject") or (
                f"🚨 [{str(alert_data.get('severity', 'ALERT')).upper()}] "
                f"{alert_data.get('rule_name', 'Alert')}"
            )
            body = ch_dict.get("body") or (
                f"<h3>Alert: {alert_data.get('rule_name')}</h3>"
                f"<p><b>Severity:</b> {alert_data.get('severity')}</p>"
                f"<p><b>Entity:</b> {alert_data.get('entity_type')}:{alert_data.get('entity_id')}</p>"
                f"<p><b>Title:</b> {alert_data.get('entity_title')}</p>"
            )
            return await dispatch_email(to_email, subj, body)
        elif c_type == "pagerduty":
            key = (
                ch_dict.get("integration_key")
                or ch_dict.get("key")
                or cfg.get("pagerduty_integration_key")
                or os.getenv("PAGERDUTY_INTEGRATION_KEY", "")
            )
            return await dispatch_pagerduty(key, alert_data)
        elif c_type == "teams":
            url = (
                ch_dict.get("webhook_url")
                or ch_dict.get("url")
                or cfg.get("teams_webhook_url")
                or os.getenv("TEAMS_WEBHOOK_URL", "")
            )
            return await dispatch_teams(url, alert_data)
        elif c_type == "webhook":
            url = ch_dict.get("url") or cfg.get("webhook_url") or os.getenv("GENERIC_WEBHOOK_URL", "")
            secret = (
                ch_dict.get("secret")
                or cfg.get("webhook_secret")
                or os.getenv("GENERIC_WEBHOOK_SECRET", "")
            )
            return await dispatch_webhook(url, secret, alert_data)
        else:
            return {
                "channel": c_type or str(ch),
                "success": False,
                "error": f"Unsupported channel type: {c_type}",
            }

    tasks = [_dispatch_channel(ch) for ch in channels]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    results = []
    for res in raw_results:
        if isinstance(res, Exception):
            results.append({"channel": "unknown", "success": False, "error": str(res)})
        else:
            results.append(res)

    await _record_deliveries(db, tenant_id, results, alert_data, triggered_by)

    return {
        "dispatched_count": len(results),
        "results": results,
    }

async def _record_deliveries(db, tenant_id, results, alert_data, triggered_by="rule") -> None:
    """Write one row per channel attempt.

    A dispatch that only returns a dict to its caller leaves no evidence anywhere, so "was anyone told?" had no
    answer in the product. dispatch_all is the one place that sees every channel result, and both the rule engine
    and the test route come through it. A failure to record is logged and never masks the delivery result.
    """
    if db is None or tenant_id is None:
        return
    try:
        for r in results or []:
            ok = bool(r.get("success"))
            await db.execute(
                text(
                    "INSERT INTO alert_deliveries "
                    "(tenant_id, channel, success, error, provider, alert_ref, rule_name, severity, triggered_by) "
                    "VALUES (:tid, :ch, :ok, :err, CAST(:prov AS jsonb), :ref, :rule, :sev, :by)"
                ),
                {
                    "tid": str(tenant_id),
                    "ch": str(r.get("channel") or "unknown"),
                    "ok": ok,
                    "err": None if ok else (r.get("error") or "unknown error"),
                    "prov": json.dumps({k: v for k, v in r.items() if k not in ("channel", "success", "error")}, default=str),
                    "ref": (str(alert_data.get("entity_id"))[:200] or None) if alert_data.get("entity_id") else None,
                    "rule": (str(alert_data.get("rule_name"))[:200] or None) if alert_data.get("rule_name") else None,
                    "sev": (str(alert_data.get("severity"))[:40] or None) if alert_data.get("severity") else None,
                    "by": triggered_by,
                },
            )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("alert delivery record failed: %s", exc)
