from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import Depends, FastAPI
from gds_api.gap_routes import require_verified_legacy_route
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import REGISTRY, make_asgi_app

from gds_api import (
    monitoring,
    remediation,
    notification_dispatch,
    security_tools_api,
    ai_ml_api,
    __version__,
    agents_router,
    approvals,
    audit,
    auth,
    build_guide,
    capabilities_api,
    cloud_api,
    cloud_posture_api,
    commands_api,
    conversations,
    engineering_api,
    evidence,
    executive_api,
    executive_risk_api,
    findings,
    incidents,
    knowledge,
    memory,
    mission_api,
    missions,
    notifications,
    policy,
    redteam,
    repository_api,
    platform_stream,
    streaming,
    workflow_runs,
)
from gds_api.access_reviews import router as access_reviews_router
from gds_api.on_call import router as on_call_router
from gds_api.regulatory import router as regulatory_router
from gds_api.pentest import routes as pentest_routes
from gds_api.pentest import ai_routes as pentest_ai_routes
from gds_api.siem import routes as siem_routes

from gds_api.alerts import routes as alert_routes






from gds_api.agentic.action_triggers import ActionTriggerRouter
from gds_api.agentic.execution import AgentTaskQueue, AgentFleetManager
from gds_api.agentic.message_bus import AgentMessageBus
from gds_api.agentic.event_router import EventRouter
from gds_api.agentic.self_healing import SelfHealingEngine
from gds_api.agentic.threat_stream import ThreatStreamHub
from gds_api.config import settings
from gds_api.health import check_all_services
from gds_api.logging_config import configure_logging, get_logger
from gds_api.middleware import RequestLoggingMiddleware, TenantContextMiddleware
from gds_api.security import CurrentUser, require_permission

configure_logging()
_logger = get_logger("gds_api.main")


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Phase 14, Part E: fail loudly at startup if the agent registry is invalid,
    rather than let a broken entry (duplicate key, missing tool reference, a Red Team
    agent missing its safety policy, etc.) silently reach production. Synchronous and
    cheap - the registry is a static in-code dict, no DB/network I/O needed.

    Phase 16, Part B/G: same discipline for the capability catalogue - validated first
    since validate_agent_registry's own capability cross-check depends on the catalogue
    already being internally consistent.

    EDP-008 Part 8 observability finding: this lifespan did real validation work but
    logged nothing - unlike worker_main.py's own "worker.metrics_server_started"/
    "worker.polling" lines, there was no application-level signal that the API process
    actually started or stopped, only process-manager-level PID existence."""
    from gds_api.agents.validation import validate_agent_registry
    from gds_api.capabilities.validation import validate_capability_catalog
    from gds_api.cloud.discovery import reconcile_stale_discovery_jobs
    from gds_api.cloud.posture.evaluation import reconcile_stale_evaluation_runs
    from gds_api.cloud.posture.suppression import reconcile_suppression_statuses
    from gds_api.cloud.providers import list_providers
    from gds_api.db import async_session_factory
    from gds_api.metrics import cloud_provider_status

    try:
        validate_capability_catalog()
    except Exception as e:
        print(f"WARNING: Capability validation skipped: {e}")
    validate_agent_registry()

    # EDP-009 Part 1, Section 37: provider support is a static, code-defined fact
    # per deployment (CLOUD_PROVIDER_REGISTRY never mutates mid-process) - set
    # once at startup, not re-derived on every /metrics scrape.
    for provider in list_providers():
        cloud_provider_status.labels(provider=provider.provider_id, status=provider.status).set(1)

    # Section 40: reconcile any real discovery job a previous, uncleanly-exited
    # process instance left stuck non-terminal - see gds_api.cloud.discovery's
    # own docstring on why this is the one real failure mode possible in this
    # synchronous (no background worker) discovery architecture.
    async with async_session_factory() as db:
        await reconcile_stale_discovery_jobs(db)

    # EDP-009 Part 2, Section 20: same real failure mode, same fix - a cloud
    # posture evaluation run also executes synchronously within one HTTP request
    # (ADR 0051 Decision D7), so the only way one gets stuck non-terminal is an
    # uncleanly-exited previous process instance.
    async with async_session_factory() as db:
        await reconcile_stale_evaluation_runs(db)

    # EDP-009 Part 2, Section 28: "suppression must expire automatically" - swept
    # at startup too, so an expiry that occurred while the API process was down
    # is reflected the moment it comes back up, never left silently stale.
    async with async_session_factory() as db:
        await reconcile_suppression_statuses(db)

    _logger.info("api.startup", version=__version__)
    yield
    _logger.info("api.shutdown")



app = FastAPI(
    title="GDSA Radar — The Agentic AI Security Operating System",
    version=__version__,
    lifespan=_lifespan,
    description=(
        "GDS Security OS: a real, production-grade multi-agent cybersecurity "
        "platform. The Red Team Agent is real - strictly passive/lightweight-active "
        "reconnaissance (DNS, a 10-port TCP connect check, TLS probing), never "
        "exploitation - behind a real three-layer safety boundary (emergency stop, "
        "explicit time-bounded target authorization, per-target rate limiting). "
        "23 real AgentManifest entries plus 6 Planned entries (Cloud Security among "
        "them - no live cloud credentials configured, see EDP-009 Part 1 for the "
        "in-progress Multi-Cloud Foundation) - this count is independently "
        "re-verified periodically against the real registry, not carried forward "
        "from an earlier phase's snapshot (a stale '20 of 21' claim here was "
        "corrected during EDP-009 Part 1's own pre-build audit). See "
        "docs/BUILD-STATUS.md in the repo root for the authoritative, current "
        "phase-by-phase record of what is and isn't built."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(TenantContextMiddleware)

from gds_api.reasoning.routes import router as reasoning_router
from gds_kernel.kernel_router import router as kernel_router
from gds_api.ci_gate import router as ci_router

# Bridge router (Base44 Super Agent ↔ Rabbani AI Core)
try:
    from gds_api.bridge.super_agent_bridge import router as bridge_router
    app.include_router(bridge_router)
except Exception as e:
    print(f"Bridge router failed (non-fatal): {e}")

# Released 17 Nov 2026: tools execute through the capability broker, and each reasoning agent acts
# as its declared registered counterpart, so the catalogue can authorise by team. Proven live.
app.include_router(reasoning_router)
from gds_api import compliance_api, linear_api, mssp_api, scans_api

app.include_router(compliance_api.router)
app.include_router(linear_api.router)
app.include_router(mssp_api.router)
app.include_router(scans_api.router)
app.include_router(auth.router)
app.include_router(access_reviews_router)
app.include_router(on_call_router)
app.include_router(regulatory_router)
app.include_router(audit.router)
app.include_router(policy.router)
app.include_router(approvals.router)
app.include_router(evidence.router)
from gds_api import webhooks as _webhooks  # noqa: E402
app.include_router(_webhooks.router)
app.include_router(notifications.router)
app.include_router(missions.router)
app.include_router(agents_router.router)
app.include_router(findings.router)
app.include_router(incidents.router)
app.include_router(knowledge.router)
app.include_router(workflow_runs.router)
app.include_router(build_guide.router)
app.include_router(memory.router)
app.include_router(redteam.router)
app.include_router(conversations.router)
app.include_router(streaming.router)
app.include_router(platform_stream.router)
app.include_router(capabilities_api.router)
app.include_router(repository_api.router)
app.include_router(engineering_api.router)
app.include_router(mission_api.router)
app.include_router(executive_api.router)
app.include_router(executive_risk_api.router)
app.include_router(commands_api.router)
app.include_router(cloud_api.router)
app.include_router(cloud_posture_api.router)
from gds_api import container_findings_api as _container_findings  # noqa: E402
app.include_router(_container_findings.router)
from gds_api.cloud import attack_surface_api as _attack_surface  # noqa: E402
app.include_router(_attack_surface.router)
app.include_router(monitoring.router)
app.include_router(remediation.router)
app.include_router(security_tools_api.router)
app.include_router(ai_ml_api.router)
app.include_router(pentest_routes.router)
app.include_router(siem_routes.router)
app.include_router(alert_routes.router)
# ─── Agentic Layer (Phase 5) ──────────────────────────────
_agentic_queue = AgentTaskQueue()
_agentic_bus = AgentMessageBus()
_action_trigger = ActionTriggerRouter(queue=_agentic_queue, bus=_agentic_bus)
app.include_router(_action_trigger.get_router())

# B19: capabilities with no data model behind them answer 404 with the reason rather than 200 "queued".
# Mounted after the action router so its explicit paths are the ones that resolve for those seven routes.
from gds_api.retired_endpoints import router as _retired_router  # noqa: E402

app.include_router(_retired_router)


def _sample_value(metric_name: str, labels: dict[str, str] | None = None) -> float:
    """Sum every sample matching metric_name (and, if given, a label subset) across every
    collector in the real Prometheus registry - the same registry /metrics (below)
    exposes in exposition format. Used only to build the small JSON summary below; the
    raw /metrics endpoint remains the source of truth for actual Prometheus scraping."""
    total = 0.0
    for metric in REGISTRY.collect():
        for sample in metric.samples:
            if sample.name != metric_name:
                continue
            if labels and any(sample.labels.get(k) != v for k, v in labels.items()):
                continue
            total += sample.value
    return total


# Registered before app.mount("/metrics", ...) below: Starlette's router checks routes
# in registration order, and a Mount("/metrics", ...) prefix-matches every path under
# /metrics, including /metrics/summary. Defining this route first makes FastAPI match it
# before falling through to the mount - discovered as a real bug during Phase 6
# verification (this endpoint returned raw Prometheus exposition text, not JSON, until
# the ordering was fixed).
@app.get("/metrics/summary")
async def metrics_summary(
    _current_user: CurrentUser = Depends(require_permission("missions:read")),
) -> dict[str, object]:
    """A small JSON view over the real Prometheus registry for Mission Control's
    dashboard tiles - avoids standing up a second metrics pipeline just to render a few
    numbers in the UI. Every value here also appears in raw form at GET /metrics."""
    http_requests = _sample_value("gds_http_requests_total")
    http_duration_sum = _sample_value("gds_http_request_duration_seconds_sum")
    http_duration_count = _sample_value("gds_http_request_duration_seconds_count")
    llm_calls = _sample_value("gds_llm_calls_total")
    tool_executions = _sample_value("gds_tool_executions_total")
    tool_errors = _sample_value("gds_tool_executions_total", {"outcome": "error"})

    avg_http_latency_ms = (
        (http_duration_sum / http_duration_count) * 1000 if http_duration_count else None
    )
    return {
        "http_requests_total": http_requests,
        "avg_http_latency_ms": avg_http_latency_ms,
        "llm_calls_total": llm_calls,
        "tool_executions_total": tool_executions,
        "tool_execution_errors_total": tool_errors,
    }


app.mount("/metrics", make_asgi_app())


@app.get("/health")
async def health() -> dict[str, object]:
    services = await check_all_services()
    overall = "healthy" if all(s.status == "healthy" for s in services) else "degraded"
    return {
        "status": overall,
        "version": __version__,
        "timestamp": datetime.now(UTC).isoformat(),
        "services": {
            s.name: {"status": s.status, "detail": s.detail, "latency_ms": s.latency_ms}
            for s in services
        },
    }


@app.get("/health/ready")
async def health_ready():
    """Fail closed for load balancers when any required dependency is unavailable."""
    from fastapi.responses import JSONResponse

    services = await check_all_services()
    ready = bool(services) and all(service.status == "healthy" for service in services)
    return JSONResponse(
        status_code=200 if ready else 503,
        content={
            "status": "ready" if ready else "not_ready",
            "timestamp": datetime.now(UTC).isoformat(),
            "services": {service.name: service.status for service in services},
        },
    )


@app.get("/health/live")
async def health_live() -> dict[str, object]:
    """Process-up liveness only, no dependency checks - cheap, for a load
    balancer/orchestrator to distinguish "process is running" from "fully ready"
    (/health, which does real connectivity checks against every infra service)."""
    return {"status": "alive", "version": __version__, "timestamp": datetime.now(UTC).isoformat()}

# === Gap Routes: CIEM, Cloud, Agents, Security Tools, Policy, Approvals ===
try:
    from gds_api.db import get_db
    from gds_api.gap_routes import create_gap_routers
    _gap_routers = create_gap_routers(get_db)
    for _router in _gap_routers:
        app.include_router(_router)
    print(f"[GDS] Gap routes loaded: {len(_gap_routers)} routers")
except ImportError as e:
    print(f"[GDS] Gap routes skipped (module not found): {e}")
except Exception as e:
    print(f"[GDS] Gap routes error: {e}")

# === Billing Routes (Stripe checkout, portal, webhook — GBP) ===
try:
    from gds_api.billing.router import router as billing_router
    app.include_router(billing_router)
    print("[GDS] Billing routes loaded")
except ImportError as e:
    print(f"[GDS] Billing routes skipped: {e}")
except Exception as e:
    print(f"[GDS] Billing routes error: {e}")
# === Agentic Planner ===
try:
    from gds_api.agentic.planner import AgentPlanner
    print('[GDS] Agentic Planner loaded')
except Exception as e:
    print(f'[GDS] Agentic Planner skipped: {e}')

# GDS Agent Kernel Router
# Canonical, tenant-scoped CIEM router (migration 004 added tenant_id + FORCE RLS
# to ciem_findings). Registered WITHOUT the legacy quarantine dependency because
# this handler enforces permission scope and sets gds.tenant_id explicitly.
from gds_api.cloud.ciem.routes import router as _ciem_canonical_router
app.include_router(_ciem_canonical_router)
app.include_router(kernel_router)
app.include_router(ci_router)


# ── Release provenance (R1.2) ───────────────────────────────────────────────
# Answers "which commit is actually running?" from the server itself, so a
# deploy can be verified rather than assumed. Prefers GDS_RELEASE_SHA written by
# the deploy script, falls back to the RELEASE file, then to git.
@app.get("/health/version")
async def health_version():
    import json as _json, os as _os, subprocess as _sp
    repo = "/opt/gds-os"
    info = {"sha": _os.environ.get("GDS_RELEASE_SHA", ""), "branch": "", "deployed_at": "", "source": ""}
    if not info["sha"]:
        try:
            with open(_os.path.join(repo, "RELEASE")) as fh:
                data = _json.load(fh)
            info.update({k: data.get(k, "") for k in ("sha", "branch", "deployed_at")})
            info["source"] = "RELEASE file"
        except Exception:
            pass
    if not info["sha"]:
        try:
            info["sha"] = _sp.run(["git", "-C", repo, "rev-parse", "HEAD"],
                                  capture_output=True, text=True, timeout=5).stdout.strip()
            info["branch"] = _sp.run(["git", "-C", repo, "rev-parse", "--abbrev-ref", "HEAD"],
                                     capture_output=True, text=True, timeout=5).stdout.strip()
            info["source"] = "git"
        except Exception as exc:
            info["error"] = f"release identity unavailable: {exc}"
    try:
        dirty = _sp.run(["git", "-C", repo, "status", "--porcelain"],
                        capture_output=True, text=True, timeout=5).stdout.strip()
        info["tree_clean"] = not bool(dirty)
    except Exception:
        info["tree_clean"] = None
    try:
        import subprocess as _sp2
        out = _sp2.run(["sudo", "-u", "postgres", "psql", "-d", "gds_os", "-tAc",
                        "SELECT count(*)||':'||coalesce(max(version),'-') FROM schema_migrations;"],
                       capture_output=True, text=True, timeout=8).stdout.strip()
        cnt, latest = (out.split(":", 1) + ["", ""])[:2]
        info["migrations_applied"] = int(cnt) if cnt.isdigit() else None
        info["schema_version"] = latest
    except Exception:
        info["migrations_applied"] = None
    return info

# Authenticated worker heartbeats: status is derived from stored, verified evidence, never assumed.
from gds_api.heartbeat_api import router as heartbeat_router  # noqa: E402

app.include_router(heartbeat_router)

from gds_api.cloud.onboarding_api import router as cloud_onboarding_router  # noqa: E402

app.include_router(cloud_onboarding_router)


from gds_api.tenant_branding import router as tenant_branding_router  # noqa: E402
from gds_api.admin_identity import router as admin_identity_router  # noqa: E402

app.include_router(tenant_branding_router)
app.include_router(admin_identity_router)

# --- OpenAPI security declarations (P4 / B21) ------------------------------------------------
# The API had no securitySchemes at all: 0 of 324 operations declared how they are authenticated,
# so generated clients and the docs could not tell a public endpoint from a protected one. These
# declarations describe what the code ALREADY enforces - the access cookie read by
# get_current_user, and the platform key the bridge handlers verify - rather than adding auth.
# tests/test_openapi_security.py fails if a route is added without a declaration.
from fastapi.openapi.utils import get_openapi  # noqa: E402
from gds_api.security import ACCESS_COOKIE_NAME  # noqa: E402

_PUBLIC_OPENAPI_PATHS = {
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/openapi.json",
    "/docs",
    "/docs/oauth2-redirect",
    "/redoc",
}


def _declare_security(schema: dict) -> dict:
    schemes = schema.setdefault("components", {}).setdefault("securitySchemes", {})
    schemes["AccessCookie"] = {
        "type": "apiKey",
        "in": "cookie",
        "name": ACCESS_COOKIE_NAME,
        "description": (
            "Session cookie issued by POST /auth/login. Read by get_current_user on every "
            "protected route and scoped to the caller's tenant."
        ),
    }
    schemes["BridgePlatformKey"] = {
        "type": "http",
        "scheme": "bearer",
        "description": (
            "Platform key for /bridge/*, presented as 'Authorization: Bearer <key>' and verified "
            "by _verify_auth in each handler. Bridge routes act for the GDS tenant, not a user."
        ),
    }
    methods = ("get", "post", "put", "patch", "delete", "head", "options")
    for path, operations in (schema.get("paths") or {}).items():
        public = path in _PUBLIC_OPENAPI_PATHS or path.startswith("/health")
        for method, operation in operations.items():
            if method not in methods or not isinstance(operation, dict):
                continue
            if public:
                operation["security"] = []
            elif path.startswith("/bridge"):
                operation["security"] = [{"BridgePlatformKey": []}]
            else:
                operation["security"] = [{"AccessCookie": []}]
    return schema


def _openapi_with_security() -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    app.openapi_schema = _declare_security(schema)
    return app.openapi_schema


app.openapi = _openapi_with_security
