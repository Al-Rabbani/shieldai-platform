import logging
import os
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from gds_api.audit import record_audit_event
from gds_api.config import settings
from gds_api.db import get_db
from gds_api.models import Role, Tenant, User, UserSession
from gds_api.rate_limit import ip_rate_limit
from gds_api.schemas import LoginRequest, MeResponse, RegisterRequest, RoleOut, TenantOut, MfaCodeRequest, MfaDisableRequest
from gds_api import mfa
from gds_api.security import (
    hash_password,
    REFRESH_COOKIE_NAME,
    CurrentUser,
    clear_auth_cookies,
    create_access_token,
    generate_refresh_token,
    get_current_user,
    hash_refresh_token,
    set_auth_cookies,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_log = logging.getLogger(__name__)

# A named reference (not an inline Depends(...) call) so the test suite can override
# just this dependency via app.dependency_overrides - real login flows still get real
# rate limiting; gds_api.rate_limit itself is exercised directly and for real in
# tests/test_rate_limit.py, so overriding it here doesn't leave the feature untested,
# just decoupled from tests that only need to log in as a means to an end.
login_rate_limit = ip_rate_limit("login", max_requests=10, window_seconds=60)
# EDP-008 Part 8 API hardening audit finding: /refresh had no rate limit at all, unlike
# /login - low severity on its own (refresh tokens are unguessable 32-byte
# secrets.token_urlsafe values, not brute-forceable), but a real inconsistency worth
# closing for defense in depth at the same cost as /login's own limit.
refresh_rate_limit = ip_rate_limit("refresh", max_requests=10, window_seconds=60)


async def _issue_session(db: AsyncSession, response: Response, *, user: User) -> None:
    # R2.1: user_sessions is FORCE-RLS protected and its policy applies the tenant predicate
    # to INSERT as well as SELECT. Login reaches here before any tenant is known, so bind the
    # tenant resolved from the authenticated user row first, or the insert is rejected.
    await db.execute(
        text("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": str(user.tenant_id)}
    )
    refresh_token = generate_refresh_token()
    db.add(
        UserSession(
            tenant_id=user.tenant_id,
            user_id=user.id,
            refresh_token_hash=hash_refresh_token(refresh_token),
            expires_at=datetime.now(UTC) + timedelta(days=settings.jwt_refresh_token_days),
        )
    )
    access_token = create_access_token(user_id=user.id, tenant_id=user.tenant_id)
    set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token)



@router.post("/register", dependencies=[Depends(ip_rate_limit("register", max_requests=5, window_seconds=60))])
async def register(
    body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)
) -> MeResponse:
    """Register a new organization and admin user."""
    # Public sign-up is closed. Reaching this route used to create a tenant AND grant it
    # platform_owner, so anyone who found the page became an owner. Accounts are now created by an
    # owner through /admin/users, or a whole tenant through /admin/tenants.
    if os.getenv("GDS_ALLOW_PUBLIC_SIGNUP", "false").strip().lower() not in ("1", "true", "yes"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Public sign-up is closed on this platform. An owner must create your account.",
        )

    import uuid
    from gds_api.seed_data import ROLE_PERMISSIONS

    # Check if email already exists
    # R2.1 auth bootstrap: users is FORCE-RLS protected and login has no principal yet.
    # Bind the submitted address so the users policy exposes exactly that one row; any other
    # user remains invisible even though this pre-auth path runs unauthenticated.
    await db.execute(
        text("SELECT set_config('gds.login_email', :e, false)"), {"e": body.email.lower()}
    )
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    # Create new tenant
    slug = (body.full_name or body.email.split("@")[0]).lower().replace(" ", "-")[:50]
    tenant = Tenant(id=uuid.uuid4(), name=body.full_name or body.email, slug=f"{slug}-{uuid.uuid4().hex[:6]}")
    # R2.1: tenants, roles and users are all FORCE-RLS protected. The tenant id is generated here,
    # so bind it BEFORE the insert rather than after. This ordering matters for a subtle reason:
    # the ORM emits INSERT ... RETURNING, and PostgreSQL applies the table's SELECT policy to the
    # returned row in addition to the INSERT policy. Binding afterwards therefore fails the
    # RETURNING clause even though the insert itself would satisfy tenants_registration_insert.
    # With the id bound, both the registration-insert policy and the own-select policy are met.
    await db.execute(
        text("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": str(tenant.id)}
    )
    db.add(tenant)
    await db.flush()

    # Create platform_owner role for this tenant
    role = Role(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        name="analyst",
        permissions=ROLE_PERMISSIONS["analyst"],
    )
    db.add(role)
    await db.flush()

    # Create admin user
    user = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        role_id=role.id,
        email=body.email,
        password_hash=hash_password(body.password),
        is_active=True,
    )
    db.add(user)
    await db.flush()

    await _issue_session(db, response, user=user)
    await record_audit_event(
        db, tenant_id=tenant.id, user_id=user.id, action="auth.register", detail={"email": body.email}
    )
    await db.commit()

    return MeResponse(
        user_id=user.id,
        email=user.email,
        tenant=TenantOut(id=tenant.id, name=tenant.name, slug=tenant.slug),
        role=RoleOut(id=role.id, name=role.name, permissions=list(role.permissions)),
    )


@router.post("/login", dependencies=[Depends(login_rate_limit)])
async def login(
    body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)
) -> MeResponse:
    # R2.1 auth bootstrap: refresh resolves the user by email before a principal
    # exists, so expose only the row for the submitted address.
    await db.execute(
        text("SELECT set_config('gds.login_email', :e, false)"),
        {"e": body.email.lower()},
    )
    result = await db.execute(
        select(User, Role).join(Role, User.role_id == Role.id).where(User.email == body.email)
    )
    row = result.first()
    try:
        password_ok = row is not None and verify_password(body.password, row[0].password_hash)
    except Exception:
        # A stored hash that cannot be parsed (corrupted row, a placeholder, an algorithm the
        # verifier does not know) must fail closed as an authentication failure. It previously
        # raised, turning a routine rejected login into a 500 - which both signals that the account
        # exists and tells the caller the stored hash is malformed.
        password_ok = False

    # MFA POLICY (migration 075). A role may require a second factor. An account that has not enrolled is refused
    # once its deadline passes, which lets the requirement be switched on without locking an operator out of a
    # product whose only enrolment path needs a session. The refusal is 403 with a machine-readable code so the
    # client can send the person to /settings/mfa instead of showing a dead end.
    if row is not None and row[0].is_active and password_ok and not row[0].mfa_enabled:
        if mfa.enrolment_overdue(
            requires_mfa=bool(getattr(row[1], "requires_mfa", False)),
            mfa_enabled=bool(row[0].mfa_enabled),
            deadline=row[0].mfa_enrolment_deadline,
            now=datetime.now(UTC),
        ):
            await db.execute(
                text("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": str(row[0].tenant_id)}
            )
            await record_audit_event(
                db,
                tenant_id=row[0].tenant_id,
                user_id=row[0].id,
                action="auth.login.mfa_enrolment_required",
                detail={"deadline": row[0].mfa_enrolment_deadline.isoformat() if row[0].mfa_enrolment_deadline else None},
            )
            await db.commit()
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "mfa_enrolment_required",
                    "message": "This account's role requires a second factor and enrolment is overdue.",
                    "enrol_path": "/settings/mfa",
                    "deadline": row[0].mfa_enrolment_deadline.isoformat() if row[0].mfa_enrolment_deadline else None,
                },
            )

    # Second factor, checked only after the password verifies so a wrong password never reveals that an account
    # has MFA. An account with MFA enabled but no readable secret is a broken row: refuse, never fall open.
    if row is not None and row[0].is_active and password_ok and row[0].mfa_enabled:
        await db.execute(
            text("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": str(row[0].tenant_id)}
        )
        if not row[0].mfa_secret:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                "MFA is enabled for this account but no secret is stored")
        try:
            mfa_secret = mfa.decrypt_secret(row[0].mfa_secret)
        except ValueError:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                "MFA is enabled for this account but its secret cannot be read")
        supplied = (body.mfa_code or "").strip()
        if not supplied:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "mfa_required")
        if not mfa.verify(mfa_secret, supplied):
            burned = await db.execute(
                text("UPDATE mfa_recovery_codes SET used_at = now() "
                     "WHERE user_id = :u AND code_hash = :h AND used_at IS NULL RETURNING id"),
                {"u": str(row[0].id), "h": mfa.hash_recovery_code(supplied)},
            )
            if burned.first() is None:
                await record_audit_event(db, tenant_id=row[0].tenant_id, user_id=row[0].id,
                                         action="auth.login.mfa_failure", detail={})
                await db.commit()
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid second factor")

    if row is None or not row[0].is_active or not password_ok:
        # R2.1: audit_events is FORCE-RLS protected, so the failure event can only be written
        # with a tenant bound. When the address is unknown there is no tenant to attribute it
        # to; writing one anyway would violate the policy and turn a 401 into a 500, which both
        # hides the real outcome and signals account existence through the status code. In that
        # case the attempt is recorded to the application log instead, and the response stays a
        # uniform 401 either way.
        if row is not None:
            await db.execute(
                text("SELECT set_config('gds.tenant_id', :tid, false)"),
                {"tid": str(row[0].tenant_id)},
            )
            await record_audit_event(
                db,
                tenant_id=row[0].tenant_id,
                user_id=row[0].id,
                action="auth.login.failure",
                detail={"email": body.email},
            )
            await db.commit()
        else:
            _log.warning("login failure for unknown address", extra={"email_domain": body.email.split("@")[-1]})
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    user, role = row
    await _issue_session(db, response, user=user)
    await record_audit_event(
        db, tenant_id=user.tenant_id, user_id=user.id, action="auth.login.success", detail={}
    )
    await db.commit()

    # R2.1: tenants is FORCE-RLS protected and the commit above returned this session's
    # connection to the pool (NullPool discards it), so any tenant context set earlier is gone.
    # Re-bind before the read, or this lookup returns nothing and the response 500s.
    await db.execute(
        text("SELECT set_config('gds.tenant_id', :tid, false)"), {"tid": str(user.tenant_id)}
    )
    tenant = await db.get(Tenant, user.tenant_id)
    if tenant is None:
        # The tenant_id FK constraint should make this unreachable; fail loudly rather
        # than silently (an assert here would vanish under python -O).
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "User references a tenant that no longer exists"
        )
    return MeResponse(
        user_id=user.id,
        email=user.email,
        tenant=TenantOut(id=tenant.id, name=tenant.name, slug=tenant.slug),
        role=RoleOut(id=role.id, name=role.name, permissions=list(role.permissions)),
    )


@router.post("/refresh", dependencies=[Depends(refresh_rate_limit)])
async def refresh(
    request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> dict[str, str]:
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No refresh session")

    token_hash = hash_refresh_token(token)
    result = await db.execute(
        select(UserSession).where(UserSession.refresh_token_hash == token_hash)
    )
    session = result.scalar_one_or_none()
    now = datetime.now(UTC)
    if session is None or session.revoked_at is not None or session.expires_at < now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh session invalid or expired")

    session.revoked_at = now  # rotate: this refresh token is single-use
    user = await db.get(User, session.user_id)
    if user is None or not user.is_active:
        await db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer active")

    await _issue_session(db, response, user=user)
    await db.commit()
    return {"status": "refreshed"}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if token:
        token_hash = hash_refresh_token(token)
        result = await db.execute(
            select(UserSession).where(UserSession.refresh_token_hash == token_hash)
        )
        session = result.scalar_one_or_none()
        if session is not None and session.revoked_at is None:
            session.revoked_at = datetime.now(UTC)

    await record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        action="auth.logout",
        detail={},
    )
    await db.commit()
    clear_auth_cookies(response)
    return {"status": "logged_out"}


@router.get("/me")
async def me(
    current_user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> MeResponse:
    await db.execute(
        text("SELECT set_config('gds.tenant_id', :tid, false)"),
        {"tid": str(current_user.tenant_id)},
    )
    tenant = await db.get(Tenant, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "User references a tenant that no longer exists"
        )
    return MeResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        tenant=TenantOut(id=tenant.id, name=tenant.name, slug=tenant.slug),
        role=RoleOut(
            id=current_user.role_id,
            name=current_user.role_name,
            permissions=current_user.permissions,
        ),
    )

@router.get("/mfa/policy")
async def mfa_policy(
    current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    """What this account's role requires of it, and whether it is compliant today.

    Separate from /mfa/status on purpose: status says what is true of the factor, this says what is REQUIRED and
    how long is left. A settings screen needs both, and a person who is inside a grace window needs to be told
    the date rather than discover it at the next login.
    """
    await db.execute(
        text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": str(current_user.tenant_id)}
    )
    row = (await db.execute(
        text(
            "SELECT u.mfa_enabled, u.mfa_enrolled_at, u.mfa_enrolment_deadline, r.name, r.requires_mfa "
            "FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :u"
        ),
        {"u": str(current_user.user_id)},
    )).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    enabled, enrolled_at, deadline, role_name, requires = row
    now = datetime.now(UTC)
    if deadline is not None and deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=UTC)
    hours_left = round((deadline - now).total_seconds() / 3600.0, 1) if deadline else None
    return {
        "role": role_name,
        "requires_mfa": bool(requires),
        "mfa_enabled": bool(enabled),
        "enrolled_at": enrolled_at.isoformat() if enrolled_at else None,
        "enrolment_deadline": deadline.isoformat() if deadline else None,
        "hours_remaining": hours_left,
        "enforced_now": mfa.enrolment_overdue(
            requires_mfa=bool(requires), mfa_enabled=bool(enabled), deadline=deadline, now=now
        ),
        "note": (
            "A role that requires a second factor refuses a password-only sign-in. An account that has not "
            "enrolled is refused once its deadline passes; an account created after the policy carries no "
            "deadline and is refused immediately. Enrolment is at /settings/mfa and is two-step, so nothing is "
            "enforced until an authenticator has proved it produces codes."
        ),
    }


@router.get("/mfa/status")
async def mfa_status(
    current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    """Whether a second factor is on, and how many recovery codes are left.

    The secret and the codes themselves are never returned here: the enrol response shows them once and this
    route exists so a settings screen can say what is true without holding them.
    """
    uid, tid = current_user.user_id, current_user.tenant_id
    await db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": str(tid)})
    row = (await db.execute(
        text("SELECT mfa_enabled, mfa_enrolled_at, mfa_secret IS NOT NULL FROM users WHERE id = :u"),
        {"u": str(uid)},
    )).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    remaining = (await db.execute(
        text("SELECT count(*) FROM mfa_recovery_codes WHERE user_id = :u AND used_at IS NULL"),
        {"u": str(uid)},
    )).scalar()
    return {
        "mfa_enabled": bool(row[0]),
        "enrolled_at": row[1].isoformat() if row[1] else None,
        "enrolment_in_progress": bool(row[2]) and not bool(row[0]),
        "recovery_codes_remaining": int(remaining or 0),
    }


@router.post("/mfa/enrol")
async def mfa_enrol(
    current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    """Start enrolment. The secret and the recovery codes are returned once and never again.

    Enrolment is two-step on purpose: nothing is enforced until /mfa/confirm proves the authenticator app is
    producing codes, so a mistyped or unscanned secret cannot lock the owner out of their own account.
    """
    secret = mfa.new_secret()
    codes, hashes = mfa.new_recovery_codes()
    uid, tid = current_user.user_id, current_user.tenant_id
    await db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": str(tid)})
    row = (await db.execute(
        text("UPDATE users SET mfa_secret = :s, mfa_enabled = false, mfa_enrolled_at = NULL "
             "WHERE id = :u RETURNING email"),
        {"s": mfa.encrypt_secret(secret), "u": str(uid)},
    )).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    await db.execute(text("DELETE FROM mfa_recovery_codes WHERE user_id = :u"), {"u": str(uid)})
    for digest in hashes:
        await db.execute(
            text("INSERT INTO mfa_recovery_codes (tenant_id, user_id, code_hash) VALUES (:t, :u, :h)"),
            {"t": str(tid), "u": str(uid), "h": digest},
        )
    await record_audit_event(db, tenant_id=tid, user_id=uid, action="auth.mfa.enrol_started", detail={})
    await db.commit()
    return {
        "secret": secret,
        "provisioning_uri": mfa.provisioning_uri(secret, row[0]),
        "recovery_codes": codes,
        "note": "Scan the URI, then POST /auth/mfa/confirm with a current code. The secret and recovery codes are shown once.",
    }


@router.post("/mfa/confirm")
async def mfa_confirm(
    body: MfaCodeRequest, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    uid, tid = current_user.user_id, current_user.tenant_id
    await db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": str(tid)})
    row = (await db.execute(
        text("SELECT mfa_secret, mfa_enabled FROM users WHERE id = :u"), {"u": str(uid)}
    )).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    if not row[0]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No enrolment in progress; call /auth/mfa/enrol first")
    try:
        secret = mfa.decrypt_secret(row[0])
    except ValueError:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Stored MFA secret cannot be read")
    if not mfa.verify(secret, body.code):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid second factor")
    await db.execute(
        text("UPDATE users SET mfa_enabled = true, mfa_enrolled_at = now() WHERE id = :u"), {"u": str(uid)}
    )
    remaining = (await db.execute(
        text("SELECT count(*) FROM mfa_recovery_codes WHERE user_id = :u AND used_at IS NULL"), {"u": str(uid)}
    )).scalar()
    await record_audit_event(db, tenant_id=tid, user_id=uid, action="auth.mfa.enrolled", detail={})
    await db.commit()
    return {"mfa_enabled": True, "recovery_codes_remaining": int(remaining or 0)}


@router.post("/mfa/disable")
async def mfa_disable(
    body: MfaDisableRequest, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    """Turning the second factor off needs the password AND a working factor.

    Otherwise a stolen session cookie would be enough to remove the very control that protects against a stolen
    password.
    """
    uid, tid = current_user.user_id, current_user.tenant_id
    await db.execute(text("SELECT set_config('gds.tenant_id', :t, false)"), {"t": str(tid)})
    row = (await db.execute(
        text("SELECT password_hash, mfa_secret, mfa_enabled FROM users WHERE id = :u"), {"u": str(uid)}
    )).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    if not verify_password(body.password, row[0]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid password")
    if row[2]:
        supplied = (body.code or "").strip()
        secret_ok = False
        if supplied and row[1]:
            try:
                secret_ok = mfa.verify(mfa.decrypt_secret(row[1]), supplied)
            except ValueError:
                secret_ok = False
        if not secret_ok and supplied:
            burned = await db.execute(
                text("UPDATE mfa_recovery_codes SET used_at = now() "
                     "WHERE user_id = :u AND code_hash = :h AND used_at IS NULL RETURNING id"),
                {"u": str(uid), "h": mfa.hash_recovery_code(supplied)},
            )
            secret_ok = burned.first() is not None
        if not secret_ok:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "A current second factor code is required")
    await db.execute(
        text("UPDATE users SET mfa_secret = NULL, mfa_enabled = false, mfa_enrolled_at = NULL WHERE id = :u"),
        {"u": str(uid)},
    )
    await db.execute(text("DELETE FROM mfa_recovery_codes WHERE user_id = :u"), {"u": str(uid)})
    await record_audit_event(db, tenant_id=tid, user_id=uid, action="auth.mfa.disabled", detail={})
    await db.commit()
    return {"mfa_enabled": False}
