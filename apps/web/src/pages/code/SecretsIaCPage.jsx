import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { KeyRound, Shield, AlertTriangle } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const CARD = "#111827"; const BORDER = "#1a1f2e"; const CYAN = "#00d4ff";

export default function SecretsIaCPage() {
  const [tab, setTab] = useState("secrets");

  const { data: allFindings = [], isLoading } = useQuery({
    queryKey: ["secrets-iac-findings"],
    queryFn: () => base44.entities.SecretFinding.list("-created_date", 500).catch(() => []),
    initialData: [],
  });

  const { data: iacFindings = [], isLoading: loadIaC } = useQuery({
    queryKey: ["iac-findings"],
    queryFn: () => base44.entities.IaCDrift.list("-created_date", 500).catch(() => []),
    initialData: [],
  });

  const secrets = allFindings;
  const exposed = secrets.filter(s => s.status === "exposed" || s.status === "open").length;
  const iacMisconfigs = iacFindings.length;

  const secretRows = secrets.map(s => ({
    _key: s.id,
    _cells: [
      <span className="text-[10px] font-semibold" style={{ color: CYAN }}>{s.secret_type || s.finding_type || "—"}</span>,
      <span className="text-[10px] text-white">{s.repo_name || s.repository || "—"}</span>,
      <span className="text-[9px] font-mono text-slate-400 truncate max-w-32 block">{s.file_path || "—"}</span>,
      <span className="text-[9px] font-mono text-slate-500">{s.line_number ? `L${s.line_number}` : "—"}</span>,
      <StatusBadge status={s.status || "exposed"} />,
      <span className="text-[9px] text-slate-500">
        {s.detected_at ? formatDistanceToNow(new Date(s.detected_at), { addSuffix: true }) : "—"}
      </span>,
    ],
  }));

  const iacRows = iacFindings.map(f => ({
    _key: f.id,
    _cells: [
      <span className="text-[10px] font-semibold text-white">{f.resource_type || f.provider || "—"}</span>,
      <span className="text-[10px] text-slate-300 truncate max-w-40 block">{f.title || f.drift_type || "—"}</span>,
      <SevBadge sev={f.severity} />,
      <span className="text-[9px] font-mono text-slate-500 truncate max-w-28 block">{f.file_path || "—"}</span>,
      <span className="text-[9px] text-slate-400 truncate max-w-36 block">{f.remediation || f.description || "—"}</span>,
    ],
  }));

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Code", path: "/code" }, { label: "Secrets & IaC" }]}
      title="Secrets & IaC" subtitle="EXPOSED SECRETS · HARDCODED CREDENTIALS · INFRASTRUCTURE MISCONFIGS">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Secrets Detected" value={secrets.length} color={DANGER} icon={KeyRound} />
        <StatCard label="Exposed Secrets" value={exposed} color={DANGER} icon={AlertTriangle} />
        <StatCard label="IaC Misconfigs" value={iacMisconfigs} color="#f97316" icon={Shield} />
        <StatCard label="Revoked/Fixed" value={secrets.length - exposed} color="#22c55e" icon={Shield} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#080c14", border: `1px solid ${BORDER}` }}>
        {[["secrets", "Exposed Secrets", KeyRound], ["iac", "IaC Misconfigs", Shield]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === key ? "#1a1f2e" : "transparent",
              color: tab === key ? "#c9a84c" : "#64748b",
            }}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "secrets" ? (
        <GDSTable
          columns={["Secret Type", "Repository", "File", "Line", "Status", "Detected"]}
          rows={secretRows} isLoading={isLoading}
          emptyText="No secret findings detected" />
      ) : (
        <GDSTable
          columns={["Resource Type", "Issue", "Severity", "File", "Remediation"]}
          rows={iacRows} isLoading={loadIaC}
          emptyText="No IaC misconfigurations found" />
      )}
    </GDSPageShell>
  );
}