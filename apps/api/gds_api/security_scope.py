"""Phase C service identity and scoped legacy finding access.

Not wired into production routes. Enable only after the staged schema and
dedicated runtime role are ready; never reconstruct scope from request/model
payloads. No credentials or production identifiers are embedded here.
"""
from contextlib import contextmanager
from dataclasses import dataclass
import json
import os
import secrets
from uuid import UUID


class SecurityScopeError(Exception):
    """Controlled error safe to return without connection/credential details."""


@dataclass(frozen=True)
class ServiceSecurityScope:
    principal_id: UUID
    tenant_id: UUID
    repository_binding_id: UUID | None = None


def authenticate_scoped_bridge(authorization: str | None) -> ServiceSecurityScope:
    """Verify the bridge credential, then resolve its server-owned scope.

    This fixed platform service mapping is NOT general customer authorization.
    Multi-tenant principals need a separately verified registry/broker resolver.
    """
    key = os.environ.get("BRIDGE_API_KEY", "")
    if not key or not authorization or not authorization.startswith("Bearer "):
        raise SecurityScopeError("Bridge authentication failed")
    if not secrets.compare_digest(authorization[7:].encode(), key.encode()):
        raise SecurityScopeError("Bridge authentication failed")
    try:
        principal = UUID(os.environ["SECURITY_BRIDGE_PRINCIPAL_ID"])
        tenant = UUID(os.environ["SECURITY_BRIDGE_TENANT_ID"])
        repository = os.environ.get("SECURITY_BRIDGE_REPOSITORY_BINDING_ID", "")
        return ServiceSecurityScope(principal, tenant, UUID(repository) if repository else None)
    except (KeyError, ValueError, TypeError):
        raise SecurityScopeError("Bridge service scope is not configured") from None


def _validate_scope(scope):
    if not isinstance(scope, ServiceSecurityScope) or not isinstance(scope.principal_id, UUID) or not isinstance(scope.tenant_id, UUID):
        raise SecurityScopeError("Verified service scope required")
    if scope.repository_binding_id is not None and not isinstance(scope.repository_binding_id, UUID):
        raise SecurityScopeError("Invalid verified repository scope")


@contextmanager
def scoped_security_transaction(scope: ServiceSecurityScope, *, connection_factory=None):
    """Use a dedicated non-bypass role and transaction-local tenant context.

    The factory parameter is internal/test-only. This helper owns and closes
    the connection. It requires all four phase-D tables to have forced RLS.
    """
    _validate_scope(scope)
    role = os.environ.get("SECURITY_RUNTIME_ROLE", "")
    if not role:
        raise SecurityScopeError("Scoped runtime role is not configured")
    conn = None
    try:
        if connection_factory is None:
            dsn = os.environ.get("SECURITY_DATABASE_URL", "")
            if not dsn:
                raise SecurityScopeError("Scoped database is not configured")
            import psycopg2
            conn = psycopg2.connect(dsn, connect_timeout=5, options="-c statement_timeout=5000")
        else:
            conn = connection_factory()
        if conn.autocommit:
            raise SecurityScopeError("Scoped database requires transactions")
        with conn:
            with conn.cursor() as cur:
                cur.execute("""SELECT current_user, rolsuper, rolbypassrls,
                    EXISTS (SELECT 1 FROM pg_roles elevated
                            WHERE (elevated.rolsuper OR elevated.rolbypassrls)
                            AND pg_has_role(current_user, elevated.oid, 'MEMBER'))
                    FROM pg_roles WHERE rolname = current_user""")
                actual = cur.fetchone()
                if not actual or actual[0] != role or actual[1] or actual[2] or actual[3]:
                    raise SecurityScopeError("Unsafe scoped database role")
                cur.execute("""
                    SELECT count(*), bool_and(relrowsecurity AND relforcerowsecurity),
                           bool_or(pg_has_role(current_user, relowner, 'MEMBER'))
                    FROM pg_class WHERE oid IN
                    ('security_findings'::regclass, 'mission_results'::regclass,
                     'security_repository_bindings'::regclass, 'repositories'::regclass)
                """)
                protection = cur.fetchone()
                if not protection or protection[0] != 4 or protection[1] is not True or protection[2]:
                    raise SecurityScopeError("Scoped database enforcement is not ready")
                cur.execute("SELECT set_config('gds.tenant_id', %s, true)", (str(scope.tenant_id),))
                if scope.repository_binding_id is not None:
                    cur.execute("SELECT id FROM security_repository_bindings WHERE id = %s AND tenant_id = %s AND status = 'active'",
                                (str(scope.repository_binding_id), str(scope.tenant_id)))
                    if cur.fetchone() is None:
                        raise SecurityScopeError("Repository is not active in the verified tenant")
                yield cur
    except SecurityScopeError:
        raise
    except Exception:
        raise SecurityScopeError("Scoped database operation failed") from None
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                raise SecurityScopeError("Scoped database connection cleanup failed") from None


def _validate_payload(payload):
    if not isinstance(payload, dict):
        raise SecurityScopeError("Finding payload must be an object")
    reserved = {"tenant_id", "principal_id", "repository_binding_id", "trusted_scope", "security_scope"}
    if reserved.intersection(payload):
        raise SecurityScopeError("Payload cannot select security identity")


def read_scoped_findings(payload, scope, *, connection_factory=None):
    _validate_payload(payload)
    limit = payload.get("limit", 100)
    if type(limit) is not int or not 1 <= limit <= 1000:
        raise SecurityScopeError("Finding limit must be an integer between 1 and 1000")
    _validate_scope(scope)
    clauses = ["tenant_id = %s"]
    values = [str(scope.tenant_id)]
    if scope.repository_binding_id is not None:
        clauses.append("repository_binding_id = %s")
        values.append(str(scope.repository_binding_id))
    if payload.get("target"):
        clauses.append("target = %s")
        values.append(str(payload["target"]))
    if payload.get("severity"):
        clauses.append("LOWER(severity) = %s")
        values.append(str(payload["severity"]).lower())
    query = "SELECT id, scanner, title, severity, target, status FROM security_findings WHERE " + " AND ".join(clauses) + " ORDER BY detected_at DESC LIMIT %s"
    with scoped_security_transaction(scope, connection_factory=connection_factory) as cur:
        cur.execute(query, tuple(values + [limit]))
        rows = cur.fetchall()
        return [dict(zip(("id", "scanner", "title", "severity", "target", "status"), row)) for row in rows]


def store_scoped_finding(payload, scope, *, connection_factory=None):
    _validate_payload(payload)
    _validate_scope(scope)
    severity = str(payload.get("severity", "medium")).strip().lower()
    if severity not in {"critical", "high", "medium", "low", "info", "informational"}:
        raise SecurityScopeError("Invalid finding severity")
    values = (str(scope.tenant_id), str(scope.repository_binding_id) if scope.repository_binding_id else None,
              str(payload.get("source", "kernel")), str(payload.get("title", "Unknown finding")), severity,
              str(payload.get("target", "")), json.dumps({"description": str(payload.get("description", ""))[:2000], "cve_id": str(payload.get("cve_id", ""))}))
    with scoped_security_transaction(scope, connection_factory=connection_factory) as cur:
        cur.execute("""INSERT INTO security_findings
            (tenant_id, repository_binding_id, scanner, title, severity, target, details, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'open') RETURNING id""", values)
        row = cur.fetchone()
        if row is None:
            raise SecurityScopeError("Finding insert returned no ID")
        return {"success": True, "finding_id": str(row[0])}
