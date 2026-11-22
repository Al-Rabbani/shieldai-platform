import { base44 } from "@/api/base44Client";

/**
 * Writes one chain-of-custody activity row.
 * Logging must never break the action it records, so failures are swallowed here.
 */
export async function logEvidenceActivity({ action, record, detail, actor }) {
  const me = actor ? null : await base44.auth.me().catch(() => null);
  const actorName = actor || me?.full_name || me?.email || null;

  return base44.entities.EvidenceActivity.create({
    evidence_id: record?.evidence_id || null,
    evidence_title: record?.title || null,
    action,
    actor: actorName,
    actor_type: "human",
    agent_id: record?.agent_id || null,
    agent_type: record?.agent_type || null,
    incident_type: record?.incident_type || null,
    detail: detail || null,
    occurred_at: new Date().toISOString(),
  }).catch(() => null);
}