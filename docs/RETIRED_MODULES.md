# Retired scaffold routers

These routers were served under the legacy-route quarantine and returned HTTP 500 once
the quarantine was removed, because the persistence layer they query was never created
(first failure: asyncpg UndefinedTableError on marketplace_listings). They are retired
rather than un-gated so the broken handlers are unreachable, and will be rebuilt with
their schemas when those features are actually built.

The source files remain in apps/api/gds_api/<module>/routes.py.

| Router | Why retired |
|---|---|
| marketplace_routes | marketplace_listings and the rest of the marketplace schema were never created |
| attack_graph_routes | attack-path/graph persistence tables were never created |
| digital_twin_routes | digital-twin twin/asset/environment tables were never created |
| redteam_sim_routes | red-team scenario tables were never created (paths were also unmounted) |
| ai_security_routes | AI-security model/prompt tables were never created |
| autofix_routes | autofix job/run tables were never created (only a static template list worked) |
| sso_routes | SSO provider/session tables were never created |

## Second retirement batch (R2, tenant isolation)

Un-gating these produced HTTP 500 on every data endpoint, from 114 `UndefinedTableError`
occurrences; all eight tables they query are absent from the database. Retired for the same
reason as the first batch: the handlers are unreachable rather than broken, and each will be
rebuilt together with its schema.

| Router | Why retired |
|---|---|
| compliance_autofix_routes | autofix_jobs and compliance_frameworks tables were never created |
| compliance_evidence_routes | evidence_items and legal_holds tables were never created |
| ci_cd_routes | ci_pipelines and pipeline_gates tables were never created |
| webhook_routes | webhook_endpoints and webhook_events tables were never created |
| residency_routes | residency persistence tables were never created |
