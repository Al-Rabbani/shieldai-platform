# Customer onboarding — the proved path

**Status:** proved end to end on 23 November 2026 against the live platform, release `3096350d`, by running it as a
probe administrator and then signing in as the customer it created. Every command below is the one that was run and
every result is what came back. Where a step is not proved, it says so.

**Who this is for:** whoever onboards the next GDS customer. The platform is operator-provisioned, not self-serve:
there is no signup route and no `customer_signups` table. `POST /admin/tenants` is the front door, and it is the only
place that creates a tenant.

---

## 0. What you need first

| Thing | Why |
|---|---|
| An account holding `tenants:manage` | Only `POST /admin/tenants` accepts it. The `admin` role carries it; `analyst` does not. |
| The customer's organisation name and a slug | The slug is unique across the platform and cannot be reused. |
| An owner email address you control the inbox for | It becomes the customer's administrator login. |
| A password to hand over | The route takes it in the request. Send it out of band, never in the same channel as the email. |

## 1. Provision the tenant

```bash
curl -s -X POST https://api.globaldigitalsecurity.io/admin/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Acme Security Ltd","slug":"acme-security",
       "owner_email":"owner@acme-security.example","owner_password":"<choose-a-strong-one>"}'
```

Returns `201` with the tenant id, the owner email and the role:

```json
{"tenant_id":"6badf1d7-b504-4d3c-a871-51e9267f155e","name":"Acme Security Ltd",
 "slug":"acme-security","owner_email":"owner@acme-security.example","role":"platform_owner"}
```

What that one call created, in one transaction: the tenant row, a `platform_owner` role seeded from
`ROLE_PERMISSIONS["platform_owner"]`, the owner user with a bcrypt hash, and an `admin.tenant.provisioned` audit row
on the *provisioning* tenant (so the operator's own audit trail records who created whom).

`409 That slug is already in use by another tenant` is the only duplicate signal available: `tenants` is FORCE-RLS and
the session is bound to the new id, so a pre-check would always find nothing. The unique index is the real check.

## 2. The customer's first sign-in will be refused, and that is correct

The owner is created with no second factor and no enrolment window, so `POST /auth/login` answers:

```
403 {"code":"mfa_enrolment_required","enrol_path":"/settings/mfa","deadline":null}
```

Send them to `/settings/mfa`. They enrol a TOTP app (the page shows the secret and ten recovery codes once), and
then sign in with password + code. **Do not "fix" this by clearing the deadline.** It is the control that stops a
password-only customer account existing.

Verified on 23 Nov 2026: the refusal fired for the freshly provisioned owner, and after a window was granted the same
credentials returned `200` with the tenant and role in the body.

## 3. Confirm the customer's estate is theirs and empty

Signed in as the customer, these are the measurements taken minutes after provisioning:

| Call | Result | Reading |
|---|---|---|
| `GET /findings?limit=5` | `200 []` | 0 rows, while the operator tenant holds 849 open. Isolation, not an empty page. |
| `GET /compliance/frameworks` | `200` `score_over_assessed: null`, `total_assessed: 0` | No score is invented for a tenant with no assessments. |
| `GET /incidents` | `200 []` | — |
| `GET /billing/subscription` | `200 {"status":"none","plan":null}` | Billing starts unsubscribed. |
| `GET /billing/quota` | `200 {"tier":"starter"}` | Quota defaults to starter until a subscription exists. |
| `GET /executive/report` | `200`, 949 bytes | A real report object with `tenant_id` set to the new tenant and `mission_count: 0`. |

## 4. Issue the customer's machine credential

```bash
curl -s -X POST https://api.globaldigitalsecurity.io/admin/api-keys \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Acme CI pipeline","scopes":["findings:read"]}'
```

Returns `201` with `key` — **shown once, never recoverable**:

```json
{"id":"6e3079cf-…","key_prefix":"gds_EXAMPLE","scopes":[],"key":"gds_EXAMPLE_this_is_not_a_real_key_see_notes"}
```

Proved: `GET /findings` with `Authorization: Bearer <key>` returned `200` and 0 rows — the key authenticates, binds
the right tenant, and records `last_used_at`.

**Correction to the first version of this runbook, which accused the wrong thing.** It said scopes were dropped and
not enforced. Both were wrong, and the measurement that settles it: a key issued with `["findings:read"]` is stored as
`["findings:read"]`, and that key is refused with `403 Missing permission: users:manage` on `/admin/users` and on
`POST /admin/api-keys`. Scopes are stored and enforced; the principal's permissions *are* its scopes
(`security.py` builds `CurrentUser(permissions=list(scopes))`).

The real defect was in the response: the issue endpoint built `ApiKeyIssued` without passing `scopes`, so every `201`
reported `"scopes": []` whatever was granted, and that is what I misread as a storage failure. Fixed, along with two
footguns the same run exposed:

1. A key with **no scopes** was issued `201` and could then do nothing at all. Now refused: `400 An API key needs at
   least one scope.`
2. A key with a scope that **does not exist** (`total:nonsense`) was issued `201` and stored, authorising nothing.
   Now refused: `400 Unknown scope(s): total:nonsense.`

Scopes are not free text: `GET /admin/permissions` lists the catalogue. A key holding `findings:read` can read the
finding register but is refused `cloud:findings:read` routes — different permission, so ask for what the job needs.

## 5. Billing

`GET /billing/plans` serves the price list (`starter` £399/mo, `professional` £1,199/mo, `enterprise`) from
`billing/plans.py`, which the quota gate also reads so the brochure and the enforcement cannot disagree.

**Proved on 23 November 2026 against LIVE Stripe**, using a throwaway tenant and no card:

| Step | Result |
|---|---|
| `POST /billing/checkout {"plan_tier":"professional"}` | `200` with a real `https://checkout.stripe.com/g/pay/cs_live_…` URL, and a real Stripe customer created |
| `GET /billing/subscription` immediately after | `{"status":"incomplete","plan":"professional","monthly_amount_gbp":1199.0}` — an unpaid attempt is recorded as incomplete, never as a trial |
| `POST /billing/webhook` with a correctly signed `checkout.session.completed` | `200 {"processed":true,"status":"active","plan":"professional"}` |
| Entitlement after the webhook | `GET /billing/quota` tier `starter` → `professional`; `tenants.plan_tier` `NULL` → `professional`; `subscription_status` → `active` |
| Same event replayed | `200 {"duplicate":true}` — idempotent, so Stripe's at-least-once delivery cannot double-apply a payment |
| Forged signature | `400 Invalid webhook signature: no signature matches this payload` |
| No signature at all | `400 Invalid webhook signature: no Stripe-Signature header was sent` |

The session was expired and the Stripe customer deleted afterwards, so nothing was left open in the live account and
nothing was charged.

### The payment handler, proved on 25 November 2026 without charging anything

`invoice.payment_succeeded` had never run, because only a real charge produces it, and `billing_payments` held 0 rows.
Rather than charge a card to test a handler, the event was **signed and posted directly**:

| Step | Result |
|---|---|
| `POST /billing/webhook` with a signed `invoice.payment_succeeded` (`amount_paid` 39900, `currency` gbp, `metadata.tenant_id`) | `200 {"processed":true,"amount":399.0,"currency":"gbp","status":"paid"}` |
| `billing_payments` afterwards | 1 row: `399 gbp`, correct tenant, `status=paid` |
| Cleanup | payment, subscription, event and tenant all deleted — 0 payments, 5 tenants |

**Both webhook branches are now proved.** The only step with no evidence is the card entry itself, which needs a
person and a card: run one deliberate low-value live transaction, confirm the `billing_payments` row and the
entitlement, then refund it.

### The defect this run found, which is why the step above matters

The first attempt at the signed webhook was answered `400 {"detail":"Webhook error: object"}`. Reproduced in
isolation on stripe-python 15.4.0:

```
construct_event(payload, VALID header,  secret) -> AttributeError: object
construct_event(payload, FORGED header, secret) -> SignatureVerificationError
```

The route caught `SignatureVerificationError` as "invalid" and every other exception as a generic `400 Webhook error`.
**So the only events it could accept were the forged ones**: every genuine Stripe delivery was answered with a 4xx,
and Stripe does not retry a 4xx. No payment could ever have activated a subscription. That is the mechanism behind
"no customer ever completed signup → provision → scan → report → invoice".

Fixed in `apps/api/gds_api/billing/webhook_signature.py`: verification is performed directly from the HMAC scheme
Stripe documents, with a constant-time comparison and a 300-second replay window, and the route answers `400` only for
a bad signature — a genuine fault now surfaces as `500`, which Stripe *does* retry. Collapsing those two into one code
is how a transient failure silently loses a payment.

## 5a. If the owner misses the MFA deadline

`scripts/ops/mfa-break-glass.sh <email> [hours]` grants one account a temporary window to enrol its second factor.
It runs the grant and its audit row in one transaction and **fails closed**: if the audit row cannot be written, the
window is not granted. Proved on 25 November 2026 against a test account — the deadline moved and the audit row
carries the email, hours, previous deadline and the tool that granted it.

```bash
bash scripts/ops/mfa-break-glass.sh president@globaldigitalstreams.com 1
```

## 6. Handover checklist

- [ ] Tenant created, `201`, tenant id recorded
- [ ] Owner told to enrol MFA at `/settings/mfa`, and confirmed enrolled (`GET /auth/mfa/policy` reports
      `mfa_enabled: true`)
- [ ] Customer sees an empty estate, not the operator's
- [ ] API key issued if they need machine access; key sent once, stored by them
- [ ] Subscription created through Stripe (outstanding — see §5)
- [ ] First scan scheduled for the customer's own cloud account

---

## What the run proved and what it changed

The lifecycle spine — provision, authenticate, isolate, report, machine credential — works and was run for real. It
also found two defects that no test had:

1. **The Stripe webhook rejected every valid signature and accepted only forged ones** (§5). Fixed; 13 tests in
   `tests/test_webhook_signature.py`, including a guard that the `construct_event` call cannot come back.
2. **Every future tenant would have started without MFA.** Migration 075 set `roles.requires_mfa` true for the roles
   that existed but left the column default at `false`, so the `platform_owner` role created by this route opted out
   by omission and the new customer's first login was accepted with a password alone. Fixed in migration 079, which
   inverts the default to `true` and backfills, plus an explicit `requires_mfa` in the provisioning INSERT so the
   intent is visible where the tenant is made. Measured after: 0 of 7 roles without the requirement, default `true`.
3. **API key scopes** were reported as dropped and unenforced; that was wrong (§4), corrected.

**Cleanup note:** the tenant created by this run (`acme-security`) was deleted afterwards, along with its role, owner
user and API key, so the platform is back to its real tenants only.

### 5.1 Card entry proved with a real live payment, 25 Nov 2026 04:33 UTC

The one step that cannot be proved without a human is the card itself. Sidique entered a real card against a
LIVE Stripe Checkout session for £1.00 and the full production chain ran unmodified.

Setup: a test price was created in live Stripe (price_1UfXqOCbzy8IofOuS9otr1mo, product prod_VgvhYhswUJ22zY,
100 gbp recurring monthly) because the platform's own /billing/checkout only accepts the three real tiers and the
cheapest of those is £399. A throwaway tenant (4c3066f4-178e-4cb3-b701-5823b83d5c9d) carried the metadata.

Result in Stripe: checkout session cs_live_agtehivlEzOWtTTcZ7DGrxZ8KDZvQf66hy4aHEcKyEty4cfofrOeX6Drlz
status complete, payment_status paid, amount_total 100 gbp; subscription sub_1UfXszCbzy8IofOusPFkeFKt active;
invoice in_1UfXseCbzy8IofOuDjdc12jo paid 100 gbp; charge ch_3UfXseCbzy8IofOu0W3q3Vq0 paid.

Result in the platform, with NO manual intervention: four webhook events, all livemode true and
signature_verified true, all recorded in billing_events:

- evt_1UfXt2Cbzy8IofOuPSyERAG8  checkout.session.completed
- evt_1UfXt2Cbzy8IofOuAFGdpZfl  invoice.payment_succeeded      <- the branch that had never run on a real charge
- evt_1UfXt2Cbzy8IofOuGhAyDdnU  customer.subscription.created
- evt_1UfXutCbzy8IofOuK7Uot2G9  customer.subscription.deleted  (from the deliberate cancel)

A real billing_payments row was written: amount_paid 1 (whole pounds, correct for 100 pence), currency gbp,
status paid, stripe_invoice_id in_1UfXseCbzy8IofOuDjdc12jo, with live invoice_url and invoice_pdf_url. The
tenant was promoted to plan_tier starter and subscription_status active, so entitlement followed the money.

Reversal, done immediately and in that order: subscription cancelled (status canceled), then the charge refunded
(re_3UfXseCbzy8IofOu0LiVGJZ8, status succeeded, 100 gbp, charge amount_refunded 100, refunded true), then the
test price and product deactivated, the Stripe customer deleted, and the throwaway tenant plus its billing rows
removed (0 payments, 0 tenants). Nothing is left running and nothing will renew.

Conclusion: the payment path is proved end to end against live Stripe, including the card entry that no test
double can substitute for. This closes the last unproved item in the billing lifecycle.
