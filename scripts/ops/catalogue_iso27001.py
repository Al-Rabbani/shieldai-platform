"""ISO/IEC 27001:2022 Annex A — the controls this platform can actually evidence or explain.

WHY THIS IS A PARTIAL CATALOGUE AND SAYS SO. Annex A holds 93 controls: 37 organisational (5.1-5.37), 8 people
(6.1-6.8), 14 physical (7.1-7.14) and 34 technological (8.1-8.34). This file catalogues 45 of them: every technological
control, plus the access and incident/continuity organisational controls that the platform's own operation can answer
for. The remaining 48 are not catalogued at all rather than catalogued and left blank, because a row with no evidence
and no reason reads exactly like a control somebody assessed.

The people and physical themes are deliberately absent. GDS OS runs on a rented host in a data centre: it holds no
records of screening, disciplinary process, secure areas, cabling or equipment disposal, and inventing a basis for
them would be inventing a control environment that does not exist.

Reference set and titles follow the published Annex A structure. Control numbering, the theme boundaries and the
per-theme counts were checked against published reproductions of the standard on 21 Nov 2026 (isms.online and
advisera both give 93 controls across 5.1-5.37, 6.1-6.8, 7.1-7.14 and 8.1-8.34). The titles below are the Annex A
control names, not ISO 27002 implementation guidance.

A control is mapped to a collector ONLY where that collector genuinely evidences it. Where it is mapped, the basis
says what the collector measures. Where it is not, the basis says which artefact is missing. Nothing here is marked
passing by default: the collectors run against live data on every assessment.
"""

# (framework, ref, title, category, check_key or None, severity, mapping_basis)

_ACCESS = [
    ("5.15", "Access control", "access", None, "high",
     "Not evidenced: needs a documented access control policy stating the rules. Enforcement of the one rule that "
     "matters most here - tenant separation - is measured under 8.3."),
    ("5.16", "Identity management", "access", "unique_user_identity", "high",
     "Every account carries a unique email identifier and none is blank, so no two accounts are the same principal."),
    ("5.17", "Authentication information", "access", "password_hashing", "high",
     "Every account holds a distinct one-way bcrypt hash and none is stored in a recoverable form."),
    ("5.18", "Access rights", "access", "access_review", "high",
     "Measures whether standing access has actually been re-justified: completed reviews in the last 90 days and "
     "undecided review items."),
]

_INCIDENT = [
    ("5.24", "Information security incident management planning and preparation", "incident",
     "incident_response_plan", "high",
     "A response plan is versioned in the repository and incidents are recorded in the system, so the plan has "
     "somewhere to be exercised."),
    ("5.25", "Assessment and decision on information security events", "incident",
     "incident_severity", "high",
     "Measures whether recorded events carry a severity, which is the decision this control requires."),
    ("5.26", "Response to information security incidents", "incident", "incident_register", "high",
     "Measures the incident register: whether incidents are recorded, contained and closed with times attached."),
    ("5.27", "Learning from information security incidents", "incident", None, "medium",
     "Not evidenced: the incidents table carries a lessons_learned field, but nothing measures whether it is filled "
     "in, and no collector exists for it."),
    ("5.28", "Collection of evidence", "incident", None, "medium",
     "Not evidenced: chain-of-custody tables exist but no control evidences that evidence is collected to a "
     "defined standard."),
    ("5.29", "Information security during disruption", "continuity", None, "high",
     "Not evidenced: needs a plan for operating securely while disrupted. Backup existence is measured under 8.13 "
     "and restore under 5.30, which is not the same claim."),
    ("5.30", "ICT readiness for business continuity", "continuity", "backup_restore_tested", "critical",
     "A restore has been rehearsed from the recorded dump and the hash matched, so readiness is demonstrated rather "
     "than asserted."),
]

_TECHNOLOGICAL = [
    ("8.1", "User endpoint devices", "endpoint", None, "medium",
     "Not evidenced: no endpoint management exists for the workstations that reach the console."),
    ("8.2", "Privileged access rights", "access", "least_priv_db", "critical",
     "Measures whether the application's own database roles hold superuser or BYPASSRLS, which would make every "
     "row-level policy theatre."),
    ("8.3", "Information access restriction", "access", "tenant_isolation", "critical",
     "An unbound tenant read returns zero rows across every tenant table, and a synthetic tenant that owns nothing "
     "sees nothing."),
    ("8.4", "Access to source code", "appsec", None, "high",
     "Not evidenced: repository access is not reviewed by any control here."),
    ("8.5", "Secure authentication", "access", "mfa_enforced", "critical",
     "Measures MFA enforcement across accounts. It fails while accounts can authenticate without a second factor."),
    ("8.6", "Capacity management", "operations", None, "medium",
     "Not evidenced: capacity is watched by hand and by Prometheus, but no control asserts a threshold or a "
     "response."),
    ("8.7", "Protection against malware", "endpoint", None, "high",
     "Not evidenced: no anti-malware or EDR agent runs on the host. Container image scanning is a different "
     "control (8.8)."),
    ("8.8", "Management of technical vulnerabilities", "vulnerability", "patch_currency", "critical",
     "Measures whether the running system is current with security patches, from the package state rather than a "
     "policy document."),
    ("8.9", "Configuration management", "config", None, "high",
     "Not evidenced: no configuration baseline is recorded, so drift cannot be detected. Deploys are gated, which "
     "is a different control (8.32)."),
    ("8.10", "Information deletion", "data", None, "medium",
     "Not evidenced: retention rules exist as table definitions but no control evidences that data is actually "
     "deleted on schedule."),
    ("8.11", "Data masking", "data", None, "medium",
     "Not evidenced: capability inputs are redacted in the broker, but no control measures masking of stored data."),
    ("8.12", "Data leakage prevention", "data", None, "high",
     "Not evidenced: no DLP control exists. Secret scanning is not DLP."),
    ("8.13", "Information backup", "continuity", "backup_automated", "critical",
     "A scheduled backup exists and the newest dump is recent, so backups are produced without a human."),
    ("8.14", "Redundancy of information processing facilities", "continuity", None, "high",
     "Not evidenced: the platform runs on a single host. There is no redundancy and no control should imply it."),
    ("8.15", "Logging", "monitoring", "audit_log", "critical",
     "Measures the audit trail itself: whether events are being written and how stale the newest one is."),
    ("8.16", "Monitoring activities", "monitoring", "monitoring", "critical",
     "Measures whether monitoring exists and is wired to something that reacts, rather than a dashboard nobody "
     "reads."),
    ("8.17", "Clock synchronization", "operations", None, "medium",
     "Not evidenced: the host synchronises time, but no control asserts it, so an audit trail's ordering rests on "
     "an unmeasured assumption."),
    ("8.18", "Use of privileged utility programs", "access", None, "medium",
     "Not evidenced: privileged utilities are not inventoried or restricted by any control."),
    ("8.19", "Installation of software on operational systems", "config", None, "high",
     "Not evidenced: no control restricts what may be installed on the host. Deployment is gated (8.32) but "
     "installation is not."),
    ("8.20", "Networks security", "network", "ufw_default_deny", "critical",
     "The host firewall defaults to deny incoming, measured from the live rule set."),
    ("8.21", "Security of network services", "network", "ports_minimal", "high",
     "Measures which ports are actually reachable from the internet, not which ones a document says should be."),
    ("8.22", "Segregation of networks", "network", None, "high",
     "Not evidenced: everything runs on one host network with no segmentation between the API, the databases and "
     "the workers."),
    ("8.23", "Web filtering", "network", None, "low",
     "Not evidenced: no egress filtering exists for the host or for users."),
    ("8.24", "Use of cryptography", "crypto", None, "high",
     "Not evidenced as a whole: cryptography in transit is measured under NIS2 Art.21.2.h and encryption at rest "
     "under HIPAA 164.312(a)(2)(iv). This control is left unmapped rather than claiming either half twice."),
    ("8.25", "Secure development life cycle", "appsec", None, "high",
     "Not evidenced: no documented secure development life cycle exists."),
    ("8.26", "Application security requirements", "appsec", None, "high",
     "Not evidenced: no requirements artefact states application security requirements."),
    ("8.27", "Secure system architecture and engineering principles", "appsec", None, "high",
     "Not evidenced: architecture principles are not written down as a controlled document."),
    ("8.28", "Secure coding", "appsec", None, "high",
     "Not evidenced: SAST runs, but no control evidences that secure coding standards exist or are applied."),
    ("8.29", "Security testing in development and acceptance", "appsec", None, "high",
     "Not evidenced: no acceptance security testing gate exists in the pipeline."),
    ("8.30", "Outsourced development", "appsec", None, "medium",
     "Not evidenced: no outsourced development takes place, and no control records that determination."),
    ("8.31", "Separation of development, test and production environments", "config", None, "high",
     "Not evidenced: one host serves production; no separate test environment is recorded."),
    ("8.32", "Change management", "config", "deploy_gated", "high",
     "Deploys refuse a dirty tree, run migrations, restart, smoke test and roll back on failure, so change is "
     "controlled by the pipeline rather than by intention."),
    ("8.33", "Test information", "data", None, "medium",
     "Not evidenced: no control governs the use of production data in testing, because there is no test "
     "environment to govern."),
    ("8.34", "Protection of information systems during audit testing", "operations", None, "medium",
     "Not evidenced: no control limits the impact of audit or assessment activity on live systems."),
]

ISO27001 = (
    [(ref, title, cat, check, sev, basis) for ref, title, cat, check, sev, basis in _ACCESS]
    + [(ref, title, cat, check, sev, basis) for ref, title, cat, check, sev, basis in _INCIDENT]
    + [(ref, title, cat, check, sev, basis) for ref, title, cat, check, sev, basis in _TECHNOLOGICAL]
)

CATALOGUE = [("iso27001", ref, title, cat, check, sev, basis)
             for ref, title, cat, check, sev, basis in ISO27001]

# The standard's own structure, so a test can assert this file has not drifted from it.
THEMES = {
    "5": ("Organizational", 37),
    "6": ("People", 8),
    "7": ("Physical", 14),
    "8": ("Technological", 34),
}
OFFICIAL_CONTROL_COUNT = sum(count for _, count in THEMES.values())  # 93
