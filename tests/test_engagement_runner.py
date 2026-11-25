"""An authorised engagement must be executable, and every refusal must be visible.

A draft engagement was a plan nothing could run. These guards pin the parts that decide what happens to a live
target, and the three defects found only by running it against the real estate on 25 Nov 2026: one role was
driven for every technique (refused), offensive capabilities demanded an approval nobody had asked for, and
nothing bounded a scanner that does not return.
"""
from gds_api.pentest.engagement_runner import (
    AGENT_FOR_TOOL,
    IMPLEMENTED_TECHNIQUES,
    PER_TOOL_SECONDS,
    _url_for,
    plan_for_target,
)


def test_only_implemented_techniques_are_claimed():
    assert IMPLEMENTED_TECHNIQUES == ("recon", "vulnerability_scan")


def test_a_domain_earns_dns_then_headers_then_a_scan():
    steps = plan_for_target({"target": "app.example.com", "target_type": "domain"},
                            {"recon", "vulnerability_scan"})
    assert [s["tool"] for s in steps] == ["recon_dns_enumeration", "security_headers_check", "nuclei_scan"]


def test_a_host_gets_no_dns_step():
    steps = plan_for_target({"target": "www.example.com", "target_type": "host"},
                            {"recon", "vulnerability_scan"})
    assert [s["tool"] for s in steps] == ["security_headers_check", "nuclei_scan"]


def test_a_technique_the_engagement_did_not_allow_is_never_planned():
    steps = plan_for_target({"target": "www.example.com", "target_type": "host"}, {"recon"})
    assert "nuclei_scan" not in [s["tool"] for s in steps]


def test_every_planned_tool_has_a_role_that_holds_it():
    """Driving all techniques through one coordinator was refused: 'not authorised to request this capability'."""
    for ttype in ("domain", "host"):
        for step in plan_for_target({"target": "x.example.com", "target_type": ttype},
                                    set(IMPLEMENTED_TECHNIQUES)):
            assert step["tool"] in AGENT_FOR_TOOL, f"{step['tool']} has no owning role"


def test_the_url_is_built_once_and_never_doubled():
    assert _url_for("www.example.com", "host") == "https://www.example.com"
    assert _url_for("https://www.example.com/", "host") == "https://www.example.com"
    assert _url_for("http://x.example.com", "domain") == "http://x.example.com"


def test_a_hung_scanner_is_bounded():
    """A nuclei run against these hosts measured 3.5 minutes; 240s abandoned it mid-run."""
    assert PER_TOOL_SECONDS >= 300


def test_authorisation_is_rechecked_at_run_time_not_at_creation():
    """An engagement created while a target was valid must not run after that authorisation expired."""
    import inspect

    from gds_api.pentest.engagement_runner import execute_engagement

    src = inspect.getsource(execute_engagement)
    assert "valid_from" in src and "valid_until" in src
    assert "a.status = 'active'" in src
    assert "refused_targets" in src, "an unusable target must be named, not silently dropped"


def test_the_engagement_authorisation_requires_the_same_human():
    """The approval may only be derived from the engagement when one person authorised both it and the target."""
    import inspect

    from gds_api.pentest.engagement_runner import execute_engagement

    src = inspect.getsource(execute_engagement)
    assert "same_authoriser" in src
    assert "authorized_by_user_id" in src
