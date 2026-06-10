# PEA Full Platform Audit — 2026-05-29

## CRITICAL BUGS CONFIRMED

### FUNC-01 [CRITICAL] peaRegister — Wrong success_url + stale fields
- success_url still points to `/payment-success` SPA (NOT peaPaymentSuccess)
- Still writes `applicant_role`, `venture_name`, `invitation_token` (all wrong builder fields)
- Does NOT write to `founder{}` or `venture{}` nested objects
- Uses `client.asServiceRole` — source of serviceToken issue
- NOT DEPLOYED on builder (404 on live endpoint)

### FUNC-02 [CRITICAL] peaNotifyAdmin — createClientFromRequest
- Line 6: `import { createClientFromRequest }`
- Line 124: `const base44 = createClientFromRequest(req)` — BREAKS in automation context
- Still uses `applicant_role` field

### FUNC-03 [HIGH] peaApplicationWebhook — hardcoded Resend key, stale fields
- Hardcoded Resend key present
- Still reads `applicant_role`, `phone_number`, `invitation_token` from body (okay for input)
- BUT writes them correctly to builder schema (founder{}/venture{}) — this is OK

### FUNC-04 [HIGH] peaRegister — NOT DEPLOYED (404 live)
- `peaRegister` returns 404 on live endpoint

### FUNC-05 [HIGH] peaVerifyPayment — OLD /payment-success ref in comments only
- Code itself is correct (createClient with serviceToken)
- Minor: comment references old page — NOT a runtime bug

### FUNC-06 [HIGH] sendRegistrationInvite — invitation_token field name
- Line 29: reads `invitation_token` from input
- Line 154: writes `session_token` to builder — CORRECT
- BUT the function still references `invitation_token` as input key — inconsistent API

### FUNC-07 [MEDIUM] peaWeeklyStatus — hardcoded Resend key, stale field refs
- Builder-side now uses direct REST (working) but local copy has old refs
- Sends to builder records using wrong field `applicant_role` for display (non-breaking)

### FUNC-08 [MEDIUM] peaStatusPage — hardcoded Resend key, applicant_role refs
- Uses `applicant_role` for display — should use `application_type`

### FUNC-09 [MEDIUM] peaGetStatus — hardcoded Resend key, applicant_role refs

## MISSING FEATURES (to build)

### FEAT-01 [CRITICAL] AI Scoring — Not implemented
- `ai_score` and `ai_analysis` fields exist in DB but are never populated
- Need: LLM-based scoring on submission (OpenAI/Claude call in peaApplicationWebhook)

### FEAT-02 [CRITICAL] AI-Powered Invoice Generation
- No invoice function exists
- Need: PDF/HTML invoice generated on payment confirmation, stored + emailed

### FEAT-03 [CRITICAL] AI-Powered Receipt
- No receipt function exists  
- Need: Official receipt generated post-payment, emailed to applicant

### FEAT-04 [HIGH] Co-founder portal connection
- cofounder_invite_token field exists in DB
- sendRegistrationInvite exists but co-founder flow is incomplete

### FEAT-05 [HIGH] KYC verification flow
- kyc_status field exists ('not_started') but no KYC trigger/flow

### FEAT-06 [MEDIUM] Certificate generation
- certificate_url, certificate_generated_at, certificate_sent_to_founder_at exist
- No certificate generation logic

## SCHEMA CONFIRMED (builder app actual fields)
Top-level: reference_code, status, payment_status, payment_reference, application_type, applicant_name, applicant_email, application_fee, currency, session_token, submitted_at, current_step, founder_application_complete, auth_status, kyc_status, final_decision, certificate_url, ai_score, ai_analysis
Nested objects: founder{full_name, role, nationality, country_of_residence, phone, date_of_birth, linkedin}, venture{...}, compliance{}, financials{}, market{}, innovation{}, vision{}, kyc_data{}, auth_data{}

### 102. Auto-Scan Run #52 — Config-Only Commit — 2026-06-10 05:51
**Date:** 2026-06-10

**Scheduled Automation:** 🔍 Auto-Scan on New Commits — shieldai-platform

**Commit Detected:**
- Latest SHA: `abef33acbeb04515ce96edde541f03734e28a560`
- Previous baseline: `374bd03cc115070e3c2ac1b3f59dde3f58614f2e`
- Branch: main
- Message: Delete base44/connectors directory
- Files changed: 2 (github.jsonc, gitlab.jsonc) — **CONFIG FILES ONLY**
- Code impact: **NONE**

**Scan Decision:** ✅ SKIPPED
- Reason: Zero code changes, zero dependency updates
- Files deleted: base44/connectors/* (config files)
- Expected new vulnerabilities: 0
- Baseline remains valid

**Current Platform Status:**
- Last full scan: config-only commit (no SAST/SCA needed)
- Triaged findings: 26 active
  - 2 critical (due in 24h)
  - 5 high (due in 7d)
  - 14 medium (due in 30d)
  - 5 low (due in 90d)
- Risk score: 42/100
- SLA breaches: 0
- Status: ✅ All findings within SLA

**Automation Status:** ✅ **Complete** (detection ✅, decision ✅, no scan needed)

---
