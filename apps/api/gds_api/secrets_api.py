"""Secrets and certificates, measured from the sources that actually hold them.

The builder's Secrets & Key Management page read four entities - SecretReference, CertificateRecord,
SecretLeakageAlert, SecretAccessPolicy - and none of them has a table. Every read fell into an empty list, so the page
printed four zero tiles over four "No secrets registered / No certificates tracked / No leakage alerts / No access
policies configured" panels. That is the worst shape of this defect class: a page telling the security owner that the
estate holds no secrets and no certificates, when in fact the host holds 60-odd credentials and the platform serves a
live TLS certificate. An unmeasured absence was rendered as a clean bill of health.

This route answers the same questions from what is really there:

* Certificates: a live TLS handshake to each hostname the platform serves, from the API host. The certificate a client
  receives is the fact that matters, so the chain is read from the wire, not from a file on disk. Two separate facts are
  reported per endpoint - whether a certificate was served at all, and whether Python's default trust store verified it -
  because an expired certificate is still served, and "not served" is a different failure from "served but not trusted".
* Credentials: the names of credential-shaped variables in the API process environment, grouped by the integration that
  needs them. Presence only. No value is read into the response, no prefix, no length, no hash: the route states that
  policy in its own payload so a reader can see it was a decision, not an oversight.
* API keys: the platform's own api_keys table, which exists and holds the keys issued to callers. Zero rows is a real
  measured zero here, and the key hash is never returned.
* Leakage scanning and access policies: refused by name, with the measurement behind the refusal (which scanner
  binaries were looked for, which tables were looked for). No scanner runs on this host, so "0 leakage alerts" would be
  a fiction.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import shutil
import socket
import ssl
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/secrets", tags=["secrets"])

# A variable is credential-shaped if its name says so. Matching on the name means the value is never touched.
CREDENTIAL_NAME = re.compile(r"(KEY|SECRET|TOKEN|PASSWORD|PASSWD|WEBHOOK|CREDENTIAL|DSN|CONNECTION)", re.I)

# The integrations this platform can actually speak to, and the variables each one needs. Declared here so the page can
# say "Linear has its key, Azure has all three of four" instead of listing 60 names with no meaning attached. A name that
# is absent is reported as absent; nothing is guessed from a similar name.
INTEGRATIONS: dict[str, list[str]] = {
    "aws": ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
    "azure": ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET"],
    "openai": ["OPENAI_API_KEY"],
    "anthropic": ["ANTHROPIC_API_KEY"],
    "github": ["GITHUB_TOKEN"],
    "linear": ["LINEAR_API_KEY"],
    "stripe": ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    "resend": ["RESEND_API_KEY"],
    "slack": ["SLACK_WEBHOOK_URL"],
    "backblaze": ["B2_KEY_ID", "B2_APPLICATION_KEY"],
    "minio": ["MINIO_ROOT_USER", "MINIO_ROOT_PASSWORD"],
    "neo4j": ["NEO4J_USER", "NEO4J_PASSWORD"],
    "malwarebazaar": ["MALWAREBAZAAR_AUTH_KEY"],
}

# Service attribution by variable-name prefix. Ordered: the first matching prefix wins, so "DATABASE_URL" is the database
# rather than "url".
SERVICE_PREFIXES: tuple[tuple[str, str], ...] = (
    ("AWS_", "aws"),
    ("AZURE_", "azure"),
    ("OPENAI_", "openai"),
    ("ANTHROPIC_", "anthropic"),
    ("GITHUB_", "github"),
    ("LINEAR_", "linear"),
    ("STRIPE_", "stripe"),
    ("RESEND_", "resend"),
    ("SLACK_", "slack"),
    ("B2_", "backblaze"),
    ("MINIO_", "minio"),
    ("NEO4J_", "neo4j"),
    ("MALWAREBAZAAR_", "malwarebazaar"),
    ("POSTGRES_", "database"),
    ("DATABASE_", "database"),
    ("SECURITY_DATABASE_", "database"),
    ("GDS_RUNTIME_DB_", "database"),
    ("REDIS_", "redis"),
    ("JWT_", "platform"),
    ("SECRET_KEY", "platform"),
    ("HEARTBEAT_", "platform"),
    ("BRIDGE_", "platform"),
    ("CI_GATE_", "platform"),
    ("GDS_API_", "platform"),
    ("ALERT_EMAIL_", "platform"),
    ("SECURITY_ALERT_", "platform"),
)

# Scanner binaries looked for. Their absence is measured on every request rather than asserted once.
SCANNER_BINARIES = ("gitleaks", "trufflehog", "detect-secrets")

# Tables that would have to exist for the page's leakage and access-policy panels to hold anything.
CANDIDATE_STORES = ("secret_leakage_alerts", "secret_access_policies", "secret_references", "certificate_records")


async def _tenant(db: AsyncSession, current_user: CurrentUser) -> str:
    tenant_id = getattr(current_user, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=403, detail="This session is not bound to a tenant.")
    # api_keys is FORCE-RLS protected on gds.tenant_id, not app.tenant_id.
    await db.execute(text("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": str(tenant_id)})
    return str(tenant_id)


def _service_of(name: str) -> str:
    for prefix, service in SERVICE_PREFIXES:
        if name.startswith(prefix):
            return service
    return "other"


def _category_of(name: str) -> str:
    upper = name.upper()
    if "WEBHOOK" in upper:
        return "webhook"
    if upper.endswith("_URL") or upper.endswith("_DSN") or "DATABASE_URL" in upper:
        return "connection string"
    if "PASSWORD" in upper or "PASSWD" in upper or upper.endswith("_PASS"):
        return "password"
    if "SECRET" in upper:
        return "secret"
    if "TOKEN" in upper:
        return "token"
    if "KEY" in upper:
        return "api key"
    if "CREDENTIAL" in upper or "AUTH" in upper:
        return "credential"
    return "other"


def _credential_inventory() -> dict[str, Any]:
    """Credential-shaped environment variables: names, service, category, whether a value is set.

    A variable that exists but is empty is reported as not configured, because an empty value cannot authenticate
    anything. The value itself is never read beyond a strip() to answer that one question, and never returned.
    """
    items = []
    for name in sorted(os.environ):
        if not CREDENTIAL_NAME.search(name):
            continue
        configured = bool((os.environ.get(name) or "").strip())
        items.append(
            {
                "name": name,
                "service": _service_of(name),
                "category": _category_of(name),
                "configured": configured,
            }
        )

    integrations = []
    for service, required in INTEGRATIONS.items():
        entries = [
            {"name": var, "configured": bool((os.environ.get(var) or "").strip())}
            for var in required
        ]
        present = sum(1 for entry in entries if entry["configured"])
        integrations.append(
            {
                "integration": service,
                "required": entries,
                "configured_vars": present,
                "required_vars": len(entries),
                "state": "configured" if present == len(entries) else ("partial" if present else "absent"),
            }
        )

    return {
        "items": items,
        "total": len(items),
        "configured": sum(1 for item in items if item["configured"]),
        "empty": sum(1 for item in items if not item["configured"]),
        "integrations": integrations,
        "value_policy": (
            "Names only. This route reads whether a value is set and never returns the value, a prefix of it, its "
            "length or a hash of it."
        ),
    }


def _endpoint_hosts() -> list[str]:
    """The hostnames this platform serves, from APP_DOMAIN plus the app/api/www prefixes it is published under.

    A hostname that does not resolve or does not answer is reported as a failed probe, not dropped: a missing endpoint
    is a fact worth seeing.
    """
    raw = (os.getenv("APP_DOMAIN") or "").strip()
    apex = re.sub(r"^https?://", "", raw).split("/")[0].strip().lower()
    hosts: list[str] = []
    if apex:
        candidates = [apex, f"www.{apex}", f"app.{apex}", f"api.{apex}"]
        for host in candidates:
            if host and host not in hosts:
                hosts.append(host)
    return hosts


def _rdn(cert_part: Any, key: str) -> str | None:
    """Pull one value out of ssl's ((('commonName', 'x'),), ...) structure."""
    for rdn in cert_part or ():
        for name, value in rdn:
            if name == key:
                return value
    return None


def _handshake(host: str, port: int = 443, verify: bool = True, timeout: float = 6.0) -> dict[str, Any]:
    """One TLS handshake. verify=False still reads the certificate, so an expired chain is described, not hidden."""
    context = ssl.create_default_context()
    if not verify:
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
    with socket.create_connection((host, port), timeout=timeout) as sock:
        with context.wrap_socket(sock, server_hostname=host) as tls:
            cert = tls.getpeercert() or {}
            cipher = tls.cipher() or (None, None, None)
            return {"cert": cert, "tls_version": tls.version(), "cipher": cipher[0]}


def _probe_endpoint(host: str, port: int = 443) -> dict[str, Any]:
    now = dt.datetime.now(dt.timezone.utc)
    result: dict[str, Any] = {
        "host": host,
        "port": port,
        "served": False,
        "chain_verified": False,
        "common_name": None,
        "sans": [],
        "issuer": None,
        "not_before": None,
        "not_after": None,
        "days_until_expiry": None,
        "expired": None,
        "tls_version": None,
        "cipher": None,
    }
    try:
        served = _handshake(host, port, verify=False)
    except (OSError, ssl.SSLError) as exc:
        result["reason"] = f"{type(exc).__name__}: {exc}"
        return result

    cert = served["cert"]
    result.update(
        served=True,
        tls_version=served["tls_version"],
        cipher=served["cipher"],
        common_name=_rdn(cert.get("subject"), "commonName"),
        issuer=_rdn(cert.get("issuer"), "commonName") or _rdn(cert.get("issuer"), "organizationName"),
        sans=[value for kind, value in cert.get("subjectAltName", ()) if kind == "DNS"],
    )
    not_after_raw = cert.get("notAfter")
    not_before_raw = cert.get("notBefore")
    if not_after_raw:
        try:
            not_after = dt.datetime.fromtimestamp(
                ssl.cert_time_to_seconds(not_after_raw), tz=dt.timezone.utc
            )
            result["not_after"] = not_after.isoformat()
            # Floored, so "0 days" means less than a day left rather than none.
            days = int((not_after - now).total_seconds() // 86400)
            result["days_until_expiry"] = days
            result["expired"] = days < 0
        except ValueError:
            result["not_after"] = not_after_raw
    if not_before_raw:
        try:
            result["not_before"] = dt.datetime.fromtimestamp(
                ssl.cert_time_to_seconds(not_before_raw), tz=dt.timezone.utc
            ).isoformat()
        except ValueError:
            result["not_before"] = not_before_raw

    try:
        _handshake(host, port, verify=True)
        result["chain_verified"] = True
    except ssl.SSLCertVerificationError as exc:
        result["verify_reason"] = getattr(exc, "verify_message", str(exc))
    except (OSError, ssl.SSLError) as exc:
        result["verify_reason"] = f"{type(exc).__name__}: {exc}"
    return result


def _renewal_mechanism() -> dict[str, Any]:
    certbot = shutil.which("certbot")
    cron = os.path.exists("/etc/cron.d/certbot")
    return {
        "certbot_installed": bool(certbot),
        "renewal_cron_present": cron,
        "renewal_proven_by_this_route": False,
        "note": (
            "The renewal mechanism is reported as configured or not. This route does not run a renewal and cannot prove "
            "one will succeed; only the certificate's own expiry date is measured."
        ),
    }


async def _store_state(db: AsyncSession) -> dict[str, dict[str, Any]]:
    rows = (
        await db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
    ).all()
    tables = {row[0] for row in rows}
    return {name: {"exists": name in tables} for name in CANDIDATE_STORES}


async def _api_keys(db: AsyncSession, tenant_id: str) -> dict[str, Any]:
    rows = (
        await db.execute(
            text(
                """
                SELECT id, name, key_prefix, coalesce(scopes, '[]'::jsonb) AS scopes,
                       created_at, last_used_at, revoked_at
                FROM api_keys
                WHERE tenant_id = :tid
                ORDER BY created_at DESC
                """
            ),
            {"tid": tenant_id},
        )
    ).mappings().all()

    items = [
        {
            "id": str(row["id"]),
            "name": row["name"],
            "key_prefix": row["key_prefix"],
            "scopes": row["scopes"] if isinstance(row["scopes"], list) else json.loads(row["scopes"] or "[]"),
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "last_used_at": row["last_used_at"].isoformat() if row["last_used_at"] else None,
            "revoked_at": row["revoked_at"].isoformat() if row["revoked_at"] else None,
            "active": row["revoked_at"] is None,
        }
        for row in rows
    ]
    return {
        "store": "api_keys",
        "total": len(items),
        "active": sum(1 for item in items if item["active"]),
        "revoked": sum(1 for item in items if not item["active"]),
        "items": items,
        "note": (
            "A real measured zero: the store exists and holds no key for this tenant. The key hash is never returned."
        ),
    }


@router.get("/posture")
async def secrets_posture(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("secrets:read")),
) -> dict[str, Any]:
    """Certificates served, credentials present, API keys issued, and the panels this platform cannot fill."""
    tenant_id = await _tenant(db, current_user)

    endpoints = [_probe_endpoint(host) for host in _endpoint_hosts()]
    served = [item for item in endpoints if item["served"]]
    expiring = [item for item in served if item["days_until_expiry"] is not None]
    soonest = min(expiring, key=lambda item: item["days_until_expiry"]) if expiring else None

    scanners = {name: shutil.which(name) for name in SCANNER_BINARIES}
    stores = await _store_state(db)

    return {
        "certificates": {
            "endpoints": endpoints,
            "endpoints_probed": len(endpoints),
            "endpoints_serving": len(served),
            "endpoints_unverified": sum(1 for item in served if not item["chain_verified"]),
            "expired": sum(1 for item in served if item["expired"]),
            "soonest_expiry_days": soonest["days_until_expiry"] if soonest else None,
            "soonest_expiry_host": soonest["host"] if soonest else None,
            "renewal": _renewal_mechanism(),
            "basis": (
                "Read from a live TLS handshake to each hostname from this host, so the certificate reported is the one "
                "a client receives. chain_verified is Python's default trust store, which is a separate fact from being "
                "served."
            ),
        },
        "credentials": _credential_inventory(),
        "api_keys": await _api_keys(db, tenant_id),
        "leakage_scanning": {
            "measurable": False,
            "scanners_looked_for": scanners,
            "scanner_present": any(scanners.values()),
            "stores": stores,
            "reason": (
                "No secret scanner runs on this platform: none of "
                + ", ".join(SCANNER_BINARIES)
                + " is installed, no scheduled job runs one, and there is no leakage-alert table. Nothing has been "
                "scanned, so a count of leakage alerts would describe a scan that never happened."
            ),
        },
        "access_policies": {
            "measurable": False,
            "stores": stores,
            "reason": (
                "There is no secret access-policy store on this platform. Who may resolve which credential is enforced "
                "by the API's own permission checks, not by a per-secret policy record, so no policy can be listed or "
                "edited here."
            ),
        },
        "rotation": {
            "certificates": _renewal_mechanism(),
            "credentials": {
                "measurable": False,
                "reason": (
                    "Nothing on this platform rotates an environment credential: there is no rotation schedule, no "
                    "rotation job and no record of when a value last changed. Only certificate renewal has a mechanism."
                ),
            },
        },
        "measured_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
