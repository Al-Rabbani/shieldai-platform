"""Provision one isolated, least-privilege tenant for the read-only assessment canary.

Run from the repository root with PYTHONPATH=apps/api and --apply. Idempotent for
this reserved slug; it refuses to repurpose any pre-existing customer tenant.
Prints identifiers for GDS_ASSESSMENT_* configuration, never credentials.
"""
import argparse
import asyncio
import secrets
import uuid

from sqlalchemy import select, text

from gds_api.db import async_session_factory
from gds_api.models import Policy, Role, Tenant, User
from gds_api.security import hash_password
from gds_api.tenant_binding import bind_tenant

SLUG = "gds-assessment-sandbox"
EMAIL = "assessment-runner@invalid.gds"


async def provision(apply: bool) -> None:
    async with async_session_factory() as db:
        # The forced tenant RLS permits creation only in a registration context.
        # This address is reserved for the assessment principal and cannot receive mail.
        await db.execute(text("SELECT set_config('gds.login_email', :email, false)"), {"email": EMAIL})
        existing = (await db.execute(select(User).where(User.email == EMAIL))).scalar_one_or_none()
        if existing:
            await bind_tenant(db, existing.tenant_id)
            tenant = await db.get(Tenant, existing.tenant_id)
            role = await db.get(Role, existing.role_id)
            if (tenant is None or tenant.slug != SLUG or role is None
                    or role.tenant_id != tenant.id or role.permissions != []
                    or not existing.is_active):
                raise RuntimeError("Reserved assessment identity is inconsistent; refusing reuse")
            policy = (await db.execute(select(Policy).where(
                Policy.tenant_id == tenant.id, Policy.risk_class == "low"
            ))).scalar_one_or_none()
            if policy is None or policy.requires_approval:
                raise RuntimeError("Assessment read-only policy is missing or changed; refusing reuse")
            user = existing
        else:
            if not apply:
                print("Assessment sandbox is absent; rerun with --apply to create it")
                return
            tenant = Tenant(id=uuid.uuid4(), name="GDS Assessment Sandbox", slug=SLUG)
            await bind_tenant(db, tenant.id)
            db.add(tenant)
            await db.flush()
            role = Role(id=uuid.uuid4(), tenant_id=tenant.id, name="assessment_runner", permissions=[])
            db.add(role)
            await db.flush()
            # The random password is deliberately discarded; this user has no login path.
            user = User(id=uuid.uuid4(), tenant_id=tenant.id, role_id=role.id,
                        email=EMAIL, password_hash=hash_password(secrets.token_urlsafe(48)), is_active=True)
            db.add(user)
            db.add(Policy(id=uuid.uuid4(), tenant_id=tenant.id, risk_class="low",
                          requires_approval=False, min_role="platform_owner"))
            await db.commit()
        print(f"GDS_ASSESSMENT_TENANT_ID={tenant.id}")
        print(f"GDS_ASSESSMENT_PRINCIPAL_ID={user.id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Create the reserved tenant if absent")
    asyncio.run(provision(parser.parse_args().apply))
