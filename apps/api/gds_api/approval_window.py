"""How long an approval stays decidable, defined once.

MEASURED 26 Nov 2026: the 24 hour figure existed in three places that had to agree - the expiry job's
DEFAULT_MAX_AGE_HOURS, the reminder job's WINDOW_HOURS, and the service-level objective's own threshold. They agreed by
coincidence on the day they were written. A reminder computed against a different window than the expiry job would tell
a decider there was time left after the action had already been abandoned, which is worse than no reminder at all.
"""
from __future__ import annotations

from datetime import datetime, timedelta

APPROVAL_WINDOW_HOURS = 24


def expires_at(created_at: datetime) -> datetime:
    """When the approval stops being decidable."""
    return created_at + timedelta(hours=APPROVAL_WINDOW_HOURS)


def hours_remaining(created_at: datetime, now: datetime | None = None) -> float:
    """Hours left to decide. Negative once the window has closed."""
    reference = now or datetime.now(created_at.tzinfo)
    return round((expires_at(created_at) - reference).total_seconds() / 3600.0, 2)
