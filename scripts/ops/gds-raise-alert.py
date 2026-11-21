#!/usr/bin/env python3
"""Raise a real, acknowledgeable alert from a shell watchdog.

Measured 21 Nov 2026: gds-service-watch.sh has been restarting wedged services every five minutes and writing to a
log, and nothing else ever learned about it. The pager exists and can re-raise a notification on a 5/15/60-minute
ladder until somebody acknowledges it, but nothing in the restart path ever created a notification, so the ladder had
nothing to carry. A restart that silently succeeds hides a service that is flapping; a restart that fails silently
leaves the platform down with nobody told.

This is the missing link: the watchdog calls this, the pager does the escalation. It inserts a notification that
requires acknowledgement, which is what makes the ladder apply.

Runs as postgres because notifications is a FORCE RLS table and an unbound read would report "no duplicate" for a
duplicate that exists, which would turn the dedupe into a spam generator.

Deliberately no delivery here. Delivery belongs to gds-page.py, so there is one place that knows how to send and one
place that knows what to say.
"""
from __future__ import annotations

import argparse
import os
import sys

import psycopg2

ENV_PATHS = ("/opt/.env", "/opt/gds-pager.env")
OWNER_EMAIL = "president@globaldigitalstreams.com"
DEDUPE_MINUTES = 30


def load_env() -> None:
    for path in ENV_PATHS:
        try:
            with open(path, encoding="utf-8") as handle:
                lines = handle.readlines()
        except OSError:
            continue
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
        return


def main() -> int:
    parser = argparse.ArgumentParser(description="raise an acknowledgeable alert")
    parser.add_argument("--type", required=True, help="notification type, e.g. service_failure")
    parser.add_argument("--severity", default="high", choices=["info", "low", "medium", "high", "critical"])
    parser.add_argument("--message", required=True)
    parser.add_argument("--dedupe-minutes", type=int, default=DEDUPE_MINUTES)
    args = parser.parse_args()

    load_env()
    tenant = (os.environ.get("GDS_TENANT_ID") or "").strip()

    conn = psycopg2.connect("dbname=gds_os")
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, tenant_id FROM users WHERE lower(email) = lower(%s) AND is_active LIMIT 1",
                (OWNER_EMAIL,),
            )
            row = cur.fetchone()
            if not row:
                # Nobody to page is a failure worth failing on, not a silent skip: an alert nobody receives is a
                # log line with extra steps.
                print(f"FATAL: no active user {OWNER_EMAIL} to receive the alert", file=sys.stderr)
                return 2
            user_id, user_tenant = row
            tenant = tenant or str(user_tenant)

            cur.execute(
                "SELECT id FROM notifications "
                "WHERE type = %s AND message = %s AND acknowledged_at IS NULL "
                "AND created_at > now() - (%s || ' minutes')::interval LIMIT 1",
                (args.type, args.message, args.dedupe_minutes),
            )
            existing = cur.fetchone()
            if existing:
                print(f"suppressed duplicate of notification {existing[0]}")
                conn.rollback()
                return 0

            cur.execute(
                "INSERT INTO notifications (id, tenant_id, user_id, type, message, severity, "
                "requires_ack, escalation_level, created_at) "
                "VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, TRUE, 0, now()) RETURNING id",
                (tenant, user_id, args.type, args.message, args.severity),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
        print(f"raised notification {new_id} [{args.severity}] {args.type}")
        return 0
    except Exception as exc:  # noqa: BLE001 - the watchdog logs this and carries on
        conn.rollback()
        print(f"FATAL: could not raise alert: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
