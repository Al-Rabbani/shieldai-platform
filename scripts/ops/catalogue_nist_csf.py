"""NIST Cybersecurity Framework 2.0 — the operational subcategories this platform can answer for.

Reference set: the CSF 2.0 Core as published in NIST CSWP 29. Subcategory identifiers and their wording were extracted
from that publication on 21 Nov 2026 (pdftotext of nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf), giving 106
subcategories across 22 categories, and the per-category membership was cross-checked against an independent mirror of
the framework (csf.tools), which agrees on every category checked.

WHY 67 OF 106. This file catalogues the operational subcategories: all of Identify-Asset (7), Identify-Risk Assessment
(10), Protect (22), Detect (11), Respond (13) and Recover-Recovery Plan (6). The Govern function (31) and Identify-
Improvement (4) are not catalogued, and neither is Protect-Awareness and Training (2) or Recover-Communication (2),
because they are governance, workforce and communication artefacts: policies, oversight records, training completion,
stakeholder notification logs. GDS OS holds none of them, and a row that says "not evidenced" 39 times is a document
pretending to be an assessment.

A subcategory is mapped to a collector ONLY where the collector genuinely measures it. Eighteen are mapped; the other
forty-nine state which artefact is missing. Nothing here is marked passing by default.
"""

# (ref, title, category, check_key or None, severity, mapping_basis)

_ID_AM = [
    ("ID.AM-01", "Inventories of hardware managed by the organization are maintained", "inventory",
     "asset_inventory", "high",
     "cloud_assets holds every discovered resource per provider with a last-seen time, so the inventory is the "
     "measured table rather than a claim about one."),
    ("ID.AM-02", "Inventories of software, services, and systems managed by the organization are maintained",
     "inventory", None, "high",
     "Not evidenced: there is no software or service inventory. Container images are scanned but not catalogued as "
     "an asset register."),
    ("ID.AM-03", "Representations of the organization's authorized network communication and internal and external "
     "network data flows are maintained", "network", None, "medium",
     "Not evidenced: no data-flow map exists. The firewall rule set shows what is allowed, not what communicates."),
    ("ID.AM-04", "Inventories of services provided by suppliers are maintained", "inventory", None, "medium",
     "Not evidenced: no supplier or third-party service register exists."),
    ("ID.AM-05", "Assets are prioritized based on classification, criticality, resources, and impact on the mission",
     "inventory", None, "high",
     "Not evidenced: assets carry no classification or criticality score, so nothing can be prioritised by it."),
    ("ID.AM-07", "Inventories of data and corresponding metadata for designated data types are maintained",
     "inventory", None, "high",
     "Not evidenced: no data inventory or classification scheme exists. Table definitions are not a data catalogue."),
    ("ID.AM-08", "Systems, hardware, software, services, and data are managed throughout their life cycles",
     "inventory", None, "medium",
     "Not evidenced: no lifecycle records exist, including no end-of-life tracking."),
]

_ID_RA = [
    ("ID.RA-01", "Vulnerabilities in assets are identified, validated, and recorded", "vulnerability", None, "critical",
     "Not evidenced by a collector: 1,002 findings are recorded and 18 controls read that register, but nothing "
     "asserts that findings are validated rather than merely stored."),
    ("ID.RA-02", "Cyber threat intelligence is received from information sharing forums and sources", "vulnerability",
     None, "high",
     "Not evidenced: OSV, CISA KEV and EPSS are queried, but no control measures that the feeds are current."),
    ("ID.RA-03", "Internal and external threats to the organization are identified and recorded", "risk", None, "high",
     "Not evidenced: no threat register exists."),
    ("ID.RA-04", "Potential impacts and likelihoods of threats exploiting vulnerabilities are identified and recorded",
     "risk", None, "high",
     "Not evidenced: findings carry severity and EPSS but no recorded business impact or likelihood."),
    ("ID.RA-05", "Threats, vulnerabilities, likelihoods, and impacts are used to understand inherent risk and inform "
     "risk response prioritization", "risk", None, "high",
     "Not evidenced: no inherent-risk model exists. Severity bands are not a risk calculation."),
    ("ID.RA-06", "Risk responses are chosen, prioritized, planned, tracked, and communicated", "risk", None, "high",
     "Not evidenced: no risk treatment plan is recorded."),
    ("ID.RA-07", "Changes and exceptions are managed, assessed for risk impact, recorded, and tracked", "risk", None,
     "high",
     "Not evidenced: accepted-risk records exist, but nothing assesses the risk impact of a change before it ships."),
    ("ID.RA-08", "Processes for receiving, analyzing, and responding to vulnerability disclosures are established",
     "vulnerability", None, "high",
     "Not evidenced: no disclosure handling process is documented."),
    ("ID.RA-09", "The authenticity and integrity of hardware and software are assessed prior to acquisition and use",
     "supplychain", None, "high",
     "Not evidenced: images are not signature-verified before use."),
    ("ID.RA-10", "Critical suppliers are assessed prior to acquisition", "supplychain", None, "high",
     "Not evidenced: no supplier assessment is recorded for any dependency, including the cloud provider."),
]

_PR_AA = [
    ("PR.AA-01", "Identities and credentials for authorized users, services, and hardware are managed by the "
     "organization", "access", "unique_user_identity", "high",
     "Every account carries a unique email identifier and none is blank, so no two accounts are the same principal."),
    ("PR.AA-02", "Identities are proofed and bound to credentials based on the context of interactions", "access",
     None, "high",
     "Not evidenced: there is no identity proofing step; an invited email address is accepted as the identity."),
    ("PR.AA-03", "Users, services, and hardware are authenticated", "access", "auth_declared", "critical",
     "Every published OpenAPI operation declares a security scheme, so no endpoint ships unauthenticated by "
     "omission."),
    ("PR.AA-04", "Identity assertions are protected, conveyed, and verified", "access", None, "high",
     "Not evidenced: tokens are signed and validated in code, but no control asserts the validation, so a "
     "verification bypass would not be caught here."),
    ("PR.AA-05", "Access permissions, entitlements, and authorizations are defined in a policy, managed, enforced, and "
     "reviewed, and incorporate the principles of least privilege and separation of duties", "access",
     "access_review", "critical",
     "Measures whether standing access has actually been re-justified: completed reviews in the last 90 days and "
     "undecided review items."),
    ("PR.AA-06", "Physical access to assets is managed, monitored, and enforced commensurate with risk", "access",
     None, "medium",
     "Not evidenced: the platform runs on a rented host and holds no physical access records."),
]

_PR_DS = [
    ("PR.DS-01", "The confidentiality, integrity, and availability of data-at-rest are protected", "data",
     "encryption_at_rest", "critical",
     "Measures volume encryption from the host's own block devices. It fails while the database volume is plain "
     "ext4."),
    ("PR.DS-02", "The confidentiality, integrity, and availability of data-in-transit are protected", "crypto",
     "tls_hsts", "critical",
     "HSTS with includeSubDomains and a long max-age on the public API evidences enforced encryption in transit."),
    ("PR.DS-10", "The confidentiality, integrity, and availability of data-in-use are protected", "data", None,
     "medium",
     "Not evidenced: no memory-protection or confidential-computing control exists."),
    ("PR.DS-11", "Backups of data are created, protected, maintained, and tested", "continuity",
     "backup_restore_tested", "critical",
     "A restore has been rehearsed from the recorded dump and the hash matched, so the backup is tested rather than "
     "assumed."),
]

_PR_PS = [
    ("PR.PS-01", "Configuration management practices are established and applied", "config", None, "high",
     "Not evidenced: no configuration baseline is recorded, so drift cannot be detected. Deploys are gated, which is "
     "a change control, not a configuration baseline."),
    ("PR.PS-02", "Software is maintained, replaced, and removed commensurate with risk", "vulnerability",
     "patch_currency", "critical",
     "Measures pending package updates from the host's own package state, including how many are security updates."),
    ("PR.PS-03", "Hardware is maintained, replaced, and removed commensurate with risk", "operations", None, "medium",
     "Not evidenced: hardware lifecycle is the hosting provider's responsibility and is not tracked here."),
    ("PR.PS-04", "Log records are generated and made available for continuous monitoring", "monitoring", "audit_log",
     "critical",
     "Measures the audit trail itself: whether events are being written and how stale the newest one is."),
    ("PR.PS-05", "Installation and execution of unauthorized software are prevented", "config", None, "high",
     "Not evidenced: nothing restricts what may be installed or executed on the host."),
    ("PR.PS-06", "Secure software development practices are integrated, and their performance is monitored throughout "
     "the software development life cycle", "appsec", None, "high",
     "Not evidenced: no secure development life cycle is documented or measured."),
]

_PR_IR = [
    ("PR.IR-01", "Networks and environments are protected from unauthorized logical access and usage", "network",
     "ufw_default_deny", "critical",
     "The host firewall defaults to deny incoming, measured from the live rule set."),
    ("PR.IR-02", "The organization's technology assets are protected from environmental threats", "operations", None,
     "low",
     "Not evidenced: environmental protection is the hosting provider's responsibility and is not evidenced here."),
    ("PR.IR-03", "Mechanisms are implemented to achieve resilience requirements in normal and adverse situations",
     "continuity", "backup_offhost", "high",
     "A recent encrypted copy held at a second provider is an isolated copy, so recovery does not depend on the host "
     "surviving."),
    ("PR.IR-04", "Adequate resource capacity to ensure availability is maintained", "operations", None, "medium",
     "Not evidenced: capacity is watched by hand and by Prometheus, but no control asserts a threshold or a response."),
]

_DE_CM = [
    ("DE.CM-01", "Networks and network services are monitored to find potentially adverse events", "monitoring",
     "monitoring", "critical",
     "Measures whether monitoring exists and is scraping live targets, rather than a dashboard nobody reads."),
    ("DE.CM-02", "The physical environment is monitored to find potentially adverse events", "monitoring", None,
     "low",
     "Not evidenced: no physical monitoring exists in a rented host."),
    ("DE.CM-03", "Personnel activity and technology usage are monitored to find potentially adverse events",
     "monitoring", None, "medium",
     "Not evidenced: user activity is logged through the audit trail but not analysed for anomalies."),
    ("DE.CM-06", "External service provider activities and services are monitored to find potentially adverse events",
     "monitoring", None, "medium",
     "Not evidenced: no third-party service monitoring exists."),
    ("DE.CM-09", "Computing hardware and software, runtime environments, and their data are monitored to find "
     "potentially adverse events", "monitoring", "container_health", "high",
     "Every running container reporting healthy, or covered by the host watchdog, evidences runtime monitoring."),
]

_DE_AE = [
    ("DE.AE-02", "Potentially adverse events are analyzed to better understand associated activities", "incident",
     None, "high",
     "Not evidenced: alerts are raised, but no analysis record states what activity was associated with them."),
    ("DE.AE-03", "Information is correlated from multiple sources", "incident", None, "high",
     "Not evidenced: no correlation rule set is recorded as an artefact, so correlation cannot be evidenced."),
    ("DE.AE-04", "The estimated impact and scope of adverse events are understood", "incident", None, "high",
     "Not evidenced: incidents carry no impact assessment field that any control reads."),
    ("DE.AE-06", "Information on adverse events is provided to authorized staff and tools", "incident", None, "medium",
     "Not evidenced: notifications are delivered, but no control asserts that the right staff receive them."),
    ("DE.AE-07", "Cyber threat intelligence and other contextual information are integrated into the analysis",
     "incident", None, "medium",
     "Not evidenced: threat intel is ingested but not joined to event analysis."),
    ("DE.AE-08", "Incidents are declared when adverse events meet the defined incident criteria", "incident",
     "incident_register", "high",
     "Measures the incident register: whether incidents are recorded, contained and closed with times attached."),
]

_RS_MA = [
    ("RS.MA-01", "The incident response plan is executed in coordination with relevant third parties once an incident "
     "is declared", "incident", "incident_response_plan", "high",
     "A response plan is versioned in the repository and incidents are recorded, so the plan has somewhere to be "
     "exercised."),
    ("RS.MA-02", "Incident reports are triaged and validated", "incident", "incident_severity", "high",
     "Measures whether recorded events carry a severity from a fixed classification, which is the triage decision."),
    ("RS.MA-03", "Incidents are categorized and prioritized", "incident", None, "high",
     "Not evidenced: incidents carry a severity but no separate category or priority that any control reads."),
    ("RS.MA-04", "Incidents are escalated or elevated as needed", "incident", None, "high",
     "Not evidenced: escalation exists for findings, not for incidents."),
    ("RS.MA-05", "The criteria for initiating incident recovery are applied", "incident", None, "medium",
     "Not evidenced: no recovery-initiation criteria are documented."),
]

_RS_AN = [
    ("RS.AN-03", "Analysis is performed to establish what has taken place during an incident and the root cause of "
     "the incident", "incident", None, "high",
     "Not evidenced: a root_cause field exists on incidents and nothing measures whether it is filled in."),
    ("RS.AN-06", "Actions performed during an investigation are recorded, and the records' integrity and provenance "
     "are preserved", "incident", None, "medium",
     "Not evidenced: no investigation record exists."),
    ("RS.AN-07", "Incident data and metadata are collected, and their integrity and provenance are preserved",
     "incident", None, "high",
     "Not evidenced: evidence tables with hashes exist, but no control asserts that incident evidence is collected."),
    ("RS.AN-08", "An incident's magnitude is estimated and validated", "incident", None, "medium",
     "Not evidenced: no magnitude estimate is recorded per incident."),
]

_RS_CO = [
    ("RS.CO-02", "Internal and external stakeholders are notified of incidents", "incident", "incident_reporting",
     "critical",
     "Measures whether a regulatory notification procedure exists and has been exercised, not whether one is "
     "intended."),
    ("RS.CO-03", "Information is shared with designated internal and external stakeholders", "incident", None,
     "medium",
     "Not evidenced: no stakeholder notification log exists."),
]

_RS_MI = [
    ("RS.MI-01", "Incidents are contained", "incident", None, "high",
     "Not evidenced: containment actions are not recorded as a step with a time, so containment cannot be shown."),
    ("RS.MI-02", "Incidents are eradicated", "incident", None, "high",
     "Not evidenced: eradication is not recorded separately from closure."),
]

_RC_RP = [
    ("RC.RP-01", "The recovery portion of the incident response plan is executed once initiated from the incident "
     "response process", "continuity", None, "high",
     "Not evidenced: recovery has never been executed against a real incident, only rehearsed."),
    ("RC.RP-02", "Recovery actions are selected, scoped, prioritized, and performed", "continuity", None, "medium",
     "Not evidenced: no recovery action log exists."),
    ("RC.RP-03", "The integrity of backups and other restoration assets is verified before using them for restoration",
     "continuity", "backup_restore_tested", "critical",
     "The restore drill verifies the dump's sha256 before restoring, so integrity is checked before use rather than "
     "assumed."),
    ("RC.RP-04", "Critical mission functions and cybersecurity risk management are considered to establish "
     "post-incident operational norms", "continuity", None, "medium",
     "Not evidenced: no post-incident baseline exists."),
    ("RC.RP-05", "The integrity of restored assets is verified, systems and services are restored, and normal "
     "operating status is confirmed", "continuity", None, "high",
     "Not evidenced: the drill restores to a scratch instance; restoration of production has never been exercised."),
    ("RC.RP-06", "The end of incident recovery is declared based on criteria, and incident-related documentation is "
     "completed", "continuity", None, "medium",
     "Not evidenced: no recovery completion criteria or declaration record exists."),
]

NIST_CSF = (
    _ID_AM + _ID_RA + _PR_AA + _PR_DS + _PR_PS + _PR_IR + _DE_CM + _DE_AE + _RS_MA + _RS_AN + _RS_CO + _RS_MI + _RC_RP
)

CATALOGUE = [("nist_csf", ref, title, cat, check, sev, basis) for ref, title, cat, check, sev, basis in NIST_CSF]

# Published structure, so a test can assert this file has not drifted from the framework.
FUNCTIONS = {"GV": 31, "ID": 21, "PR": 22, "DE": 11, "RS": 13, "RC": 8}
OFFICIAL_SUBCATEGORY_COUNT = sum(FUNCTIONS.values())  # 106
