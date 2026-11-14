"""Dependency health checks with protocol verification and bounded timeouts.

Public results deliberately omit raw exception text, which can contain credentials
or internal connection details. Process liveness and dependency readiness are separate.
"""

import asyncio
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

import httpx

from gds_api.config import settings


@dataclass
class ServiceHealth:
    name: str
    status: str  # "healthy" | "unhealthy"
    detail: str
    latency_ms: float


async def _timed(name: str, check: Callable[[], Awaitable[str]]) -> ServiceHealth:
    start = time.perf_counter()
    try:
        # 8s, not 3s: Docker Desktop on Windows proxies container ports through its
        # WSL2 VM, and a fresh connection (auth handshake included, for postgres/neo4j)
        # routinely takes 1.5-2.5s here even when the service is perfectly healthy.
        # A tighter timeout produced flaky false "unhealthy" reports under concurrent load.
        detail = await asyncio.wait_for(check(), timeout=8.0)
        return ServiceHealth(
            name=name,
            status="healthy",
            detail=detail,
            latency_ms=round((time.perf_counter() - start) * 1000, 1),
        )
    except Exception as exc:  # noqa: BLE001 - deliberately broad: surface any failure as unhealthy
        return ServiceHealth(
            name=name,
            status="unhealthy",
            detail=f"{type(exc).__name__}: dependency check failed",
            latency_ms=round((time.perf_counter() - start) * 1000, 1),
        )


async def _check_postgres() -> str:
    import asyncpg

    conn = await asyncpg.connect(dsn=settings.postgres_dsn)
    try:
        await conn.fetchval("SELECT 1")
    finally:
        await conn.close()
    return "connected, SELECT 1 ok"


async def _check_redis() -> str:
    from redis.asyncio import Redis

    client: Redis = Redis(host=settings.redis_host, port=settings.redis_port)
    try:
        pong = await client.ping()
    finally:
        await client.aclose()
    return f"ping ok ({pong})"


async def _check_neo4j() -> str:
    from neo4j import AsyncGraphDatabase

    driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
    )
    try:
        await driver.verify_connectivity()
    finally:
        await driver.close()
    return "bolt connectivity verified"


async def _check_qdrant() -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{settings.qdrant_url}/healthz")
        resp.raise_for_status()
    return "healthz ok"


async def _check_minio() -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{settings.minio_url}/minio/health/live")
        resp.raise_for_status()
    return "health/live ok"


async def _tcp_check(host: str, port: int) -> str:
    reader, writer = await asyncio.open_connection(host, port)
    writer.close()
    await writer.wait_closed()
    return f"tcp connect ok ({host}:{port})"


async def _check_temporal() -> str:
    # A listening Docker proxy is not proof that the workflow service is ready.
    # Client.connect performs the real Temporal gRPC system-info handshake.
    from gds_api.temporal_client import get_temporal_client

    await get_temporal_client()
    return "Temporal gRPC handshake verified"


async def _check_nats() -> str:
    reader, writer = await asyncio.open_connection(settings.nats_host, settings.nats_port)
    try:
        greeting = await reader.readline()
        if not greeting.startswith(b"INFO "):
            raise RuntimeError("NATS protocol greeting unavailable")
        writer.write(b"PING\r\n")
        await writer.drain()
        for _ in range(8):
            reply = (await reader.readline()).strip()
            if reply == b"PONG":
                return "NATS protocol PING/PONG verified"
            if not reply or reply.startswith(b"-ERR"):
                raise RuntimeError("NATS protocol check rejected")
        raise RuntimeError("NATS protocol PONG unavailable")
    finally:
        writer.close()
        await asyncio.wait_for(writer.wait_closed(), timeout=1.0)


CHECKS: dict[str, Callable[[], Awaitable[str]]] = {
    "postgres": _check_postgres,
    "redis": _check_redis,
    "neo4j": _check_neo4j,
    "qdrant": _check_qdrant,
    "temporal": _check_temporal,
    "nats": _check_nats,
    "minio": _check_minio,
}


async def _check_all_services_uncached() -> list[ServiceHealth]:
    results = await asyncio.gather(*(_timed(name, check) for name, check in CHECKS.items()))
    return list(results)


_cache: tuple[float, list[ServiceHealth]] | None = None
_CACHE_TTL_SECONDS = 3.0
_cache_lock = asyncio.Lock()


async def check_all_services() -> list[ServiceHealth]:
    """A real, short (3s) in-process cache over the 7 real per-service checks - found
    necessary during Phase 9 load testing, not a premature optimization: k6 at just 10
    concurrent VUs hitting GET /health measured a real p95 of ~19.6s (vs. ~1s for
    GET /missions/GET /agents under the same load), because every single request opened
    7 fresh connections (Postgres/Redis/Neo4j/Qdrant/MinIO plus 2 TCP checks) with no
    reuse, and Mission Control's homepage calls this on every page load. Infra health
    doesn't meaningfully change within 3 seconds, so serving a cached result for that
    window is honest, not stale-in-a-misleading-way - GET /health/live remains
    uncached and dependency-free for callers that specifically want a fresh liveness
    signal.

    The lock matters as much as the cache itself - a first version without it still
    measured the same ~18s p95 under the same k6 load, a real "cache stampede" bug
    caught only by re-running the load test after adding the cache, not assumed fixed
    from the code alone: with N concurrent requests all arriving during the same cache
    miss (exactly what 10 ramping VUs do), all N raced to call the real, slow uncached
    check independently instead of one call refreshing the cache for all of them. The
    lock makes every request during a miss wait for one real fetch and share its result,
    rather than opening 70 fresh connections at once for a single "cache miss" instant."""
    global _cache
    now = time.monotonic()
    if _cache is not None and (now - _cache[0]) < _CACHE_TTL_SECONDS:
        return _cache[1]

    async with _cache_lock:
        # Re-check inside the lock: another request may have already refreshed the
        # cache while this one was waiting to acquire it.
        now = time.monotonic()
        if _cache is not None and (now - _cache[0]) < _CACHE_TTL_SECONDS:
            return _cache[1]
        results = await _check_all_services_uncached()
        _cache = (now, results)
        return results
