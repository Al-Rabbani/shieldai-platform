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

## Regulatory notification clock (NIS2 Article 23), 20 Nov 2026

Migration 035 adds `regulatory_notifications`, FORCE-RLS with the standard tenant predicate and granted to `gds`
and `gds_runtime` (not `gds_app`, which does not exist on this host).

`apps/api/gds_api/regulatory.py` computes the Article 23 deadlines **from detection** and stores them: 24 hours for
the early warning, 72 hours for the notification, 30 days for the final report. Overdue is therefore a query, not a
recollection: `GET /regulatory-notifications/overdue`.

**It deliberately never sends anything.** Notifying a supervisory authority is a legal act taken by a person, so
`POST /regulatory-notifications/{id}/submit` records that a person sent it and when. A platform that files
regulatory reports on its own is a liability, not a feature.

Exercised on the two open incidents: 0 reportable, 2 determined not reportable, none overdue. Nothing was closed to
make that number look better, because the MinIO and Temporal risk behind those incidents is still unresolved.

## Access reviews, measured against live accounts, 20 Nov 2026

The control previously counted rows in a way that joined sessions rather than users: it reported 72 when the real
figure was 5 active accounts. It now reads the user table directly.

The decide path was proven on throwaway accounts: self-revocation is refused with 409, revoking another account
deactivates it, and retain records the decision without changing state. One review item remains open because it is
the owner's decision, not a platform one.

## On-call shifts, so staffing is measured not asserted, 20 Nov 2026

`incident_response_staffing` used to assert `paging_integration: False` while a working 5/15/60-minute
acknowledgement ladder ran on cron. It now reports the ladder, the schedule, ackable notifications and the rota
separately, and fails for the true reason: the rota table exists and no shift covers the current time.

`/on-call/shifts` was proven end to end with a labelled shift: `on_call` false, create 201, `on_call` true naming the
person, delete 204, `on_call` false again. The shift was then deleted so the table is back to zero rows. The control
flips to pass while coverage exists, which is what makes it a measurement rather than a fixture.

## Console-initiated cloud discovery, and the three defects behind it, 20 Nov 2026

`POST /cloud/discovery-jobs` hung until the client gave up and recorded no job. Three defects sat behind it, each
hidden by the one in front:

1. **Self-deadlock on the mission row.** `fail_mission_durably` writes the mission from its own session while the
   caller still held an uncommitted `UPDATE missions`, so both waited forever with no timeout. The failure path now
   rolls the session back before that write, and the DENY branch no longer writes `mission.status` locally.
2. **Lost tenant bind across internal commits.** `execute_capability_request` and the job commit both return the
   connection under `NullPool`, taking `gds.tenant_id` with it. The follow-up `UPDATE missions` then matched 0 rows
   under RLS and the audit insert was rejected outright. The mission id is snapshotted, the tenant is re-bound, and
   the mission is reloaded instead of read off an expired instance. The route re-binds before its own commit.
3. **The capability is agent-only.** `cloud.discover_environment` is granted to `security_architecture` alone, so
   `requesting_agent_id=None` guaranteed a denial. The run is attributed to that agent while the real initiator is
   still recorded as `user_id`, so the audit names both the person and the agent holding the grant.

Measured after the fix: `POST /cloud/discovery-jobs` returns 200 in 2.86 s against the real Azure subscription,
records a completed job, and leaves zero blocked or idle-in-transaction sessions.

Two provider-discovery tests had used `provider="azure"` to mean "no Azure environment exists". Connecting the real
subscription invalidated that premise, so the not-connected contract is now tested against `kubernetes` and Azure's
declared authentication mechanisms are asserted from the provider registry instead.

## Container CVE watcher, why it usually says nothing, 20 Nov 2026

MinIO and Temporal carry criticals that cannot be fixed on this host. Re-reporting them weekly is noise, so the
weekly job (`scripts/ops/gds-container-cve-watch.py`, Sunday 04:30) answers one actionable question per container:
has a genuinely better image become pullable?

It alerts only when all four hold: the registry answers, the pulled tag differs from the image the container runs,
the build is actually pullable, and scanning it shows strictly fewer criticals than the recorded count. Every other
outcome is logged with its real numbers, including the reasons nothing can be concluded: MinIO's registry refuses
this host, Temporal's tag is unchanged, neo4j is pinned by digest.

Comparison is by **local image id**, not registry digest. A digest disappears from the host once a tag moves, which
made `nats` unreadable on a second run. Pulling both proves pullability and yields the candidate id, and the tag is
then restored to the running image, because a monitor must not change what a later recreate would adopt.
