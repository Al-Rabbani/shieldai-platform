"""An alert about a condition that has healed must be closed, and only that kind of alert.

MEASURED 26 Nov 2026: three slo_breach notifications sat open and the pager re-delivered every one of them on its
5/15/60 ladder (slack=200, email=200 per rung) while one described a condition that had stopped being true. Scanner
freshness read 86% during a scan and 100% an hour later; nothing in the platform ever closed a breach alert.
"""
from gds_api.slo_recovery import PREFIX, recovered_alert_types, recovery_note


def report(*objectives):
    return {"objectives": [{"id": i, "status": s, "actual": a, "target": t} for i, s, a, t in objectives]}


def test_a_healed_objective_closes_its_alert():
    payload = report(("scanner_freshness", "met", 100.0, 100.0),
                     ("mission_success", "breached", 88.57, 90.0))
    assert recovered_alert_types(
        payload, ["slo_breach:scanner_freshness", "slo_breach:mission_success"]
    ) == ["slo_breach:scanner_freshness"]


def test_a_still_breached_objective_is_left_open():
    payload = report(("mission_success", "breached", 88.57, 90.0))
    assert recovered_alert_types(payload, ["slo_breach:mission_success"]) == []


def test_another_writers_alert_is_never_closed():
    payload = report(("scanner_freshness", "met", 100.0, 100.0))
    assert recovered_alert_types(
        payload, ["approval.awaiting_decision", "slo_breach:scanner_freshness"]
    ) == ["slo_breach:scanner_freshness"]


def test_an_unmeasured_objective_counts_as_recovered_rather_than_paging_forever():
    # "unmeasured" is not "breached": leaving it open would page about a number the platform is not asserting.
    payload = {"objectives": [{"id": "api_latency", "status": "unmeasured"}]}
    assert recovered_alert_types(payload, ["slo_breach:api_latency"]) == ["slo_breach:api_latency"]


def test_the_note_names_the_measurement_that_closed_it():
    payload = report(("scanner_freshness", "met", 100.0, 100.0))
    note = recovery_note("slo_breach:scanner_freshness", payload)
    assert "met" in note and "100.0" in note
    assert PREFIX in "slo_breach:scanner_freshness"


def test_the_prefix_is_what_the_writers_use():
    from gds_api.slo_api import breach_alerts

    payload = report(("mission_success", "breached", 88.57, 90.0))
    assert all(a["type"].startswith(PREFIX) for a in breach_alerts(payload))
