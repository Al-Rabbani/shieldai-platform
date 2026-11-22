import { base44 } from "@/api/base44Client";

/**
 * Writes one compliance evidence audit row: who touched which document, when, and why.
 * Auditing must never break the action it records, so failures are swallowed here.
 */
export async function logComplianceAudit({
  event_type,
  framework,
  evidence_id,
  evidence_title,
  detail,
  drive_url,
  actor,
}) {
  const me = actor ? null : await base44.auth.me().catch(() => null);

  return base44.entities.ComplianceEvidenceAudit.create({
    event_type,
    framework: framework || null,
    evidence_id: evidence_id || null,
    evidence_title: evidence_title || null,
    detail: detail || null,
    drive_url: drive_url || null,
    actor: actor || me?.full_name || me?.email || "GDS OS",
    actor_type: actor ? "system" : "human",
    occurred_at: new Date().toISOString(),
  }).catch(() => null);
}