#!/usr/bin/env python3
"""Phase C staging validation — real operations against gds_staging_isolation
as the gds_runtime_stg runtime role, with forced RLS.

All test records are labelled STG-VALIDATION-* and cleaned up at the end.
Every assertion is real database behavior; nothing is simulated.
"""
import json
import os
import sys
import uuid

sys.path.insert(0, "/opt/gds-os/apps/api")

passed, failed = [], []


def check(name, fn):
    try:
        detail = fn()
        passed.append(name)
        print(f"PASS  {name} :: {detail}")
    except Exception as e:
        failed.append((name, str(e)))
        print(f"FAIL  {name} :: {e}")


def expect_error(fn, fragment=""):
    try:
        fn()
        raise AssertionError("expected SecurityScopeError, none raised")
    except Exception as e:
        if "SecurityScopeError" not in type(e).__name__:
            raise
        if fragment and fragment not in str(e):
            raise AssertionError(f"unexpected message: {e}")


import psycopg2
from gds_api.security_scope import (
    SecurityScopeError,
    ServiceSecurityScope,
    read_scoped_findings,
    resolve_repository_binding,
    resolve_service_scope,
    scoped_finding_counts,
    scoped_mission_load,
    scoped_mission_persist,
    service_scope_configured,
    store_scoped_finding,
)

GDS_TENANT = uuid.UUID("2ec10dd0-e48e-4043-8c88-5998ba5e23b0")
TEST_TENANT = uuid.UUID("764efb10-724f-4f1a-a89b-eb834365b4cc")
TEST_SCOPE = ServiceSecurityScope(uuid.UUID(int=999), TEST_TENANT, None)

print("=== 1. service scope resolution ===")
check("service scope configured",
      lambda: f"principal={resolve_service_scope().principal_id} tenant={resolve_service_scope().tenant_id}")

scope = resolve_service_scope()
check("scope tenant is the reviewed GDS tenant",
      lambda: str(scope.tenant_id)) if scope.tenant_id == GDS_TENANT else check("scope tenant is the reviewed GDS tenant", lambda: (_ for _ in ()).throw(AssertionError(str(scope.tenant_id))))

print("=== 2. scoped finding write/read (GDS tenant) ===")
finding_id = {}


def store_test_finding():
    result = store_scoped_finding({
        "source": "stg-validation", "title": "STG-VALIDATION phase-c scoped write",
        "severity": "medium", "target": "stg-validation.local",
        "description": "Phase C staging validation record", "cve_id": "",
    }, scope)
    finding_id["gds"] = result["finding_id"]
    return f"finding_id={result['finding_id']}"


check("store_scoped_finding inserts with explicit tenant", store_test_finding)


def read_back():
    rows = read_scoped_findings({"target": "stg-validation.local", "limit": 10}, scope)
    
    if not any(str(r["id"]) == str(finding_id["gds"]) for r in rows):
        raise AssertionError("stored finding not readable in scope")
    return f"read back {len(rows)} scoped row(s)"


check("read_scoped_findings sees own write", read_back)


def sees_backfill():
    rows = read_scoped_findings({"limit": 100}, scope)
    if len(rows) < 1:
        raise AssertionError("no backfilled GDS findings visible")
    return f"visible tenant findings >= {len(rows)} (backfill 92 expected)"


check("backfilled GDS findings visible under GDS scope", sees_backfill)

print("=== 3. cross-tenant isolation (test tenant scope) ===")


def test_tenant_cannot_read_gds():
    rows = read_scoped_findings({"target": "stg-validation.local", "limit": 10}, TEST_SCOPE)
    if rows:
        raise AssertionError(f"RLS leak: test tenant sees GDS finding {rows[0]['id']}")
    return "0 rows leaked"


check("RLS blocks test-tenant read of GDS findings", test_tenant_cannot_read_gds)


def test_tenant_sees_no_gds_backfill():
    rows = read_scoped_findings({"limit": 100}, TEST_SCOPE)
    if rows:
        raise AssertionError(f"RLS leak: test tenant sees {len(rows)} GDS rows")
    return "test tenant sees 0 GDS rows"


check("RLS blocks test-tenant read of all GDS rows", test_tenant_sees_no_gds_backfill)


def test_tenant_store():
    result = store_scoped_finding({
        "source": "stg-validation", "title": "STG-VALIDATION test-tenant row",
        "severity": "low", "target": "stg-validation-test.local",
        "description": "should land in the TEST tenant", "cve_id": "",
    }, TEST_SCOPE)
    finding_id["test"] = result["finding_id"]
    # verify placement with the admin connection (identity, not a leak)
    admin = psycopg2.connect("dbname=gds_staging_isolation user=postgres")
    with admin:
        with admin.cursor() as cur:
            cur.execute("SELECT tenant_id FROM security_findings WHERE id=%s", (finding_id["test"],))
            row = cur.fetchone()
            if not row or str(row[0]) != str(TEST_TENANT):
                raise AssertionError(f"wrong placement: {row}")
    admin.close()
    return f"test-tenant row landed in test tenant ({result['finding_id'][:8]})"


check("test-tenant write lands in test tenant", test_tenant_store)


def gds_scope_cannot_read_test_row():
    rows = read_scoped_findings({"target": "stg-validation-test.local", "limit": 10}, scope)
    if rows:
        raise AssertionError("GDS scope sees test-tenant row")
    return "no cross-read in reverse direction"


check("RLS blocks GDS-scope read of test-tenant row", gds_scope_cannot_read_test_row)

print("=== 4. payload cannot select identity (fail closed) ===")


def reserved_rejected():
    expect_error(lambda: store_scoped_finding(
        {"title": "x", "severity": "low", "tenant_id": str(GDS_TENANT)}, scope),
        "cannot select security identity")
    expect_error(lambda: scoped_mission_persist(
        {"mission_id": "m", "tenant_id": str(GDS_TENANT)}, scope),
        "cannot select security identity")
    return "reserved identity fields rejected in both writers"


check("payload identity fields rejected", reserved_rejected)


def unconfigured_fail_closed():
    saved = {k: os.environ.pop(k) for k in list(os.environ) if k.startswith("SECURITY_")}
    try:
        expect_error(lambda: resolve_service_scope(), "not configured")
        assert service_scope_configured() is False
        # writers must fail closed with no ambient fallback
        expect_error(lambda: store_scoped_finding(
            {"title": "x", "severity": "low"}, scope), "not configured")
        expect_error(lambda: scoped_mission_persist(
            {"mission_id": "m"}, scope), "not configured")
    finally:
        os.environ.update(saved)
    return "unset env fails closed for resolve/store/persist"


check("unconfigured scope fails closed everywhere", unconfigured_fail_closed)


def unsafe_role_rejected():
    saved = os.environ.get("SECURITY_RUNTIME_ROLE")
    try:
        # forged role that does not match the actual connection role
        os.environ["SECURITY_RUNTIME_ROLE"] = "gds"
        expect_error(lambda: read_scoped_findings({"limit": 1}, scope), "Unsafe scoped database role")
        os.environ["SECURITY_RUNTIME_ROLE"] = "postgres"
        expect_error(lambda: read_scoped_findings({"limit": 1}, scope), "Unsafe scoped database role")
    finally:
        os.environ["SECURITY_RUNTIME_ROLE"] = saved
    return "superuser/forged runtime roles rejected before any query"


check("unsafe runtime role rejected", unsafe_role_rejected)

print("=== 5. mission persist/load with explicit identity ===")
MISSION_ID = "STG-VALIDATION-phase-c-001"


def persist_mission():
    result = scoped_mission_persist({
        "mission_id": MISSION_ID, "goal": "phase c staging validation",
        "status": "completed", "plan": {"steps": 1},
        "agent_results": [{"agent": "stg"}], "unified_report": "stg-validation report",
        "total_tool_calls": 2, "successful_agents": 1, "total_agents": 1,
        "duration_ms": 100, "kernel_managed": True,
    }, scope)
    return result["mission_id"]


check("scoped_mission_persist inserts", persist_mission)


def verify_mission_tenant():
    admin = psycopg2.connect("dbname=gds_staging_isolation user=postgres")
    with admin:
        with admin.cursor() as cur:
            cur.execute("SELECT tenant_id, repository_binding_id FROM mission_results WHERE mission_id=%s", (MISSION_ID,))
            row = cur.fetchone()
            if not row or str(row[0]) != str(GDS_TENANT) or row[1] is not None:
                raise AssertionError(f"identity drift: {row}")
    admin.close()
    return "tenant_id=GDS tenant, repo binding NULL (platform scope)"


check("mission row carries verified identity", verify_mission_tenant)


def upsert_updates_not_duplicates():
    scoped_mission_persist({"mission_id": MISSION_ID, "goal": "updated",
                            "status": "completed", "unified_report": "v2"}, scope)
    admin = psycopg2.connect("dbname=gds_staging_isolation user=postgres")
    with admin:
        with admin.cursor() as cur:
            cur.execute("SELECT COUNT(*), MAX(unified_report) FROM mission_results WHERE mission_id=%s", (MISSION_ID,))
            count, report = cur.fetchone()
            if count != 1 or report != "v2":
                raise AssertionError(f"upsert drift: count={count} report={report}")
    admin.close()
    return "upsert updated in place (1 row, report=v2)"


check("mission upsert updates same row", upsert_updates_not_duplicates)


def load_mission():
    data = scoped_mission_load(MISSION_ID, scope)
    if not data or data.get("mission_id") != MISSION_ID:
        raise AssertionError("mission not loadable in scope")
    return "loaded with plan/agent_results parsed"


check("scoped_mission_load returns mission", load_mission)


def test_tenant_cannot_load_gds_mission():
    if scoped_mission_load(MISSION_ID, TEST_SCOPE) is not None:
        raise AssertionError("RLS leak: test tenant loaded GDS mission")
    return "test-tenant scope cannot see GDS mission"


check("RLS blocks test-tenant mission load", test_tenant_cannot_load_gds_mission)

print("=== 6. repository binding trusted chain ===")
BINDING_ID = {}


def resolve_binding():
    bid = resolve_repository_binding(scope, provider="github",
                                     provider_repository_id=1273433852,
                                     provider_full_name="Al-Rabbani/shieldai-platform")
    BINDING_ID["id"] = bid
    admin = psycopg2.connect("dbname=gds_staging_isolation user=postgres")
    with admin:
        with admin.cursor() as cur:
            cur.execute("SELECT id, status FROM security_repository_bindings WHERE provider_repository_id=%s", (str(1273433852),))
            row = cur.fetchone()
            if str(row[0]) != str(bid) or row[1] != "active":
                raise AssertionError(f"binding mismatch: {row}")
    admin.close()
    return f"resolved binding {bid}"


check("binding resolved by immutable repo ID + canonical name", resolve_binding)


def wrong_name_fails():
    expect_error(lambda: resolve_repository_binding(
        scope, provider="github", provider_repository_id=1273433852,
        provider_full_name="Al-Rabbani/not-the-registered-name"),
        "does not match the registered binding")
    return "renamed/mismatched full_name rejected"


check("name mismatch fails closed", wrong_name_fails)


def unknown_id_fails():
    expect_error(lambda: resolve_repository_binding(
        scope, provider="github", provider_repository_id=42,
        provider_full_name="someone/other-repo"),
        "not registered")
    return "unknown/fork repository ID rejected"


check("unknown repo ID fails closed", unknown_id_fails)


def binding_scoped_counts():
    counts = scoped_finding_counts(scope, repository_binding_id=BINDING_ID["id"], statuses=("open",))
    # backfilled findings intentionally have NO reviewed binding association,
    # so exact-binding counts must be zero — no substring leakage.
    if counts["total"] != 0:
        raise AssertionError(f"substring leak: {counts}")
    tenant_counts = scoped_finding_counts(scope, statuses=("open",))
    if tenant_counts["total"] < 1:
        raise AssertionError("tenant counts empty")
    return f"binding-exact=0, tenant-scope={tenant_counts['total']} open"


check("exact-binding counts (no ILIKE leakage)", binding_scoped_counts)

print("=== 7. cleanup of labelled test records ===")


def cleanup():
    admin = psycopg2.connect("dbname=gds_staging_isolation user=postgres")
    with admin:
        with admin.cursor() as cur:
            cur.execute("DELETE FROM security_findings WHERE title LIKE 'STG-VALIDATION%'")
            f = cur.rowcount
            cur.execute("DELETE FROM mission_results WHERE mission_id = %s", (MISSION_ID,))
            m = cur.rowcount
    admin.close()
    return f"deleted {f} findings, {m} mission"


check("labelled test records removed", cleanup)

print()
print(f"RESULT: {len(passed)} passed, {len(failed)} failed")
for name, err in failed:
    print(f"  FAILED: {name} :: {err}")
sys.exit(1 if failed else 0)
