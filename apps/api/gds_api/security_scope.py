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
    if payload.get("status"):
        clauses.append("LOWER(status) = %s")
        values.append(str(payload["status"]).lower())
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
              str(payload.get("target", "")), json.dumps({"description": str(payload.get("description", ""))[:2000], "cve_id": str(payload.get("cve_id", "")), "remediation": str(payload.get("remediation", ""))[:2000]}))
    with scoped_security_transaction(scope, connection_factory=connection_factory) as cur:
        cur.execute("""INSERT INTO security_findings
            (tenant_id, repository_binding_id, scanner, title, severity, target, details, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'open') RETURNING id""", values)
        row = cur.fetchone()
        if row is None:
            raise SecurityScopeError("Finding insert returned no ID")
        return {"success": True, "finding_id": str(row[0])}


"""Phase C wiring extensions: service scope resolution + scoped mission/alert operations.

Appended to the Phase C.1 module so all tenant-scoped database access shares
one enforcement point (role safety, forced-RLS readiness, transaction-local
gds.tenant_id). No credentials or production identifiers are embedded.
"""

# ---------------------------------------------------------------------------
# Service scope resolution (fail closed)
# ---------------------------------------------------------------------------

_SERVICE_ENV_KEYS = (
    "SECURITY_SERVICE_PRINCIPAL_ID",
    "SECURITY_SERVICE_TENANT_ID",
    "SECURITY_SERVICE_REPOSITORY_BINDING_ID",
)


def service_scope_configured() -> bool:
    """True only when a server-owned service scope is fully configured."""
    return bool(
        os.environ.get("SECURITY_SERVICE_PRINCIPAL_ID")
        and os.environ.get("SECURITY_SERVICE_TENANT_ID")
    )


def resolve_service_scope() -> ServiceSecurityScope:
    """Resolve the trusted platform-service scope from server-owned env.

    This fixed platform-service mapping is NOT general customer authorization.
    Multi-tenant principals need a separately verified registry/broker resolver.
    Fail closed: raise SecurityScopeError when the mapping is absent or
    malformed. Callers must never fall back to an ambient/pool identity.
    """
    try:
        principal = UUID(os.environ["SECURITY_SERVICE_PRINCIPAL_ID"])
        tenant = UUID(os.environ["SECURITY_SERVICE_TENANT_ID"])
    except (KeyError, ValueError, TypeError):
        raise SecurityScopeError("Service scope is not configured") from None
    repository = os.environ.get("SECURITY_SERVICE_REPOSITORY_BINDING_ID", "")
    if repository:
        try:
            return ServiceSecurityScope(principal, tenant, UUID(repository))
        except ValueError:
            raise SecurityScopeError("Service scope is not configured") from None
    return ServiceSecurityScope(principal, tenant, None)


# ---------------------------------------------------------------------------
# Mission persistence / retrieval (scoped)
# ---------------------------------------------------------------------------

_MISSION_RESERVED = {"tenant_id", "principal_id", "repository_binding_id", "trusted_scope", "security_scope"}

_MISSION_COLUMNS = (
    "tenant_id", "repository_binding_id", "mission_id", "goal", "status",
    "plan", "agent_results", "unified_report", "mission_pid",
    "total_tool_calls", "successful_agents", "total_agents", "duration_ms",
    "kernel_managed", "completed_at",
)


def _validate_mission_data(mission_data):
    if not isinstance(mission_data, dict):
        raise SecurityScopeError("Mission data must be an object")
    if _MISSION_RESERVED.intersection(mission_data):
        raise SecurityScopeError("Mission data cannot select security identity")
    mission_id = mission_data.get("mission_id")
    if not isinstance(mission_id, str) or not 1 <= len(mission_id) <= 200:
        raise SecurityScopeError("Mission id must be a non-empty string")
    for numeric_field in ("total_tool_calls", "successful_agents", "total_agents", "duration_ms"):
        value = mission_data.get(numeric_field, 0)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise SecurityScopeError("Mission metrics must be numeric")
    for text_field in ("goal", "status", "mission_pid"):
        value = mission_data.get(text_field, "")
        if value is not None and not isinstance(value, (str, int, float)):
            raise SecurityScopeError("Mission text fields must be scalar")


def scoped_mission_persist(mission_data, scope, *, connection_factory=None):
    """Insert or update a mission row with explicit, scope-owned identity.

    tenant_id/repository_binding_id come ONLY from the verified scope; the
    caller payload can never set them. RLS WITH CHECK enforces the boundary
    at the database even if this code were bypassed.
    """
    _validate_mission_data(mission_data)
    _validate_scope(scope)
    completed_at = mission_data.get("completed_at")
    values = (
        str(scope.tenant_id),
        str(scope.repository_binding_id) if scope.repository_binding_id else None,
        str(mission_data["mission_id"]),
        str(mission_data.get("goal", ""))[:4000],
        str(mission_data.get("status", "completed"))[:64],
        json.dumps(mission_data.get("plan", {})) if not isinstance(mission_data.get("plan", {}), str) else mission_data.get("plan", "{}"),
        json.dumps(mission_data.get("agent_results", [])) if not isinstance(mission_data.get("agent_results", []), str) else mission_data.get("agent_results", "[]"),
        str(mission_data.get("unified_report", ""))[:200000],
        str(mission_data.get("mission_pid", ""))[:64],
        int(mission_data.get("total_tool_calls", 0)),
        int(mission_data.get("successful_agents", 0)),
        int(mission_data.get("total_agents", 0)),
        int(mission_data.get("duration_ms", 0)),
        bool(mission_data.get("kernel_managed", False)),
        completed_at,
    )
    with scoped_security_transaction(scope, connection_factory=connection_factory) as cur:
        cur.execute(
            """INSERT INTO mission_results (""" + ", ".join(_MISSION_COLUMNS) + """)
            VALUES (""" + ", ".join(["%s"] * len(_MISSION_COLUMNS)) + """)
            ON CONFLICT (mission_id) DO UPDATE SET
                status = EXCLUDED.status,
                agent_results = EXCLUDED.agent_results,
                unified_report = EXCLUDED.unified_report,
                total_tool_calls = EXCLUDED.total_tool_calls,
                successful_agents = EXCLUDED.successful_agents,
                total_agents = EXCLUDED.total_agents,
                duration_ms = EXCLUDED.duration_ms,
                kernel_managed = EXCLUDED.kernel_managed,
                completed_at = EXCLUDED.completed_at
            RETURNING mission_id""",
            values,
        )
        row = cur.fetchone()
        if row is None:
            raise SecurityScopeError("Mission persist returned no ID")
        return {"success": True, "mission_id": str(row[0])}


def scoped_mission_load(mission_id, scope, *, connection_factory=None):
    """Load one mission row, tenant-scoped by RLS plus explicit identity."""
    if not isinstance(mission_id, str) or not 1 <= len(mission_id) <= 200:
        raise SecurityScopeError("Mission id must be a non-empty string")
    _validate_scope(scope)
    with scoped_security_transaction(scope, connection_factory=connection_factory) as cur:
        cur.execute(
            "SELECT * FROM mission_results WHERE mission_id = %s",
            (mission_id,),
        )
        row = cur.fetchone()
        if row is None:
            return None
        cols = [desc[0] for desc in cur.description]
        return dict(zip(cols, row))


# ---------------------------------------------------------------------------
# Scoped finding counts (CI gate, alert worker)
# ---------------------------------------------------------------------------

def scoped_finding_counts(scope, *, repository_binding_id=None, since=None,
                          statuses=("open",), connection_factory=None):
    """Severity counts scoped to the verified tenant (RLS) and, when the
    verified identity includes a repository binding, to exact binding IDs.

    `since` is an optional datetime for windowed counts. No substring
    matching is performed: repository scope is an exact binding ID or absent.
    """
    _validate_scope(scope)
    if repository_binding_id is not None and not isinstance(repository_binding_id, UUID):
        raise SecurityScopeError("Repository scope must be a verified binding ID")
    clauses, values = [], []
    if repository_binding_id is not None:
        clauses.append("repository_binding_id = %s")
        values.append(str(repository_binding_id))
    if statuses:
        placeholders = ", ".join(["%s"] * len(statuses))
        clauses.append("LOWER(status) IN (" + placeholders + ")")
        values.extend(str(s).lower() for s in statuses)
    if since is not None:
        clauses.append("detected_at >= %s")
        values.append(since)
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    with scoped_security_transaction(scope, connection_factory=connection_factory) as cur:
        cur.execute(
            "SELECT LOWER(severity), COUNT(*) FROM security_findings" + where + " GROUP BY 1",
            tuple(values),
        )
        counts = {str(sev): int(n) for sev, n in cur.fetchall()}
        cur.execute("SELECT COUNT(*) FROM security_findings" + where, tuple(values))
        total_row = cur.fetchone()
        total = int(total_row[0]) if total_row else 0
    return {"by_severity": counts, "total": total}


# ---------------------------------------------------------------------------
# Repository binding resolution (trusted chain for the CI gate)
# ---------------------------------------------------------------------------

def resolve_repository_binding(scope, *, provider, provider_repository_id,
                               provider_full_name, connection_factory=None):
    """Resolve the verified, active repository binding by IMMUTABLE provider
    repository ID within the allowed tenant, then verify the canonical
    provider_full_name matches the registered record.

    A commit URL or full name is never identity; provider_repository_id is.
    Renames update the registered full_name; forks have different IDs.
    """
    _validate_scope(scope)
    if provider not in {"github"}:
        raise SecurityScopeError("Unsupported repository provider")
    if isinstance(provider_repository_id, bool) or not isinstance(provider_repository_id, int) or provider_repository_id <= 0:
        raise SecurityScopeError("Provider repository id must be a positive integer")
    if not isinstance(provider_full_name, str) or "/" not in provider_full_name:
        raise SecurityScopeError("Provider full name must be owner/repository")
    with scoped_security_transaction(scope, connection_factory=connection_factory) as cur:
        cur.execute(
            """SELECT id, lower(provider_full_name), status FROM security_repository_bindings
               WHERE provider = %s AND provider_repository_id = %s""",
            (provider, str(provider_repository_id)),
        )
        row = cur.fetchone()
        if row is None or row[2] != "active":
            raise SecurityScopeError("Repository binding is not registered or not active")
        if row[1] != provider_full_name.strip().lower():
            raise SecurityScopeError("Repository full name does not match the registered binding")
        return UUID(str(row[0]))
