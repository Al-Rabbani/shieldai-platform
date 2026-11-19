#!/usr/bin/env python3
"""A notification nobody acknowledges is a log entry, not a page.

Measured 19 Nov 2026: 183 notifications, all 183 unread, and nothing re-raised any of them. The platform could
tell a human something had gone wrong, exactly once, and then never again. That is a logging system with an
email attached.

This adds the missing half: a notification marked requires_ack is re-delivered on a widening ladder until
somebody acknowledges it. After the final rung it is marked unanswered, so the record shows the silence
instead of implying the alert was handled.

WHAT THIS IS NOT, stated plainly: there is still no paging provider (no PagerDuty or Opsgenie key exists in
this environment), no phone tree, and no rota naming more than one person. Delivery is the two channels
already proven to work here, the Slack webhook and Resend email, plus the acknowledgement endpoint. A real
phone page needs a provider account, which is an owner decision, not a code change.

Runs as postgres because it must see every tenant's notifications; with 63/63 tenant tables FORCE-RLS an
unbound app-role read would return zero rows and silently page nobody.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

import psycopg2
import psycopg2.extras

# Rung -> minutes to wait before re-raising. Level 0 is the original delivery.
LADDER_MINUTES = (5, 15, 60)
MAX_LEVEL = len(LADDER_MINUTES)


def _load_env(path: str = "/opt/.env") -> None:
    """Cron and `sudo -u postgres` both start without the service environment, so read it directly.

    Without this the pager runs, finds nothing configured, and reports slack=not_configured while the alert
    quietly never leaves the host - a paging system that pages nobody is worse than none, because it looks
    like one.
    """
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    except OSError as exc:
        # Not fatal by itself, but the caller below refuses to run with no channel at all.
        print(f"  warning: could not read {path} ({type(exc).__name__})", file=sys.stderr)


def _post(url: str, payload: dict, headers: dict | None = None, timeout: int = 15) -> int:
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status
    except urllib.error.HTTPError as exc:
        return exc.code
    except Exception:
        return 0


def deliver(row: dict) -> str:
    """Best effort on both proven channels, and the outcome recorded rather than assumed."""
    level = int(row["escalation_level"]) + 1
    text = (f"[{row['severity'].upper()}] {row['type']}: {row['message']}\n"
            f"Unacknowledged, escalation rung {level} of {MAX_LEVEL}.")
    out = []

    slack = os.getenv("SLACK_WEBHOOK_URL", "").strip()
    out.append(f"slack={_post(slack, {'text': text})}" if slack else "slack=not_configured")

    key = os.getenv("RESEND_API_KEY", "").strip()
    to = (row.get("email") or "").strip()
    if key and to:
        code = _post("https://api.resend.com/emails",
                     {"from": os.getenv("RESEND_FROM", "alerts@globaldigitalstreams.com"),
                      "to": [to], "subject": f"[{row['severity'].upper()}] GDS OS alert needs acknowledgement",
                      "text": text},
                     {"Authorization": f"Bearer {key}"})
        out.append(f"email={code}")
    else:
        out.append("email=not_configured" if not key else "email=no_recipient")
    return ",".join(out)


def due(row: dict, now: dt.datetime) -> bool:
    level = int(row["escalation_level"])
    if level >= MAX_LEVEL:
        return False
    base = row["last_notified_at"] or row["created_at"]
    wait = LADDER_MINUTES[min(level, len(LADDER_MINUTES) - 1)]
    return now >= base + dt.timedelta(minutes=wait)


def main() -> int:
    _load_env()
    if not (os.getenv("SLACK_WEBHOOK_URL", "").strip() or os.getenv("RESEND_API_KEY", "").strip()):
        # A pager that cannot deliver is worse than no pager, because it looks like one.
        print("  FATAL: no delivery channel configured (SLACK_WEBHOOK_URL and RESEND_API_KEY both empty)",
              file=sys.stderr)
        return 2
    conn = psycopg2.connect("dbname=gds_os")
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT n.id, n.type, n.message, coalesce(n.severity, 'unknown') AS severity,
               n.escalation_level, n.notify_count, n.created_at, n.last_notified_at, u.email
        FROM notifications n
        LEFT JOIN users u ON u.id = n.user_id
        WHERE n.requires_ack AND n.acknowledged_at IS NULL AND n.escalation_level < %s
        ORDER BY n.created_at
    """, (MAX_LEVEL,))
    rows = cur.fetchall()
    now = dt.datetime.now(dt.timezone.utc)
    acted = 0
    for row in rows:
        if not due(row, now):
            continue
        delivery = deliver(row)
        level = int(row["escalation_level"]) + 1
        cur.execute("""UPDATE notifications
                       SET escalation_level = %s, notify_count = notify_count + 1,
                           last_notified_at = now(), last_delivery = %s
                       WHERE id = %s""", (level, delivery, row["id"]))
        acted += 1
        state = "UNANSWERED, nobody acknowledged" if level >= MAX_LEVEL else f"re-raised, rung {level}"
        print(f"  {row['severity']:<8} {row['type']:<24} {state} | {delivery}")
    conn.commit()
    print(f"  paged {acted} of {len(rows)} open acknowledgement(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
