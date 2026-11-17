"""Request-scoped structured logging + HTTP metrics: one JSON log line per request
(method, path, status, latency), a request_id bound to every log line emitted while
handling it (via gds_api.logging_config's contextvars, echoed back as X-Request-ID for
client-side correlation), and a real Prometheus counter/histogram observation per
request (gds_api.metrics).
"""

import time
import uuid
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from gds_api.logging_config import bind_request_context, clear_request_context, get_logger
from gds_api.security import ACCESS_COOKIE_NAME, decode_access_token
from gds_api.tenant_binding import use_tenant
from gds_api.metrics import http_request_duration_seconds, http_requests_total

_log = get_logger("gds_api.request")


def _route_path(request: Request) -> str:
    # The matched route's template (e.g. "/missions/{mission_id}"), not the resolved
    # path with a real UUID in it - using the raw path as a metric label would create
    # unbounded cardinality (one Prometheus time series per mission ever created).
    route = request.scope.get("route")
    return str(route.path) if route is not None else request.url.path


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = str(uuid.uuid4())
        bind_request_context(request_id=request_id)
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            _log.exception("request.failed", method=request.method, path=request.url.path)
            clear_request_context()
            raise

        duration_seconds = time.perf_counter() - start
        path_label = _route_path(request)
        http_requests_total.labels(
            method=request.method, path=path_label, status_code=str(response.status_code)
        ).inc()
        http_request_duration_seconds.labels(method=request.method, path=path_label).observe(
            duration_seconds
        )

        _log.info(
            "request.completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            latency_ms=round(duration_seconds * 1000, 2),
        )
        response.headers["X-Request-ID"] = request_id
        clear_request_context()
        return response


class TenantContextMiddleware(BaseHTTPMiddleware):
    """Scope each authenticated request to its tenant.

    Every FORCE-RLS table returns ZERO rows on a connection with no tenant bound, and db.py
    uses NullPool, so a route that commits and then reads (db.refresh after commit is the
    common case) resumes on a fresh, unbound connection and cannot see the row it just
    wrote. Measured live: deciding an approval returned HTTP 500 from db.refresh even though
    the decision had committed.

    Binding per request removes that whole class of bug instead of patching 61 call sites.
    The tenant comes from the same signed cookie the auth dependency verifies; an
    unauthenticated or invalid token simply leaves the request unscoped and the route's own
    auth denies it, so this can never widen access.
    """

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        token = request.cookies.get(ACCESS_COOKIE_NAME)
        if not token:
            return await call_next(request)
        try:
            tenant_id = decode_access_token(token).get("tenant_id")
        except Exception:  # noqa: BLE001 - an invalid token is the auth layer's problem, not ours
            return await call_next(request)
        if not tenant_id:
            return await call_next(request)
        with use_tenant(tenant_id):
            return await call_next(request)
