import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, AlertTriangle, Lock, Globe } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { YesNo, StatCard, ProviderBadge } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const ASSET_TYPE_COLOR = {
  s3_bucket: "#ff9900", gcs_bucket: "#4285f4", azure_blob: "#0078d4",
  rds_database: "#3b82f6", bigquery_dataset: "#4285f4",
  dynamodb_table: "#ff9900", elasticsearch: "#f59e0b", redis: "#dc382d", mongodb: "#4db33d",
};

function SensitivityBar({ score }) {
  const color = score >= 80 ? DANGER : score >= 50 ? "#eab308" : SUCCESS;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[9px] font-mono" style={{ color }}>{score}</span>
    </div>
  );
}

export default function DSPMPage() {
  const [provider, setProvider] = useState("all");
  const [dataType, setDataType] = useState("all");
  const [encFilter, setEncFilter] = useState("all");

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["dspm-assets"],
    queryFn: () => base44.entities.DSPMAsset.list("-sensitivity_score", 500).catch(() => []),
    initialData: [],
  });

  const filtered = assets.filter(a => {
    if (provider !== "all" && a.provider !== provider) return false;
    if (dataType === "pii" && !a.pii_detected) return false;
    if (dataType === "pci" && !a.pci_data) return false;
    if (dataType === "phi" && !a.phi_data) return false;
    if (encFilter === "unencrypted" && a.encryption_at_rest) return false;
    if (encFilter === "encrypted" && !a.encryption_at_rest) return false;
    return true;
  });

  const providers = [...new Set(assets.map(a => a.provider).filter(Boolean))];

  const rows = filtered.map(a => {
    const typeColor = ASSET_TYPE_COLOR[a.asset_type] || "#64748b";
    return {
      _key: a.id,
      _cells: [
        <span className="text-[11px] font-semibold text-white">{a.asset_name || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
          style={{ color: typeColor, background: `${typeColor}18` }}>
          {(a.asset_type || "—").replace(/_/g, " ")}
        </span>,
        <ProviderBadge provider={a.provider} />,
        <span className="text-[9px] text-slate-400">{a.region || "—"}</span>,
        <SensitivityBar score={a.sensitivity_score || 0} />,
        <YesNo val={a.pii_detected} />,
        <YesNo val={a.pci_data} />,
        <div className="flex items-center gap-1">
          {!a.encryption_at_rest && <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ color: DANGER, background: "rgba(239,68,68,0.1)" }}>No Enc</span>}
          {a.encryption_at_rest && <span className="text-[8px]" style={{ color: SUCCESS }}>✓</span>}
        </div>,
        <div className="flex items-center gap-1">
          {a.public_access && <span className="text-[8px] px-1.5 py-0.5 rounded font-bold animate-pulse" style={{ color: DANGER, background: "rgba(239,68,68,0.1)" }}>⚠ Public</span>}
          {!a.public_access && <span className="text-[8px]" style={{ color: "#64748b" }}>Private</span>}
        </div>,
        <span className="text-[9px] font-mono text-slate-400">{a.data_size_gb ? `${a.data_size_gb}GB` : "—"}</span>,
        <span className="text-[9px] text-slate-400">{a.owner_team || "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Cloud", path: "/cloud" }, { label: "DSPM" }]}
      title="DSPM — Data Security" subtitle="DATA STORE INVENTORY · PII DETECTION · ENCRYPTION POSTURE"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {[
            ["provider", provider, setProvider, ["all", ...providers]],
            ["data type", dataType, setDataType, ["all", "pii", "pci", "phi"]],
            ["encryption", encFilter, setEncFilter, ["all", "encrypted", "unencrypted"]],
          ].map(([key, val, set, opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o.toUpperCase()}</option>)}
            </select>
          ))}
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Data Stores" value={assets.length} color={CYAN} icon={Database} />
        <StatCard label="With PII" value={assets.filter(a => a.pii_detected).length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Public Access" value={assets.filter(a => a.public_access).length} color={DANGER} icon={Globe} />
        <StatCard label="Unencrypted" value={assets.filter(a => !a.encryption_at_rest).length} color="#eab308" icon={Lock} />
      </div>

      <GDSTable
        columns={["Asset Name", "Type", "Provider", "Region", "Sensitivity", "PII", "PCI", "Encryption", "Access", "Size", "Owner"]}
        rows={rows} isLoading={isLoading}
        emptyText="No data stores scanned yet" />
    </GDSPageShell>
  );
}