"""Small Redis INCR+EXPIRE rate limiter - no new third-party dependency (Redis is
already a first-class dependency via gds_api.memory), avoiding an unverified
compatibility/maintenance-risk package for what is a well-known ~20-line pattern.

Two flavors: ip_rate_limit (unauthenticated routes, keyed by client IP - protects
POST /auth/login against brute force) and tenant_rate_limit (authenticated routes,
keyed by tenant_id - protects POST /missions, which triggers real, metered Anthropic
API usage per call).
"""

import logging
from collections.abc import Awaitable, Callable

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis

from gds_api.config import settings
from gds_api.security import CurrentUser, get_current_user

_log = logging.getLogger(__name__)


def trips_for(limit: str) -> str:
    """The Redis key holding how many times one named limit has tripped. Named so tests and operators agree."""
    return f"ratelimit_hits:{limit}"


def _get_redis() -> Redis:
    # Fresh client per call, not a module-level singleton - same reasoning as
    # gds_api.memory._get_redis(): redis-py's connection pool binds to whichever event
    # loop first used it, which breaks across the test suite's asyncio.run()-per-test
    # pattern. Uvicorn only ever runs one loop, so this costs nothing there either.
    return Redis(host=settings.redis_host, port=settings.redis_port, decode_responses=True)


async def _check_and_increment(key: str, max_requests: int, window_seconds: int) -> None:
    async with _get_redis() as r:
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, window_seconds)
        if count > max_requests:
            # B20 requires brute force to be throttled AND logged, and until 21 Nov 2026 only the
            # first half was true: a trip raised 429 and left no trace anywhere, so an operator
            # reading the log could not tell an attack from ordinary traffic, and nothing counted
            # how often any limit fired. The trip is now recorded twice - a warning with a stable
            # event marker for the log, and a per-limit counter in Redis so the rate of trips can
            # be read without grepping, including for limits that fire rarely but matter.
            parts = key.split(":", 2)
            limit = parts[1] if len(parts) > 1 else key
            subject = parts[2] if len(parts) > 2 else "unknown"
            await r.incr(f"ratelimit_hits:{limit}")
            _log.warning(
                "rate limit exceeded: %s", limit,
                extra={
                    "event": "rate_limit.exceeded",
                    "limit": limit,
                    "subject": subject,
                    "count": count,
                    "max_requests": max_requests,
                    "window_seconds": window_seconds,
                },
            )
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Rate limit exceeded: max {max_requests} requests per {window_seconds}s",
            )


def ip_rate_limit(
    key_prefix: str, *, max_requests: int, window_seconds: int
) -> Callable[[Request], Awaitable[None]]:
    async def _dependency(request: Request) -> None:
        client_host = request.client.host if request.client else "unknown"
        await _check_and_increment(
            f"ratelimit:{key_prefix}:{client_host}", max_requests, window_seconds
        )

    return _dependency


def tenant_rate_limit(
    key_prefix: str, *, max_requests: int, window_seconds: int
) -> Callable[[CurrentUser], Awaitable[None]]:
    async def _dependency(current_user: CurrentUser = Depends(get_current_user)) -> None:
        await _check_and_increment(
            f"ratelimit:{key_prefix}:{current_user.tenant_id}", max_requests, window_seconds
        )

    return _dependency
