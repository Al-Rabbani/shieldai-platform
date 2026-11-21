"""Scope determinations: the written decision that says what a compliance framework applies to.

PCI DSS could not be judged for one reason: nobody had ever decided whether any system here is in scope. Every
requirement sat at not_tested with the same sentence, which reads like a measurement problem but was a decision that
had not been taken. This module holds the decision, the evidence behind it, and the requirement-by-requirement
consequence, so the catalogue can report applicability instead of permanent uncertainty.

WHAT IS MEASURED AND WHAT IS DECIDED. The facts below were measured on the live platform on 21 November 2026 and each
one names its method. The decision drawn from them (no cardholder data environment exists on GDS infrastructure) is a
judgement on those facts, and it is the owner's to reverse. The record therefore separates `determined_by` (who
gathered the evidence) from `approved_by` (who accepted the scope), and carries a review date, because a scope that
nobody revisits is how an out-of-date determination becomes a false assurance.

THE HONEST LIMIT. SAQ A is the candidate track for a merchant that outsources every cardholder data function to a
PCI DSS validated third party. The definitive list of requirements SAQ A asks about lives in the SAQ A questionnaire,
which the PCI Council gates behind a click-through, so it has not been read here. Requirements 1 to 11 are marked not
applicable on the measured architecture, not on a reading of the SAQ, and that caveat travels with the record.
"""

from __future__ import annotations

# Requirement 12 stays applicable because it is the one obligation that survives outsourcing: managing the third party
# that holds the data. It is judged by the tpsp_management collector, which measures whether the payment provider is
# bound by a recorded agreement and reviewed against its PCI attestation.
PCI_APPLICABLE = ["12"]
PCI_NOT_APPLICABLE = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]

PCI_DETERMINATION = {
    "framework_key": "pci_dss",
    "determination_ref": "SCOPE-PCI-2026-11",
    "status": "approved",
    "cde_defined": False,
    "cde_summary": (
        "No cardholder data environment exists on infrastructure GDS controls. Card details are entered on Stripe's "
        "hosted checkout page and never reach a GDS process, database, log or browser form, so there is no system "
        "here that stores, processes or transmits account data. The CDE that matters to a cardholder is Stripe's, and "
        "GDS's PCI obligation is the outsourced-merchant track plus management of that third party."
    ),
    "chd_stored": False,
    "chd_processed": False,
    "chd_transmitted": False,
    "saq_track": "SAQ A (candidate: all cardholder data functions outsourced to a PCI DSS validated third party)",
    "systems_in_scope": [
        {"system": "Stripe hosted checkout (checkout.stripe.com)", "role": "the only place a card number is entered",
         "responsibility": "Stripe, as a PCI DSS validated third-party service provider"},
        {"system": "apps/api/gds_api/billing/service.py", "role": "creates the hosted session, receives webhooks",
         "responsibility": "GDS - holds Stripe identifiers and amounts only, never account data"},
    ],
    "systems_out_of_scope": [
        {"system": "gds_os PostgreSQL database", "reason": "no column in the public schema can hold a PAN, CVV or expiry"},
        {"system": "GDS web console (web/gds_app.html)", "reason": "no card input and no Stripe.js; checkout is a redirect"},
        {"system": "API logs", "reason": "no 13 to 19 digit sequence appears in the API log"},
        {"system": "billing_events webhook store", "reason": "12 stored events, none containing a card field"},
    ],
    "tpsp": [
        {
            "name": "Stripe",
            "service": "hosted checkout, card processing, subscriptions and invoices",
            "pci_status": "PCI DSS Level 1 service provider, as asserted by Stripe",
            "written_agreement_recorded": False,
            "attestation_reviewed_at": None,
        }
    ],
    "applicable_refs": PCI_APPLICABLE,
    "not_applicable_refs": PCI_NOT_APPLICABLE,
    "evidence": [
        {"method": "read apps/api/gds_api/billing/service.py",
         "result": "stripe.checkout.Session.create with payment_method_types=[\"card\"]; card entry happens on Stripe's "
                   "hosted page, and the platform receives a session id, not a card"},
        {"method": "grep console HTML for card inputs and js.stripe.com",
         "result": "no match: the console has no card field and never loads Stripe.js, so no card form is rendered "
                   "by GDS"},
        {"method": "information_schema.columns scan of the public schema for card, pan, cvv, cvc, expiry, last4, "
                   "track, emv and pin_block",
         "result": "only unrelated *_expires_at timestamps (sessions, tokens, suppressions); no column can hold "
                   "cardholder data"},
        {"method": "read billing_subscriptions and billing_payments definitions",
         "result": "hold stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_invoice_id, "
                   "stripe_charge_id, amounts, currency, status and invoice URLs; no PAN, no last4, no expiry"},
        {"method": "query the billing_events webhook payloads for card, last4, pan, cvv",
         "result": "12 events stored, 0 matching, so webhook payloads have not captured card fields either"},
        {"method": "scan /var/log/gds-api.log for 13 to 19 digit sequences",
         "result": "no match, so account numbers are not being logged"},
        {"method": "grep the API for card_number, cvv, pan, track2, emv_data",
         "result": "one hit, in the pentest scanner's list of sensitive field names it looks for; nothing stores "
                   "or handles them"},
    ],
    "caveats": [
        "SAQ A is a candidate track, not a confirmed one. The definitive requirement subset must be read from the "
        "licensed SAQ A questionnaire; requirements 1 to 11 are marked not applicable on the measured architecture, "
        "not on a reading of that document.",
        "The PCI DSS v4.0.1 requirement headings in catalogue_pci_dss.py came from published summaries because the "
        "standard is gated behind a click-through; they must be checked against the licensed copy before any "
        "attestation.",
        "Stripe's PCI DSS status is asserted by Stripe. No attestation of compliance has been obtained or reviewed, "
        "and no written agreement is recorded in the platform, which is why requirement 12 currently fails.",
        "The determination is about infrastructure GDS controls. If card entry ever moves onto a GDS-hosted page, or "
        "card data is stored for any reason, this determination is void and the full SAQ D scope applies.",
    ],
    "determined_by": "GDS Co-Pilot, from evidence measured on the live platform on 21 November 2026",
    "approved_by": "president@globaldigitalstreams.com",
    "approval_basis": (
        "Owner instructed the scope determination be resolved: \"let's fix this first [ the PCI scope determination ]\" "
        "(21 November 2026). The facts are measured; the scope decision is his to reverse, and reversing it means "
        "superseding this record rather than editing the verdicts."
    ),
    "review_due_at": "2027-11-21T00:00:00Z",
}

DETERMINATIONS = [PCI_DETERMINATION]


def validate(determination: dict) -> None:
    """Refuse to write a determination that cannot be acted on.

    Applicability has to be decidable and complete: every ref in exactly one list, no overlap, and a reason for the
    decision. A determination that leaves a requirement unclassified would put the catalogue back where it started,
    with a requirement nobody can judge and no explanation why.
    """
    applicable = list(determination.get("applicable_refs") or [])
    excluded = list(determination.get("not_applicable_refs") or [])
    if not applicable and not excluded:
        raise ValueError(f"{determination['determination_ref']}: no applicability recorded")
    overlap = sorted(set(applicable) & set(excluded))
    if overlap:
        raise ValueError(f"{determination['determination_ref']}: refs in both lists: {overlap}")
    if determination.get("status") == "approved":
        if not determination.get("approved_by") or not determination.get("approved_at"):
            raise ValueError(
                f"{determination['determination_ref']}: an approved determination must name its approver and the time"
            )
        if not determination.get("evidence"):
            raise ValueError(f"{determination['determination_ref']}: an approved determination must carry evidence")
        if not determination.get("review_due_at"):
            raise ValueError(f"{determination['determination_ref']}: an approved determination must carry a review date")
    for item in determination.get("evidence") or []:
        if not item.get("method") or not item.get("result"):
            raise ValueError(f"{determination['determination_ref']}: every evidence entry needs a method and a result")
