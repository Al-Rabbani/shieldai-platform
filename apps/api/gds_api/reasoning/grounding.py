"""Grounding guard for mission reports.

WHY THIS EXISTS
---------------
A live mission on 14 Nov 2026 ran 3/3 agents with 7 tool calls and reported
"there are currently no open findings in the system" while the database held
148 open findings. The read tool was not broken - called directly it returns 50
rows. The agents simply never called it, and the model asserted a clean result
anyway. The system prompt already said "never fabricate results", which proves a
prompt instruction is not a control: the model can ignore it.

This module makes the guarantee deterministic:

1. ground_truth() reads the real counts from the database before synthesis and
   hands them to the aggregator as authoritative context, so the model has no
   reason to guess.
2. apply_grounding() then inspects the finished report for findings claims and
   compares them with those counts. When the report contradicts the database,
   a correction block is appended to the stored report - labelled as platform
   output rather than model output - so the record cannot quietly claim a clean
   platform.

Both functions fail soft: if the database is unreachable the guard degrades to
"unverified" and says so, rather than inventing a number or blocking a mission.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# "no open findings", "zero open security findings", "0 findings"
# Deliberately narrow: "0 KEV-listed findings" or "0 critical findings" are true
# statements about a subset, not claims that the register is empty. Only a bare
# "no/zero/0 [open] [security] findings" counts as a clean-platform claim.
_ZERO_CLAIM = re.compile(
    r"\b(?:no|zero|none|0)\s+(?:open\s+|active\s+)?(?:security\s+)?findings?\b",
    re.IGNORECASE)
# "148 open findings", "12 findings", "3 critical findings"
_NUM_CLAIM = re.compile(
    r"\b(\d{1,4})\s+(?:open\s+)?(?:security\s+)?findings?\b", re.IGNORECASE)
# "Open findings: zero" / "findings = 0" - the inverted form.
_ZERO_INVERTED = re.compile(
    r"\bfindings?\b\s*[:=]\s*(?:zero|none|0)\b", re.IGNORECASE)
_CLEAN_PHRASE = re.compile(
    r"\b(?:no (?:open )?(?:security )?(?:findings|vulnerabilities) (?:were )?detected|"
    r"zero open findings|clean bill of health|no active vulnerabilities)\b",
    re.IGNORECASE)


@dataclass
class GroundTruth:
    ok: bool = False
    open_findings: int = 0
    total_findings: int = 0
    critical_open: int = 0
    kev_listed: int = 0
    error: str = ""
    source: str = "security_findings (live)"

    def describe(self) -> str:
        if not self.ok:
            return (f"UNAVAILABLE ({self.error}). Do not state any finding count; "
                    "say the count could not be verified.")
        return (f"open findings = {self.open_findings}; total findings = {self.total_findings}; "
                f"critical open = {self.critical_open}; KEV-listed = {self.kev_listed} "
                f"[source: {self.source}, read at synthesis time]")


def ground_truth() -> GroundTruth:
    """Read real counts. Never raises."""
    gt = GroundTruth()
    try:
        from gds_api.security_scope import (read_scoped_findings,
                                           resolve_service_scope,
                                           service_scope_configured)
        if not service_scope_configured():
            gt.error = "service security scope not configured"
            return gt
        scope = resolve_service_scope()
        rows = read_scoped_findings({"limit": 1000}, scope)
        gt.total_findings = len(rows)
        for r in rows:
            status = str(r.get("status") or "").lower()
            sev = str(r.get("severity") or "").lower()
            if status == "open":
                gt.open_findings += 1
                if sev == "critical":
                    gt.critical_open += 1
        try:
            kev = read_scoped_findings({"limit": 1000}, scope)
            gt.kev_listed = sum(1 for r in kev if r.get("kev_listed") is True)
        except Exception:
            gt.kev_listed = 0
        gt.ok = True
    except Exception as e:  # fail soft, never block a mission
        gt.error = f"{type(e).__name__}: {str(e)[:120]}"
    return gt


def _claims(text: str) -> dict:
    zero = bool(_ZERO_CLAIM.search(text) or _CLEAN_PHRASE.search(text)
                or _ZERO_INVERTED.search(text))
    nums = [int(m) for m in _NUM_CLAIM.findall(text)]
    return {"zero_claim": zero, "numbers": nums}


def contradictions(report: str, gt: GroundTruth) -> list[str]:
    """Return human-readable contradictions between the report and the database."""
    if not gt.ok or not report:
        return []
    c = _claims(report)
    out: list[str] = []

    if c["zero_claim"] and gt.open_findings > 0:
        out.append(
            f'the report states there are no open findings, but the register holds '
            f'{gt.open_findings} open findings')

    for n in c["numbers"]:
        # Only flag a stated count that cannot describe the real register.
        if n == 0 and gt.open_findings > 0:
            out.append(f'the report states 0 findings, but {gt.open_findings} are open')
        elif n > gt.total_findings:
            out.append(
                f'the report states {n} findings, which exceeds the {gt.total_findings} '
                f'records that exist')
    # de-duplicate while preserving order
    seen, uniq = set(), []
    for o in out:
        if o not in seen:
            seen.add(o)
            uniq.append(o)
    return uniq


def apply_grounding(report: str, gt: GroundTruth) -> str:
    """Append a platform-authored correction when the model contradicts the data."""
    try:
        problems = contradictions(report, gt)
    except Exception:
        return report
    if not problems:
        if gt.ok:
            return report + (f"\n\n[VERIFIED BY PLATFORM] {gt.describe()}")
        return report + (f"\n\n[UNVERIFIED] Could not check this report against the "
                         f"database: {gt.error}")

    bullets = "\n".join(f"  - {p}" for p in problems)
    return (f"{report}\n\n"
            f"[GROUNDING CORRECTION - added by the platform, not the model]\n"
            f"This report contradicts the live database:\n{bullets}\n"
            f"The claim above was not backed by a tool result in this mission.\n"
            f"AUTHORITATIVE VALUES: {gt.describe()}\n"
            f"Treat these values as the record.")
