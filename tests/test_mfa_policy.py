"""P0-4: the second factor is REQUIRED, and an account that has not enrolled is refused on a stated date.

MEASURED BEFORE THIS: the platform had a complete two-step TOTP enrolment, login already refused a
password-only sign-in for an ENROLLED account, and /settings/mfa was routed and wired. None of it was required:
0 of 5 accounts had enrolled. The mechanism was never the gap; the policy was. These tests pin the policy, the
decision that can lock an operator out, and the wording of the refusal.
"""
import ast
import pathlib
from datetime import UTC, datetime, timedelta

ROOT = pathlib.Path(__file__).resolve().parents[1]
API = ROOT / "apps/api/gds_api"
MIGRATION = ROOT / "migrations/security_isolation/075_mfa_enrolment_policy.sql"


def test_the_policy_columns_exist_and_every_role_requires_the_factor():
    sql = "\n".join(l for l in MIGRATION.read_text().splitlines() if not l.strip().startswith("--"))
    assert "ALTER TABLE roles ADD COLUMN IF NOT EXISTS requires_mfa boolean NOT NULL DEFAULT false" in sql
    assert "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enrolment_deadline timestamptz" in sql
    assert "UPDATE roles SET requires_mfa = true" in sql


def test_existing_accounts_get_a_dated_grace_and_new_ones_do_not():
    """The deadline is what keeps the policy from locking the only administrator out of the product whose
    enrolment path needs a session. New accounts carry none, so the requirement is immediate for them."""
    sql = MIGRATION.read_text()
    assert "SET mfa_enrolment_deadline = now() + interval '72 hours'" in sql
    assert "AND mfa_enabled = false" in sql


def test_the_break_glass_path_is_written_down():
    assert "UPDATE users SET mfa_enrolment_deadline = now() + interval '1 hour'" in MIGRATION.read_text()


def overdue(**kw):
    """The decision, imported from the module rather than reimplemented."""
    import sys
    sys.path.insert(0, str(ROOT / "apps/api"))
    from gds_api.mfa import enrolment_overdue
    return enrolment_overdue(**kw)


def test_a_role_without_the_requirement_never_refuses_anyone():
    assert overdue(requires_mfa=False, mfa_enabled=False, deadline=None, now=datetime.now(UTC)) is False


def test_an_enrolled_account_is_not_refused_here():
    assert overdue(requires_mfa=True, mfa_enabled=True, deadline=None, now=datetime.now(UTC)) is False


def test_no_deadline_means_the_requirement_is_already_in_force():
    assert overdue(requires_mfa=True, mfa_enabled=False, deadline=None, now=datetime.now(UTC)) is True


def test_a_future_deadline_does_not_refuse_and_a_past_one_does():
    now = datetime(2026, 11, 23, 15, 0, tzinfo=UTC)
    assert overdue(requires_mfa=True, mfa_enabled=False, deadline=now + timedelta(hours=72), now=now) is False
    assert overdue(requires_mfa=True, mfa_enabled=False, deadline=now - timedelta(seconds=1), now=now) is True
    assert overdue(requires_mfa=True, mfa_enabled=False, deadline=now, now=now) is True


def test_a_naive_deadline_is_read_as_utc_rather_than_raising():
    now = datetime(2026, 11, 23, 15, 0, tzinfo=UTC)
    naive_past = datetime(2026, 11, 23, 14, 0)
    assert overdue(requires_mfa=True, mfa_enabled=False, deadline=naive_past, now=now) is True


def test_login_consults_the_policy_before_issuing_a_session():
    src = (API / "auth.py").read_text()
    assert "mfa.enrolment_overdue(" in src
    assert 'action="auth.login.mfa_enrolment_required"' in src
    assert '"code": "mfa_enrolment_required"' in src
    assert '"/settings/mfa"' in src
    # the refusal must be raised, not logged and stepped over
    block = src[src.index("mfa.enrolment_overdue("):]
    assert "raise HTTPException(" in block[:1600]
    assert "HTTP_403_FORBIDDEN" in block[:1600]


def test_the_policy_route_states_requirement_deadline_and_compliance():
    src = (API / "auth.py").read_text()
    assert '@router.get("/mfa/policy")' in src
    for field in ("requires_mfa", "enrolment_deadline", "hours_remaining", "enforced_now"):
        assert f'"{field}"' in src


def test_the_orm_knows_the_new_columns():
    """A column in Postgres that the ORM does not know is an AttributeError at login, returned as a 500. That is
    the migration 033 lesson, and tests/test_orm_column_parity.py guards the same thing against the live table."""
    models = (API / "models.py").read_text()
    tree = ast.parse(models)
    attrs = {
        node.target.id
        for cls in tree.body
        if isinstance(cls, ast.ClassDef)
        for node in cls.body
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name)
    }
    assert "requires_mfa" in attrs
    assert "mfa_enrolment_deadline" in attrs
