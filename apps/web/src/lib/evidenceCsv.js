const COLUMNS = [
  { key: "evidence_id", label: "Evidence ID" },
  { key: "title", label: "Title" },
  { key: "evidence_type", label: "Evidence Type" },
  { key: "incident_type", label: "Incident Type" },
  { key: "severity_level", label: "Severity" },
  { key: "integrity_status", label: "Integrity" },
  { key: "chain_of_custody_status", label: "Custody" },
  { key: "collected_by", label: "Collected By" },
  { key: "collected_at", label: "Collected At" },
  { key: "source_system", label: "Source System" },
  { key: "agent_id", label: "Agent ID" },
  { key: "agent_type", label: "Agent Type" },
  { key: "framework_tags", label: "Framework Tags" },
  { key: "description", label: "Description" },
];

function cell(value) {
  const text = Array.isArray(value) ? value.join("; ") : value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildEvidenceCsv(records) {
  return [
    COLUMNS.map((column) => cell(column.label)).join(","),
    ...records.map((record) => COLUMNS.map((column) => cell(record[column.key])).join(",")),
  ].join("\n");
}

export function downloadEvidenceCsv(records) {
  if (!records.length) return;
  const blob = new Blob([buildEvidenceCsv(records)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `evidence-log_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}