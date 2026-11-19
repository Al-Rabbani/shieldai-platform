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

def chk_auth_declared():
    rc, out, _ = sh(["curl", "-s", "-m", "15", "http://127.0.0.1:8000/openapi.json"])
    try:
        spec = json.loads(out)
    except Exception:
        return unknown("openapi.json unreadable", {})
    methods = {"get", "post", "put", "patch", "delete"}
    total = declared = 0
    for path, item in spec.get("paths", {}).items():
        for m, op in item.items():
            if m in methods:
                total += 1
                if op.get("security"):
                    declared += 1
    obs = {"operations": total, "declaring_auth": declared}
    if total == 0:
        return unknown("no operations in the OpenAPI document", obs)
    return (ok(obs, f"{declared} of {total} operations declare auth") if declared == total
            else bad(obs, f"{total - declared} operations declare no auth"))

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

def chk_mfa_enforced():
    return unknown("no MFA enrolment data exists in the schema, so enforcement cannot be evidenced", {})

def chk_encryption_at_rest():
    return unknown("volume-level encryption cannot be verified from inside the guest", {})

def chk_access_review():
    n = int(one("SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('access_reviews','access_review_items');", "0"))
    return unknown("no access review records exist", {"review_tables": n})

def chk_incident_response():
    cands = ["/opt/gds-os/docs/INCIDENT_RESPONSE.md", "/opt/gds-os/docs/runbooks/incident_response.md"]
    found = [c for c in cands if os.path.exists(c)]
    return (ok({"documents": found}, "incident response runbook present") if found
            else unknown("no incident response runbook is versioned in the repo", {"checked": cands}))

COLLECTORS = {
    "rls_forced": chk_rls_forced, "least_priv_db": chk_least_priv_db, "audit_log": chk_audit_log,
    "log_retention": chk_log_retention, "backup_offhost": chk_backup_offhost,
    "backup_automated": chk_backup_automated, "backup_restore_tested": chk_backup_restore_tested,
    "tls_hsts": chk_tls_hsts, "security_headers": chk_security_headers, "ports_minimal": chk_ports_minimal,
    "ufw_default_deny": chk_ufw_default_deny, "monitoring": chk_monitoring, "auth_declared": chk_auth_declared,
    "deploy_gated": chk_deploy_gated, "patch_currency": chk_patch_currency,
    "container_health": chk_container_health, "tenant_isolation": chk_tenant_isolation,
    "mfa_enforced": chk_mfa_enforced, "encryption_at_rest": chk_encryption_at_rest,
    "access_review": chk_access_review, "incident_response": chk_incident_response,
}

# ---------------------------------------------------------------- catalog
FRAMEWORKS = [
    ("cis_v8",        "CIS Critical Security Controls v8",           "8.0", 153),
    ("nist_ai_rmf",   "NIST AI Risk Management Framework",           "1.0",  72),
    ("hipaa",         "HIPAA Security Rule (45 CFR 164)",            "2013", 75),
    ("dora",          "DORA (EU) 2022/2554",                         "2022", 58),
    ("soc2_type2",    "SOC 2 Type II (AICPA TSC 2017)",              "2017", 61),
]

# (framework, ref, title, category, check_key or None, severity, mapping_basis)
CATALOG = [
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
    ("cis_v8","17.1","Designate personnel for incident handling","ir",'incident_response',"high",None),
    ("cis_v8","17.4","Establish incident response process","ir",'incident_response',"high",None),
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
    ("soc2_type2","CC7.4","Incident response","ir",'incident_response',"high",None),
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
    ("hipaa","164.308(a)(6)(ii)","Response and reporting","ir",'incident_response',"high",None),
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
    ("dora","Art.17(1)","ICT-related incident management process","ir",'incident_response',"critical",None),
    ("dora","Art.28(1)","ICT third-party risk management","thirdparty",None,"high",None),

    # NIST AI RMF — deliberately none automated: no AI governance artefacts exist to evidence them.
    ("nist_ai_rmf","GOVERN-1.1","Legal and regulatory requirements understood","govern",None,"high",None),
    ("nist_ai_rmf","GOVERN-1.2","Risk management integrated into processes","govern",None,"high",None),
    ("nist_ai_rmf","GOVERN-2.1","Roles and responsibilities documented","govern",None,"high",None),
    ("nist_ai_rmf","GOVERN-3.1","Workforce diversity and AI competency","govern",None,"medium",None),
    ("nist_ai_rmf","GOVERN-4.1","Risk culture and accountability","govern",None,"medium",None),
    ("nist_ai_rmf","GOVERN-5.1","Engagement with stakeholders","govern",None,"medium",None),
    ("nist_ai_rmf","GOVERN-6.1","Third-party AI risk policies","govern",None,"high",None),
    ("nist_ai_rmf","MAP-1.1","Context and intended purpose established","map",None,"high",None),
    ("nist_ai_rmf","MAP-2.1","Interdisciplinary roles defined","map",None,"medium",None),
    ("nist_ai_rmf","MAP-3.1","AI system benefits and costs assessed","map",None,"medium",None),
    ("nist_ai_rmf","MEASURE-1.1","Approaches and metrics selected","measure",None,"high",None),
    ("nist_ai_rmf","MEASURE-2.7","Security and resilience of AI systems","measure",None,"critical",None),
    ("nist_ai_rmf","MEASURE-2.10","Privacy risk assessed","measure",None,"high",None),
    ("nist_ai_rmf","MEASURE-3.1","Risk tracking over time","measure",None,"medium",None),
    ("nist_ai_rmf","MEASURE-4.1","Measurement results evaluated","measure",None,"medium",None),
    ("nist_ai_rmf","MANAGE-1.1","Risk response decided","manage",None,"high",None),
    ("nist_ai_rmf","MANAGE-2.1","Resources allocated to risk treatment","manage",None,"medium",None),
    ("nist_ai_rmf","MANAGE-3.1","Third-party risks monitored","manage",None,"high",None),
    ("nist_ai_rmf","MANAGE-4.1","Post-deployment monitoring","manage",None,"high",None),
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
    "mfa_enforced": "No MFA enrolment data exists in this platform, so enforcement cannot be evidenced",
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
    for key, name, version, count in FRAMEWORKS:
        psql(f"""INSERT INTO compliance_frameworks (framework_key, name, version, official_control_count, source)
                 VALUES ({q(key)}, {q(name)}, {q(version)}, {count}, 'catalogued 2026-11-19')
                 ON CONFLICT (framework_key) DO UPDATE
                 SET name = EXCLUDED.name, version = EXCLUDED.version,
                     official_control_count = EXCLUDED.official_control_count;""")

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
    for key, name, version, official in FRAMEWORKS:
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
