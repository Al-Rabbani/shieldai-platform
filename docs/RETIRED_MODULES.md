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
