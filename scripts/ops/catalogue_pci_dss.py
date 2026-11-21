"""PCI DSS v4.0.1 — twelve requirements, catalogued at requirement level, with scope determined.

THE SCOPE IS NOW A RECORD, NOT A GUESS. SCOPE-PCI-2026-11 (scripts/ops/scope_determinations.py, stored in
compliance_scope_determinations) determines that no cardholder data environment exists on infrastructure GDS controls:
card details are entered on Stripe's hosted checkout and never reach a GDS process, database, log or browser form. On
that determination requirements 1 to 11 are marked not_applicable with the record named as the reason, and only
requirement 12 — managing the third party that holds the data — is judged. It currently fails, because the payment
provider is named but neither a written agreement nor a review of its PCI attestation is recorded.

WHY NOTHING HERE IS MARKED PASS ON A TECHNICALITY. An earlier version of this file mapped no requirement at all,
because marking one "pass" on the strength of a host firewall would have invented a scope and then certified it. The
difference now is that the scope is written down, evidenced and dated, so not_applicable means "does not apply to this
architecture" rather than "nobody has looked".

This remains different from the ISO 27001 catalogue, where a control could be evidenced because it applies to the
platform whatever the business does.

VERIFICATION LIMIT, STATED PLAINLY. The PCI DSS v4.0.1 standard is published behind a click-through on
pcisecuritystandards.org and every direct PDF URL returns 404 or an HTML interstitial. The twelve requirement headings
below are the v4.0.1 wording as published in vendor summaries, not read out of the standard itself. Before any
external PCI claim, these titles and the sub-requirement numbering they refer to must be checked against the licensed
copy. Nothing here should be quoted to a QSA without that check.

Granularity: the twelve top-level requirements. The standard's ~250 sub-requirements are not catalogued, because
cataloguing them without a defined CDE would mean judging each one against a scope that does not exist.
"""

# (ref, title, category, check_key or None, severity, mapping_basis)

PCI_DSS = [
    ("1", "Install and Maintain Network Security Controls", "network", None, "critical",
     "Out of scope by determination SCOPE-PCI-2026-11: no cardholder data environment exists on GDS infrastructure. The host firewall is measured under NIS2 "
     "Art.21.2.d and ISO 8.20, but that evidences a host boundary, not network security controls around card data."),
    ("2", "Apply Secure Configurations to All System Components", "config", None, "high",
     "Out of scope by determination SCOPE-PCI-2026-11, and the capability is absent regardless: no configuration standard or baseline "
     "exists, so 2.2 could not be evidenced even inside a defined scope."),
    ("3", "Protect Stored Account Data", "data", None, "critical",
     "Out of scope by determination SCOPE-PCI-2026-11: the platform stores no account data, so there is nothing to protect "
     "under 3.x. That determination needs an owner-signed scope statement before it can be relied on."),
    ("4", "Protect Cardholder Data with Strong Cryptography During Transmission Over Open, Public Networks", "crypto",
     None, "critical",
     "Out of scope by determination SCOPE-PCI-2026-11. TLS on the public API is measured (HSTS, includeSubDomains, long max-age), but "
     "that is a transport control, not evidence that card data transmission is in scope and protected."),
    ("5", "Protect All Systems and Networks from Malicious Software", "endpoint", None, "high",
     "Out of scope by determination SCOPE-PCI-2026-11, and the capability is absent: no anti-malware or EDR agent runs on the host."),
    ("6", "Develop and Maintain Secure Systems and Software", "appsec", None, "critical",
     "Out of scope by determination SCOPE-PCI-2026-11. Patching is measured (6.3.3 shape) and currently fails with 9 pending security "
     "updates; 6.2 secure development and 6.4 payment-page requirements are not evidenced at all."),
    ("7", "Restrict Access to System Components and Cardholder Data by Business Need to Know", "access", None,
     "critical",
     "Out of scope by determination SCOPE-PCI-2026-11. Tenant separation and database least privilege are measured, but no role "
     "definition ties access to a business need, which is what 7.2 requires."),
    ("8", "Identify Users and Authenticate Access to System Components", "access", None, "critical",
     "Out of scope by determination SCOPE-PCI-2026-11. Unique identity and password hashing are measured and pass; MFA is measured and "
     "fails, so 8.4 would fail inside any scope."),
    ("9", "Restrict Physical Access to Cardholder Data", "operations", None, "high",
     "Out of scope by determination SCOPE-PCI-2026-11. The platform runs on a rented host and holds no physical access records."),
    ("10", "Log and Monitor All Access to System Components and Cardholder Data", "monitoring", None, "critical",
     "Out of scope by determination SCOPE-PCI-2026-11. Audit logging is measured and passes (10.2 shape); daily log review (10.4) is not "
     "measured and no review record exists."),
    ("11", "Test Security of Systems and Networks Regularly", "vulnerability", None, "critical",
     "Out of scope by determination SCOPE-PCI-2026-11, and the capability is largely absent: no ASV scan, no penetration test programme "
     "and no segmentation test has been performed. Container CVE watching is not an 11.3 assessment."),
    ("12", "Support Information Security with Organizational Policies and Programs", "governance",
     "tpsp_management", "high",
     "Applies by determination SCOPE-PCI-2026-11: outsourcing every cardholder data function does not outsource the "
     "obligation to manage the provider. Judged on the 12.8 shape - the provider is listed, bound by a recorded "
     "agreement, and reviewed against its PCI attestation annually - because that is the part of requirement 12 that "
     "survives outsourcing and that this platform can evidence. The wider policy and risk-assessment programme that "
     "requirement 12 also demands is not measured here, and this row does not claim it."),
]

CATALOGUE = [("pci_dss", ref, title, cat, check, sev, basis) for ref, title, cat, check, sev, basis in PCI_DSS]

# v4.0.1 has twelve top-level requirements. The sub-requirement count is deliberately not asserted here, because it
# has not been verified against the licensed standard.
OFFICIAL_REQUIREMENT_COUNT = 12
