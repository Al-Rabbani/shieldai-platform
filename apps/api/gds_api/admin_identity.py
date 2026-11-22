"""Owner/admin portal: people, roles, machine credentials and tenant provisioning (step 10).

Until this module existed there was no way to add a person to the platform without a shell. The only
route in was `/auth/register`, which created a tenant and granted it `platform_owner` on the way past,
so every self-registered stranger became the owner of their own island and nobody could be onboarded
into an existing tenant at all.

Three rules this module keeps, learned the hard way on this platform:

  * Raw SQL with an explicit tenant predicate, never a trusted RLS predicate alone. A forced table
    with no tenant bound returns zero rows and looks like "no users", which is indistinguishable
    from a real empty result.
  * Bind the tenant BEFORE any write. `set_config(..., false)` is session-scoped and this app uses a
    NullPool, so a commit discards the connection and the next statement starts unbound.
  * A credential is shown once. Only a hash is stored, so a later read cannot recover a usable key.

Tenant listing is deliberately absent: `tenants` is FORCE-RLS and returns only the caller's own row,
so an endpoint that claimed to list every tenant would be reporting a scoped result as a complete
one. Provisioning is implemented because it can bind the new tenant before it writes.
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.db import get_db
from gds_api.security import CurrentUser, hash_password, require_permission
from gds_api.seed_data import ROLE_PERMISSIONS

router = APIRouter(prefix="/admin", tags=["admin-identity"])

CATALOGUE_PERMISSIONS = sorted({p for perms in ROLE_PERMISSIONS.values() for p in perms})


async def _bind(db: AsyncSession, tenant_id: uuid.UUID) -> None:
    await db.execute(
        text("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": str(tenant_id)}
    )


def _row(row) -> dict:
    return dict(row._mapping) if hasattr(row, "_mapping") else dict(row)


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    role: str | None = None
    is_active: bool
    created_at: datetime | None = None
    mfa_enabled: bool = False


class UserCreate(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=12, description="Minimum 12 characters")
    role: str = Field(description="A role that already exists in this tenant")


class UserPatch(BaseModel):
    role: str | None = None
    is_active: bool | None = None


class RoleOut(BaseModel):
    id: uuid.UUID
    name: str
    permissions: list[str]
    member_count: int = 0


class RoleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=64)
    permissions: list[str] = Field(default_factory=list)


class ApiKeyOut(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    created_at: datetime | None = None
    last_used_at: datetime | None = None
    revoked_at: datetime | None = None


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    scopes: list[str] = Field(default_factory=list)


class ApiKeyIssued(ApiKeyOut):
    key: str = Field(description="Shown once. It cannot be recovered later.")


class TenantCreated(BaseModel):
    tenant_id: uuid.UUID
    name: str
    slug: str
    owner_email: str
    role: str


class TenantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=60, pattern=r"^[a-z0-9][a-z0-9-]*$")
    owner_email: str = Field(min_length=3)
    owner_password: str = Field(min_length=12)


# ---------------------------------------------------------------- users


@router.get("/users", response_model=list[UserOut])
async def list_users(
    current_user: CurrentUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db),
) -> list[UserOut]:
    await _bind(db, current_user.tenant_id)
    rows = (
        await db.execute(
            text(
                """
                SELECT u.id, u.email, r.name AS role, u.is_active, u.created_at, u.mfa_enabled
                FROM users u
                LEFT JOIN roles r ON r.id = u.role_id AND r.tenant_id = u.tenant_id
                WHERE u.tenant_id = :tid
                ORDER BY u.created_at ASC
                """
            ),
            {"tid": str(current_user.tenant_id)},
        )
    ).fetchall()
    return [UserOut(**_row(r)) for r in rows]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    current_user: CurrentUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    await _bind(db, current_user.tenant_id)

    role = (
        await db.execute(
            text("SELECT id, name FROM roles WHERE tenant_id = :tid AND name = :name"),
            {"tid": str(current_user.tenant_id), "name": body.role},
        )
    ).fetchone()
    if not role:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Role '{body.role}' does not exist in this tenant. Known roles: "
            + ", ".join(sorted(ROLE_PERMISSIONS)),
        )

    existing = (
        await db.execute(
            text("SELECT 1 FROM users WHERE tenant_id = :tid AND lower(email) = lower(:email)"),
            {"tid": str(current_user.tenant_id), "email": body.email},
        )
    ).fetchone()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with that email already exists here.")

    user_id = uuid.uuid4()
    await db.execute(
        text(
            """
            INSERT INTO users (id, tenant_id, role_id, email, password_hash, is_active, created_at)
            VALUES (:id, :tid, :role_id, :email, :hash, true, now())
            """
        ),
        {
            "id": str(user_id),
            "tid": str(current_user.tenant_id),
            "role_id": str(role._mapping["id"]),
            "email": body.email,
            "hash": hash_password(body.password),
        },
    )
    await db.execute(
        text(
            """
            INSERT INTO audit_events (id, tenant_id, user_id, action, detail, created_at)
            VALUES (gen_random_uuid(), :tid, :actor, 'admin.user.created',
                    jsonb_build_object('email', :email, 'role', :role), now())
            """
        ),
        {
            "tid": str(current_user.tenant_id),
            "actor": str(current_user.user_id),
            "email": body.email,
            "role": body.role,
        },
    )
    await db.commit()

    return UserOut(
        id=user_id, email=body.email, role=body.role, is_active=True, created_at=None, mfa_enabled=False
    )


@router.patch("/users/{user_id}", response_model=UserOut)
async def patch_user(
    user_id: uuid.UUID,
    body: UserPatch,
    current_user: CurrentUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    await _bind(db, current_user.tenant_id)

    target = (
        await db.execute(
            text(
                """
                SELECT u.id, u.email, r.name AS role, u.is_active, u.created_at, u.mfa_enabled
                FROM users u LEFT JOIN roles r ON r.id = u.role_id AND r.tenant_id = u.tenant_id
                WHERE u.tenant_id = :tid AND u.id = :uid
                """
            ),
            {"tid": str(current_user.tenant_id), "uid": str(user_id)},
        )
    ).fetchone()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such user in this tenant.")

    if body.role is not None:
        role = (
            await db.execute(
                text("SELECT id FROM roles WHERE tenant_id = :tid AND name = :name"),
                {"tid": str(current_user.tenant_id), "name": body.role},
            )
        ).fetchone()
        if not role:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Role '{body.role}' does not exist here.")
        await db.execute(
            text("UPDATE users SET role_id = :rid WHERE tenant_id = :tid AND id = :uid"),
            {"rid": str(role._mapping["id"]), "tid": str(current_user.tenant_id), "uid": str(user_id)},
        )

    if body.is_active is not None:
        if user_id == current_user.user_id and body.is_active is False:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Refusing to deactivate the account making the request.",
            )
        await db.execute(
            text("UPDATE users SET is_active = :active WHERE tenant_id = :tid AND id = :uid"),
            {"active": body.is_active, "tid": str(current_user.tenant_id), "uid": str(user_id)},
        )

    await db.execute(
        text(
            """
            INSERT INTO audit_events (id, tenant_id, user_id, action, detail, created_at)
            VALUES (gen_random_uuid(), :tid, :actor, 'admin.user.updated',
                    jsonb_build_object('target', :target, 'role', :role, 'is_active', :active), now())
            """
        ),
        {
            "tid": str(current_user.tenant_id),
            "actor": str(current_user.user_id),
            "target": str(user_id),
            "role": body.role,
            "active": body.is_active,
        },
    )
    await db.commit()

    refreshed = (
        await db.execute(
            text(
                """
                SELECT u.id, u.email, r.name AS role, u.is_active, u.created_at, u.mfa_enabled
                FROM users u LEFT JOIN roles r ON r.id = u.role_id AND r.tenant_id = u.tenant_id
                WHERE u.tenant_id = :tid AND u.id = :uid
                """
            ),
            {"tid": str(current_user.tenant_id), "uid": str(user_id)},
        )
    ).fetchone()
    return UserOut(**_row(refreshed))


# ---------------------------------------------------------------- roles


@router.get("/roles", response_model=list[RoleOut])
async def list_roles(
    current_user: CurrentUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db),
) -> list[RoleOut]:
    await _bind(db, current_user.tenant_id)
    rows = (
        await db.execute(
            text(
                """
                SELECT r.id, r.name, r.permissions,
                       (SELECT count(*) FROM users u WHERE u.role_id = r.id AND u.tenant_id = r.tenant_id) AS member_count
                FROM roles r
                WHERE r.tenant_id = :tid
                ORDER BY r.name
                """
            ),
            {"tid": str(current_user.tenant_id)},
        )
    ).fetchall()
    return [
        RoleOut(
            id=r._mapping["id"],
            name=r._mapping["name"],
            permissions=list(r._mapping["permissions"] or []),
            member_count=r._mapping["member_count"],
        )
        for r in rows
    ]


@router.post("/roles", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def create_role(
    body: RoleCreate,
    current_user: CurrentUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db),
) -> RoleOut:
    await _bind(db, current_user.tenant_id)

    unknown = [p for p in body.permissions if p not in CATALOGUE_PERMISSIONS]
    if unknown:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unknown permission(s): {', '.join(sorted(unknown))}. A role may only hold permissions "
            "the platform actually enforces.",
        )

    taken = (
        await db.execute(
            text("SELECT 1 FROM roles WHERE tenant_id = :tid AND name = :name"),
            {"tid": str(current_user.tenant_id), "name": body.name},
        )
    ).fetchone()
    if taken:
        raise HTTPException(status.HTTP_409_CONFLICT, "A role with that name already exists here.")

    role_id = uuid.uuid4()
    await db.execute(
        text(
            """
            INSERT INTO roles (id, tenant_id, name, permissions, created_at)
            VALUES (:id, :tid, :name, cast(:perms AS jsonb), now())
            """
        ),
        {
            "id": str(role_id),
            "tid": str(current_user.tenant_id),
            "name": body.name,
            "perms": __import__("json").dumps(body.permissions),
        },
    )
    await db.execute(
        text(
            """
            INSERT INTO audit_events (id, tenant_id, user_id, action, detail, created_at)
            VALUES (gen_random_uuid(), :tid, :actor, 'admin.role.created',
                    jsonb_build_object('name', :name, 'permission_count', :count), now())
            """
        ),
        {
            "tid": str(current_user.tenant_id),
            "actor": str(current_user.user_id),
            "name": body.name,
            "count": len(body.permissions),
        },
    )
    await db.commit()

    return RoleOut(id=role_id, name=body.name, permissions=body.permissions, member_count=0)


@router.get("/permissions")
async def list_catalogue_permissions(
    current_user: CurrentUser = Depends(require_permission("users:manage")),
) -> dict:
    """The permissions a role may hold, so a UI offers real ones instead of free text."""
    return {"permissions": CATALOGUE_PERMISSIONS, "count": len(CATALOGUE_PERMISSIONS)}


# ---------------------------------------------------------------- api keys


def _hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@router.get("/api-keys", response_model=list[ApiKeyOut])
async def list_api_keys(
    current_user: CurrentUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db),
) -> list[ApiKeyOut]:
    await _bind(db, current_user.tenant_id)
    rows = (
        await db.execute(
            text(
                """
                SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
                FROM api_keys WHERE tenant_id = :tid ORDER BY created_at DESC
                """
            ),
            {"tid": str(current_user.tenant_id)},
        )
    ).fetchall()
    return [ApiKeyOut(**_row(r)) for r in rows]


@router.post("/api-keys", response_model=ApiKeyIssued, status_code=status.HTTP_201_CREATED)
async def issue_api_key(
    body: ApiKeyCreate,
    current_user: CurrentUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db),
) -> ApiKeyIssued:
    await _bind(db, current_user.tenant_id)

    raw = f"gds_{secrets.token_urlsafe(32)}"
    key_id = uuid.uuid4()
    await db.execute(
        text(
            """
            INSERT INTO api_keys (id, tenant_id, name, key_prefix, key_hash, scopes, created_by, created_at)
            VALUES (:id, :tid, :name, :prefix, :hash, cast(:scopes AS jsonb), :actor, now())
            """
        ),
        {
            "id": str(key_id),
            "tid": str(current_user.tenant_id),
            "name": body.name,
            "prefix": raw[:12],
            "hash": _hash_key(raw),
            "scopes": __import__("json").dumps(body.scopes),
            "actor": str(current_user.user_id),
        },
    )
    await db.execute(
        text(
            """
            INSERT INTO audit_events (id, tenant_id, user_id, action, detail, created_at)
            VALUES (gen_random_uuid(), :tid, :actor, 'admin.api_key.issued',
                    jsonb_build_object('name', :name, 'prefix', :prefix), now())
            """
        ),
        {
            "tid": str(current_user.tenant_id),
            "actor": str(current_user.user_id),
            "name": body.name,
            "prefix": raw[:12],
        },
    )
    await db.commit()

    return ApiKeyIssued(
        id=key_id,
        name=body.name,
        key_prefix=raw[:12],
        created_at=None,
        last_used_at=None,
        revoked_at=None,
        key=raw,
    )


@router.delete("/api-keys/{key_id}", response_model=ApiKeyOut)
async def revoke_api_key(
    key_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_db),
) -> ApiKeyOut:
    await _bind(db, current_user.tenant_id)

    existing = (
        await db.execute(
            text(
                """
                SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
                FROM api_keys WHERE tenant_id = :tid AND id = :kid
                """
            ),
            {"tid": str(current_user.tenant_id), "kid": str(key_id)},
        )
    ).fetchone()
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such key in this tenant.")

    await db.execute(
        text(
            "UPDATE api_keys SET revoked_at = coalesce(revoked_at, now()) "
            "WHERE tenant_id = :tid AND id = :kid"
        ),
        {"tid": str(current_user.tenant_id), "kid": str(key_id)},
    )
    await db.execute(
        text(
            """
            INSERT INTO audit_events (id, tenant_id, user_id, action, detail, created_at)
            VALUES (gen_random_uuid(), :tid, :actor, 'admin.api_key.revoked',
                    jsonb_build_object('name', :name), now())
            """
        ),
        {
            "tid": str(current_user.tenant_id),
            "actor": str(current_user.user_id),
            "name": existing._mapping["name"],
        },
    )
    await db.commit()

    refreshed = (
        await db.execute(
            text(
                """
                SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
                FROM api_keys WHERE tenant_id = :tid AND id = :kid
                """
            ),
            {"tid": str(current_user.tenant_id), "kid": str(key_id)},
        )
    ).fetchone()
    return ApiKeyOut(**_row(refreshed))


# ---------------------------------------------------------------- tenants


@router.post("/tenants", response_model=TenantCreated, status_code=status.HTTP_201_CREATED)
async def provision_tenant(
    body: TenantCreate,
    current_user: CurrentUser = Depends(require_permission("tenants:manage")),
    db: AsyncSession = Depends(get_db),
) -> TenantCreated:
    """Provision a tenant with its own owner. The new tenant is bound before anything is written.

    There is deliberately no matching GET: `tenants` is FORCE-RLS and a read returns only the caller's
    own row, so a "list every tenant" endpoint would present a scoped result as a complete one.
    """
    tenant_id = uuid.uuid4()
    await _bind(db, tenant_id)

    clash = (
        await db.execute(
            text("SELECT 1 FROM tenants WHERE slug = :slug"), {"slug": body.slug}
        )
    ).fetchone()
    if clash:
        raise HTTPException(status.HTTP_409_CONFLICT, "That slug is already in use.")

    await db.execute(
        text(
            "INSERT INTO tenants (id, name, slug, created_at) VALUES (:id, :name, :slug, now())"
        ),
        {"id": str(tenant_id), "name": body.name, "slug": body.slug},
    )

    role_id = uuid.uuid4()
    await db.execute(
        text(
            """
            INSERT INTO roles (id, tenant_id, name, permissions, created_at)
            VALUES (:id, :tid, 'platform_owner', cast(:perms AS jsonb), now())
            """
        ),
        {
            "id": str(role_id),
            "tid": str(tenant_id),
            "perms": __import__("json").dumps(ROLE_PERMISSIONS["platform_owner"]),
        },
    )

    user_id = uuid.uuid4()
    await db.execute(
        text(
            """
            INSERT INTO users (id, tenant_id, role_id, email, password_hash, is_active, created_at)
            VALUES (:id, :tid, :rid, :email, :hash, true, now())
            """
        ),
        {
            "id": str(user_id),
            "tid": str(tenant_id),
            "rid": str(role_id),
            "email": body.owner_email,
            "hash": hash_password(body.owner_password),
        },
    )

    await _bind(db, current_user.tenant_id)
    await db.execute(
        text(
            """
            INSERT INTO audit_events (id, tenant_id, user_id, action, detail, created_at)
            VALUES (gen_random_uuid(), :tid, :actor, 'admin.tenant.provisioned',
                    jsonb_build_object('tenant_id', :new_tid, 'slug', :slug, 'owner', :email), now())
            """
        ),
        {
            "tid": str(current_user.tenant_id),
            "actor": str(current_user.user_id),
            "new_tid": str(tenant_id),
            "slug": body.slug,
            "email": body.owner_email,
        },
    )
    await db.commit()

    return TenantCreated(
        tenant_id=tenant_id,
        name=body.name,
        slug=body.slug,
        owner_email=body.owner_email,
        role="platform_owner",
    )
