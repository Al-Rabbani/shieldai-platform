// Patch impact projection.
//
// The platform stores one overall score per snapshot (GlobalRiskScore.overall_score)
// but no component formula that maps individual findings to points. This model is
// therefore an explicit planning estimate, not a recalculated platform score:
// the recorded gap between the current score and 100 is distributed across the
// open findings in proportion to severity and CVSS. Every value it returns can be
// traced to a stored number, and the assumptions are surfaced in the UI.

export const SEVERITY_BASE = { critical: 10, high: 7, medium: 4, low: 1.5, info: 0 };
const SEVERITY_CVSS_FALLBACK = { critical: 0.85, high: 0.7, medium: 0.5, low: 0.3, info: 0 };

export function gradeFor(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function findingWeight(finding) {
  const severity = finding.severity || finding.normalized_severity || "low";
  const base = SEVERITY_BASE[severity] ?? 1;
  const cvss = Number(finding.cvss_score);
  const factor = Number.isFinite(cvss) && cvss > 0
    ? Math.min(cvss, 10) / 10
    : SEVERITY_CVSS_FALLBACK[severity] ?? 0.5;
  return base * factor;
}

/**
 * @param {Array} findings open findings used as the exposure base
 * @param {number} currentScore recorded overall score (0-100)
 */
export function buildImpactModel(findings, currentScore) {
  const score = Number(currentScore);
  const hasScore = Number.isFinite(score);
  const gap = hasScore ? Math.max(0, Math.min(100, 100 - score)) : 0;
  const rows = findings.map((f) => ({ finding: f, weight: findingWeight(f) }));
  const totalWeight = rows.reduce((sum, r) => sum + r.weight, 0);
  const pointsPerWeight = totalWeight > 0 ? gap / totalWeight : 0;
  const withDelta = rows.map((r) => ({ ...r, delta: r.weight * pointsPerWeight }));
  return {
    currentScore: hasScore ? score : null,
    currentGrade: hasScore ? gradeFor(score) : "—",
    gap,
    totalWeight,
    pointsPerWeight,
    rows: withDelta,
    scorable: hasScore && totalWeight > 0,
  };
}

export function projectImpact(model, selectedIds) {
  const selected = new Set(selectedIds);
  const removed = model.rows.filter((r) => selected.has(r.finding.id));
  const removedWeight = removed.reduce((sum, r) => sum + r.weight, 0);
  const gain = removedWeight * model.pointsPerWeight;
  const projected = model.currentScore == null ? null : Math.min(100, model.currentScore + gain);
  return {
    removedCount: removed.length,
    gain,
    projected,
    projectedGrade: projected == null ? "—" : gradeFor(projected),
    gradeChanged: projected != null && gradeFor(projected) !== model.currentGrade,
  };
}