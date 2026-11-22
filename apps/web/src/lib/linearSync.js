import { base44 } from "@/api/base44Client";

const SYNC_STATUSES = ["in_remediation", "fixed", "accepted_risk", "false_positive"];

/**
 * Push finding status onto its linked Linear ticket. Bulk entity writes skip the
 * per-record trigger that normally does this, so every bulk status change calls
 * this afterwards to keep the project board in step.
 */
export async function pushLinearStates(findingIds) {
  const requested = [...new Set((findingIds || []).filter(Boolean))];
  if (requested.length === 0) return { checked: 0, updated: 0 };

  // Only findings with a linked ticket need a call: everything else has nothing to update.
  const linked = await base44.entities.LinearIssueLink.list({ sort: "-synced_at", limit: 500 })
    .then((page) => (page?.items || page || []).map((link) => link.finding_id))
    .catch(() => null);
  const unique = linked ? requested.filter((id) => linked.includes(id)) : requested;
  let updated = 0;
  for (const findingId of unique) {
    try {
      const response = await base44.functions.invoke("gdsLinearSync", { action: "push_state", finding_id: findingId });
      const data = response?.data || {};
      if (data.updated || data.pushed || data.synced) updated += 1;
    } catch {
      // A finding with no linked ticket is not an error worth blocking the caller.
    }
  }
  return { checked: unique.length, updated };
}

export { SYNC_STATUSES };