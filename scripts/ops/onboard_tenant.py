#!/usr/bin/env python3
"""Onboard an existing tenant as a managed MSSP customer, and prove the isolation claim.

What this does NOT do is invent a customer. It takes a tenant that already exists (created through
POST /auth/register by a real person) and brings it to a managed state: plan, SLA tier, provisioned
services, branding defaults, an isolation probe that actually runs, and a baseline taken from that
tenant's own telemetry.

Two honest distinctions are kept throughout:
  - services_provisioned says what was CONFIGURED for the tenant, not that it is being delivered.
  - health is not_assessed when the tenant has no telemetry of its own, rather than defaulting to a
    comfortable number.

The isolation probe runs as the application role, never as postgres, because postgres bypasses RLS and
would "pass" while proving nothing.
"""
import argparse, json, subprocess, sys

DB = ["sudo", "-u", "postgres", "psql", "-d", "gds_os", "-tAc"]

def psql(sql):
    p = subprocess.run(DB + [sql], capture_output=True, text=True, timeout=60)
    if p.returncode != 0:
        raise RuntimeError(p.stderr.strip()[:300])
    return p.stdout.strip()

def one(sql, default=None):
    out = psql(sql)
    return out.splitlines()[0] if out else default

def q(v):
    return "'" + str(v).replace("'", "''") + "'"

def probe(tenant_id, table):
    """Count rows visible (a) with no tenant bound and (b) bound to this tenant, as the app role.

    psql echoes the SET command tag ahead of the result, so the count is the last line, not the first.
    """
    def count(bind):
        out = psql(f"SET ROLE gds; SET gds.tenant_id = {bind}; SELECT count(*) FROM {table};")
        return int(out.splitlines()[-1].strip())

    return count("''"), count(q(tenant_id))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tenant-slug", required=True)
    ap.add_argument("--plan", required=True, help="plan_tier to record, e.g. trial")
    ap.add_argument("--sla", default="standard")
    ap.add_argument("--services", default="monitoring,vulnerability_management,compliance_reporting")
    ap.add_argument("--performed-by", default="gds-copilot")
    a = ap.parse_args()

    row = one(f"SELECT id || '|' || name || '|' || coalesce(display_name,'') FROM tenants WHERE slug = {q(a.tenant_slug)};")
    if not row:
        sys.exit(f"no tenant with slug {a.tenant_slug}")
    tid, name, display = row.split("|")
    services = [s.strip() for s in a.services.split(",") if s.strip()]

    # 1. managed state
    psql(f"""UPDATE tenants SET plan_tier = {q(a.plan)}, subscription_status = 'trialing',
                    onboarding_status = 'complete', onboarded_at = now(),
                    services_provisioned = {q(json.dumps(services))}::jsonb,
                    sla_tier = {q(a.sla)},
                    display_name = coalesce(nullif(display_name,''), {q(name)})
              WHERE id = {q(tid)};""")

    # 2. isolation, measured not assumed
    ev = {}
    ok = True
    for table in ("missions", "findings"):
        unbound, bound = probe(tid, table)
        own = int(one(f"SELECT count(*) FROM {table} WHERE tenant_id = {q(tid)};") or 0)
        platform = int(one(f"SELECT count(*) FROM {table};") or 0)
        # The meaningful claim is not "this tenant sees its own rows" but "this tenant cannot see the
        # rows that belong to everyone else". Recording the platform total makes that visible.
        ev[table] = {"unbound_visible": unbound, "bound_visible": bound, "own_rows": own,
                     "platform_total": platform,
                     "other_tenants_rows_invisible": platform - own}
        if unbound != 0:
            ok = False
        if bound != own:
            ok = False

    # 3. baseline from this tenant's own telemetry only
    findings = int(one(f"SELECT count(*) FROM findings WHERE tenant_id = {q(tid)};" ) or 0)
    missions = int(one(f"SELECT count(*) FROM missions WHERE tenant_id = {q(tid)};" ) or 0)
    users = int(one(f"SELECT count(*) FROM users WHERE tenant_id = {q(tid)} AND is_active;" ) or 0)
    baseline = {
        "active_users": users, "findings": findings, "missions": missions,
        "health": "not_assessed" if findings == 0 and missions == 0 else "assessed",
        "note": ("no telemetry of its own yet: nothing has been scanned for this tenant, so no health "
                 "score is reported rather than a default") if findings == 0 and missions == 0 else "",
    }

    # mssp_onboarding_records is FORCE RLS (migration 030), so the row's tenant must be bound in the same
    # session as the insert. psql runs both statements in one session, so the setting carries.
    psql(f"""SELECT set_config('gds.tenant_id', {q(tid)}, false);
             INSERT INTO mssp_onboarding_records
             (tenant_id, plan_tier, sla_tier, services_provisioned, isolation_verified,
              isolation_evidence, baseline, performed_by)
             VALUES ({q(tid)}, {q(a.plan)}, {q(a.sla)}, {q(json.dumps(services))}::jsonb, {'true' if ok else 'false'},
                     {q(json.dumps(ev))}::jsonb, {q(json.dumps(baseline))}::jsonb, {q(a.performed_by)});""")

    print(json.dumps({"tenant": a.tenant_slug, "tenant_id": tid, "plan": a.plan, "sla": a.sla,
                      "services_provisioned": services, "isolation_verified": ok,
                      "isolation_evidence": ev, "baseline": baseline}, indent=2))
    if not ok:
        sys.exit("ISOLATION PROBE FAILED — onboarding recorded with isolation_verified=false")

if __name__ == "__main__":
    main()
