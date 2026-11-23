import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, AlertTriangle, Scale, XCircle } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const CARD = "#111827"; const BORDER = "#1a1f2e";
const SUCCESS = "#22c55e";

const ECO_COLORS = { npm: "#cb3837", pip: "#3572a5", go: "#00acd7", maven: "#c71a36", nuget: "#004880", cargo: "#ce422b" };

export default function DependenciesPage() {
  const [eco, setEco] = useState("all");

  const { data: licenses = [], isLoading: loadL } = useQuery({
    queryKey: ["license-risks"],
    queryFn: () => base44.entities.LicenseRisk.list("-created_date", 500).catch(() => []),
    initialData: [],
  });

  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["sca-findings"],
    queryFn: () => base44.entities.SCAFinding.list("-created_date", 500).catch(() => []),
    initialData: [],
  });

  const filteredFindings = eco === "all" ? findings : findings.filter(f => f.ecosystem?.toLowerCase() === eco);
  const filteredLicenses = eco === "all" ? licenses : licenses.filter(l => l.ecosystem?.toLowerCase() === eco);

  const ecosystems = [...new Set(findings.map(f => f.ecosystem).filter(Boolean))];
  const outdated = findings.filter(f => f.is_outdated).length;
  const eol = licenses.filter(l => l.is_eol).length;
  const licViolations = licenses.filter(l => l.risk_level === "high" || l.risk_level === "critical").length;
  const vulnerable = findings.filter(f => f.severity === "critical" || f.severity === "high").length;

  const findingRows = filteredFindings.map(f => ({
    _key: f.id,
    _cells: [
      <span className="text-white font-semibold text-xs">{f.package_name || "—"}</span>,
      <span className="font-mono text-[10px] text-slate-400">{f.installed_version || "—"}</span>,
      <SevBadge sev={f.severity} />,
      <span className="font-mono text-[9px]" style={{ color: "#3b82f6" }}>{f.cve_id || "—"}</span>,
      <span className="font-mono text-[10px]" style={{ color: SUCCESS }}>{f.fixed_version || "—"}</span>,
      <span className="text-[10px] text-slate-400">{f.repo_name || "—"}</span>,
      f.ecosystem ? (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded"
          style={{ color: ECO_COLORS[f.ecosystem] || "#64748b", background: `${ECO_COLORS[f.ecosystem] || "#64748b"}18` }}>
          {f.ecosystem}
        </span>
      ) : <span className="text-slate-600">—</span>,
    ],
  }));

  const licenseRows = filteredLicenses.map(l => {
    const riskColor = l.risk_level === "critical" || l.risk_level === "high" ? DANGER : l.risk_level === "medium" ? "#eab308" : SUCCESS;
    return {
      _key: l.id,
      _cells: [
        <span className="text-white font-semibold text-xs">{l.package_name || "—"}</span>,
        <span className="font-mono text-[10px] text-slate-400">{l.version || "—"}</span>,
        <span className="text-[10px] text-slate-300">{l.license_type || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
          style={{ color: riskColor, background: `${riskColor}18` }}>{l.risk_level || "—"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-32 block">{l.risk_reason || "—"}</span>,
        <span className="text-[9px]" style={{ color: l.is_eol ? DANGER : "#64748b" }}>{l.is_eol ? "EOL" : "Active"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Code", path: "/code" }, { label: "Dependencies" }]}
      title="Dependencies & SCA" subtitle="SOFTWARE COMPOSITION ANALYSIS · LICENSE COMPLIANCE"
      actions={
        <select value={eco} onChange={e => setEco(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs text-slate-300"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <option value="all">All Ecosystems</option>
          {ecosystems.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Outdated Deps" value={outdated} color="#f97316" icon={Package} />
        <StatCard label="EOL Packages" value={eol} color={DANGER} icon={XCircle} />
        <StatCard label="License Violations" value={licViolations} color="#eab308" icon={Scale} />
        <StatCard label="Vulnerable Packages" value={vulnerable} color={DANGER} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Vulnerable Dependencies</h3>
          <GDSTable
            columns={["Package", "Version", "Severity", "CVE", "Fix Version", "Repo", "Ecosystem"]}
            rows={findingRows} isLoading={loadF}
            emptyText="No vulnerable dependencies found" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white mb-3">License Risks</h3>
          <GDSTable
            columns={["Package", "Version", "License", "Risk Level", "Reason", "EOL"]}
            rows={licenseRows} isLoading={loadL}
            emptyText="No license risks found" />
        </div>
      </div>
    </GDSPageShell>
  );
}