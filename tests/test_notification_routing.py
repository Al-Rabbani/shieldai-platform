"""An alert that cannot say where to act is a log line with a red dot on it.

MEASURED 26 Nov 2026: the notification centre renders notification.action_url as a link and the bell navigates to it,
but notifications had no such column, so every alert the platform raised led nowhere. The reminder telling a decider an
approval was waiting arrived with no route to the approval.

These tests read the files rather than the database: the column, the model, the schema and every writer that must fill
it. A writer that forgets is a notification that leads nowhere again.
"""
import pathlib
import re

REPO = pathlib.Path("/opt/gds-os")


def _read(relative: str) -> str:
    return (REPO / relative).read_text(encoding="utf-8")


def test_the_column_exists_in_a_migration():
    migrations = list((REPO / "migrations/security_isolation").glob("*.sql"))
    matching = [m for m in migrations if "ADD COLUMN IF NOT EXISTS action_url" in m.read_text(encoding="utf-8")
                and "notifications" in m.read_text(encoding="utf-8")]
    assert matching, "no migration adds notifications.action_url"


def test_the_model_and_the_response_carry_it():
    assert "action_url" in _read("apps/api/gds_api/models.py").split("class Notification(")[1].split("class ")[0]
    schema = _read("apps/api/gds_api/schemas.py").split("class NotificationOut(")[1].split("class ")[0]
    assert "action_url" in schema


def test_the_raiser_accepts_a_destination_and_writes_it():
    raiser = _read("scripts/ops/gds-raise-alert.py")
    assert "--action-url" in raiser
    assert "action_url)" in raiser or "action_url," in raiser


def test_every_writer_names_a_real_page():
    """Each writer's destination must be a route that exists in App.jsx, not a plausible-looking string."""
    routes = _read("apps/web/src/App.jsx")
    writers = {
        "scripts/ops/approval_reminders.py": "/operations/approvals",
        "scripts/ops/expire_stale_approvals.py": "/operations/approvals",
        "scripts/ops/slo_check.py": "/operations/slo",
        # The API's own writers: the broker's "an approval needs you" and the decide route's answer.
        "apps/api/gds_api/policy.py": "/operations/approvals",
        "apps/api/gds_api/approvals.py": "/operations/approvals",
    }
    for script, page in writers.items():
        body = _read(script)
        assert page in body, f"{script} does not name {page}"
        assert f'path="{page}"' in routes, f"{page} is not a route in App.jsx"


def test_a_row_with_no_title_still_has_a_label():
    row = _read("apps/web/src/components/notifications/NotificationRow.jsx")
    assert "labelFor" in row
    assert "notification.title}" not in row.split("labelFor")[0], "the label must not fall back to an absent title"
