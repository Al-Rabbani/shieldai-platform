# Retired modules

These modules were retired because the persistence layer they query was never created. Their
handlers could not work: the first failure was `asyncpg UndefinedTableError` on
`marketplace_listings`, and every data-backed sibling failed the same way. They are gone from
the tree rather than left commented out, because source that no process can reach still invites
work: a second copy of the kernel once diverged from the live one and fixes were applied to the
copy that never ran.

**Deleted 17 November 2026.** Full source is preserved at git tag
`archive/retired-routers-20261117` (commit `eca747d`). Restoring any module is
`git checkout archive/retired-routers-20261117 -- apps/api/gds_api/<module>`.

When these features are actually built, the schema comes first and the handlers are written
against it. Resurrecting the old handlers would resurrect the assumption that killed them.

## Batch 1 - deleted whole packages

| Module | Deleted path | Tables it expected, never created |
|---|---|---|
| marketplace | `apps/api/gds_api/marketplace/` | `marketplace_listings`, listings, publishers, certifications, reviews, downloads, subscriptions, licenses, revenue shares, invoices |
| attack_graph | `apps/api/gds_api/attack_graph/` | attack path / attack graph persistence |
| digital_twin | `apps/api/gds_api/digital_twin/` | twin, twin asset, twin environment |
| redteam_sim | `apps/api/gds_api/redteam_sim/` | red-team scenario tables |
| ai_security | `apps/api/gds_api/ai_security/` | AI model, prompt, prompt-attack tables |
| autofix | `apps/api/gds_api/autofix/` | autofix job and run tables |
| sso | `apps/api/gds_api/sso/` | SSO provider and session tables |

## Batch 2 - deleted route modules only

Their engines were either already dead or still referenced by live code, so only the retired
router files were removed.

| Module | Deleted path | Tables it expected, never created |
|---|---|---|
| compliance_autofix | `apps/api/gds_api/compliance/autofix_routes.py` + orphaned `autofix.py` | `autofix_jobs` |
| compliance_evidence | `apps/api/gds_api/compliance/evidence_routes.py` | `evidence_items`, `legal_holds` |
| ci_cd | `apps/api/gds_api/integrations/routes.py` | `ci_pipelines`, `pipeline_gates` |
| webhook | `apps/api/gds_api/webhooks/routes.py` | `webhook_endpoints`, `webhook_events` |
| residency | `apps/api/gds_api/data_residency/routes.py` | residency policy tables |

The `integrations`, `webhooks` and `data_residency` packages were removed entirely once their
route modules went: with no consumer left, only orphaned engines remained.

## What replaced them

Nothing, deliberately. A retired module 404s rather than returning 500. The canonical routers
that do work (`findings`, `agents`, `cloud`, `policy`, `approvals`, `ciem`) were the ones wired
to real tables.

## Still gated on purpose

`reasoning` stays behind the quarantine dependency until OpenAI credits fund it. Its endpoints
were secured and tenant-scoped on 14 November, but releasing them while the LLM call fails only
converts a 503 into a 500.

## Guard against regression

`tests/test_readiness_protocols.py::RetiredModuleAbsenceTests` fails if any retired path
reappears, if `main.py` mentions a retired router again, or if this document loses a module.
`tests/test_repo_hygiene.py` fails on tracked `.bak`, `.pyc`, `patches/`, or new one-off
`fix_*` / `phase5_*` scripts.
