import { base44 } from "@/api/base44Client";

export const DEFAULT_SLA_HOURS = { critical: 24, high: 72, medium: 168, low: 336, info: 720 };
export const SLA_SEVERITIES = ["critical", "high", "medium", "low", "info"];

let hours = { ...DEFAULT_SLA_HOURS };
const listeners = new Set();
let pending = null;

export function slaHours() {
  return hours;
}

export function subscribeSlaHours(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetSlaTargetsCache() {
  pending = null;
}

export function loadSlaTargets() {
  if (!pending) {
    pending = base44.entities.SlaTarget.list("-created_date", 50)
      .then((rows) => {
        const next = { ...DEFAULT_SLA_HOURS };
        (rows || []).forEach((row) => {
          if (row.severity && Number(row.hours) > 0) next[row.severity] = Number(row.hours);
        });
        hours = next;
        listeners.forEach((listener) => listener(hours));
        return hours;
      })
      .catch(() => hours);
  }
  return pending;
}

export function formatSlaHours(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "—";
  if (numeric < 24) return `${numeric}h`;
  const days = numeric / 24;
  return `${numeric}h · ${Number.isInteger(days) ? days : days.toFixed(1)}d`;
}