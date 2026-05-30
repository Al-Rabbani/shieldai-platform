#!/usr/bin/env python3
"""
sync_builder_to_agent — PEA dual-DB sync skill v1.2
Reads builder Application records, creates/updates flat records in agent app.
Called every 5 minutes by the polling automation.

SKIP logic: only skip explicitly flagged test domains — NOT the word "invalid"
which would catch @peaverify.invalid test emails.
"""
import json, urllib.request, urllib.error, os, sys

BUILDER_APP = "69e2e852c48630e3502f13b1"
AGENT_APP   = "6a14246111a4fa5e22999619"
BASE_URL    = "https://app.base44.com/api/apps"
UA          = "Mozilla/5.0 (compatible; PEA-Sync/1.2)"

# Skip test records by reference_code prefix patterns (not email domain)
SKIP_REFS   = ["TEST-BUILDER", "TEST-AGENT"]
# Skip known internal test email subdomains
SKIP_EMAILS = ["probe.invalid", "logtest.", "schema.test."]

def api(method, app_id, path, data=None, token=""):
    url  = f"{BASE_URL}/{app_id}/{path}"
    body = json.dumps(data).encode() if data else None
    req  = urllib.request.Request(url, data=body, method=method, headers={
        "Authorization":  f"Bearer {token}",
        "Content-Type":   "application/json",
        "User-Agent":     UA,
        "Accept":         "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise Exception(f"HTTP {e.code}: {e.read().decode()[:300]}")

def should_skip(ref, email):
    ref_up = (ref or "").upper()
    em_low = (email or "").lower()
    if any(ref_up.startswith(s) for s in SKIP_REFS):
        return True
    if any(s in em_low for s in SKIP_EMAILS):
        return True
    return False

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

    created = updated = skipped = 0

    for a in prod:
        ref = a["reference_code"]
        f   = a.get("founder") or {}
        v   = a.get("venture") or {}

        flat = {
            "reference_code":       ref,
            "status":               a.get("status", "submitted"),
            "payment_status":       a.get("payment_status", "pending"),
            "applicant_name":       a.get("applicant_name", ""),
            "applicant_email":      a.get("applicant_email", ""),
            "applicant_role":       f.get("role") or "Founder",
            "date_of_birth":        f.get("date_of_birth"),
            "phone_number":         f.get("phone") or "",
            "nationality":          f.get("nationality") or "",
            "country_of_residence": f.get("country_of_residence") or "",
            "linkedin_url":         f.get("linkedin") or "",
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

        if ref not in agent_index:
            result = api("POST", AGENT_APP, "entities/Application", data=flat, token=token)
            print(f"  CREATED  {ref} → agent id={result.get('id','?')}")
            print(f"    name={flat.get('applicant_name')} | venture={flat.get('venture_name')}")
            print(f"    nat={flat.get('nationality')} | phone={flat.get('phone_number')} | stripe={bool(flat.get('stripe_session_id'))}")
            created += 1
        else:
            ex = agent_index[ref]
            needs = (
                ex.get("status")         != flat["status"] or
                ex.get("payment_status") != flat["payment_status"] or
                (flat.get("stripe_session_id") and not ex.get("stripe_session_id")) or
                (flat.get("phone_number")      and not ex.get("phone_number")) or
                (flat.get("nationality")       and not ex.get("nationality")) or
                (flat.get("date_of_birth")     and not ex.get("date_of_birth"))
            )
            if needs:
                patch = {k: flat[k] for k in [
                    "status", "payment_status", "stripe_session_id", "phone_number",
                    "nationality", "country_of_residence", "linkedin_url",
                    "venture_name", "venture_stage", "venture_sector",
                    "date_of_birth", "applicant_role",
                ] if flat.get(k) is not None}
                api("PUT", AGENT_APP, f"entities/Application/{ex['id']}", data=patch, token=token)
                print(f"  UPDATED  {ref} — status={flat['status']} pay={flat['payment_status']} nat={flat.get('nationality')} phone={flat.get('phone_number')}")
                updated += 1
            else:
                skipped += 1

    print(f"\nSync complete — created={created} updated={updated} skipped={skipped} | total={len(prod)}")
    return created, updated

if __name__ == "__main__":
    main()
