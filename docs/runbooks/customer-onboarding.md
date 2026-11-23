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
{"id":"6e3079cf-…","key_prefix":"gds_W2oOuL1a","scopes":[],"key":"gds_W2oOuL1aLLMiHGVTJrY0r7lwSymJs44…"}
```

Proved: `GET /findings` with `Authorization: Bearer <key>` returned `200` and 0 rows — the key authenticates, binds
the right tenant, and records `last_used_at`.

**Two defects this step exposed, not yet fixed:**
1. `scopes` came back `[]` although `["findings:read"]` was sent. The requested scopes are silently dropped.
2. The key still read `/findings` with empty scopes, so scope is not what authorises the call. A key issued for
   read-only use is not read-only by construction. Until this is fixed, treat every issued key as full-tenant.

## 5. Billing

`GET /billing/plans` serves the price list (`starter` £399/mo, `professional` £1,199/mo, `enterprise`) from
`billing/plans.py`, which the quota gate also reads so the brochure and the enforcement cannot disagree.

`POST /billing/checkout` creates a Stripe checkout session against the **live** account (only live keys are configured
on this host). **Not proved:** no checkout session has been created or paid as part of this runbook, because doing so
would put a real charge against a real card. The customer-facing invoice step is therefore the one part of the
lifecycle with no end-to-end evidence yet. Prove it with a real low-value transaction and a refund, then record the
result here.

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

1. **Every future tenant would have started without MFA.** Migration 075 set `roles.requires_mfa` true for the roles
   that existed but left the column default at `false`, so the `platform_owner` role created by this route opted out
   by omission and the new customer's first login was accepted with a password alone. Fixed in migration 079, which
   inverts the default to `true` and backfills, plus an explicit `requires_mfa` in the provisioning INSERT so the
   intent is visible where the tenant is made. Measured after: 0 of 7 roles without the requirement, default `true`.
2. **API key scopes are dropped and not enforced** (§4). Open.

**Cleanup note:** the tenant created by this run (`acme-security`) was deleted afterwards, along with its role, owner
user and API key, so the platform is back to its real tenants only.
