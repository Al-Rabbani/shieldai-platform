"""Two declared capabilities that had no implementation: check_credential_leaks and detect_identity_threats.

Both are named in `capabilities/catalog.py` with their own `required_tool_ids`, and neither name
existed in `tool_gateway.TOOL_REGISTRY`, so the broker raised KeyError and each returned 500.

check_credential_leaks
  Real: HaveIBeenPwned v3 `breachedaccount` per address, using HIBP_API_KEY. No key is configured on
  this host, so email lookups answer SOURCE_UNAVAILABLE naming the exact missing secret rather than
  inventing a clean result - the same honest shape the URLhaus lookup already uses.
  Also real and key-free: the Pwned Passwords range API. Callers may pass `password` or
  `password_sha1`; the check sends only the first five characters of the SHA-1 (k-anonymity), never
  the secret itself, and compares the returned suffixes locally.

detect_identity_threats
  Real analysis over this tenant's own audit_events: off-hours activity, actions only one user
  performs, and per-user volume anomalies against the tenant's own baseline. Findings are stored in
  security_findings (scanner "identity-detection"), deduped.
  Impossible-travel and geo-velocity are NOT implemented and are NOT claimed: this database holds no
  table with an IP address or country column (checked: zero tables have ip_address), so there is no
  telemetry to do it honestly. The response says so in `unavailable_signals`. With no audit events in
  the window it returns INSUFFICIENT_IDENTITY_DATA rather than an empty "all clear".
"""
from __future__ import annotations

import hashlib
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy import text

from gds_api.db import async_session_factory
from gds_api.tenant_binding import bind_tenant

HIBP_EMAIL_API = "https://haveibeenpwned.com/api/v3/breachedaccount/{email}"
HIBP_PASSWORD_API = "https://api.pwnedpasswords.com/range/{prefix}"
_USER_AGENT = "GDS-OS-Security-Platform"
_OFF_HOURS_START = 19  # UTC; the platform records audit timestamps in UTC
_OFF_HOURS_END = 7
_VOLUME_MULTIPLIER = 3.0


def _refuse(tool: str, code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"success": False, "tool": tool, "code": code, "error": message, **extra}


def _tenant(payload: dict[str, Any]) -> str | None:
    tenant = payload.get("_tenant_id") or payload.get("tenant_id")
    return str(tenant) if tenant else None


async def _store(db: Any, tenant: str, scanner: str, target: str, title: str, severity: str, details: dict[str, Any]) -> bool:
    existing = (
        await db.execute(
            text(
                "SELECT id FROM security_findings WHERE tenant_id = :t AND scanner = :s "
                "AND title = :title AND target = :target AND status = 'open' LIMIT 1"
            ),
            {"t": tenant, "s": scanner, "title": title[:250], "target": target[:500]},
        )
    ).scalar_one_or_none()
    if existing:
        return False
    await db.execute(
        text(
            "INSERT INTO security_findings (tenant_id, scanner, title, severity, target, details, status) "
            "VALUES (:t, :s, :title, :sev, :target, CAST(:details AS jsonb), 'open')"
        ),
        {
            "t": tenant,
            "s": scanner,
            "title": title[:250],
            "sev": severity,
            "target": target[:500],
            "details": json.dumps(details),
        },
    )
    return True


# ---- check_credential_leaks ------------------------------------------------------


async def check_credential_leaks(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Look addresses up in HIBP, and optionally check a password against Pwned Passwords."""
    payload = payload or {}
    tool = "check_credential_leaks"
    tenant = _tenant(payload)
    if not tenant:
        return _refuse(tool, "MISSING_ARGUMENT", "tenant_id is required")

    password = payload.get("password")
    password_sha1 = payload.get("password_sha1")
    result: dict[str, Any] = {"success": True, "tool": tool}

    # Key-free, real: Pwned Passwords k-anonymity range lookup.
    if password or password_sha1:
        digest = (
            str(password_sha1).upper()
            if password_sha1
            else hashlib.sha1(str(password).encode("utf-8")).hexdigest().upper()
        )
        prefix, suffix = digest[:5], digest[5:]
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.get(
                    HIBP_PASSWORD_API.format(prefix=prefix),
                    headers={"User-Agent": _USER_AGENT, "Add-Padding": "true"},
                )
            if response.status_code != 200:
                result["password_check"] = {
                    "available": False,
                    "reason": f"Pwned Passwords returned HTTP {response.status_code}",
                }
            else:
                occurrences = 0
                for line in response.text.splitlines():
                    candidate, _, count = line.partition(":")
                    if candidate.strip().upper() == suffix:
                        occurrences = int(count.strip() or 0)
                        break
                result["password_check"] = {
                    "available": True,
                    "source": "haveibeenpwned-pwned-passwords",
                    "prefix_sent": prefix,
                    "occurrences": occurrences,
                    "pwned": occurrences > 0,
                }
        except Exception as exc:
            result["password_check"] = {"available": False, "reason": f"{type(exc).__name__}: {exc}"[:300]}

    # Email lookups need the paid HIBP key.
    emails = [str(e).strip() for e in (payload.get("emails") or []) if str(e).strip()]
    async with async_session_factory() as db:
        await bind_tenant(db, uuid.UUID(tenant))
        if not emails and payload.get("use_tenant_users"):
            emails = [
                str(e)
                for e in (
                    await db.execute(text("SELECT email FROM users WHERE tenant_id = :t"), {"t": tenant})
                ).scalars().all()
                if e
            ]

        if emails:
            api_key = os.environ.get("HIBP_API_KEY")
            if not api_key:
                result["email_check"] = {
                    "available": False,
                    "source_unavailable": "HIBP_API_KEY",
                    "reason": "HaveIBeenPwned requires an API key for address lookups; "
                    "no HIBP_API_KEY is configured on this host",
                    "emails_requested": len(emails),
                }
                result["success"] = bool(result.get("password_check", {}).get("available"))
            else:
                checked: list[dict[str, Any]] = []
                stored = 0
                async with httpx.AsyncClient(timeout=30) as client:
                    for email in emails[:50]:
                        try:
                            response = await client.get(
                                HIBP_EMAIL_API.format(email=email),
                                headers={"hibp-api-key": api_key, "User-Agent": _USER_AGENT},
                                params={"truncateResponse": "false"},
                            )
                        except Exception as exc:
                            checked.append({"email": email, "error": f"{type(exc).__name__}: {exc}"[:200]})
                            continue
                        if response.status_code == 404:
                            checked.append({"email": email, "breaches": 0})
                            continue
                        if response.status_code != 200:
                            checked.append({"email": email, "error": f"HTTP {response.status_code}"})
                            continue
                        breaches = response.json() or []
                        checked.append(
                            {
                                "email": email,
                                "breaches": len(breaches),
                                "names": [b.get("Name") for b in breaches[:10]],
                            }
                        )
                        if breaches and await _store(
                            db,
                            tenant,
                            "hibp",
                            email,
                            f"Credential exposure: {email} appears in {len(breaches)} breach(es)",
                            "high",
                            {
                                "breaches": [b.get("Name") for b in breaches[:20]],
                                "breach_dates": [b.get("BreachDate") for b in breaches[:20]],
                                "data_classes": [b.get("DataClasses") for b in breaches[:20]],
                                "source": "haveibeenpwned",
                            },
                        ):
                            stored += 1
                await db.commit()
                result["email_check"] = {
                    "available": True,
                    "source": "haveibeenpwned-breachedaccount",
                    "emails_checked": len(checked),
                    "findings_created": stored,
                    "results": checked,
                }
        else:
            result["email_check"] = {
                "available": False,
                "reason": "no emails supplied; pass emails[] or use_tenant_users=true",
            }
    return result


# ---- detect_identity_threats -----------------------------------------------------


async def detect_identity_threats(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Behavioural identity anomalies from the tenant's own audit trail."""
    payload = payload or {}
    tool = "detect_identity_threats"
    tenant = _tenant(payload)
    if not tenant:
        return _refuse(tool, "MISSING_ARGUMENT", "tenant_id is required")
    days = int(payload.get("window_days") or 7)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    async with async_session_factory() as db:
        await bind_tenant(db, uuid.UUID(tenant))
        rows = (
            await db.execute(
                text(
                    "SELECT user_id, action, created_at FROM audit_events "
                    "WHERE tenant_id = :t AND created_at >= :since AND user_id IS NOT NULL"
                ),
                {"t": tenant, "since": since},
            )
        ).mappings().all()
        users = {
            str(uid): email
            for uid, email in (
                await db.execute(text("SELECT id, email FROM users WHERE tenant_id = :t"), {"t": tenant})
            ).all()
        }

        if not rows:
            return _refuse(
                tool,
                "INSUFFICIENT_IDENTITY_DATA",
                f"no audit_events for this tenant in the last {days} days, so no behavioural "
                "baseline exists to compare against",
                window_days=days,
            )

        per_user: dict[str, list[Any]] = {}
        for row in rows:
            per_user.setdefault(str(row["user_id"]), []).append(row)
        global_actions: dict[str, set[str]] = {}
        for uid, user_rows in per_user.items():
            global_actions[uid] = {str(r["action"]) for r in user_rows}

        average = len(rows) / max(len(per_user), 1)
        created = 0
        detected: list[dict[str, Any]] = []

        for uid, user_rows in per_user.items():
            identity = users.get(uid, uid)
            off_hours = [r for r in user_rows if r["created_at"].hour >= _OFF_HOURS_START or r["created_at"].hour < _OFF_HOURS_END]
            if len(user_rows) >= 5 and len(off_hours) >= max(3, int(0.6 * len(user_rows))):
                if await _store(
                    db, tenant, "identity-detection", identity,
                    f"Off-hours activity: {identity} acted {len(off_hours)} times outside 07:00-19:00 UTC",
                    "low",
                    {"events": len(off_hours), "window_days": days, "hours_utc": "19-07"},
                ):
                    created += 1
                detected.append({"identity": identity, "signal": "off_hours", "events": len(off_hours)})

            if len(user_rows) >= 5 and average > 0 and len(user_rows) > _VOLUME_MULTIPLIER * average:
                if await _store(
                    db, tenant, "identity-detection", identity,
                    f"Volume anomaly: {identity} produced {len(user_rows)} events vs tenant average {average:.0f}",
                    "medium",
                    {"events": len(user_rows), "average": round(average, 1), "window_days": days},
                ):
                    created += 1
                detected.append({"identity": identity, "signal": "volume_anomaly", "events": len(user_rows)})

            others = set().union(*(a for other, a in global_actions.items() if other != uid)) if len(global_actions) > 1 else set()
            unique_actions = global_actions[uid] - others
            if len(global_actions) > 1 and unique_actions and len(user_rows) >= 3:
                if await _store(
                    db, tenant, "identity-detection", identity,
                    f"Unusual actions: {identity} performed {len(unique_actions)} action(s) no other user did",
                    "medium",
                    {"actions": sorted(unique_actions)[:10], "window_days": days},
                ):
                    created += 1
                detected.append({"identity": identity, "signal": "unique_actions", "actions": sorted(unique_actions)[:5]})

        await db.commit()

    return {
        "success": True,
        "tool": tool,
        "window_days": days,
        "audit_events_analysed": len(rows),
        "identities_analysed": len(per_user),
        "signals_detected": len(detected),
        "findings_created": created,
        "detections": detected[:20],
        "unavailable_signals": {
            "impossible_travel": "no table in this database has an IP address or country column, so "
            "geo-velocity cannot be computed honestly",
            "failed_login_bursts": "no authentication-failure table exists to baseline against",
        },
    }


IDENTITY_TOOL_HANDLERS: dict[str, Any] = {
    "check_credential_leaks": check_credential_leaks,
    "detect_identity_threats": detect_identity_threats,
}

for _name, _handler in IDENTITY_TOOL_HANDLERS.items():
    _handler.risk_class = "low"  # type: ignore[attr-defined]
    _handler.description = {  # type: ignore[attr-defined]
        "check_credential_leaks": "Check addresses against HaveIBeenPwned and passwords against Pwned Passwords.",
        "detect_identity_threats": "Detect behavioural identity anomalies from the tenant's own audit trail.",
    }[_name]
