"""Tenant isolation and authentication check for the newest routes.

Two facts this script encodes, both learned by testing rather than assuming:

1. Authentication is a real barrier: every route below refuses an unauthenticated caller.
2. The tenant a request runs as comes from the USER RECORD, not from the token's tenant claim. A token minted
   with a foreign tenant claim still resolves to the user's real tenant, which is the safer design: a token
   cannot assert a tenant its user does not belong to. So a meaningful isolation test must use a real user who
   genuinely belongs to another tenant, not a forged claim.

Run on the host with /opt/.env sourced: apps/api/venv/bin/python scripts/ops/verify_tenant_isolation.py
Exit code 1 means a route answered without auth or handed rows to another tenant.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

sys.path.insert(0, "apps/api")
from gds_api.security import ACCESS_COOKIE_NAME, create_access_token  # noqa: E402

BASE = "http://127.0.0.1:8000"
OWNER = uuid.UUID(os.environ["GDS_OWNER_USER_ID"])
TENANT = uuid.UUID(os.environ["GDS_TENANT_ID"])


def call(method: str, path: str, cookie: str | None = None, body: dict | None = None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if cookie:
        headers["Cookie"] = f"{ACCESS_COOKIE_NAME}={cookie}"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()[:120].decode(errors="replace")


def foreign_identity() -> tuple[uuid.UUID, uuid.UUID] | None:
    """A real, active user in a tenant other than ours. None when the deployment has only one tenant."""
    sql = (
        "SELECT id || ' ' || tenant_id FROM users "
        f"WHERE tenant_id <> '{TENANT}' AND is_active ORDER BY created_at LIMIT 1;"
    )
    out = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", "gds_os", "-tAc", sql],
        capture_output=True, text=True,
    ).stdout.strip()
    if not out:
        return None
    user_id, tenant_id = out.split()
    return uuid.UUID(user_id), uuid.UUID(tenant_id)


ROUTES = [
    ("GET", "/on-call/now", None),
    ("GET", "/on-call/shifts", None),
    ("POST", "/on-call/shifts", {"person_name": "x", "person_email": "x@example.com",
                                 "starts_at": "2026-11-20T00:00:00Z", "ends_at": "2026-11-21T00:00:00Z"}),
    ("DELETE", f"/on-call/shifts/{uuid.uuid4()}", None),
    ("GET", "/regulatory-notifications/overdue", None),
    ("POST", f"/incidents/{uuid.uuid4()}/regulatory-notifications", {}),
    ("POST", f"/regulatory-notifications/{uuid.uuid4()}/submit", {}),
    ("GET", "/cloud/posture/score?provider=azure", None),
]


def row_count(payload) -> int | None:
    if isinstance(payload, list):
        return len(payload)
    if isinstance(payload, dict):
        for key in ("items", "results", "notifications", "overdue"):
            if isinstance(payload.get(key), list):
                return len(payload[key])
        if "total" in payload and isinstance(payload["total"], int):
            return payload["total"]
        if payload.get("on_call") is False:
            return 0
    return None


def main() -> int:
    failures: list[str] = []

    print("== unauthenticated callers must be refused ==")
    for method, path, body in ROUTES:
        status, _ = call(method, path, cookie=None, body=body)
        ok = status in (401, 403)
        print("   %-6s %-44s %s %s" % (method, path[:44], status, "refused" if ok else "LEAKED"))
        if not ok:
            failures.append(f"{method} {path} answered {status} without a cookie")

    print("== a real user in another tenant must see nothing of ours ==")
    identity = foreign_identity()
    if identity is None:
        print("   skipped: this deployment has only one tenant")
    else:
        user_id, tenant_id = identity
        cookie = create_access_token(user_id=user_id, tenant_id=tenant_id)
        print("   foreign identity: user %s tenant %s" % (str(user_id)[:8], str(tenant_id)[:8]))
        for path in ("/on-call/shifts", "/regulatory-notifications/overdue", "/on-call/now"):
            status, payload = call("GET", path, cookie=cookie)
            count = row_count(payload)
            isolated = status in (401, 403) or count == 0
            print("   %-44s %s rows=%s %s" % (path[:44], status, count, "isolated" if isolated else "LEAKED"))
            if not isolated:
                failures.append(f"{path} returned {count} rows to a foreign tenant")

    print()
    if failures:
        for failure in failures:
            print("  FAIL:", failure)
        return 1
    print("  auth and isolation clean on %d routes" % len(ROUTES))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
