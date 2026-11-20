"""Accepted risk for security findings: the honest middle state between open and fixed.

The problem this exists to solve, stated plainly. `security_findings` held two statuses, open and resolved, and
the findings API had no write path at all. When a finding cannot be fixed - the 14 Trivy criticals in
minio/minio:latest and temporalio/auto-setup:latest, where no newer image is obtainable and the vendor has not
shipped one - the only thing the platform let you do was call it resolved. That is a lie: resolved means fixed.
So the finding stayed open forever, the critical count stayed at 14, and the count stopped meaning anything.

Acceptance is not a mute button. It is a decision with an owner, a stated reason, real compensating controls and
an expiry, and it is visible in the same count as everything else (see findings_summary, which reports
`accepted` and `accepted_critical` alongside the open counts). Nothing here deletes or hides a finding.

The guardrails below are deliberate and each one is a mistake this platform has already made somewhere else:
  * A reason and controls must be real sentences, not "n/a". Enforced by length.
  * An acceptance must expire, and cannot run longer than a year.
  * A finding that is already fixed cannot be accepted.
  * One live acceptance per finding, so "when does this reopen" has exactly one answer.
  * Expiry reopens the finding automatically. Silence cannot become permanent.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

MIN_REASON_CHARS = 40
MIN_CONTROLS_CHARS = 40
MAX_ACCEPTANCE_DAYS = 365


class InvalidAcceptance(ValueError):
    """The acceptance itself is not defensible as written."""


class AcceptanceNotFound(Exception):
    """No such finding or acceptance in this tenant."""


class AcceptanceConflict(Exception):
    """The finding is not in a state that can be accepted, or already has a live acceptance."""


def _require_sentence(field: str, value: str, minimum: int) -> str:
    cleaned = (value or "").strip()
    if len(cleaned) < minimum:
        raise InvalidAcceptance(
            f"{field} must be at least {minimum} characters and explain the decision; got {len(cleaned)}"
        )
    return cleaned


def _as_utc(moment: datetime) -> datetime:
    return moment.replace(tzinfo=timezone.utc) if moment.tzinfo is None else moment.astimezone(timezone.utc)


def validate_expiry(expires_at: datetime, now: datetime | None = None) -> datetime:
    """An acceptance is a lease. It must end in the future and within a year."""
    reference = now or datetime.now(timezone.utc)
    expiry = _as_utc(expires_at)
    if expiry <= reference:
        raise InvalidAcceptance("expires_at must be in the future; an already-expired acceptance accepts nothing")
    if expiry > reference + timedelta(days=MAX_ACCEPTANCE_DAYS):
        raise InvalidAcceptance(
            f"expires_at cannot be more than {MAX_ACCEPTANCE_DAYS} days out; re-accept at review instead of "
            "accepting indefinitely"
        )
    return expiry


async def _bind_tenant(db: AsyncSession, tenant_id: uuid.UUID) -> None:
    await db.execute(
        text("SELECT set_config('gds.tenant_id', :tid, true)"), {"tid": str(tenant_id)}
    )


_ROW_COLUMNS = (
    "id, tenant_id, finding_id, accepted_by, accepted_by_email, reason, compensating_controls, "
    "severity_at_acceptance, expires_at, review_date, revoked_at, revoked_by, revoke_reason, expired_at, created_at"
)


async def reconcile_expired_acceptances(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Reopen findings whose acceptance has run out, and mark those acceptances expired.

    Called on every read of the acceptance list, the same way the cloud posture module refreshes suppression
    status on read. An acceptance that expires must not keep suppressing a finding just because nobody looked.
    """
    await _bind_tenant(db, tenant_id)
    expired = (
        await db.execute(
            text(
                "UPDATE finding_risk_acceptances SET expired_at = now() "
                "WHERE tenant_id = :tid AND revoked_at IS NULL AND expired_at IS NULL AND expires_at <= now() "
                "RETURNING finding_id"
            ),
            {"tid": str(tenant_id)},
        )
    ).scalars().all()
    if not expired:
        return 0
    await db.execute(
        text(
            "UPDATE security_findings SET status = 'open' "
            "WHERE tenant_id = :tid AND status = 'accepted_risk' AND id = ANY(:ids)"
        ),
        {"tid": str(tenant_id), "ids": [int(f) for f in expired]},
    )
    return len(expired)


async def accept_risk(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    user_email: str | None,
    finding_id: int,
    reason: str,
    compensating_controls: str,
    expires_at: datetime,
    review_date: date | None = None,
) -> dict:
    """Record an accepted-risk decision and move the finding to accepted_risk."""
    reason = _require_sentence("reason", reason, MIN_REASON_CHARS)
    compensating_controls = _require_sentence("compensating_controls", compensating_controls, MIN_CONTROLS_CHARS)
    expiry = validate_expiry(expires_at)

    await _bind_tenant(db, tenant_id)
    finding = (
        await db.execute(
            text(
                "SELECT id, severity, status FROM security_findings "
                "WHERE id = :fid AND tenant_id = :tid FOR UPDATE"
            ),
            {"fid": finding_id, "tid": str(tenant_id)},
        )
    ).mappings().first()
    if finding is None:
        raise AcceptanceNotFound("Finding not found")
    if finding["status"] == "resolved":
        raise AcceptanceConflict(
            "This finding is resolved; there is nothing to accept. Reopen it first if it has regressed."
        )
    live = (
        await db.execute(
            text(
                "SELECT id FROM finding_risk_acceptances WHERE finding_id = :fid AND tenant_id = :tid "
                "AND revoked_at IS NULL AND expired_at IS NULL"
            ),
            {"fid": finding_id, "tid": str(tenant_id)},
        )
    ).first()
    if live is not None:
        raise AcceptanceConflict(f"This finding already has a live acceptance ({live[0]}); revoke it first")

    row = (
        await db.execute(
            text(
                "INSERT INTO finding_risk_acceptances "
                "(tenant_id, finding_id, accepted_by, accepted_by_email, reason, compensating_controls, "
                " severity_at_acceptance, expires_at, review_date) "
                "VALUES (:tid, :fid, :uid, :email, :reason, :controls, :severity, :expires, :review) "
                f"RETURNING {_ROW_COLUMNS}"
            ),
            {
                "tid": str(tenant_id),
                "fid": str(finding_id),
                "uid": str(user_id),
                "email": user_email,
                "reason": reason,
                "controls": compensating_controls,
                "severity": finding["severity"],
                "expires": expiry,
                "review": review_date,
            },
        )
    ).mappings().first()

    await db.execute(
        text("UPDATE security_findings SET status = 'accepted_risk' WHERE id = :fid AND tenant_id = :tid"),
        {"fid": finding_id, "tid": str(tenant_id)},
    )
    return dict(row)


async def revoke_acceptance(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    acceptance_id: uuid.UUID,
    revoke_reason: str,
) -> dict:
    """Withdraw an acceptance. The finding reopens and the row keeps the reason it was withdrawn."""
    revoke_reason = _require_sentence("revoke_reason", revoke_reason, MIN_REASON_CHARS)
    await _bind_tenant(db, tenant_id)
    acceptance = (
        await db.execute(
            text(
                "SELECT id, finding_id, revoked_at, expired_at FROM finding_risk_acceptances "
                "WHERE id = :aid AND tenant_id = :tid FOR UPDATE"
            ),
            {"aid": str(acceptance_id), "tid": str(tenant_id)},
        )
    ).mappings().first()
    if acceptance is None:
        raise AcceptanceNotFound("Acceptance not found")
    if acceptance["revoked_at"] is not None:
        raise AcceptanceConflict("This acceptance is already revoked")
    if acceptance["expired_at"] is not None:
        raise AcceptanceConflict("This acceptance already expired and the finding was reopened")

    row = (
        await db.execute(
            text(
                "UPDATE finding_risk_acceptances "
                "SET revoked_at = now(), revoked_by = :uid, revoke_reason = :reason "
                f"WHERE id = :aid AND tenant_id = :tid RETURNING {_ROW_COLUMNS}"
            ),
            {"aid": str(acceptance_id), "tid": str(tenant_id), "uid": str(user_id), "reason": revoke_reason},
        )
    ).mappings().first()
    await db.execute(
        text(
            "UPDATE security_findings SET status = 'open' "
            "WHERE id = :fid AND tenant_id = :tid AND status = 'accepted_risk'"
        ),
        {"fid": str(acceptance["finding_id"]), "tid": str(tenant_id)},
    )
    return dict(row)


async def list_acceptances(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    finding_id: int | None = None,
    include_history: bool = False,
) -> list[dict]:
    """Live acceptances by default; include_history adds revoked and expired rows."""
    await _bind_tenant(db, tenant_id)
    await reconcile_expired_acceptances(db, tenant_id)
    where = ["tenant_id = :tid"]
    params: dict = {"tid": str(tenant_id)}
    if finding_id is not None:
        where.append("finding_id = :fid")
        params["fid"] = str(finding_id)
    if not include_history:
        where.append("revoked_at IS NULL AND expired_at IS NULL")
    rows = (
        await db.execute(
            text(
                f"SELECT {_ROW_COLUMNS} FROM finding_risk_acceptances WHERE "
                + " AND ".join(where)
                + " ORDER BY created_at DESC"
            ),
            params,
        )
    ).mappings().all()
    return [dict(r) for r in rows]
