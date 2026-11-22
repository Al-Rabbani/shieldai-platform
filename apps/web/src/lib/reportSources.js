export const REPORT_SOURCES = [
  {
    key: "TriagedFinding",
    label: "Vulnerabilities",
    statusField: "status",
    statusOptions: ["open", "in_remediation", "fixed", "accepted_risk", "false_positive"],
    severityField: "severity",
    severityOptions: ["critical", "high", "medium", "low", "info"],
    fields: ["title", "severity", "status", "asset_name", "owner_team", "assigned_to", "cvss_score", "cve_id", "cwe_id", "sla_breached", "autofix_available", "fixed_by_agent_id", "detected_at", "fixed_at"],
    defaultColumns: ["title", "severity", "status", "asset_name", "owner_team"],
  },
  {
    key: "Asset",
    label: "Assets",
    statusField: "status",
    statusOptions: ["active", "inactive", "decommissioned"],
    fields: ["name", "type", "cloud_provider", "region", "risk_score", "open_findings", "status", "assigned_to", "last_scanned"],
    defaultColumns: ["name", "type", "cloud_provider", "risk_score", "open_findings"],
  },
  {
    key: "Incident",
    label: "Incidents",
    statusField: "status",
    statusOptions: ["new", "investigating", "contained", "resolved"],
    severityField: "severity",
    severityOptions: ["critical", "high", "medium", "low"],
    fields: ["title", "severity", "status", "incident_type", "affected_assets", "description", "assigned_to", "opened_at", "closed_at", "financial_impact_usd"],
    defaultColumns: ["title", "severity", "status", "assigned_to", "opened_at"],
  },
  {
    key: "EvidenceRecord",
    label: "Forensic evidence",
    statusField: "integrity_status",
    statusOptions: ["verified", "tampered", "pending"],
    severityField: "severity_level",
    severityOptions: ["critical", "high", "medium", "low", "info"],
    fields: ["evidence_id", "title", "evidence_type", "incident_type", "severity_level", "source_system", "collected_by", "collected_at", "integrity_status", "chain_of_custody_status", "agent_id"],
    defaultColumns: ["evidence_id", "title", "incident_type", "collected_at", "integrity_status"],
  },
  {
    key: "Agent",
    label: "Agents",
    statusField: "status",
    statusOptions: ["active", "idle", "working", "error", "unknown", "archived"],
    fields: ["name", "display_name", "agent_type", "status", "health_score", "executions_total", "last_heartbeat"],
    defaultColumns: ["name", "agent_type", "status", "last_heartbeat"],
  },
  {
    key: "ComplianceChecklistItem",
    label: "Compliance controls",
    statusField: "status",
    statusOptions: ["complete", "incomplete"],
    fields: ["framework", "control_ref", "title", "category", "status", "evidence_missing", "owner", "completed_at", "completed_by"],
    defaultColumns: ["framework", "control_ref", "title", "status"],
  },
];

export function sourceFor(key) {
  return REPORT_SOURCES.find((source) => source.key === key) || REPORT_SOURCES[0];
}

const DATE_FIELDS = {
  TriagedFinding: "detected_at",
  Incident: "opened_at",
  EvidenceRecord: "collected_at",
  Asset: "last_scanned",
};

export function dateFieldFor(source) {
  return DATE_FIELDS[source.key] || "created_date";
}

export function buildQuery(source, statusFilter, severityFilter) {
  const query = {};
  if (statusFilter && statusFilter !== "any" && source.statusField) query[source.statusField] = statusFilter;
  if (severityFilter && severityFilter !== "any" && source.severityField) query[source.severityField] = severityFilter;
  return query;
}

export function formatCell(value) {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return new Date(text).toLocaleString();
  return text;
}