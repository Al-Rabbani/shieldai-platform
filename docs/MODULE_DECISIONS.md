# The five unbuilt modules: built or retired, with evidence

These five were retired as routers on 14 Nov 2026 and left documented as "awaiting rebuild". Deferring is not
a decision, so each one is now settled on measured evidence rather than intent.

| Module | Decision | Evidence |
|---|---|---|
| Compliance evidence vault | **BUILT (kept)** | `gds_api/evidence.py` uploads to object storage with a sha256 per item; live `GET /evidence` returns real rows (subject_type `cloud_finding`, content_type `application/json`, 485-496 bytes each) |
| CI/CD security gate | **BUILT (kept)** | `gds_api/ci_gate.py`; `CI_GATE_API_KEY` configured; `.github/workflows/shieldai-security-gate.yml` calls it; live `POST /ci/gate` on repo `Al-Rabbani/shieldai-platform` at `3c659d4` returned verdict `pass` with counts from the real findings table |
| Compliance autofix | **RETIRED** | The CI client posts to `SHIELDAI_AUTOFIX_URL`, and no autofix endpoint exists (`openapi.json` has zero paths containing `autofix` or `/fix`). The real fix capability is the governed tool `_auto_fix_finding`, which builds a mission plan and never pushes. An unattended CI job that commits fixes would bypass the human approval the whole platform is built around, so the job is removed rather than given an endpoint |
| Webhooks | **BUILT (new)** | Migration 032 (`webhook_endpoints`, `webhook_deliveries`, both FORCE-RLS), `gds_api/webhooks.py` CRUD, `gds-webhook-dispatch.py` on a 5-minute cron. Proven: 14 real findings delivered to a receiver that verified HMAC-SHA256 on the exact body, 14 delivery rows, 0 failures |
| Data residency | **RETIRED as a module** | One host in one region. A "verify" endpoint cannot enforce placement it does not control, and the old route only dispatched an agent task. Residency is a factual statement, recorded below, not a control |

## What the retired routes actually did

`/actions/webhooks/replay`, `/actions/data-residency/verify`, `/actions/evidence/auto-attest` and
`/actions/compliance/evidence-collect` each posted a task to an agent channel via `_dispatch_action`. None of
them performed the work named in the path. They remain as task requests, and must not be read as
implementations of those modules.

## Data residency, as fact rather than policy

- **Application and database:** Hostinger KVM, one host, `2.24.141.108`. The provider's datacentre region is
  **not verified from inside the platform** and must be confirmed in the Hostinger panel before any residency
  claim is made to a customer.
- **Off-host backups:** Backblaze B2 bucket in `eu-central-003` (EU), gpg AES256 encrypted before upload.
- **Object storage for evidence:** the same B2 account.
- No customer data is replicated outside these two locations.

## Autofix, where it actually lives

`tool_gateway._auto_fix_finding` produces a mission plan for a fix; nothing is committed to a repository
without the governed approval path. A CI job that fixes code unattended is a different security posture from
the one this platform enforces, so the gate blocks and a human approves the remedy.
