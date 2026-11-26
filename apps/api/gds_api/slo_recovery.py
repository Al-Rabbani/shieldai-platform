"""An alert about a condition that has healed must be closed.

MEASURED 26 Nov 2026: three slo_breach notifications sat open and the pager was re-delivering all of them on its
5/15/60 ladder - slack=200, email=200 on every rung - while one of the three described a condition that no longer
held. Scanner freshness was measured at 86% at 00:00 during a scan and read 100% within the hour, but nothing in the
platform ever closes a breach alert, so the owner was being paged about a healed objective and would be paged until he
acknowledged something that had stopped being true.

Closing is not the same as deleting: the row stays, acknowledged with a reason, because "it breached and then
recovered" is information. A new breach raises a new row, so a flapping objective is visible as a series rather than
being silently suppressed by the old one.
"""
from __future__ import annotations

from typing import Any

PREFIX = "slo_breach:"


def recovered_alert_types(report: dict[str, Any], open_types: list[str]) -> list[str]:
    """Open SLO alerts whose objective is not breached in this report, sorted for a stable log line.

    Only names under the slo_breach prefix are considered: this function must never close an alert raised by another
    writer that happens to be open at the same time.
    """
    breached = {
        f"{PREFIX}{objective.get('id')}"
        for objective in (report.get("objectives") or [])
        if objective.get("status") == "breached"
    }
    return sorted(
        alert_type
        for alert_type in set(open_types)
        if alert_type.startswith(PREFIX) and alert_type not in breached
    )


def recovery_note(alert_type: str, report: dict[str, Any]) -> str:
    """What to record on the row, naming the measurement that closed it."""
    objective_id = alert_type[len(PREFIX):]
    for objective in report.get("objectives") or []:
        if objective.get("id") == objective_id:
            return (
                f"recovered: {objective_id} is now {objective.get('status')} at "
                f"{objective.get('actual')} against a target of {objective.get('target')}"
            )
    return f"recovered: {objective_id} is no longer breached"
