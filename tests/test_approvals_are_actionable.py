"""An approval is the only place a person is genuinely required, so it must be reachable from the console.

Measured 20 Nov 2026: the platform created approvals (four were sitting pending, one from a path replaced that
afternoon) but the console had no page for them. A human could only decide one with curl, which means every
governed action above the read-only risk classes was, in practice, undecidable from the product.

Also measured: nothing ever expired an approval, so an obsolete request kept looking like a decision the
platform was waiting for. expiring is neither approving nor rejecting, and the row is kept as a record.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

CLIENT = (ROOT / "web" / "gds_app.html").read_text(encoding="utf-8")
EXPIRY = (ROOT / "scripts" / "ops" / "expire_stale_approvals.py").read_text(encoding="utf-8")
CRON = (ROOT / "config" / "cron" / "root.crontab").read_text(encoding="utf-8")


def test_the_console_has_an_approvals_route():
    assert "data-route=\"approvals\"" in CLIENT
    assert "approvals:'Approvals'" in CLIENT
    assert 'id="page-approvals"' in CLIENT
    assert "if (page === 'approvals') withBusy('approvals', loadApprovals);" in CLIENT


def test_the_page_decides_through_the_real_endpoint():
    assert "apiResult('/approvals?status_filter=pending'" in CLIENT
    assert "'/approvals/' + encodeURIComponent(id) + '/decide'" in CLIENT
    assert 'data-decision="approved"' in CLIENT and 'data-decision="rejected"' in CLIENT


def test_each_refusal_is_reported_as_its_own_fact():
    """409, 403 and 404 mean different things; collapsing them into one error would mislead the operator."""
    assert "sent.status === 409" in CLIENT
    assert "sent.status === 403" in CLIENT
    assert "sent.status === 404" in CLIENT


def test_nothing_waiting_says_so_instead_of_showing_an_empty_table():
    assert "Nothing is waiting for a decision." in CLIENT


def test_expiry_is_neither_approval_nor_rejection_and_keeps_the_row():
    assert 'approval.status = "expired"' in EXPIRY
    assert 'action="approval.expired"' in EXPIRY
    assert "type=\"approval.expired\"" in EXPIRY
    assert "delete" not in EXPIRY.lower()


def test_the_expiry_job_reads_its_tenant_from_the_environment():
    """The mission reaper reported success for two days while sweeping nothing, because an unbound read of a
    FORCE-RLS table returns zero rows and raises nothing."""
    assert 'os.environ.get("GDS_TENANT_ID"' in EXPIRY
    assert "return 2" in EXPIRY


def test_the_expiry_job_is_scheduled():
    assert "expire_stale_approvals.py" in CRON
    assert "15 * * * *" in CRON


def test_the_cron_entry_loads_the_environment_it_needs():
    """Cron runs with a minimal environment. The first version of this entry did not source /opt/.env, so it
    would have exited 2 with "no tenant configured" every hour and looked perfectly scheduled."""
    line = next(l for l in CRON.splitlines() if "expire_stale_approvals.py" in l)
    assert ". /opt/.env" in line
    assert "set -a" in line
