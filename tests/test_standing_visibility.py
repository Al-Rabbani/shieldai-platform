"""Standing authority must be readable without querying the database by hand.

MEASURED 26 Nov 2026: six standing approvals were granted for the Q4 external surface review - named tools authorised
against two hosts for seven days with no further human decision - and nothing in the platform listed them. The approval
queue showed what was waiting and what had been decided, not what currently holds ongoing authority.
"""
import pathlib

REPO = pathlib.Path("/opt/gds-os")


def test_the_api_lists_standing_approvals():
    route = (REPO / "apps/api/gds_api/approvals.py").read_text()
    assert '@router.get("/standing"' in route
    assert "standing_until > now()" in route, "an expired standing approval must not be listed as active"
    assert "approvals:read" in route.split('@router.get("/standing"')[1][:400]


def test_the_endpoint_binds_the_tenant_before_reading_a_forced_table():
    route = (REPO / "apps/api/gds_api/approvals.py").read_text()
    standing = route.split('@router.get("/standing"')[1].split("@router.")[0]
    assert "set_config('gds.tenant_id'" in standing


def test_the_page_shows_standing_authority_separately_from_decisions():
    page = (REPO / "apps/web/src/pages/ApprovalsQueuePage.jsx").read_text()
    assert "Standing authority" in page
    assert "standingApprovals" in page
    # The section must render the uses, because "authorised twice" and "authorised 40 times" are different postures.
    assert "row.uses" in page


def test_the_adapter_exposes_it():
    adapter = (REPO / "apps/web/src/api/base44Client.js").read_text()
    assert "export async function standingApprovals" in adapter
    assert "'/approvals/standing'" in adapter
