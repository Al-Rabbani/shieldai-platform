#!/usr/bin/env python3
"""
sync_builder_to_agent — PEA dual-DB sync skill v1.3
Reads builder Application records, creates/updates flat records in agent app.
Called every 5 minutes by the polling automation.

Field mapping (builder → agent):
  applicant_name         → applicant_name   (root level on both)
  applicant_email        → applicant_email
  founder.role           → applicant_role
  founder.phone          → phone_number
  founder.nationality    → nationality
  founder.date_of_birth  → date_of_birth
  founder.country_of_residence → country_of_residence
  founder.linkedin       → linkedin_url
  venture.company_name   → venture_name
  venture.stage          → venture_stage
  venture.sector         → venture_sector
  venture.one_liner      → venture_description
  venture.website        → website_url
  payment_reference      → stripe_session_id
  session_token          → invitation_token
  status / payment_status → same

SKIP logic: only skip explicitly flagged test subdomains, never broad keywords.
"""
import json, urllib.request, urllib.error, os, sys

BUILDER_APP = "69e2e852c48630e3502f13b1"
AGENT_APP   = "6a14246111a4fa5e22999619"
BASE_URL    = "https://app.base44.com/api/apps"
UA          = "Mozilla/5.0 (compatible; PEA-Sync/1.3)"

# Only skip known internal test email subdomains
SKIP_EMAIL_FRAGMENTS = ["probe.invalid", "logtest.", "schema.test.", "peaverify.test"]
# Skip by reference_code prefix
SKIP_REF_PREFIXES    = ["TEST-BUILDER", "TEST-AGENT"]

def api(method, app_id, path, data=None, token=""):
    url  = f"{BASE_URL}/{app_id}/{path}"
    body = json.dumps(data).encode() if data else None
    req  = urllib.request.Request(url, data=body, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type":  "application/json",
        "User-Agent":    UA,
        "Accept":        "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise Exception(f"HTTP {e.code}: {e.read().decode()[:300]}")

def should_skip(ref, email):
    ref_up = (ref   or "").upper()
    em_low = (email or "").lower()
    if any(ref_up.startswith(p) for p in SKIP_REF_PREFIXES):
        return True
    if any(s in em_low for s in SKIP_EMAIL_FRAGMENTS):
        return True
    return False

def nonempty(*vals):
    """Return first non-None, non-empty value."""
    for v in vals:
        if v not in (None, "", 0):
            return v
    return None

def main():
    token = os.environ.get("BASE44_SERVICE_TOKEN", "")
    if not token:
        print("ERROR: BASE44_SERVICE_TOKEN not set"); sys.exit(1)

    builder_recs = api("GET", BUILDER_APP, "entities/Application", token=token)
    agent_recs   = api("GET", AGENT_APP,   "entities/Application", token=token)
    agent_index  = {a["reference_code"]: a for a in agent_recs if a.get("reference_code")}

    prod = [a for a in builder_recs
            if a.get("reference_code")
            and not should_skip(a.get("reference_code"), a.get("applicant_email"))]

    print(f"Builder production records: {len(prod)} | Agent records: {len(agent_recs)}")

    created = updated = skipped = 0

    for a in prod:
        ref = a["reference_code"]
        f   = a.get("founder") or {}
        v   = a.get("venture") or {}
        ex  = agent_index.get(ref)  # existing agent record if any

        # Build flat record — prefer builder nested fields, fall back to agent's existing
        # values for fields the old registration path never collected
        ex_nat   = (ex or {}).get("nationality",       "")
        ex_phone = (ex or {}).get("phone_number",      "")
        ex_dob   = (ex or {}).get("date_of_birth",     None)
        ex_li    = (ex or {}).get("linkedin_url",      "")
        ex_cor   = (ex or {}).get("country_of_residence", "")

        flat = {
            "reference_code":       ref,
            "status":               a.get("status", "submitted"),
            "payment_status":       a.get("payment_status", "pending"),
            "applicant_name":       a.get("applicant_name") or f.get("full_name", ""),
            "applicant_email":      a.get("applicant_email", ""),
            "applicant_role":       nonempty(f.get("role"), "Founder"),
            "date_of_birth":        nonempty(f.get("date_of_birth"), ex_dob),
            "phone_number":         nonempty(f.get("phone"), ex_phone, ""),
            "nationality":          nonempty(f.get("nationality"), ex_nat, ""),
            "country_of_residence": nonempty(f.get("country_of_residence"), ex_cor, v.get("headquarters"), ""),
            "linkedin_url":         nonempty(f.get("linkedin"), ex_li, ""),
            "website_url":          v.get("website") or "",
            "venture_name":         v.get("company_name") or "",
            "venture_stage":        v.get("stage") or "",
            "venture_sector":       v.get("sector") or "",
            "venture_description":  v.get("one_liner") or "",
            "co_founder_name":      "",
            "co_founder_email":     "",
            "declaration_agreed":   True,
            "documents_submitted":  False,
            "submitted_at":         a.get("submitted_at") or a.get("created_date"),
            "invitation_token":     a.get("session_token"),
            "stripe_session_id":    a.get("payment_reference"),
            "ai_score":             a.get("ai_score"),
        }

        if not ex:
            # Create new flat record
            result = api("POST", AGENT_APP, "entities/Application", data=flat, token=token)
            print(f"  CREATED  {ref} → agent id={result.get('id','?')}")
            print(f"    name={flat['applicant_name']} | venture={flat['venture_name']}")
            print(f"    nat={flat['nationality']} | phone={flat['phone_number']} | stripe={bool(flat['stripe_session_id'])}")
            created += 1
        else:
            # Update if any key field has changed or gained a value
            needs = (
                ex.get("status")               != flat["status"]              or
                ex.get("payment_status")       != flat["payment_status"]      or
                (flat.get("stripe_session_id") and not ex.get("stripe_session_id")) or
                (flat.get("phone_number")      and not ex.get("phone_number"))      or
                (flat.get("nationality")       and not ex.get("nationality"))       or
                (flat.get("date_of_birth")     and not ex.get("date_of_birth"))     or
                (flat.get("venture_name")      and ex.get("venture_name") != flat["venture_name"]) or
                (flat.get("venture_sector")    and ex.get("venture_sector") != flat["venture_sector"]) or
                (flat.get("country_of_residence") and not ex.get("country_of_residence"))
            )
            if needs:
                patch = {k: flat[k] for k in [
                    "status", "payment_status", "stripe_session_id",
                    "phone_number", "nationality", "country_of_residence",
                    "linkedin_url", "venture_name", "venture_stage",
                    "venture_sector", "venture_description", "website_url",
                    "date_of_birth", "applicant_role", "invitation_token",
                ] if flat.get(k) not in (None, "")}
                api("PUT", AGENT_APP, f"entities/Application/{ex['id']}", data=patch, token=token)
                print(f"  UPDATED  {ref} — status={flat['status']} | pay={flat['payment_status']} | nat={flat['nationality']} | venture={flat['venture_name']}")
                updated += 1
            else:
                print(f"  SKIP     {ref} — already in sync")
                skipped += 1

    print(f"\nSync complete — created={created} updated={updated} skipped={skipped} | total={len(prod)}")
    return created, updated

if __name__ == "__main__":
    main()
