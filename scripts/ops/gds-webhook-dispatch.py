#!/usr/bin/env python3
"""Deliver signed finding events to every registered webhook endpoint.

Every attempt is recorded, including failures, because a delivery log that only shows successes is marketing.
The signature is HMAC-SHA256 over the exact bytes sent, so a receiver can verify the body was not altered in
flight and did not come from someone else.

Trigger is a poll over security_findings created since the endpoint's last delivery, not an event bus. Stated
plainly so nobody assumes sub-second latency: the cron runs every five minutes.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import hmac
import json
import sys
import urllib.error
import urllib.request

import psycopg2
import psycopg2.extras

RANK = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4, "unknown": 2}
INITIAL_WINDOW_HOURS = 24
MAX_PER_ENDPOINT = 20


def post(url: str, body: bytes, signature: str, event: str) -> tuple[int, str | None]:
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Content-Type": "application/json",
        "X-GDS-Event": event,
        "X-GDS-Signature": f"sha256={signature}",
        "User-Agent": "gds-os-webhooks/1",
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, None
    except urllib.error.HTTPError as exc:
        return exc.code, f"HTTP {exc.code}"
    except Exception as exc:
        return 0, type(exc).__name__


def main() -> int:
    conn = psycopg2.connect("dbname=gds_os")
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""SELECT id, tenant_id, name, url, secret, min_severity, last_delivery_at
                   FROM webhook_endpoints WHERE is_active""")
    endpoints = cur.fetchall()
    sent = failed = 0
    for ep in endpoints:
        since = ep["last_delivery_at"] or (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=INITIAL_WINDOW_HOURS))
        cur.execute("""SELECT id, title, severity, detected_at FROM security_findings
                       WHERE tenant_id = %s AND detected_at > %s ORDER BY detected_at LIMIT %s""",
                    (ep["tenant_id"], since, MAX_PER_ENDPOINT))
        findings = [f for f in cur.fetchall() if RANK.get((f["severity"] or "unknown").lower(), 2)
                    >= RANK.get(ep["min_severity"], 3)]
        if not findings:
            continue
        for f in findings:
            payload = {
                "event": "finding.created",
                "finding_id": f["id"],
                "title": f["title"],
                "severity": f["severity"],
                "detected_at": f["detected_at"].isoformat(),
                "tenant_id": str(ep["tenant_id"]),
                "sent_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            }
            body = json.dumps(payload, sort_keys=True).encode()
            sig = hmac.new(ep["secret"].encode(), body, hashlib.sha256).hexdigest()
            code, err = post(ep["url"], body, sig, "finding.created")
            ok = 200 <= code < 300
            sent += 1 if ok else 0
            failed += 0 if ok else 1
            cur.execute("""INSERT INTO webhook_deliveries
                           (tenant_id, endpoint_id, finding_id, event_type, payload, signature, response_code, delivered, error)
                           VALUES (%s,%s,%s,'finding.created',%s,%s,%s,%s,%s)""",
                        (ep["tenant_id"], ep["id"], f["id"], json.dumps(payload), sig, code, ok, err))
        cur.execute("""UPDATE webhook_endpoints
                       SET last_delivery_at = now(),
                           consecutive_failures = CASE WHEN %s = 0 THEN consecutive_failures + 1 ELSE 0 END
                       WHERE id = %s""", (sent, ep["id"]))
        print(f"  {ep['name']:<24} {len(findings)} event(s) -> {sent} delivered, {failed} failed")
    conn.commit()
    print(f"  dispatched: {sent} delivered, {failed} failed across {len(endpoints)} endpoint(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
