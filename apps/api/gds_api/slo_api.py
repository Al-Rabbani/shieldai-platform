"""Service level objectives, measured from the platform's own telemetry.

MEASURED BEFORE THIS (25 Nov 2026): the platform sells SLA tiers to MSSP customers, and it had no statement of its
own service level anywhere in the product. Prometheus had been scraping the API since 19 Nov
(gds_http_requests_total, gds_http_request_duration_seconds), scan_runs had recorded every scanner run since 23 Nov,
and missions and approvals held their own outcomes, but nothing joined them into an answer to "are we meeting what
we promise".

DESIGN RULES, each of which is a way this kind of page usually lies:
  1. A missing measurement is reported as `unmeasured` with a reason, never as 0% and never as 100%. Prometheus
     being down must not read as perfect availability.
  2. Every objective states its BASIS: where the number comes from and what it excludes. Availability here counts
     only requests the API itself answered, so a request that never reached it (nginx 502/504, host down, DNS) is
     outside the measurement and is listed as a blind spot rather than folded into a flattering number.
  3. A window longer than the available history is not asserted. The response carries the first sample Prometheus
     holds and the longest window that can honestly be claimed, so a 24 hour objective on six days of history says
     so instead of implying a month of compliance.
  4. Tenant-scoped objectives say so. API counters carry no tenant label, so availability and latency are
     platform-wide; scanner freshness, mission success and approval timeliness are read under the caller's tenant.
  5. A ratio objective is measured against a threshold that exists in the data. The latency histogram has fixed
     bucket boundaries and no bucket at 800 ms, so asking for the share under 800 ms silently returns nothing;
     latency is therefore stated as a p95, which the histogram can answer exactly.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import text

from gds_api.db import get_db
from gds_api.scan_health_api import _verdict
from gds_api.security import CurrentUser, require_permission

router = APIRouter(prefix="/slo", tags=["slo"])

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://127.0.0.1:9090")
_PROM_TIMEOUT = 5.0

# An objective within this fraction of its budget left is still met but close enough to say so.
_AT_RISK_BUDGET_PCT = 25.0

# Approval timeliness has no per-row deadline in the approvals table, so the objective carries its own threshold
# and says that in its basis. 24 hours is the point at which an undecided request starts blocking someone's work.
_APPROVAL_THRESHOLD_HOURS = 24

# Latency objective: the 95th percentile of API response time, in milliseconds.
_LATENCY_TARGET_MS = 800.0


def evaluate_higher(actual: float | None, target: float) -> dict[str, Any]:
    """Status, remaining budget and shortfall for a "higher is better" ratio objective (shares, percentages)."""
    if actual is None:
        return {"status": "unmeasured", "budget_remaining_pct": None, "shortfall": None}
    if actual >= target:
        # The allowance is (1 - target). At exactly the target it is spent, so the objective is met but at risk;
        # only a perfect actual leaves the whole allowance untouched.
        span = 1.0 - target
        remaining = 100.0 if span <= 0 else max(0.0, min(100.0, (actual - target) / span * 100.0))
        status = "at_risk" if remaining <= _AT_RISK_BUDGET_PCT else "met"
        return {"status": status, "budget_remaining_pct": round(remaining, 2), "shortfall": 0.0}
    return {"status": "breached", "budget_remaining_pct": 0.0, "shortfall": round(target - actual, 6)}


def evaluate_lower(actual: float | None, target: float) -> dict[str, Any]:
    """Status and remaining budget for a "lower is better" objective (latency).

    At zero the budget is full, at the target it is empty, and above the target the objective is breached by the
    difference. Budget is deliberately not clamped to a percentage of the target: a p95 of 176 ms against an 800 ms
    target has spent under a quarter of the allowance, and that is the number worth showing.
    """
    if actual is None:
        return {"status": "unmeasured", "budget_remaining_pct": None, "shortfall": None}
    if target <= 0:
        return {"status": "unmeasured", "budget_remaining_pct": None, "shortfall": None}
    if actual <= target:
        remaining = max(0.0, min(100.0, (target - actual) / target * 100.0))
        status = "at_risk" if remaining <= _AT_RISK_BUDGET_PCT else "met"
        return {"status": status, "budget_remaining_pct": round(remaining, 2), "shortfall": 0.0}
    return {"status": "breached", "budget_remaining_pct": 0.0, "shortfall": round(actual - target, 3)}


def _objective(
    slo_id: str,
    name: str,
    question: str,
    target: float,
    actual: float | None,
    scope: str,
    window: str,
    basis: str,
    unit: str = "%",
    direction: str = "higher",
    detail: dict[str, Any] | None = None,
    unmeasured_reason: str | None = None,
) -> dict[str, Any]:
    verdict = (evaluate_lower if direction == "lower" else evaluate_higher)(actual, target)
    payload = {
        "id": slo_id,
        "name": name,
        "question": question,
        "scope": scope,
        "window": window,
        "direction": direction,
        "unit": unit,
        "target": round(target * (100.0 if unit == "%" else 1.0), 2),
        "actual": None if actual is None else round(actual * (100.0 if unit == "%" else 1.0), 2),
        "status": verdict["status"],
        "budget_remaining_pct": verdict["budget_remaining_pct"],
        "shortfall": None if verdict["shortfall"] is None else round(
            verdict["shortfall"] * (100.0 if unit == "%" else 1.0), 2),
        "basis": basis,
        "detail": detail or {},
    }
    if verdict["status"] == "unmeasured":
        payload["unmeasured_reason"] = unmeasured_reason or "no measurement was available"
    return payload


# ---------------------------------------------------------------------------------------------------------------
# Prometheus
# ---------------------------------------------------------------------------------------------------------------


async def _prom_scalar(client: httpx.AsyncClient, promql: str) -> tuple[float | None, str | None]:
    """One instant query. Returns (value, None) or (None, reason). An empty result is 'no data', not zero."""
    try:
        response = await client.get("/api/v1/query", params={"query": promql})
        response.raise_for_status()
        body = response.json()
    except Exception as exc:  # noqa: BLE001 - the reason is reported, never swallowed
        return None, f"Prometheus did not answer ({type(exc).__name__})"
    if body.get("status") != "success":
        return None, f"Prometheus refused the query ({str(body.get('error'))[:120]})"
    result = body.get("data", {}).get("result") or []
    if not result:
        return None, "Prometheus holds no samples for this query"
    try:
        return float(result[0]["value"][1]), None
    except (KeyError, IndexError, TypeError, ValueError):
        return None, "Prometheus returned a value this reader could not parse"


async def _prom_first_sample(client: httpx.AsyncClient) -> datetime | None:
    """When the API counters were first scraped, so no window longer than that is asserted."""
    now = datetime.now(timezone.utc)
    try:
        response = await client.get(
            "/api/v1/query_range",
            params={
                "query": "sum(gds_http_requests_total)",
                "start": int((now - timedelta(days=30)).timestamp()),
                "end": int(now.timestamp()),
                "step": "6h",
            },
        )
        response.raise_for_status()
        body = response.json()
    except Exception:  # noqa: BLE001
        return None
    result = body.get("data", {}).get("result") or []
    if not result:
        return None
    values = result[0].get("values") or []
    if not values:
        return None
    try:
        return datetime.fromtimestamp(float(values[0][0]), tz=timezone.utc)
    except (TypeError, ValueError, IndexError):
        return None


async def _api_objectives() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Availability and latency, from the API's own Prometheus counters."""
    availability_basis = (
        "Share of API responses that were not 5xx, counted from the API's own Prometheus counters over 24 hours. "
        "Requests that never reached the API (nginx 502/504, host down, DNS failure) are outside this measurement."
    )
    latency_basis = (
        "95th percentile of API response time over 24 hours, from the API's own request-duration histogram. "
        "Time spent in nginx or on the network before the request arrives is not included."
    )
    measurement: dict[str, Any] = {
        "prometheus_url": PROMETHEUS_URL,
        "first_sample_at": None,
        "days_of_history": None,
        "longest_assertable_window": None,
    }
    objectives: list[dict[str, Any]] = []
    try:
        client = httpx.AsyncClient(base_url=PROMETHEUS_URL, timeout=_PROM_TIMEOUT)
    except Exception as exc:  # noqa: BLE001
        reason = f"Prometheus client could not be created ({type(exc).__name__})"
        objectives.append(_objective(
            "api_availability", "API availability", "Of the requests the API answered, how many succeeded?",
            0.995, None, "platform", "24h", availability_basis, unmeasured_reason=reason))
        objectives.append(_objective(
            "api_latency", "API responsiveness", "How fast is the 95th percentile response?",
            _LATENCY_TARGET_MS, None, "platform", "24h", latency_basis, unit="ms", direction="lower",
            unmeasured_reason=reason))
        return objectives, measurement

    async with client:
        first = await _prom_first_sample(client)
        if first:
            now = datetime.now(timezone.utc)
            days = (now - first).total_seconds() / 86400.0
            measurement["first_sample_at"] = first.isoformat()
            measurement["days_of_history"] = round(days, 2)
            measurement["longest_assertable_window"] = f"{int(days)}d" if days >= 1 else "<1d"

        total, total_err = await _prom_scalar(client, "sum(increase(gds_http_requests_total[24h]))")
        failures, _fail_err = await _prom_scalar(
            client, 'sum(increase(gds_http_requests_total{status_code=~"5.."}[24h]))'
        )
        if total is None or total <= 0:
            availability = None
            availability_reason = total_err or "no API requests were recorded in the last 24 hours"
            availability_detail: dict[str, Any] = {}
        else:
            availability = 1.0 - ((failures or 0.0) / total)
            availability_reason = None
            availability_detail = {
                "requests_counted": int(round(total)),
                "failed_requests": int(round(failures or 0.0)),
            }
        objectives.append(_objective(
            "api_availability", "API availability", "Of the requests the API answered, how many succeeded?",
            0.995, availability, "platform", "24h", availability_basis,
            detail=availability_detail, unmeasured_reason=availability_reason))

        p95, p95_err = await _prom_scalar(
            client, "histogram_quantile(0.95, sum(increase(gds_http_request_duration_seconds_bucket[24h])) by (le))"
        )
        requests_seen, seen_err = await _prom_scalar(
            client, "sum(increase(gds_http_request_duration_seconds_count[24h]))"
        )
        if p95 is None:
            latency = None
            latency_reason = p95_err or seen_err or "no request durations were recorded in the last 24 hours"
            latency_detail: dict[str, Any] = {}
        else:
            latency = p95 * 1000.0
            latency_reason = None
            latency_detail = {
                "requests_counted": None if requests_seen is None else int(round(requests_seen)),
                "threshold_ms": int(_LATENCY_TARGET_MS),
            }
        objectives.append(_objective(
            "api_latency", "API responsiveness", "How fast is the 95th percentile response?",
            _LATENCY_TARGET_MS, latency, "platform", "24h", latency_basis, unit="ms", direction="lower",
            detail=latency_detail, unmeasured_reason=latency_reason))

    return objectives, measurement


# ---------------------------------------------------------------------------------------------------------------
# Database-backed objectives, read under the caller's tenant
# ---------------------------------------------------------------------------------------------------------------


def scanner_objective(schedules: list[dict[str, Any]], last_runs: dict[str, datetime],
                      now: datetime) -> dict[str, Any]:
    """Share of registered scanners whose last run is recent enough that a dead one would be noticed.

    Fresh means the last run is within twice the registered interval. One missed run is normal on a busy host; two in
    a row means nothing is watching and the register is stale rather than quiet. A scanner with no recorded run at
    all is not fresh, and it is named.
    """
    basis = (
        "Share of registered scanners whose last recorded run is within twice their registered interval. A scanner "
        "with no run row reads as never run, because a run that leaves no record cannot be told apart from no run."
    )
    total = len(schedules)
    if total == 0:
        return _objective(
            "scanner_freshness", "Scanner freshness", "Is every registered scanner running on its interval?",
            1.0, None, "tenant", "now", basis, unmeasured_reason="no scanner schedules are registered")

    fresh, overdue, silent, never = [], [], [], []
    for row in schedules:
        name = row.get("name") or "unnamed"
        interval = row.get("interval_minutes")
        last = last_runs.get(name)
        if last is None:
            never.append(name)
            continue
        age_minutes = (now - last).total_seconds() / 60.0
        verdict = _verdict(age_minutes, interval)
        if verdict == "alive":
            fresh.append(name)
        elif verdict == "overdue":
            overdue.append(name)
        elif verdict == "silent":
            silent.append(name)
        else:
            never.append(name)

    actual = len(fresh) / total
    return _objective(
        "scanner_freshness", "Scanner freshness", "Is every registered scanner running on its interval?",
        1.0, actual, "tenant", "now", basis,
        detail={
            "registered": total,
            "fresh": fresh,
            "overdue": overdue,
            "silent": silent,
            "never_run": never,
        },
    )


_INTERNAL_MISSION_TYPES = ("warfare_stage",)


def _is_internal_mission(mission_type: str | None) -> bool:
    """A run the platform started to prove something to itself, not work an operator asked for.

    Campaign stages and the `*_proof` families are scaffolding: a stage is one step of a campaign that has its own
    record, and a proof run exists to verify a capability. Counting them would let the size of the test harness
    decide the service level, in both directions.
    """
    if not mission_type:
        return False
    return mission_type.endswith("_proof") or mission_type in _INTERNAL_MISSION_TYPES


def mission_objective(rows: list[dict[str, Any]], window_days: int = 7) -> dict[str, Any]:
    """Completed operator missions as a share of those that reached an outcome.

    Cancelled missions are excluded and counted: a cancellation is a decision, not an outcome the platform produced,
    and folding it into the denominator would let cancelling failures improve the number. Internal proof runs and
    campaign stages are excluded too, and both exclusions are named and counted in the detail so the number cannot
    be quietly improved by reclassifying work.
    """
    basis = (
        "Completed divided by completed plus failed, over the window, for missions an operator or schedule asked "
        "for. Cancelled missions, internal `*_proof` runs and campaign stages are excluded and counted separately: "
        "a cancellation is a decision, and the proof families exist to verify the platform rather than to serve a "
        "customer."
    )
    completed = failed = cancelled = 0
    failed_by_type: dict[str, int] = {}
    excluded_by_type: dict[str, int] = {}
    for row in rows:
        status = (row.get("status") or "").lower()
        mission_type = row.get("mission_type") or "(untyped)"
        if _is_internal_mission(row.get("mission_type")):
            excluded_by_type[mission_type] = excluded_by_type.get(mission_type, 0) + 1
            continue
        if status == "completed":
            completed += 1
        elif status == "failed":
            failed += 1
            failed_by_type[mission_type] = failed_by_type.get(mission_type, 0) + 1
        elif status == "cancelled":
            cancelled += 1
    decided = completed + failed
    actual = None if decided == 0 else completed / decided
    reason = None if decided else f"no operator mission completed or failed in the last {window_days} days"
    return _objective(
        "mission_success", "Mission success",
        "When an operator mission reaches an outcome, how often is it a completed one?",
        0.90, actual, "tenant", f"{window_days}d", basis,
        detail={
            "completed": completed,
            "failed": failed,
            "cancelled_excluded": cancelled,
            "failed_by_type": dict(sorted(failed_by_type.items(), key=lambda kv: -kv[1])),
            "internal_runs_excluded": sum(excluded_by_type.values()),
            "internal_runs_by_type": dict(sorted(excluded_by_type.items(), key=lambda kv: -kv[1])),
        },
        unmeasured_reason=reason,
    )


def approval_objective(rows: list[dict[str, Any]], window_days: int = 30,
                       threshold_hours: int = _APPROVAL_THRESHOLD_HOURS) -> dict[str, Any]:
    """Decided approvals whose decision came within the threshold.

    Approvals carry no per-row deadline, so the threshold is this objective's own definition and says so. Pending
    approvals are excluded from the ratio and reported with the age of the oldest, because a request nobody has
    decided is a queue problem rather than a timeliness failure, and hiding the queue inside the ratio would make
    both numbers wrong.
    """
    basis = (
        f"Decided approvals whose decision came within {threshold_hours} hours of the request, over the window. "
        f"The {threshold_hours} hours is this objective's own threshold: approvals carry no per-row deadline. "
        "Pending approvals are excluded and reported separately with the age of the oldest."
    )
    decided, within = 0, 0
    pending = 0
    oldest_pending_hours: float | None = None
    now = datetime.now(timezone.utc)
    for row in rows:
        status = (row.get("status") or "").lower()
        created = row.get("created_at")
        if status in ("pending", "requested", "awaiting_approval"):
            pending += 1
            if created is not None:
                age = (now - created).total_seconds() / 3600.0
                oldest_pending_hours = age if oldest_pending_hours is None else max(oldest_pending_hours, age)
            continue
        decided_at = row.get("decided_at")
        if decided_at is None or created is None:
            continue
        decided += 1
        if (decided_at - created).total_seconds() <= threshold_hours * 3600.0:
            within += 1
    actual = None if decided == 0 else within / decided
    reason = None if decided else f"no approval was decided in the last {window_days} days"
    return _objective(
        "approval_timeliness", "Approval timeliness",
        "When a request is decided, is the decision made within a day?",
        0.95, actual, "tenant", f"{window_days}d", basis,
        detail={
            "decided": decided,
            "within_threshold": within,
            "pending_excluded": pending,
            "oldest_pending_hours": None if oldest_pending_hours is None else round(oldest_pending_hours, 1),
            "threshold_hours": threshold_hours,
        },
        unmeasured_reason=reason,
    )


_BLIND_SPOTS = [
    "Availability and latency count only requests the API itself answered. A request that never reached it "
    "(nginx 502/504, host down, DNS failure) is outside this measurement.",
    "Latency is measured inside the API process. Time spent in nginx or on the network before the request arrives "
    "is not included.",
    "Scanner freshness reflects the schedules and runs recorded in the database. A scanner that ran but wrote no "
    "run row reads as never run.",
    "API objectives are platform-wide because the HTTP counters carry no tenant label. The other objectives are "
    "read under the caller's tenant and cover that tenant's data only.",
    "A window longer than the Prometheus history is not asserted. The response states the first sample held and the "
    "longest window that can be claimed.",
]


def overall_status(objectives: list[dict[str, Any]]) -> dict[str, Any]:
    counts: dict[str, int] = {}
    for objective in objectives:
        counts[objective["status"]] = counts.get(objective["status"], 0) + 1
    if counts.get("breached"):
        status = "breached"
    elif counts.get("at_risk"):
        status = "at_risk"
    elif objectives and counts.get("met") == len(objectives):
        status = "met"
    else:
        status = "unmeasured"
    return {
        "status": status,
        "objectives": len(objectives),
        "met": counts.get("met", 0),
        "at_risk": counts.get("at_risk", 0),
        "breached": counts.get("breached", 0),
        "unmeasured": counts.get("unmeasured", 0),
    }


@router.get("")
async def service_levels(
    current_user: CurrentUser = Depends(require_permission("monitoring:read")),
    db=Depends(get_db),
) -> dict[str, Any]:
    """The platform's service level objectives, each with its measurement, basis and status."""
    tenant = str(current_user.tenant_id)
    await db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": tenant})
    now = datetime.now(timezone.utc)

    api_objectives, measurement = await _api_objectives()

    schedules = (await db.execute(text(
        "SELECT name, monitor_type, interval_minutes, last_run_at, status FROM scan_schedules ORDER BY name"
    ))).mappings().all()
    run_rows = (await db.execute(text(
        "SELECT scanner, max(started_at) AS last_started FROM scan_runs GROUP BY scanner"
    ))).mappings().all()
    last_runs: dict[str, datetime] = {
        row["scanner"]: row["last_started"] for row in run_rows if row["last_started"] is not None
    }
    # A schedule's own stamp is a second, independent record of a run. Prefer the later of the two.
    for row in schedules:
        stamped = row.get("last_run_at")
        name = row.get("name")
        if stamped is None or name is None:
            continue
        current = last_runs.get(name)
        last_runs[name] = stamped if current is None or stamped > current else current

    mission_rows = (await db.execute(text(
        "SELECT status, mission_type FROM missions WHERE created_at >= :since"
    ), {"since": now - timedelta(days=7)})).mappings().all()

    approval_rows = (await db.execute(text(
        "SELECT status, created_at, decided_at FROM approvals WHERE created_at >= :since"
    ), {"since": now - timedelta(days=30)})).mappings().all()

    objectives = list(api_objectives)
    objectives.append(scanner_objective([dict(r) for r in schedules], last_runs, now))
    objectives.append(mission_objective([dict(r) for r in mission_rows]))
    objectives.append(approval_objective([dict(r) for r in approval_rows]))

    return {
        "generated_at": now.isoformat(),
        "tenant_id": tenant,
        "overall": overall_status(objectives),
        "measurement": measurement,
        "objectives": objectives,
        "blind_spots": _BLIND_SPOTS,
    }
