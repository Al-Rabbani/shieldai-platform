"""An approval must authorise exactly the scope a human approved, and standing reuse must be bounded.

Three measured facts on 25 Nov 2026 drove this file:

  1. The reuse query matched tenant, capability and tool but NOT the target or the requesting agent, so a
     request approved for one host could be reused for another: reevaluate_capability_request would re-check
     the OLD target while the wrapper executed the caller's NEW one.

  2. Reuse was pinned to capability_requests.mission_id, so an approval could never be consumed by a later
     mission and every campaign minted fresh requests, which is why the five-stage workflow could not run
     unattended past an approval-gated stage.

  3. The first attempt to fix (2) let the reuse query return another mission's request. That fails the
     execution chain's binding check, because a decision is bound to the mission that executes it. So the two
     queries are now separate and cannot disagree: APPROVAL_REUSE_SQL stays inside one mission, and
     STANDING_CARRY_SQL finds a live standing approval so the NEW mission gets its OWN approval.

These tests execute both real queries against real rows.
"""
from __future__ import annotations

import asyncio
import os
import pathlib
import re
import uuid

import pytest

from gds_api.reasoning.approval_scope import (
    APPROVAL_REUSE_SQL,
    STANDING_CARRY_SQL,
)

TENANT = uuid.UUID("2ec10dd0-e48e-4043-8c88-5998ba5e23b0")
MARK = "standing-approval test"
CAP = "network.port_scan"


async def _conn():
    """A connection that can write these fixtures.

    Two traps measured here: the socket path uses peer authentication, which fails for the user running the
    suite, so a DSN carrying a password is rebuilt onto 127.0.0.1 (scram); and these tables are FORCE RLS, so
    the tenant must be bound or an unbound session silently sees nothing.
    """
    import asyncpg
    from urllib.parse import quote, urlsplit, urlunsplit

    dsn = os.environ.get("GDS_TEST_DSN") or os.environ.get("DATABASE_URL") or os.environ.get("GDS_DATABASE_URL")
    if not dsn:
        try:
            text = pathlib.Path("/opt/.env").read_text()
        except OSError:
            text = ""
        found = re.search(r"^DATABASE_URL=(.+)$", text, re.M)
        dsn = found.group(1).strip() if found else None
    if dsn:
        parts = urlsplit(dsn)
        if parts.password:
            dsn = urlunsplit(parts._replace(
                netloc=f"{parts.username}:{quote(parts.password, safe='')}@127.0.0.1:5432"))
    try:
        conn = (await asyncpg.connect(dsn)) if dsn else await asyncpg.connect(
            user="postgres", database="gds_os", host="/var/run/postgresql")
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"no writable database connection available: {type(exc).__name__}")
    await conn.execute("SELECT set_config('gds.tenant_id', $1, false)", str(TENANT))
    return conn


async def _cleanup(conn):
    await conn.execute(
        "DELETE FROM capability_decisions WHERE request_id IN ("
        "  SELECT id FROM capability_requests WHERE purpose = $1)", MARK)
    await conn.execute("DELETE FROM capability_requests WHERE purpose = $1", MARK)
    await conn.execute("DELETE FROM approvals WHERE action_description = $1", MARK)
    await conn.execute("DELETE FROM missions WHERE objective = $1", MARK)


async def _fixture(conn, *, tool, target, agent, status, standing=False, until="now() + interval '1 hour'"):
    user = await conn.fetchval("SELECT id FROM users LIMIT 1")
    mission = await conn.fetchval(
        "INSERT INTO missions (id, tenant_id, requested_by_user_id, objective, status, mission_type) "
        "VALUES (gen_random_uuid(), $1, $2, $3, 'running', 'test') RETURNING id", TENANT, user, MARK)
    request = await conn.fetchval(
        "INSERT INTO capability_requests (id, tenant_id, user_id, mission_id, requesting_agent_id, "
        "capability_key, requested_tool_id, target_type, target_reference, target_scope, purpose, "
        "requested_parameters_safe, requested_at) "
        "VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'host', "
        "$7::varchar, $7::text, $8, '{}'::jsonb, now()) "
        "RETURNING id", TENANT, user, mission, agent, CAP, tool, target, MARK)
    approval = await conn.fetchval(
        "INSERT INTO approvals (id, tenant_id, requested_by_user_id, risk_class, action_description, status) "
        "VALUES (gen_random_uuid(), $1, $2, 'R4', $3, $4) RETURNING id", TENANT, user, MARK, status)
    if standing:
        await conn.execute(
            f"UPDATE approvals SET standing = TRUE, standing_until = {until} WHERE id = $1", approval)
    await conn.execute(
        "INSERT INTO capability_decisions (id, request_id, tenant_id, decision, capability_key, "
        "capability_version, authoritative_risk_class, evaluated_tenant_id, evaluated_user_id, "
        "evaluated_mission_id, approval_required, target_authorisation_required, connector_checks, "
        "credential_checks, emergency_stop_check, rate_limit_check, policy_checks, decision_trace, "
        "policy_version, approval_id, decided_at) "
        "VALUES (gen_random_uuid(), $1, $2, 'ALLOW', $3, '1.0', 'R4', $2, $4, $5, TRUE, "
        "TRUE, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'test', $6, now())",
        request, TENANT, CAP, user, mission, approval)
    return {"mission": mission, "request": request, "approval": approval}


def _to_positional(sql: str, values: dict):
    """Both queries are written with :named placeholders for SQLAlchemy; asyncpg wants $1..$n.

    Placeholders are numbered by FIRST APPEARANCE, which is how SQLAlchemy compiles them, so this executes the
    same text the wrapper executes rather than a hand-copied variant.
    """
    order: list[str] = []

    def repl(m):
        name = m.group(1)
        if name not in order:
            order.append(name)
        return f"${order.index(name) + 1}"

    text = re.sub(r":([a-z_][a-z0-9_]*)", repl, sql)
    return text, tuple(values[n] for n in order)


async def _reuse(conn, *, mission, tool, target, agent):
    text, args = _to_positional(APPROVAL_REUSE_SQL, {
        "tid": str(TENANT), "mid": str(mission), "ck": CAP, "tool": tool,
        "agent": agent, "tref": target})
    return await conn.fetchval(text, *args)


async def _carry(conn, *, tool, target, agent):
    text, args = _to_positional(STANDING_CARRY_SQL, {
        "tid": str(TENANT), "ck": CAP, "tool": tool, "agent": agent, "tref": target})
    return await conn.fetchrow(text, *args)


def test_a_different_target_never_reuses_an_approved_request():
    asyncio.run(_t1())


async def _t1():
    conn = await _conn()
    try:
        await _cleanup(conn)
        fx = await _fixture(conn, tool="nmap_scan", target="host-a.example", agent="red_team", status="approved")
        same = await _reuse(conn, mission=fx["mission"], tool="nmap_scan", target="host-a.example", agent="red_team")
        other = await _reuse(conn, mission=fx["mission"], tool="nmap_scan", target="host-b.example", agent="red_team")
        assert same == fx["request"], "the same scope must reuse its own request"
        assert other is None, "an approval for host A must not authorise host B"
    finally:
        await _cleanup(conn)
        await conn.close()


def test_a_different_agent_never_reuses_an_approved_request():
    asyncio.run(_t2())


async def _t2():
    conn = await _conn()
    try:
        await _cleanup(conn)
        fx = await _fixture(conn, tool="nmap_scan", target="host-c.example", agent="red_team", status="approved")
        other = await _reuse(conn, mission=fx["mission"], tool="nmap_scan", target="host-c.example",
                             agent="vulnerability_assessment")
        assert other is None, "an approval for one agent must not authorise another"
    finally:
        await _cleanup(conn)
        await conn.close()


def test_reuse_never_crosses_a_mission_even_under_a_standing_approval():
    """A decision is bound to the mission that executes it, so reuse must stay inside one mission."""
    asyncio.run(_t3())


async def _t3():
    conn = await _conn()
    try:
        await _cleanup(conn)
        await _fixture(conn, tool="nmap_scan", target="host-d.example", agent="red_team",
                       status="approved", standing=True)
        reused = await _reuse(conn, mission=uuid.uuid4(), tool="nmap_scan", target="host-d.example",
                              agent="red_team")
        assert reused is None, "another mission's request must never be handed to this one"
    finally:
        await _cleanup(conn)
        await conn.close()


def test_a_live_standing_approval_is_found_for_the_same_scope():
    asyncio.run(_t4())


async def _t4():
    conn = await _conn()
    try:
        await _cleanup(conn)
        fx = await _fixture(conn, tool="nmap_scan", target="host-e.example", agent="red_team",
                            status="approved", standing=True)
        carried = await _carry(conn, tool="nmap_scan", target="host-e.example", agent="red_team")
        assert carried is not None, "a live standing approval must be found"
        assert carried["standing_approval_id"] == fx["approval"]
    finally:
        await _cleanup(conn)
        await conn.close()


def test_an_expired_standing_approval_is_not_carried():
    asyncio.run(_t5())


async def _t5():
    conn = await _conn()
    try:
        await _cleanup(conn)
        await _fixture(conn, tool="nmap_scan", target="host-f.example", agent="red_team",
                       status="approved", standing=True, until="now() - interval '1 minute'")
        assert await _carry(conn, tool="nmap_scan", target="host-f.example", agent="red_team") is None, \
            "outside its window a standing approval authorises nothing"
    finally:
        await _cleanup(conn)
        await conn.close()


def test_a_non_standing_approval_is_never_carried():
    asyncio.run(_t6())


async def _t6():
    conn = await _conn()
    try:
        await _cleanup(conn)
        await _fixture(conn, tool="nmap_scan", target="host-g.example", agent="red_team", status="approved")
        assert await _carry(conn, tool="nmap_scan", target="host-g.example", agent="red_team") is None, \
            "without standing, an approval belongs to its own mission only"
    finally:
        await _cleanup(conn)
        await conn.close()


def test_a_standing_approval_for_another_target_is_not_carried():
    asyncio.run(_t7())


async def _t7():
    conn = await _conn()
    try:
        await _cleanup(conn)
        await _fixture(conn, tool="nmap_scan", target="host-h.example", agent="red_team",
                       status="approved", standing=True)
        assert await _carry(conn, tool="nmap_scan", target="host-i.example", agent="red_team") is None, \
            "a standing approval must never widen to another host"
    finally:
        await _cleanup(conn)
        await conn.close()
