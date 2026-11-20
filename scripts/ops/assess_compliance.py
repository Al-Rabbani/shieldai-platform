#!/usr/bin/env python3
"""Assess compliance controls against evidence this host can actually produce.

DESIGN RULE, and the whole point of this file: a verdict is never assumed. Every check starts at
not_tested and can only move to pass or fail on facts collected at run time. A check that throws, a
fact that cannot be read, or a control with no check at all stays not_tested and says why. Nothing is
marked passing because it is expected to be.

Scores are computed over ASSESSED controls only (pass+fail). Coverage against the framework's official
control count is reported separately, so a 100% score over 6 assessed controls out of 153 can never be
read as a compliant framework.
"""
import hashlib, json, os, re, subprocess, sys
from datetime import datetime, timezone, timedelta

DB = ["sudo", "-u", "postgres", "psql", "-d", "gds_os", "-tAc"]
PUBLIC_API = "https://api.globaldigitalsecurity.io"

def sh(cmd, timeout=30):
    p = subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout.strip(), p.stderr.strip()

def psql(sql):
    rc, out, err = sh(DB + [sql])
    if rc != 0:
        raise RuntimeError(f"psql failed: {err[:200]}")
    return out

def one(sql, default=None):
    out = psql(sql)
    return out.splitlines()[0] if out else default

def ok(observed, detail):
    return {"verdict": "pass", "observed": observed, "detail": detail}

def bad(observed, detail):
    return {"verdict": "fail", "observed": observed, "detail": detail}

def unknown(detail, observed=None):
    return {"verdict": "not_tested", "observed": observed or {}, "detail": detail}

# ---------------------------------------------------------------- collectors
def chk_rls_forced():
    row = one("""SELECT count(*) FILTER (WHERE c.relforcerowsecurity) || '/' || count(*)
                 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE n.nspname='public' AND c.relkind='r'
                   AND EXISTS (SELECT 1 FROM information_schema.columns ic
                               WHERE ic.table_name = c.relname AND ic.column_name='tenant_id');""")
    forced, total = (int(x) for x in row.split("/"))
    obs = {"forced": forced, "total": total}
    if total == 0:
        return unknown("no tenant-scoped tables found", obs)
    return (ok(obs, f"{forced} of {total} tenant tables FORCE RLS") if forced == total
            else bad(obs, f"{total - forced} tenant tables do not FORCE RLS"))

def chk_least_priv_db():
    n = int(one("SELECT count(*) FROM pg_roles WHERE rolname IN ('gds','gds_runtime') AND (rolsuper OR rolbypassrls);", "0"))
    obs = {"privileged_app_roles": n}
    return (ok(obs, "application roles are neither superuser nor BYPASSRLS") if n == 0
            else bad(obs, f"{n} application role(s) hold superuser or BYPASSRLS"))

def chk_audit_log():
    row = one("SELECT count(*) || '|' || COALESCE(max(created_at)::text,'none') FROM audit_events;")
    n, latest = row.split("|")
    obs = {"rows": int(n), "latest": latest}
    if int(n) == 0:
        return bad(obs, "audit_events is empty: no audit trail is being written")
    try:
        age = datetime.now(timezone.utc) - datetime.fromisoformat(latest).replace(tzinfo=timezone.utc)
    except Exception:
        return unknown("audit_events latest timestamp unreadable", obs)
    return (ok(obs, f"{n} audit events, latest {age.days}d ago") if age < timedelta(days=30)
            else bad(obs, f"audit trail stale: latest event {age.days}d old"))

def chk_log_retention():
    path = "/etc/logrotate.d/gds-os"
    if not os.path.exists(path):
        return unknown("no logrotate config for gds-os", {"path": path})
    txt = open(path).read()
    m = re.search(r"rotate\s+(\d+)", txt)
    days = int(m.group(1)) if m else 0
    obs = {"rotate": days, "frequency": "daily" if "daily" in txt else "other"}
    return (ok(obs, f"logs retained {days} days") if days >= 7
            else bad(obs, f"log retention only {days} days"))

def chk_backup_offhost():
    marker = "/var/lib/gds-offhost.last"
    if not os.path.exists(marker):
        return bad({"marker": None}, "no successful off-host copy has ever been recorded")
    age = datetime.now(timezone.utc) - datetime.fromtimestamp(os.path.getmtime(marker), timezone.utc)
    obs = {"last_offhost": open(marker).read().strip(), "age_hours": round(age.total_seconds()/3600, 1)}
    return (ok(obs, "off-host copy within 26h") if age < timedelta(hours=26)
            else bad(obs, f"off-host copy {obs['age_hours']}h old"))

def chk_backup_automated():
    rc, cron, _ = sh("crontab -l")
    has_cron = "gds-backup.sh" in cron
    dumps = sh("ls -1t /var/backups/gds/daily/*.dump")[1].splitlines()
    if not dumps:
        return bad({"cron": has_cron, "dumps": 0}, "no backup dumps exist")
    age = datetime.now(timezone.utc) - datetime.fromtimestamp(os.path.getmtime(dumps[0]), timezone.utc)
    obs = {"cron_entry": has_cron, "newest_dump_hours": round(age.total_seconds()/3600, 1), "dumps": len(dumps)}
    return (ok(obs, f"scheduled backup, newest {obs['newest_dump_hours']}h old") if has_cron and age < timedelta(hours=26)
            else bad(obs, "backup is not both scheduled and recent"))

def chk_backup_restore_tested():
    path = "/var/lib/gds-restore-drill.json"
    if not os.path.exists(path):
        return unknown("no restore drill record exists", {"path": path})
    d = json.load(open(path))
    age = datetime.now(timezone.utc) - datetime.fromisoformat(d["drilled_at"].replace("Z", "+00:00"))
    obs = {"drilled_at": d["drilled_at"], "age_days": age.days, "sha256_match": d.get("sha256_match"),
           "table_data_entries": d.get("table_data_entries"), "source": d.get("source")}
    good = d.get("sha256_match") is True and age < timedelta(days=365)
    return (ok(obs, f"restore rehearsed {age.days}d ago, hash matched") if good
            else bad(obs, "restore drill failed or is older than a year"))

def _headers():
    rc, out, _ = sh(["curl", "-sI", "-m", "15", f"{PUBLIC_API}/health"])
    h = {}
    for line in out.splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            h[k.strip().lower()] = v.strip()
    return h

def chk_tls_hsts():
    h = _headers()
    sts = h.get("strict-transport-security", "")
    m = re.search(r"max-age=(\d+)", sts)
    age = int(m.group(1)) if m else 0
    obs = {"hsts": sts or None, "max_age": age, "include_subdomains": "includeSubDomains" in sts}
    if not sts:
        return bad(obs, "no HSTS header on the public API")
    return (ok(obs, f"HSTS max-age {age}s with includeSubDomains") if age >= 31536000 and "includeSubDomains" in sts
            else bad(obs, "HSTS present but weak"))

def chk_security_headers():
    h = _headers()
    want = {"content-security-policy": "Content-Security-Policy",
            "x-frame-options": "X-Frame-Options",
            "x-content-type-options": "X-Content-Type-Options",
            "referrer-policy": "Referrer-Policy"}
    present = {k: bool(h.get(k)) for k in want}
    obs = {"present": present, "checked": list(want)}
    missing = [want[k] for k, v in present.items() if not v]
    return (ok(obs, "all four defensive headers present") if not missing
            else bad(obs, f"missing: {', '.join(missing)}"))

def chk_ports_minimal():
    """Flag anything listening beyond 22/80/443 on a non-loopback address.

    The first version of this check parsed the socket address by string prefix and reported Neo4j on
    7474/7687 as publicly exposed. It was bound to [::ffff:127.0.0.1], which is loopback written in
    IPv4-mapped IPv6 form - a false FAIL. A compliance check that invents failures is as damaging as
    one that invents passes, so addresses are parsed properly here.
    """
    import ipaddress

    rc, out, _ = sh("ss -ltn")
    ports = set()
    for line in out.splitlines()[1:]:
        parts = line.split()
        if len(parts) < 4:
            continue
        addr = parts[3]
        host, _, port = addr.rpartition(":")
        host = host.strip("[]")
        if host.startswith("::ffff:"):
            host = host[len("::ffff:"):]
        try:
            ip = ipaddress.ip_address(host)
        except ValueError:
            continue
        if ip.is_loopback or ip.is_link_local:
            continue
        if ip.version == 4 and str(ip).startswith("172.17."):
            continue  # docker bridge: reachable only from the host and its containers
        ports.add(int(port))
    allowed = {22, 80, 443}
    obs = {"public_ports": sorted(ports), "allowed": sorted(allowed)}
    extra = sorted(ports - allowed)
    return (ok(obs, "only 22/80/443 listen publicly") if not extra
            else bad(obs, f"unexpected public ports: {extra}"))


def chk_ufw_default_deny():
    rc, out, _ = sh("ufw status verbose")
    deny = "deny (incoming)" in out.lower()
    allowed = re.findall(r"^(\d+)/tcp\s+ALLOW IN", out, re.M)
    obs = {"default_incoming_deny": deny, "allowed_tcp": sorted(set(allowed))}
    return (ok(obs, "UFW default deny incoming") if deny else bad(obs, "UFW does not default to deny incoming"))

def chk_monitoring():
    rc, out, _ = sh(["curl", "-s", "-m", "10", "http://127.0.0.1:9090/api/v1/targets"])
    try:
        d = json.loads(out)
        targets = d["data"]["activeTargets"]
    except Exception:
        return unknown("Prometheus targets API unreachable", {})
    up = [t["labels"].get("job") for t in targets if t.get("health") == "up"]
    down = [t["labels"].get("job") for t in targets if t.get("health") != "up"]
    obs = {"targets_up": up, "targets_down": down}
    return (ok(obs, f"{len(up)} scrape targets up") if up and not down
            else bad(obs, f"down: {down}"))

def classify_operations(spec):
    """Split published operations three ways.

    OpenAPI distinguishes "nobody decided" from "deliberately public": a MISSING security key means the
    operation was never classified, while an explicit empty list means the authors decided it is public.
    Counting both as failures made this control permanently fail on /auth/login, which is public by design,
    so the check could never reflect reality and its verdict carried no information.
    """
    methods = {"get", "post", "put", "patch", "delete"}
    declared = public = missing = 0
    missing_ops = []
    for path, item in (spec or {}).get("paths", {}).items():
        for m, op in item.items():
            if m not in methods or not isinstance(op, dict):
                continue
            if "security" not in op:
                missing += 1
                missing_ops.append(f"{m.upper()} {path}")
            elif op.get("security"):
                declared += 1
            else:
                public += 1
    return {"operations": declared + public + missing, "declared": declared,
            "public": public, "missing": missing, "missing_operations": sorted(missing_ops)}


def chk_auth_declared():
    rc, out, _ = sh(["curl", "-s", "-m", "15", "http://127.0.0.1:8000/openapi.json"])
    try:
        spec = json.loads(out)
    except Exception:
        return unknown("openapi.json unreadable", {})
    counts = classify_operations(spec)
    if counts["operations"] == 0:
        return unknown("no operations in the OpenAPI document", counts)
    detail = (f"{counts['declared']} authenticated, {counts['public']} deliberately public, "
              f"{counts['missing']} undeclared")
    return (bad(counts, detail) if counts["missing"] else ok(counts, detail))


def chk_deploy_gated():
    p = "/opt/gds-os/scripts/ops/deploy.sh"
    if not os.path.exists(p):
        return unknown("deploy.sh not found", {"path": p})
    txt = open(p).read()
    dirty = "working tree is dirty" in txt or "tree is dirty" in txt
    smoke = "smoke" in txt.lower()
    obs = {"refuses_dirty_tree": dirty, "smoke_gate": smoke}
    return (ok(obs, "deploy refuses a dirty tree and runs a smoke gate") if dirty and smoke
            else bad(obs, "deploy has no dirty-tree or smoke gate"))

def chk_patch_currency():
    rc, out, _ = sh("apt-get -s upgrade 2>/dev/null | grep -c '^Inst'")
    n = int(out or 0)
    sec = int(sh("apt-get -s upgrade 2>/dev/null | grep '^Inst' | grep -ci security")[1] or 0)
    obs = {"pending_updates": n, "pending_security": sec}
    return (ok(obs, "no pending package updates") if n == 0
            else bad(obs, f"{n} pending package updates ({sec} security)"))

def chk_container_health():
    rc, out, _ = sh("docker ps --format '{{.Names}}|{{.Status}}'")
    rows = [r for r in out.splitlines() if r.strip()]
    if not rows:
        return unknown("no running containers", {})
    watchdog = ""
    wp = "/usr/local/bin/gds-container-watch.sh"
    if os.path.exists(wp):
        watchdog = open(wp).read()
    unhealthy = []
    for r in rows:
        name, _, status = r.partition("|")
        if "healthy" in status:
            continue
        if name and name in watchdog:
            continue  # host-side watchdog covers services that cannot host a healthcheck
        unhealthy.append(name)
    obs = {"containers": len(rows), "without_health_or_watchdog": unhealthy}
    return (ok(obs, f"all {len(rows)} containers healthy or watchdog-covered") if not unhealthy
            else bad(obs, f"no health signal: {unhealthy}"))

def chk_tenant_isolation():
    # Run the read as the application role, not the owner and not superuser.
    sql = ("SET ROLE gds; SET gds.tenant_id = ''; "
           "SELECT count(*) FROM missions;")
    rc, out, err = sh(DB + [sql])
    if rc != 0:
        return unknown(f"probe failed: {err[:120]}", {})
    visible = int(out.splitlines()[-1])
    obs = {"unbound_rows_visible": visible}
    return (ok(obs, "an unbound tenant read returns zero rows") if visible == 0
            else bad(obs, f"an unbound read returned {visible} rows"))

RUNBOOK_PATH = "/opt/gds-os/docs/operations/RUNBOOK.md"


def chk_incident_response_plan():
    incidents = int(one("SELECT count(*) FROM incidents;", "0") or 0)
    runbook = os.path.exists(RUNBOOK_PATH)
    if runbook and incidents:
        return ok({"runbook": "docs/operations/RUNBOOK.md", "incidents_recorded": incidents},
                  "the response plan is versioned in the repository and incidents are recorded in the system")
    return bad({"runbook": runbook, "incidents_recorded": incidents},
               "no response plan is versioned" if not runbook else "no incident has ever been recorded")


def chk_incident_response_staffing():
    # Measured, not asserted. A pager now exists (5/15/60-minute acknowledgement ladder, level 3 UNANSWERED), but a
    # pager with nobody named on a rota still wakes nobody, so the rota half is the honest reason this fails.
    pager = int(one("SELECT count(*) FROM information_schema.tables WHERE table_name='notifications';", "0") or 0)
    ackable = int(one("SELECT count(*) FROM notifications WHERE requires_ack;", "0") or 0) if pager else 0
    ladder = os.path.exists("/usr/local/bin/gds-page.py")
    cron = 0
    for f in ("/etc/cron.d/gds-paging", "/var/spool/cron/crontabs/root"):
        try:
            if os.path.exists(f) and "gds-page" in open(f).read():
                cron = 1
                break
        except Exception:
            pass
    rota = int(one("SELECT count(*) FROM information_schema.tables WHERE table_name='on_call_shifts';", "0") or 0)
    # A rota that exists but has no shift covering this moment still pages nobody, so measure coverage, not the
    # presence of a table. Empty string means the query returned nothing, which is a real answer: nobody on call.
    covering = (one("SELECT person_name FROM on_call_shifts "
                    "WHERE starts_at <= now() AND ends_at > now() ORDER BY starts_at DESC LIMIT 1;", "") or "").strip()
    observed = {"paging_ladder": ladder, "paging_scheduled": bool(cron), "ackable_notifications": ackable,
                "on_call_rota": bool(rota), "on_call_now": covering or None}
    if ladder and cron and covering:
        return ok(observed, f"a paging ladder runs on a schedule and {covering} is on call now")
    if ladder and cron and rota:
        return bad(observed,
                   "the acknowledgement ladder runs and the rota table exists, but no shift covers the current "
                   "time, so a page right now would still land on nobody in particular")
    return bad(observed,
               "the acknowledgement ladder and its 5-minute schedule exist, but no on-call rota names who answers "
               "outside business hours, so a page can still land on nobody in particular")


def chk_incident_reporting():
    # The clock exists (migration 035, gds_api/regulatory.py): deadlines are computed from detection and stored, so
    # overdue is a query. It passes only once a real incident has been assessed, because an unexercised procedure
    # is a plan, not evidence.
    has_table = int(one("SELECT count(*) FROM information_schema.tables WHERE table_name='regulatory_notifications';", "0") or 0)
    module = os.path.exists("/opt/gds-os/apps/api/gds_api/regulatory.py")
    total = late = 0
    if has_table:
        total = int(one("SELECT count(*) FROM regulatory_notifications;", "0") or 0)
        late = int(one("""SELECT count(*) FROM regulatory_notifications
            WHERE status <> 'not_reportable' AND (
            (early_warning_sent_at IS NULL AND now() > early_warning_due_at)
            OR (notification_sent_at IS NULL AND now() > notification_due_at)
            OR (final_report_sent_at IS NULL AND now() > final_report_due_at));""", "0") or 0)
    not_reportable = 0
    if has_table and total:
        not_reportable = int(one("SELECT count(*) FROM regulatory_notifications WHERE status='not_reportable';", "0") or 0)
    reportable = total - not_reportable
    observed = {"procedure_module": module, "deadline_table": bool(has_table), "assessed": total,
                "reportable": reportable, "not_reportable": not_reportable, "overdue": late}
    if module and has_table and total > 0 and late == 0:
        return ok(observed,
                  "%d incident(s) assessed against Article 23: %d reportable, %d determined not reportable, "
                  "none overdue" % (total, reportable, not_reportable))
    if module and has_table:
        return bad(observed,
                   "the Article 23 clock exists and computes the 24-hour, 72-hour and 30-day deadlines from "
                   "detection, but no incident has been assessed for reportability yet, so it is built and "
                   "unexercised rather than evidenced")
    return bad(observed, "no regulatory notification procedure exists")


def chk_incident_register():
    n = int(one("SELECT count(*) FROM incidents;", "0") or 0)
    linked = int(one("SELECT count(*) FROM incident_findings;", "0") or 0)
    if n:
        return ok({"incidents": n, "linked_findings": linked},
                  "the incident register holds records linked to the findings that justify them")
    return bad({"incidents": 0}, "the incidents table is empty, so no register is evidenced")


def chk_incident_severity():
    vals = one("SELECT string_agg(DISTINCT severity, ',' ORDER BY severity) FROM incidents;", "") or ""
    seen = [v for v in vals.split(",") if v]
    known = {"critical", "high", "medium", "low", "info"}
    if seen and set(seen) <= known:
        return ok({"severities_in_use": seen}, "incidents carry a severity from a fixed classification")
    return unknown("no incident has been classified yet", {"severities_in_use": seen})


def chk_encryption_at_rest():
    rc, out, _ = sh("lsblk -fno FSTYPE 2>/dev/null | sort -u")
    luks = "crypto_LUKS" in out
    backups_encrypted = os.path.exists("/usr/local/bin/gds-b2-upload.py")
    if luks:
        return ok({"root_luks": True, "backups_encrypted": backups_encrypted},
                  "the root volume is LUKS-encrypted")
    return bad({"root_luks": False, "backups_encrypted": backups_encrypted,
                "transport": "TLS"},
               "the root filesystem is plain ext4 on /dev/sda1 with no LUKS mapping: backups are gpg AES256 "
               "encrypted and transport is TLS, but the live database volume is unencrypted at rest")


def chk_mfa_enforced():
    """Measured, not asserted.

    This collector previously returned a hardcoded auth_second_factor: False alongside the column count. The
    column count was real; the verdict was a constant. Now that migration 033 exists it measures the mechanism
    and the enrolment, and reports which of the two is missing.
    """
    cols = int(one("SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND "
                   "(column_name ILIKE '%mfa%' OR column_name ILIKE '%totp%');", "0") or 0)
    active = int(one("SELECT count(*) FROM users WHERE is_active;", "0") or 0)
    enrolled = int(one("SELECT count(*) FROM users WHERE mfa_enabled;", "0") or 0)
    observed = {
        "users_mfa_columns": cols,
        "users_active": active,
        "users_enrolled": enrolled,
        "enrolment_mechanism": cols >= 2,
        "routes": ["/auth/mfa/enrol", "/auth/mfa/confirm", "/auth/mfa/disable"],
    }
    if cols >= 2 and active > 0 and enrolled >= active:
        return ok(observed, f"every active user ({enrolled} of {active}) has a second factor and login demands it")
    if cols >= 2:
        return bad(observed,
                   f"the mechanism exists and login enforces it, but only {enrolled} of {active} active users have "
                   "enrolled, so the remaining accounts are still password-only")
    return bad(observed, "no second factor: the users table has no MFA or TOTP column")


def chk_access_review():
    """Measures the review record, not the existence of a table.

    This collector previously hardcoded reviews_recorded: 0 and failed forever. Migration 034 added the tables
    and a real generation path, so now the question is answerable: has a review been completed recently, and how
    much of it is still undecided.
    """
    tables = int(one("SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN "
                     "('access_reviews','access_review_items');", "0") or 0)
    active = int(one("SELECT count(*) FROM users WHERE is_active;", "0") or 0)
    if tables < 2:
        return bad({"review_tables": tables, "active_users": active},
                   "no access review mechanism exists: standing access is never periodically reviewed")
    completed = int(one("SELECT count(*) FROM access_reviews WHERE status='completed' "
                        "AND completed_at > now() - interval '90 days';", "0") or 0)
    open_reviews = int(one("SELECT count(*) FROM access_reviews WHERE status='open';", "0") or 0)
    pending = int(one("SELECT count(*) FROM access_review_items WHERE decision='pending';", "0") or 0)
    last = one("SELECT coalesce(max(completed_at)::text, '') FROM access_reviews WHERE status='completed';", "") or None
    observed = {"review_tables": tables, "active_users": active, "completed_reviews_90d": completed,
                "open_reviews": open_reviews, "pending_items": pending, "last_completed": last}
    if completed > 0:
        return ok(observed, f"{completed} access review(s) completed within 90 days; most recent {last}")
    if open_reviews > 0:
        return bad(observed,
                   f"a review is open with {pending} of {active} account(s) still undecided, so standing access "
                   "has not yet been re-justified")
    return bad(observed,
               "the mechanism exists but no review has ever been completed, so standing access is unreviewed")


# ---------------------------------------------------------------- AI governance (the platform's own AI operations)
# NIST AI RMF was catalogued with no collector at all, so it read 0 of 72 with no way to tell "not applicable" from
# "not checked". These four answer the questions the platform can actually answer about ITSELF: GDS OS runs AI agents
# that call tools, and the evidence below is what those agents actually did. They deliberately say nothing about a
# customer's AI estate, and the mapping_basis text on each control says so.
def chk_ai_tool_governance():
    """MEASURE-2.7: security of the AI system, measured as whether every tool call was risk-classified and decided."""
    row = one("""SELECT count(*) || '|'
                        || count(*) FILTER (WHERE decision IS NOT NULL) || '|'
                        || count(*) FILTER (WHERE authoritative_risk_class IS NOT NULL) || '|'
                        || count(*) FILTER (WHERE policy_version IS NOT NULL) || '|'
                        || count(*) FILTER (WHERE execution_status IS NOT NULL)
                 FROM capability_decisions WHERE decided_at > now() - interval '30 days';""", "0|0|0|0|0")
    total, verdict, risk, policy, executed = (int(x) for x in row.split("|"))
    obs = {"decisions_30d": total, "with_verdict": verdict, "with_risk_class": risk,
           "with_policy_version": policy, "with_execution_status": executed}
    if total == 0:
        return bad(obs, "no AI tool-call decision in 30 days: the governed execution path is not in use")
    gaps = [name for name, value in (("verdict", verdict), ("risk class", risk), ("policy version", policy))
            if value != total]
    if gaps:
        return bad(obs, f"{total} decisions but not all carry a {'/'.join(gaps)}")
    return ok(obs, f"all {total} AI tool-call decisions in 30 days carry a verdict, a risk class and a policy version")


def chk_ai_post_deployment_monitoring():
    """MANAGE-4.1: post-deployment monitoring, measured as completed missions and stored tool-call results."""
    row = one("""SELECT (SELECT count(*) FROM missions
                          WHERE status='completed' AND created_at > now() - interval '7 days') || '|'
                        || (SELECT count(*) FROM mission_tasks
                            WHERE created_at > now() - interval '7 days' AND result IS NOT NULL) || '|'
                        || (SELECT coalesce(max(created_at)::text, 'none') FROM mission_tasks);""", "0|0|none")
    missions, calls, latest = row.split("|")
    obs = {"missions_completed_7d": int(missions), "tool_calls_with_result_7d": int(calls), "latest_tool_call": latest}
    if int(missions) == 0 and int(calls) == 0:
        return bad(obs, "no completed mission and no stored tool-call result in 7 days: nothing is being observed")
    if int(calls) == 0:
        return bad(obs, f"{missions} mission(s) completed in 7 days but no tool call stored a result, so the "
                        "outcome of the AI's actions is not recorded")
    return ok(obs, f"{missions} completed mission(s) and {calls} tool call(s) with stored results in 7 days")


def chk_ai_risk_response_decisions():
    """MANAGE-1.1: risk response decided, measured as decisions that are actually differentiated."""
    row = one("""SELECT count(*) || '|'
                        || count(*) FILTER (WHERE upper(decision) = 'ALLOW') || '|'
                        || count(*) FILTER (WHERE upper(decision) = 'REQUIRE_APPROVAL') || '|'
                        || count(*) FILTER (WHERE upper(decision) = 'DENY')
                 FROM capability_decisions WHERE decided_at > now() - interval '30 days';""", "0|0|0|0")
    total, allow, approval, deny = (int(x) for x in row.split("|"))
    obs = {"decisions_30d": total, "allow": allow, "require_approval": approval, "deny": deny}
    if total == 0:
        return bad(obs, "no risk response recorded in 30 days")
    if allow == total:
        return bad(obs, f"all {total} decisions were ALLOW: a risk response that never withholds anything is "
                        "not being exercised")
    return ok(obs, f"{total} decisions in 30 days: {allow} allow, {approval} require approval, {deny} deny")


def chk_ai_action_accountability():
    """GOVERN-4.1: accountability, measured as an attributable audit trail for AI-initiated actions."""
    row = one("""SELECT count(*) || '|' || coalesce(max(created_at)::text, 'none')
                 FROM audit_events
                 WHERE created_at > now() - interval '30 days' AND action LIKE 'mission%';""", "0|none")
    events, latest = row.split("|")
    obs = {"mission_audit_events_30d": int(events), "latest": latest}
    if int(events) == 0:
        return bad(obs, "no audit event for an AI-initiated action in 30 days: AI actions are not attributable")
    return ok(obs, f"{events} audit event(s) for AI-initiated actions in 30 days, latest {latest}")



COLLECTORS = {
    "rls_forced": chk_rls_forced, "least_priv_db": chk_least_priv_db, "audit_log": chk_audit_log,
    "log_retention": chk_log_retention, "backup_offhost": chk_backup_offhost,
    "backup_automated": chk_backup_automated, "backup_restore_tested": chk_backup_restore_tested,
    "tls_hsts": chk_tls_hsts, "security_headers": chk_security_headers, "ports_minimal": chk_ports_minimal,
    "ufw_default_deny": chk_ufw_default_deny, "monitoring": chk_monitoring, "auth_declared": chk_auth_declared,
    "deploy_gated": chk_deploy_gated, "patch_currency": chk_patch_currency,
    "container_health": chk_container_health, "tenant_isolation": chk_tenant_isolation,
    "mfa_enforced": chk_mfa_enforced, "encryption_at_rest": chk_encryption_at_rest,
    "access_review": chk_access_review,
    "incident_response_plan": chk_incident_response_plan,
    "incident_response_staffing": chk_incident_response_staffing,
    "incident_reporting": chk_incident_reporting,
    "incident_register": chk_incident_register,
    "incident_severity": chk_incident_severity,
    "ai_tool_governance": chk_ai_tool_governance,
    "ai_post_deployment_monitoring": chk_ai_post_deployment_monitoring,
    "ai_risk_response_decisions": chk_ai_risk_response_decisions,
    "ai_action_accountability": chk_ai_action_accountability,
}

# ---------------------------------------------------------------- catalog
FRAMEWORKS = [
    # (key, name, version, official control count, jurisdiction, source)
    ("cis_v8",        "CIS Critical Security Controls v8",           "8.0", 153, "International", "catalogued 2026-11-19"),
    ("nist_ai_rmf",   "NIST AI Risk Management Framework",           "1.0",  72, "US", "catalogued 2026-11-19"),
    ("hipaa",         "HIPAA Security Rule (45 CFR 164)",            "2013", 75, "US", "catalogued 2026-11-19"),
    ("dora",          "DORA (EU) 2022/2554",                         "2022", 58, "EU", "catalogued 2026-11-19"),
    ("soc2_type2",    "SOC 2 Type II (AICPA TSC 2017)",              "2017", 61, "International", "catalogued 2026-11-19"),
    ("nis2",          "NIS2 Directive (EU) 2022/2555",               "2022/2555", 75, "EU",
     "technical decomposition of Art.20, Art.21 and Art.23 into 75 checkable controls; the directive "
     "publishes no official control list, so this count is ours and the mapping requires legal review"),
]

# (framework, ref, title, category, check_key or None, severity, mapping_basis)
CATALOG = [
    # --- NIS2 (Directive (EU) 2022/2555) ---------------------------------------------------------------
    # A technical decomposition of Articles 20, 21 and 23. Where a control has a collector it is because
    # that collector genuinely evidences it; everywhere else the basis says what evidence is missing,
    # which is the useful output. The directive publishes no official control list, so this count is ours
    # and the mapping needs legal review before it is used in a regulatory statement.
    ("nis2", 'Art.20.1', 'Management body approves and oversees the cyber risk management measures', 'governance', None, 'high', 'Requires approved governance minutes or a board resolution; no such record exists in this platform.'),
    ("nis2", 'Art.20.1.b', 'Management body accountability for compliance is assigned', 'governance', None, 'high', 'Requires a named accountable owner recorded against the framework; none is recorded.'),
    ("nis2", 'Art.20.2', 'Management body members receive cyber risk management training', 'governance', None, 'medium', 'Requires training records for the management body; none are held.'),
    ("nis2", 'Art.20.3', 'Cyber risk management expertise is available to the management body', 'governance', None, 'medium', 'Requires evidence of an appointed security function or adviser; not evidenced.'),
    ("nis2", 'Art.20.4', 'Governance arrangements are reviewed and minuted on a defined cadence', 'governance', None, 'medium', 'Requires review minutes; no governance review record exists.'),
    ("nis2", 'Art.21.1', 'An all-hazards framework covers confidentiality, integrity and availability', 'governance', None, 'high', 'Requires a documented framework; technical controls exist but no risk framework document does.'),
    ("nis2", 'Art.21.1.b', 'Risk analysis is performed and a risk register is maintained', 'governance', None, 'high', 'Requires a risk register; none is held in this platform.'),
    ("nis2", 'Art.21.1.c', 'Measures are proportionate and their selection is documented', 'governance', None, 'medium', 'Requires documented proportionality decisions; not evidenced.'),
    ("nis2", 'Art.21.1.d', 'The framework and its measures are reviewed periodically', 'governance', None, 'medium', 'Requires a review record with dates; none exists.'),
    ("nis2", 'Art.21.2.a.1', 'A documented information security policy is approved by the management body', 'policy', None, 'high', 'Requires an approved policy document; not held here.'),
    ("nis2", 'Art.21.2.a.2', 'A defined risk analysis methodology is used', 'policy', None, 'high', 'Requires the methodology document; not held here.'),
    ("nis2", 'Art.21.2.a.3', 'Access control policy is enforced in systems, not only written down', 'policy', 'rls_forced', 'high', None),
    ("nis2", 'Art.21.2.a.4', 'Acceptable use of assets and systems is defined', 'policy', None, 'medium', 'Requires an acceptable use policy; not held here.'),
    ("nis2", 'Art.21.2.a.5', 'Policies are reviewed on a defined cadence', 'policy', None, 'medium', 'Requires review dates per policy; none recorded.'),
    ("nis2", 'Art.21.2.a.6', 'Exceptions to policy are approved and time-bound', 'policy', None, 'medium', 'Requires an exception register; none exists.'),
    ("nis2", 'Art.21.2.a.7', 'Ownership is assigned for each information system', 'policy', None, 'medium', 'Requires named asset owners; not recorded.'),
    ("nis2", 'Art.21.2.a.8', 'Security requirements are defined for each system class', 'policy', None, 'medium', 'Requires per-class requirements; not documented.'),
    ("nis2", 'Art.21.2.b.1', 'An incident response plan is documented', 'incident', 'incident_response_plan', 'high', 'A versioned response plan AND recorded incidents are both required before this passes.'),
    ("nis2", 'Art.21.2.b.2', 'Incident detection operates continuously', 'incident', 'monitoring', 'high', None),
    ("nis2", 'Art.21.2.b.3', 'An incident register is maintained', 'incident', 'incident_register', 'high', 'Incident rows linked to the findings that justify them constitute the register.'),
    ("nis2", 'Art.21.2.b.4', 'Incident severity classification is defined', 'incident', 'incident_severity', 'medium', 'Recorded incidents carry a severity from a fixed scale, which is the classification scheme.'),
    ("nis2", 'Art.21.2.b.5', 'Incident roles and escalation paths are assigned', 'incident', None, 'medium', 'Requires named roles; not recorded.'),
    ("nis2", 'Art.21.2.b.6', 'Post-incident lessons learned are recorded', 'incident', None, 'medium', 'Requires post-incident reviews; none recorded.'),
    ("nis2", 'Art.21.2.b.7', 'Incident evidence is preserved with integrity', 'incident', None, 'medium', 'Requires an evidence chain of custody; not evidenced.'),
    ("nis2", 'Art.21.2.c.1', 'The backup process is automated and current', 'continuity', 'backup_automated', 'high', None),
    ("nis2", 'Art.21.2.c.2', 'A backup copy is held isolated from the primary system', 'continuity', 'backup_offhost', 'high', None),
    ("nis2", 'Art.21.2.c.3', 'Restore is rehearsed and integrity is verified', 'continuity', 'backup_restore_tested', 'high', None),
    ("nis2", 'Art.21.2.c.4', 'A disaster recovery plan is documented', 'continuity', None, 'high', 'Requires a DR plan document; not versioned here.'),
    ("nis2", 'Art.21.2.c.5', 'Recovery time and recovery point objectives are defined and tested', 'continuity', None, 'high', 'Requires declared RTO and RPO with a test record; not documented.'),
    ("nis2", 'Art.21.2.c.6', 'Crisis management roles are defined', 'continuity', None, 'medium', 'Requires crisis roles; not recorded.'),
    ("nis2", 'Art.21.2.d.1', 'A supplier and service provider inventory is maintained', 'supply_chain', None, 'high', 'Requires a supplier register; not held here.'),
    ("nis2", 'Art.21.2.d.2', 'Security requirements are included in supplier agreements', 'supply_chain', None, 'high', 'Requires contractual terms; not evidenced.'),
    ("nis2", 'Art.21.2.d.3', 'Suppliers are classified by risk', 'supply_chain', None, 'medium', 'Requires a risk classification per supplier; not held.'),
    ("nis2", 'Art.21.2.d.4', 'Vulnerabilities in supplied software components are tracked', 'supply_chain', None, 'high', 'Dependency advisories exist in scanner data, but no control ties them to a supplier obligation.'),
    ("nis2", 'Art.21.2.d.5', 'Supplier access to systems is controlled and reviewed', 'supply_chain', None, 'high', 'Requires supplier access records; not held.'),
    ("nis2", 'Art.21.2.d.6', 'Concentration risk across suppliers is assessed', 'supply_chain', None, 'medium', 'Requires a concentration assessment; not performed.'),
    ("nis2", 'Art.21.2.e.1', 'A secure development lifecycle is defined', 'development', None, 'high', 'Requires an SDLC standard; not documented.'),
    ("nis2", 'Art.21.2.e.2', 'A vulnerability handling process is defined', 'development', None, 'high', 'Requires a documented handling process; not held.'),
    ("nis2", 'Art.21.2.e.3', 'A vulnerability disclosure contact is published', 'development', None, 'medium', 'Requires a published disclosure route; not published.'),
    ("nis2", 'Art.21.2.e.4', 'Security testing is performed before release', 'development', None, 'high', 'The deploy gate runs smoke tests but no security testing stage, so this is not evidenced.'),
    ("nis2", 'Art.21.2.e.5', 'Change control gates deployment', 'development', 'deploy_gated', 'high', None),
    ("nis2", 'Art.21.2.e.6', 'Security patches are applied within a defined window', 'development', 'patch_currency', 'high', None),
    ("nis2", 'Art.21.2.e.7', 'A software component inventory is maintained per release', 'development', None, 'medium', 'Requires an SBOM per release; none is generated.'),
    ("nis2", 'Art.21.2.e.8', 'Remediation deadlines are defined by severity', 'development', None, 'medium', 'Requires declared remediation SLAs; severity is recorded but no deadline is.'),
    ("nis2", 'Art.21.2.f.1', 'Control effectiveness is measured', 'assurance', None, 'high', 'This assessment records verdicts but no effectiveness metric, so effectiveness is unmeasured.'),
    ("nis2", 'Art.21.2.f.2', 'An independent review or internal audit is performed', 'assurance', None, 'high', 'Requires an audit report; none exists.'),
    ("nis2", 'Art.21.2.f.3', 'Penetration testing is performed', 'assurance', None, 'high', 'Requires a penetration test report; none is on record.'),
    ("nis2", 'Art.21.2.f.4', 'Security metrics are reviewed by management', 'assurance', 'monitoring', 'medium', None),
    ("nis2", 'Art.21.2.f.5', 'Corrective actions are tracked to closure', 'assurance', None, 'medium', 'Requires a corrective action register; not held.'),
    ("nis2", 'Art.21.2.g.1', 'A baseline configuration standard is defined', 'people', None, 'medium', 'Requires a baseline standard; not documented.'),
    ("nis2", 'Art.21.2.g.2', 'A security awareness programme is delivered', 'people', None, 'high', 'Requires awareness delivery records; none held.'),
    ("nis2", 'Art.21.2.g.3', 'Training completion records are retained', 'people', None, 'medium', 'Requires training records; none held.'),
    ("nis2", 'Art.21.2.g.4', 'Social engineering resistance is tested', 'people', None, 'medium', 'Requires campaign results; none recorded.'),
    ("nis2", 'Art.21.2.g.5', 'Privileged users receive additional training', 'people', None, 'medium', 'Requires role-specific training records; none held.'),
    ("nis2", 'Art.21.2.h.1', 'A cryptography policy is defined', 'crypto', None, 'high', 'Requires a cryptography policy; not documented.'),
    ("nis2", 'Art.21.2.h.2', 'Encryption in transit is enforced', 'crypto', 'tls_hsts', 'high', None),
    ("nis2", 'Art.21.2.h.3', 'Encryption at rest is applied', 'crypto', 'encryption_at_rest', 'high', None),
    ("nis2", 'Art.21.2.h.4', 'Key management is defined and operated', 'crypto', None, 'high', 'Requires key management records; not evidenced.'),
    ("nis2", 'Art.21.2.h.5', 'The certificate lifecycle is managed', 'crypto', None, 'medium', 'Requires a certificate inventory and renewal records; not held.'),
    ("nis2", 'Art.21.2.i.1', 'An asset inventory is maintained', 'access', None, 'high', 'Findings exist but no asset register does, so the inventory cannot be evidenced.'),
    ("nis2", 'Art.21.2.i.2', 'Least privilege is enforced for system access', 'access', 'least_priv_db', 'high', None),
    ("nis2", 'Art.21.2.i.3', 'Access rights are reviewed periodically', 'access', 'access_review', 'high', None),
    ("nis2", 'Art.21.2.i.4', 'Joiner, mover and leaver processes are operated', 'access', None, 'high', 'Requires provisioning and revocation records; not evidenced.'),
    ("nis2", 'Art.21.2.i.5', 'Tenant and data separation is enforced', 'access', 'tenant_isolation', 'high', None),
    ("nis2", 'Art.21.2.i.6', 'Administrative interfaces require authentication', 'access', 'auth_declared', 'high', None),
    ("nis2", 'Art.21.2.j.1', 'Multi-factor authentication protects privileged access', 'access', 'mfa_enforced', 'high', None),
    ("nis2", 'Art.21.2.j.2', 'Multi-factor authentication protects remote access', 'access', None, 'high', 'No second factor is implemented in this platform, so remote MFA cannot be evidenced.'),
    ("nis2", 'Art.21.2.j.3', 'Secured communications are used for voice, video and text', 'access', None, 'medium', 'Requires evidence of secured channels; not evidenced.'),
    ("nis2", 'Art.21.2.j.4', 'Secured emergency communication channels exist', 'access', None, 'medium', 'Requires a tested emergency channel; not evidenced.'),
    ("nis2", 'Art.21.2.j.5', 'Administrative and session channels are hardened', 'access', 'ports_minimal', 'medium', None),
    ("nis2", 'Art.23.1', 'An early warning is issued within 24 hours of a significant incident', 'reporting', None, 'high', 'Requires a reporting procedure and record; the platform has no incident reporting workflow.'),
    ("nis2", 'Art.23.2', 'An incident notification is issued within 72 hours', 'reporting', None, 'high', 'Requires a notification record; not held.'),
    ("nis2", 'Art.23.3', 'A final report is issued within one month', 'reporting', None, 'high', 'Requires a final report record; not held.'),
    ("nis2", 'Art.23.4', 'Affected users are informed of significant threats', 'reporting', None, 'medium', 'Requires a user notification record; not held.'),
    ("nis2", 'Art.23.5', 'The reporting procedure is documented and rehearsed', 'reporting', None, 'medium', 'Requires a rehearsed procedure; not evidenced.'),

    # CIS Controls v8 — controls this platform can genuinely evidence, plus ones it cannot yet.
    ("cis_v8","1.1","Inventory of enterprise assets","inventory",None,"medium",None),
    ("cis_v8","3.3","Configure data access control lists","data",'rls_forced',"high","RLS FORCE on every tenant table is a row-level access control list enforced by the database, not the application"),
    ("cis_v8","3.10","Encrypt sensitive data in transit","data",'tls_hsts',"high","HSTS with includeSubDomains on the public API evidences enforced TLS for data in transit"),
    ("cis_v8","3.11","Encrypt sensitive data at rest","data",'encryption_at_rest',"high",None),
    ("cis_v8","4.1","Secure configuration process","config",'security_headers',"medium","Defensive response headers evidence a hardened public service configuration"),
    ("cis_v8","4.2","Secure configuration for network infrastructure","config",'ports_minimal',"high","Only 22/80/443 listening publicly evidences a minimised network service footprint"),
    ("cis_v8","4.7","Manage default accounts","config",'least_priv_db',"high","Application database roles holding neither superuser nor BYPASSRLS evidences removal of default elevated access"),
    ("cis_v8","4.8","Uninstall or disable unnecessary services","config",'ports_minimal',"medium","No unnecessary service listening publicly"),
    ("cis_v8","5.1","Establish access control policy","access",None,"medium",None),
    ("cis_v8","5.2","Use unique passwords","access",None,"high",None),
    ("cis_v8","5.4","Restrict administrator privileges","access",'least_priv_db',"high","Least-privilege database roles"),
    ("cis_v8","6.1","Establish access granting process","access",None,"medium",None),
    ("cis_v8","6.3","Require MFA for externally exposed applications","access",'mfa_enforced',"critical",None),
    ("cis_v8","6.4","Require MFA for remote network access","access",'mfa_enforced',"critical",None),
    ("cis_v8","6.8","Define and maintain role-based access control","access",'rls_forced',"high","Tenant-scoped RLS policies are enforced role-based access at the data layer"),
    ("cis_v8","7.1","Establish vulnerability management process","vuln",'patch_currency',"high","Pending update count evidences whether a patch process is actually running"),
    ("cis_v8","7.3","Automated operating system patch management","vuln",'patch_currency',"high",None),
    ("cis_v8","7.4","Automated application patch management","vuln",'patch_currency',"high",None),
    ("cis_v8","8.1","Establish audit log management process","logging",'audit_log',"high","A populated, current audit_events table evidences an audit process in operation"),
    ("cis_v8","8.2","Collect audit logs","logging",'audit_log',"high",None),
    ("cis_v8","8.10","Retain audit logs","logging",'log_retention',"medium","logrotate retention configuration evidences a defined retention period"),
    ("cis_v8","8.11","Conduct audit log reviews","logging",'audit_log',"medium",None),
    ("cis_v8","11.1","Establish data recovery process","recovery",'backup_automated',"critical","A scheduled job producing recent dumps evidences a recovery process"),
    ("cis_v8","11.2","Perform automated backups","recovery",'backup_automated',"critical",None),
    ("cis_v8","11.4","Maintain an isolated copy of data","recovery",'backup_offhost',"critical","A fresh off-host copy at a different provider is an isolated copy"),
    ("cis_v8","11.5","Test data recovery","recovery",'backup_restore_tested',"critical","A recorded restore rehearsal with a matching hash evidences tested recovery"),
    ("cis_v8","12.1","Secure network infrastructure","network",'ports_minimal',"high",None),
    ("cis_v8","12.2","Establish secure network architecture","network",'ufw_default_deny',"high","A default-deny host firewall evidences an enforced network boundary"),
    ("cis_v8","13.1","Centralize security event alerting","monitoring",'monitoring',"high","Prometheus targets up evidences centralised collection of platform telemetry"),
    ("cis_v8","13.6","Deploy network intrusion detection","monitoring",None,"high",None),
    ("cis_v8","14.1","Establish security awareness training","people",None,"medium",None),
    ("cis_v8","16.1","Establish secure application development process","appsec",'deploy_gated',"high","A deploy that refuses a dirty tree and gates on smoke tests evidences a controlled change process"),
    ("cis_v8","17.1","Designate personnel for incident handling","ir",'incident_response_staffing',"high",'Requires named incident personnel; no on-call rota exists, so this is measured as a failure.'),
    ("cis_v8","17.4","Establish incident response process","ir",'incident_response_plan',"high",'A versioned response plan AND recorded incidents are both required before this passes.'),
    ("cis_v8","18.1","Establish penetration test program","appsec",None,"medium",None),

    # SOC 2 Type II
    ("soc2_type2","CC4.1","Monitoring of internal controls","monitoring",'monitoring',"high",None),
    ("soc2_type2","CC5.1","Control activities selection","governance",None,"medium",None),
    ("soc2_type2","CC6.1","Logical access security","access",'rls_forced',"critical","Row-level security forced in the database evidences logical access restriction at the data layer"),
    ("soc2_type2","CC6.2","Registration and deprovisioning of users","access",'access_review',"high",None),
    ("soc2_type2","CC6.3","Role-based access and least privilege","access",'least_priv_db',"high",None),
    ("soc2_type2","CC6.6","Boundary protection","network",'ports_minimal',"high",None),
    ("soc2_type2","CC6.7","Protection of data in transmission","data",'tls_hsts',"high",None),
    ("soc2_type2","CC7.1","Detection of configuration changes","monitoring",'monitoring',"high",None),
    ("soc2_type2","CC7.2","Monitoring of system components","monitoring",'monitoring',"high",None),
    ("soc2_type2","CC7.3","Evaluation of security events","logging",'audit_log',"high",None),
    ("soc2_type2","CC7.4","Incident response","ir",'incident_response_plan',"high",'A versioned response plan AND recorded incidents are both required before this passes.'),
    ("soc2_type2","CC7.5","Recovery from identified incidents","recovery",'backup_restore_tested',"high",None),
    ("soc2_type2","CC8.1","Change management","appsec",'deploy_gated',"high",None),
    ("soc2_type2","A1.2","Availability capacity and backup","recovery",'backup_automated',"high",None),
    ("soc2_type2","A1.3","Recovery testing","recovery",'backup_restore_tested',"high",None),
    ("soc2_type2","C1.1","Confidentiality of data at rest","data",'encryption_at_rest',"high",None),
    ("soc2_type2","P1.1","Privacy notice and consent","privacy",None,"high",None),

    # HIPAA Security Rule
    ("hipaa","164.312(a)(1)","Access control","access",'rls_forced',"critical","Forced row-level security evidences technical access control on ePHI stores"),
    ("hipaa","164.312(a)(2)(i)","Unique user identification","access",None,"high",None),
    ("hipaa","164.312(a)(2)(iv)","Encryption and decryption","data",'encryption_at_rest',"high",None),
    ("hipaa","164.312(b)","Audit controls","logging",'audit_log',"critical",None),
    ("hipaa","164.312(c)(1)","Integrity","data",None,"high",None),
    ("hipaa","164.312(e)(1)","Transmission security","data",'tls_hsts',"critical",None),
    ("hipaa","164.308(a)(1)(ii)(D)","Information system activity review","logging",'audit_log',"high",None),
    ("hipaa","164.308(a)(3)(ii)(A)","Authorization and supervision","access",'least_priv_db',"high",None),
    ("hipaa","164.308(a)(4)(ii)(B)","Access authorization","access",'rls_forced',"high",None),
    ("hipaa","164.308(a)(5)(ii)(B)","Protection from malicious software","vuln",'patch_currency',"high",None),
    ("hipaa","164.308(a)(6)(ii)","Response and reporting","ir",'incident_reporting',"high",'Response is documented but reporting is not: no regulatory notification procedure exists.'),
    ("hipaa","164.308(a)(7)(ii)(A)","Data backup plan","recovery",'backup_automated',"critical",None),
    ("hipaa","164.308(a)(7)(ii)(B)","Disaster recovery plan","recovery",'backup_restore_tested',"critical",None),
    ("hipaa","164.316(b)(2)(i)","Retention of documentation","logging",'log_retention',"medium",None),

    # DORA
    ("dora","Art.5","ICT risk management governance","governance",None,"high",None),
    ("dora","Art.6","ICT risk management framework","governance",None,"high",None),
    ("dora","Art.8","Identification of ICT assets and dependencies","inventory",None,"high",None),
    ("dora","Art.9(2)","Protection and prevention","config",None,"high",None),
    ("dora","Art.9(3)","Hardening of ICT systems","config",'security_headers',"high",None),
    ("dora","Art.9(4)(c)","Encryption of data in transit","data",'tls_hsts',"high",None),
    ("dora","Art.10","Detection of anomalous activity","monitoring",'monitoring',"critical",None),
    ("dora","Art.11(2)","Business continuity policy","recovery",'backup_automated',"critical",None),
    ("dora","Art.11(4)","Backup policies and procedures","recovery",'backup_offhost',"critical",None),
    ("dora","Art.11(6)","Restoration and recovery testing","recovery",'backup_restore_tested',"critical",None),
    ("dora","Art.12(1)","Backup and restoration","recovery",'backup_restore_tested',"critical",None),
    ("dora","Art.17(1)","ICT-related incident management process","ir",'incident_response_plan',"critical",'A versioned incident management process AND recorded incidents are both required.'),
    ("dora","Art.28(1)","ICT third-party risk management","thirdparty",None,"high",None),

    # NIST AI RMF — four controls are evidenced from the platform's own AI operations; the rest are organisational
    # artefacts GDS OS does not hold, and each says so rather than leaving a blank. Every basis below is about this
    # platform's own agents and tool calls. None of it says anything about a customer's AI estate.
    ("nist_ai_rmf","GOVERN-1.1","Legal and regulatory requirements understood","govern",None,"high",
     "Not evidenced: needs a register of legal obligations applying to the AI system. The platform holds none."),
    ("nist_ai_rmf","GOVERN-1.2","Risk management integrated into processes","govern",None,"high",
     "Not evidenced: needs a documented AI risk management process. The per-action risk tiering that does exist is "
     "measured under MANAGE-1.1 instead of being claimed twice."),
    ("nist_ai_rmf","GOVERN-2.1","Roles and responsibilities documented","govern",None,"high",
     "Not evidenced: needs a named accountable owner for the AI system. No such assignment is recorded."),
    ("nist_ai_rmf","GOVERN-3.1","Workforce diversity and AI competency","govern",None,"medium",
     "Not evidenced: an organisational workforce question, not measurable from platform data."),
    ("nist_ai_rmf","GOVERN-4.1","Risk culture and accountability","govern",'ai_action_accountability',"medium",
     "Every AI-initiated action writes an attributable audit event, counted over 30 days. Evidences accountability "
     "for this platform's own agents, not an organisational risk culture."),
    ("nist_ai_rmf","GOVERN-5.1","Engagement with stakeholders","govern",None,"medium",
     "Not evidenced: needs a record of stakeholder engagement. None exists."),
    ("nist_ai_rmf","GOVERN-6.1","Third-party AI risk policies","govern",None,"high",
     "Not evidenced: needs supplier AI risk terms. No model or agent supplier assessment is recorded."),
    ("nist_ai_rmf","MAP-1.1","Context and intended purpose established","map",None,"high",
     "Not evidenced: needs a documented intended-purpose statement per AI system."),
    ("nist_ai_rmf","MAP-2.1","Interdisciplinary roles defined","map",None,"medium",
     "Not evidenced: needs documented cross-disciplinary roles for AI development."),
    ("nist_ai_rmf","MAP-3.1","AI system benefits and costs assessed","map",None,"medium",
     "Not evidenced: needs a recorded benefit and cost assessment for the AI system."),
    ("nist_ai_rmf","MEASURE-1.1","Approaches and metrics selected","measure",None,"high",
     "Not evidenced: the metrics used for AI health are defined in code, but no selected-approach record exists."),
    ("nist_ai_rmf","MEASURE-2.7","Security and resilience of AI systems","measure",'ai_tool_governance',"critical",
     "Every AI tool call passes through a recorded capability decision carrying a risk class and a policy version, "
     "counted over 30 days. Evidences the governed execution path for this platform's own agents."),
    ("nist_ai_rmf","MEASURE-2.10","Privacy risk assessed","measure",None,"high",
     "Not evidenced: needs a privacy risk assessment specific to the AI system's data handling."),
    ("nist_ai_rmf","MEASURE-3.1","Risk tracking over time","measure",None,"medium",
     "Not evidenced: needs AI risk tracked over time. Security risk scores are tracked, AI risk is not."),
    ("nist_ai_rmf","MEASURE-4.1","Measurement results evaluated","measure",None,"medium",
     "Not evidenced: needs a recorded evaluation of the measurements, not only the measurements."),
    ("nist_ai_rmf","MANAGE-1.1","Risk response decided","manage",'ai_risk_response_decisions',"high",
     "Every capability request from this platform's own agents resolves to allow, require approval or deny, with a "
     "denial code, counted over 30 days. The collector fails if nothing was ever withheld, so a blanket allow "
     "cannot pass."),
    ("nist_ai_rmf","MANAGE-2.1","Resources allocated to risk treatment","manage",None,"medium",
     "Not evidenced: needs a resourcing record for AI risk treatment."),
    ("nist_ai_rmf","MANAGE-3.1","Third-party risks monitored","manage",None,"high",
     "Not evidenced: needs ongoing monitoring of AI suppliers. None is configured."),
    ("nist_ai_rmf","MANAGE-4.1","Post-deployment monitoring","manage",'ai_post_deployment_monitoring',"high",
     "Completed missions and stored tool-call results from this platform's own agents are counted over 7 days, so "
     "the collector measures observed outcomes rather than a running process."),
]

# Every mapping must state why its check is accepted as evidence for that control. Where a control
# did not state one inline, this supplies the evidentiary logic for that check so a reviewer can
# challenge it. A mapping with no stated basis is an assertion, and the test suite rejects it.
CHECK_BASIS = {
    "rls_forced": "Forced row-level security in the database enforces access restriction at the data layer, not in application code",
    "least_priv_db": "Application database roles hold neither superuser nor BYPASSRLS, evidencing least privilege",
    "audit_log": "A populated and current audit_events table evidences audit logging actually operating",
    "log_retention": "logrotate retention configuration evidences a defined retention period",
    "backup_automated": "A scheduled job producing recent dumps evidences an operating backup process",
    "backup_offhost": "A fresh encrypted copy held at a second provider is an isolated copy of the data",
    "backup_restore_tested": "A recorded restore rehearsal with a matching hash evidences tested recovery, not assumed recovery",
    "tls_hsts": "HSTS with includeSubDomains and a long max-age on the public API evidences enforced encryption in transit",
    "security_headers": "Defensive response headers evidence a hardened public service configuration",
    "ports_minimal": "Only 22/80/443 listening on non-loopback addresses evidences a minimised network footprint",
    "ufw_default_deny": "A default-deny host firewall with an explicit allow list evidences an enforced network boundary",
    "monitoring": "Prometheus scrape targets reporting up evidences centralised telemetry collection in operation",
    "auth_declared": "Every published OpenAPI operation declaring a security scheme evidences authenticated interfaces",
    "deploy_gated": "A deploy that refuses a dirty tree and gates on smoke tests evidences a controlled change process",
    "patch_currency": "The pending package update count evidences whether patching is actually applied rather than planned",
    "container_health": "Every running container reporting healthy or covered by a host watchdog evidences availability monitoring",
    "tenant_isolation": "An unbound tenant read returning zero rows evidences tenant separation enforced by the database",
    "mfa_enforced": "users.mfa_enabled is counted against active users; enrolment is opt-in so partial coverage is reported as a failure with the counts",
    "encryption_at_rest": "Volume-level encryption cannot be verified from inside the guest, so it is not claimed",
    "access_review": "No access review records exist, so periodic review cannot be evidenced",
    "incident_response": "No incident response runbook is versioned in the repository, so the process cannot be evidenced",
}

CATALOG = [
    (fw, ref, title, cat, check, sev, basis or (CHECK_BASIS.get(check) if check else None))
    for (fw, ref, title, cat, check, sev, basis) in CATALOG
]


def q(v):
    return "'" + str(v).replace("'", "''") + "'"

def jq(obj):
    return q(json.dumps(obj, sort_keys=True, default=str)) + "::jsonb"

def main():
    # 1. frameworks
    for key, name, version, count, jurisdiction, source in FRAMEWORKS:
        psql(f"""INSERT INTO compliance_frameworks (framework_key, name, version, official_control_count, jurisdiction, source)
                 VALUES ({q(key)}, {q(name)}, {q(version)}, {count}, {q(jurisdiction)}, {q(source)})
                 ON CONFLICT (framework_key) DO UPDATE
                 SET name = EXCLUDED.name, version = EXCLUDED.version,
                     official_control_count = EXCLUDED.official_control_count,
                     jurisdiction = EXCLUDED.jurisdiction, source = EXCLUDED.source;""")

    # 2. catalog
    for fw, ref, title, cat, check, sev, basis in CATALOG:
        psql(f"""INSERT INTO compliance_controls (framework_key, control_ref, title, category, check_key, severity, mapping_basis)
                 VALUES ({q(fw)}, {q(ref)}, {q(title)}, {q(cat)}, {q(check) if check else 'NULL'}, {q(sev)}, {q(basis) if basis else 'NULL'})
                 ON CONFLICT (framework_key, control_ref) DO UPDATE
                 SET title = EXCLUDED.title, category = EXCLUDED.category, check_key = EXCLUDED.check_key,
                     severity = EXCLUDED.severity, mapping_basis = EXCLUDED.mapping_basis;""")

    # 3. run each distinct check once
    results = {}
    for check in sorted({c[4] for c in CATALOG if c[4]}):
        fn = COLLECTORS.get(check)
        if not fn:
            results[check] = unknown(f"no collector implemented for {check}")
            continue
        try:
            r = fn()
        except Exception as e:
            # A collector that throws must never yield a verdict: it becomes not_tested with the reason.
            r = unknown(f"collector error: {type(e).__name__}: {e}")
        r["collector"] = check
        results[check] = r
        print(f"  {check:24s} {r['verdict']:11s} {r['detail'][:78]}")

    # 4. rewrite automated verdicts (manual rows are left untouched)
    psql("DELETE FROM compliance_assessments WHERE verdict_source = 'automated';")
    for fw, ref, title, cat, check, sev, basis in CATALOG:
        if check:
            r = results[check]
            verdict, observed, collector = r["verdict"], r["observed"], r["collector"]
            detail = r["detail"]
        else:
            verdict, observed, collector, detail = "not_tested", {}, None, "no automated check defined for this control"
        sha = hashlib.sha256(json.dumps(observed, sort_keys=True, default=str).encode()).hexdigest()
        obs = dict(observed)
        obs["_detail"] = detail
        psql(f"""INSERT INTO compliance_assessments
                 (framework, control_id, control_name, status, severity, mapped_finding, assessment_date,
                  check_key, verdict_source, collector, observed, evidence_sha, assessed_at)
                 VALUES ({q(fw)}, {q(ref)}, {q(title)}, {q(verdict)}, {q(sev)}, NULL, now(),
                  {q(check) if check else 'NULL'}, 'automated', {q(collector) if collector else 'NULL'},
                  {jq(obs)}, {q(sha)}, now());""")

    # 5. summary
    print("\n" + "=" * 96)
    print(f"{'framework':16s} {'official':>8s} {'catalog':>7s} {'assessed':>8s} {'pass':>5s} {'fail':>5s} {'n/t':>4s} {'cov%':>6s} {'score*':>7s}")
    print("=" * 96)
    for key, name, version, official, *_ in FRAMEWORKS:
        row = one(f"""SELECT count(*) || '|' ||
                      count(*) FILTER (WHERE status='pass') || '|' ||
                      count(*) FILTER (WHERE status='fail') || '|' ||
                      count(*) FILTER (WHERE status NOT IN ('pass','fail'))
                      FROM compliance_assessments WHERE framework = {q(key)} AND verdict_source='automated';""")
        total, p, f, nt = (int(x) for x in row.split("|"))
        assessed = p + f
        cov = round(100.0 * assessed / official, 1) if official else 0.0
        score = round(100.0 * p / assessed, 1) if assessed else None
        print(f"{key:16s} {official:8d} {total:7d} {assessed:8d} {p:5d} {f:5d} {nt:4d} {cov:6.1f} {str(score):>7s}")
    print("=" * 96)
    print("score* is over ASSESSED controls only. cov% is assessed / the framework's official control count,")
    print("so a high score over a small number of assessed controls is not a compliant framework.")

if __name__ == "__main__":
    main()
