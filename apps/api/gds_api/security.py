"""Password hashing, JWT issuance/verification, and the current-user/permission
dependencies every protected route uses. No agent or route may bypass these — see
CLAUDE.md's "do not weaken authentication or bypass policy checks" rule.
"""

import hashlib
import secrets
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.config import settings
from gds_api.db import get_db
from gds_api.models import Role, User

ACCESS_COOKIE_NAME = "gds_access_token"
REFRESH_COOKIE_NAME = "gds_refresh_token"
JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(*, user_id: uuid.UUID, tenant_id: uuid.UUID) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_access_token_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, str]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session") from exc
    return payload


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def set_auth_cookies(response: Response, *, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        ACCESS_COOKIE_NAME,
        access_token,
        max_age=settings.jwt_access_token_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=settings.jwt_refresh_token_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/")


@dataclass
class CurrentUser:
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    role_id: uuid.UUID
    role_name: str
    permissions: list[str]


# --- API key authentication ---------------------------------------------------------------------
#
# A key is presented as `Authorization: Bearer gds_...`. It is hashed with SHA-256 and matched against
# api_keys.key_hash, which is the only form ever stored. The lookup runs BEFORE a tenant is known, so
# it binds gds.api_key_hash and the api_keys policy exposes exactly the row whose hash matches.

API_KEY_PREFIX = "gds_"


def _extract_api_key(authorization: str | None) -> str | None:
    """Return the presented key, or None if this request carries no key.

    Pure and deliberately strict: only a Bearer credential that starts with the platform prefix is
    treated as a key. Anything else returns None so the caller falls through to the normal 401 rather
    than to a confusing "invalid key" for what was simply a malformed header.
    """
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) != 2:
        return None
    scheme, credential = parts
    if scheme.lower() != "bearer":
        return None
    if not credential.startswith(API_KEY_PREFIX):
        return None
    return credential


def _hash_api_key(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def authenticate_api_key(request: Request, db: AsyncSession) -> CurrentUser | None:
    """Resolve an API key to a principal. Returns None when no key was presented.

    Raises 401 for a key that was presented but is unknown or revoked: silently falling back to
    "not authenticated" would hide a revoked credential being used.
    """
    from sqlalchemy import text as _sql

    raw = _extract_api_key(request.headers.get("authorization"))
    if raw is None:
        return None

    key_hash = _hash_api_key(raw)
    await db.execute(
        _sql("SELECT set_config('gds.api_key_hash', :h, false)"), {"h": key_hash}
    )
    row = (
        await db.execute(
            _sql(
                """
                SELECT id, tenant_id, key_prefix, scopes, created_by, revoked_at
                FROM api_keys WHERE key_hash = :h
                """
            ),
            {"h": key_hash},
        )
    ).first()

    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown API key")
    key_id, tenant_id, key_prefix, scopes, created_by, revoked_at = row
    if revoked_at is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "API key revoked")

    # Bind the tenant this key belongs to, exactly as a session would, so every FORCE-RLS table
    # downstream filters to the right tenant.
    await db.execute(
        _sql("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": str(tenant_id)}
    )
    await db.execute(
        _sql("UPDATE api_keys SET last_used_at = now() WHERE id = :kid"), {"kid": str(key_id)}
    )
    await db.commit()
    # The commit above ends this request's connection (NullPool), which discards every GUC set on it.
    # Anything later in the same request - the audit row a permission denial writes, for one - would
    # then run unbound and fail RLS. Re-bind the tenant so downstream statements stay scoped.
    await db.execute(
        _sql("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": str(tenant_id)}
    )

    return CurrentUser(
        user_id=created_by if created_by is not None else key_id,
        tenant_id=tenant_id,
        email=f"api-key:{key_prefix}",
        role_id=key_id,
        role_name="api_key",
        permissions=list(scopes or []),
    )


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> CurrentUser:
    token = request.cookies.get(ACCESS_COOKIE_NAME)
    if not token:
        # No session cookie: a machine caller may present an API key instead. The cookie always wins,
        # so the browser path is unchanged.
        api_key_user = await authenticate_api_key(request, db)
        if api_key_user is not None:
            return api_key_user
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_access_token(token)

    # Role/permissions are loaded fresh on every request (not trusted from the JWT) so a
    # role change or deactivation takes effect immediately, not just after token expiry.
    user_id = uuid.UUID(payload["sub"])
    # R2.1 auth bootstrap: users and roles are FORCE-RLS protected and this lookup happens
    # BEFORE the tenant is known (the tenant comes FROM this row). The token subject is the
    # only identity available, so bind it as the principal: the users/roles policies allow
    # exactly the row whose id matches. Nothing broader is exposed.
    from sqlalchemy import text as _boot_text

    await db.execute(
        _boot_text("SELECT set_config('gds.principal_id', :pid, false)"),
        {"pid": str(user_id)},
    )
    result = await db.execute(
        select(User, Role).join(Role, User.role_id == Role.id).where(User.id == user_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    user, role = row
    if not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User is deactivated")

    from gds_api.logging_config import bind_request_context  # local import avoids a cycle

    bind_request_context(tenant_id=str(user.tenant_id), user_id=str(user.id))

    # R2 tenant isolation: bind gds.tenant_id on this request's session so tables with
    # FORCE ROW LEVEL SECURITY filter correctly. FastAPI caches get_db per request, so this
    # is the same session the handler receives. Session-level (is_local=false) so the
    # context survives a commit; NullPool discards the connection when the request ends.
    from sqlalchemy import text as _sql_text  # local import avoids an import cycle

    await db.execute(
        _sql_text("SELECT set_config('gds.tenant_id', :tid, false)"),
        {"tid": str(user.tenant_id)},
    )

    return CurrentUser(
        user_id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        role_id=role.id,
        role_name=role.name,
        permissions=list(role.permissions),
    )


def require_permission(
    permission: str,
) -> Callable[[CurrentUser, AsyncSession], Awaitable[CurrentUser]]:
    async def _dependency(
        current_user: CurrentUser = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> CurrentUser:
        # A role holding the wildcard holds every permission. The check used to be literal, so the platform
        # owner's role - which carries 75 permissions including "*" - was refused every gate naming a
        # permission it did not also hold by name (users:manage and tenants:manage among them). Measured
        # 22 Nov 2026: admin holds "*"; analyst, assessment_runner and platform_owner do not.
        granted = permission in current_user.permissions or "*" in current_user.permissions
        if not granted:
            from gds_api.audit import record_audit_event  # local import avoids a cycle

            await record_audit_event(
                db,
                tenant_id=current_user.tenant_id,
                user_id=current_user.user_id,
                action="rbac.permission_denied",
                detail={"required_permission": permission,
                        "held_wildcard": "*" in current_user.permissions},
            )
            await db.commit()
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Missing permission: {permission}")
        return current_user

    return _dependency
