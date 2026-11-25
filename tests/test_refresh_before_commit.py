"""A refresh after commit loses the RLS tenant context and 500s a request whose write already succeeded.

Measured 25 Nov 2026: POST /red-team/targets created the AuthorizedTarget row and then raised
InvalidRequestError "Could not refresh instance" on db.refresh() AFTER db.commit(), so the operator saw a 500
for an authorization that existed. 46 call sites across the API had the same shape.
"""
import pathlib
import re

API_ROOT = pathlib.Path(__file__).resolve().parents[1] / "gds_api"

# commit() followed by refresh() on the same session, with nothing in between.
OFFENDER = re.compile(r"await\s+(?P<s>db|session)\.commit\(\)\s*\n\s*await\s+(?P=s)\.refresh\(")


def test_no_refresh_after_commit_anywhere_in_the_api():
    offenders = []
    for path in API_ROOT.rglob("*.py"):
        for match in OFFENDER.finditer(path.read_text()):
            line = path.read_text()[: match.start()].count("\n") + 1
            offenders.append(f"{path.relative_to(API_ROOT)}:{line}")
    assert offenders == [], (
        "refresh() after commit() loses the RLS tenant context; flush and refresh before the commit: "
        + ", ".join(offenders)
    )


def test_the_guard_actually_matches_the_pattern_it_forbids():
    # Guard against a vacuous pass: the regex must catch the shape it exists to forbid.
    assert OFFENDER.search("    await db.commit()\n    await db.refresh(row)\n")
    assert OFFENDER.search("    await session.commit()\n        await session.refresh(obj)\n")
    assert not OFFENDER.search("    await db.flush()\n    await db.refresh(row)\n    await db.commit()\n")
