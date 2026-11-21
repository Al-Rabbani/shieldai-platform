"""B20: brute force must be throttled AND logged. Only the first half was ever true.

The inventory item reads "Rate limiting on auth and expensive routes - done when brute force is throttled and logged".
Measured 21 Nov 2026: the throttling worked (login 10/min, refresh 10/min, register 5/min by IP; missions 20/hour by
tenant) but a trip raised 429 and left no trace anywhere. Nothing logged it and nothing counted it, so an operator
reading the log could not distinguish an attack from ordinary traffic, and no limit's trip rate could be measured.

Worse, gds_api/missions.py carried a comment saying this limiter was "already tested directly and for real in
tests/test_rate_limit.py". That file did not exist: the limiter had no tests at all, so the one place that claimed
coverage was the place asserting a file nobody had written. This file is that test file.

Also covered here: the five scan routes in security_tools_api.py (sast, dast, container, sbom, iac) were the only scan
triggers with no limit. Each runs a real scanner against a caller-named target, so a loop of them starves the host of
CPU and disk while every other expensive route was already limited.
"""
from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from gds_api import rate_limit  # noqa: E402


class FakeRedis:
    """Stands in for redis.asyncio.Redis so the limiter is tested without a server.

    Mirrors the two commands the limiter uses. incr() returns the post-increment value, which is what the
    real client returns and what the limiter's comparison against max_requests depends on.
    """

    def __init__(self) -> None:
        self.values: dict[str, int] = {}
        self.expiries: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.values[key] = self.values.get(key, 0) + 1
        return self.values[key]

    async def expire(self, key: str, seconds: int) -> bool:
        self.expiries[key] = seconds
        return True

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False


@pytest.fixture()
def redis(monkeypatch):
    fake = FakeRedis()
    monkeypatch.setattr(rate_limit, "_get_redis", lambda: fake)
    return fake


# ------------------------------------------------------------------ throttling still works
def test_requests_are_allowed_up_to_the_limit_then_refused(redis):
    key = "ratelimit:probe:1.2.3.4"
    for _ in range(3):
        asyncio.run(rate_limit._check_and_increment(key, 3, 60))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(rate_limit._check_and_increment(key, 3, 60))
    assert exc.value.status_code == 429


def test_the_window_is_set_on_the_first_request_only(redis):
    asyncio.run(rate_limit._check_and_increment("ratelimit:probe:a", 5, 60))
    asyncio.run(rate_limit._check_and_increment("ratelimit:probe:a", 5, 60))
    assert redis.expiries["ratelimit:probe:a"] == 60


def test_the_counter_is_per_subject(redis):
    asyncio.run(rate_limit._check_and_increment("ratelimit:probe:alice", 2, 60))
    asyncio.run(rate_limit._check_and_increment("ratelimit:probe:alice", 2, 60))
    asyncio.run(rate_limit._check_and_increment("ratelimit:probe:bob", 2, 60))
    assert redis.values["ratelimit:probe:alice"] == 2
    assert redis.values["ratelimit:probe:bob"] == 1


# ------------------------------------------------------------------ the half that was missing
def test_a_trip_is_logged_with_a_stable_event_marker(redis, caplog):
    key = "ratelimit:login:203.0.113.9"
    for _ in range(2):
        asyncio.run(rate_limit._check_and_increment(key, 2, 60))
    with caplog.at_level(logging.WARNING, logger="gds_api.rate_limit"):
        with pytest.raises(HTTPException):
            asyncio.run(rate_limit._check_and_increment(key, 2, 60))

    records = [r for r in caplog.records if getattr(r, "event", None) == "rate_limit.exceeded"]
    assert len(records) == 1, "a refused request must leave exactly one record, not zero and not a flood"
    rec = records[0]
    assert rec.levelno == logging.WARNING
    assert rec.limit == "login"
    assert rec.subject == "203.0.113.9", "the log must name who was throttled or it cannot support an investigation"
    assert rec.count == 3 and rec.max_requests == 2 and rec.window_seconds == 60
    # The formatter is "%(message)s", so the written line must carry the facts itself. A record that only
    # holds them in `extra` produces "rate limit exceeded: login" in the file, which supports nothing.
    rendered = rec.getMessage()
    assert "subject=203.0.113.9" in rendered
    assert "count=3" in rendered and "max=2" in rendered


def test_a_trip_is_counted_so_its_rate_can_be_read_without_grepping(redis):
    key = "ratelimit:register:198.51.100.4"
    for _ in range(3):
        with pytest.raises(HTTPException):
            asyncio.run(rate_limit._check_and_increment(key, 0, 60))
    assert redis.values[rate_limit.trips_for("register")] == 3


def test_an_allowed_request_is_not_logged_as_a_trip(redis, caplog):
    with caplog.at_level(logging.WARNING, logger="gds_api.rate_limit"):
        asyncio.run(rate_limit._check_and_increment("ratelimit:login:192.0.2.7", 10, 60))
    assert not [r for r in caplog.records if getattr(r, "event", None) == "rate_limit.exceeded"], (
        "logging ordinary traffic as an attack would make the signal useless"
    )


# ------------------------------------------------------------------ the expensive routes
def test_the_five_scan_routes_carry_the_limit():
    """They were the only scan triggers with none: each runs a real scanner against a named target."""
    from gds_api import security_tools_api as st

    limited = {
        route.path
        for route in st.router.routes
        if any(d.dependency is st.scan_rate_limit for d in route.dependencies)
    }
    for path in ("/sast", "/dast", "/container", "/sbom", "/iac"):
        assert any(p.endswith(path) for p in limited), (
            f"{path} runs a real scanner and must be rate limited; limited routes are {sorted(limited)}"
        )


def test_the_scan_limit_is_named_and_generous_enough_for_real_use():
    from gds_api import security_tools_api as st

    assert st.scan_rate_limit is not None
    src = (ROOT / "apps" / "api" / "gds_api" / "security_tools_api.py").read_text(encoding="utf-8")
    assert 'tenant_rate_limit("security_scan", max_requests=30, window_seconds=3600)' in src, (
        "a limit tight enough to break a real scan sweep would be worse than none"
    )


def test_the_comment_that_claimed_this_file_exists_now_tells_the_truth():
    src = (ROOT / "apps" / "api" / "gds_api" / "missions.py").read_text(encoding="utf-8")
    assert "tests/test_rate_limit.py" in src
    assert (ROOT / "tests" / "test_rate_limit.py").exists(), (
        "missions.py names this file; if it is deleted the claim in the code becomes false again"
    )
