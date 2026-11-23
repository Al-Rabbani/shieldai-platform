import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Download, Package, AlertTriangle, ChevronRight, ChevronDown } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff"; const WARN = "#eab308";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const ECO_COLOR = { npm: "#cb3837", pip: "#3776ab", maven: "#c71a36", go: "#00add8", nuget: "#004880", cargo: "#f74c00" };

function TreeNode({ pkg, depth = 0 }) {
  const [open, setOpen] = useState(depth < 1);
  const deps = pkg.transitive_deps || [];
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-1.5 py-1 cursor-pointer group" onClick={() => setOpen(!open)}>
        {deps.length > 0
          ? (open ? <ChevronDown className="w-3 h-3 text-slate-600" /> : <ChevronRight className="w-3 h-3 text-slate-600" />)
          : <span className="w-3" />}
        <span className="text-[10px] font-mono text-slate-300">{pkg.package_name}</span>
        <span className="text-[9px] text-slate-600">{pkg.version}</span>
        {pkg.vuln_count > 0 && <span className="text-[8px] font-bold px-1.5 rounded" style={{ color: DANGER, background: "rgba(239,68,68,0.1)" }}>{pkg.vuln_count} vulns</span>}
        {pkg.is_eol && <span className="text-[8px] font-bold px-1.5 rounded" style={{ color: WARN, background: "rgba(234,179,8,0.1)" }}>EOL</span>}
      </div>
      {open && deps.map((d, i) => <TreeNode key={i} pkg={d} depth={depth + 1} />)}
    </div>
  );
}

export default function SBOMPage() {
  const [selectedRepo, setSelectedRepo] = useState("");

  const { data: repos = [] } = useQuery({
    queryKey: ["sbom-repos"],
    queryFn: () => base44.entities.CodeRepository.list("-created_date", 100).catch(() => []),
    initialData: [],
  });

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["sbom-packages", selectedRepo],
    queryFn: () => selectedRepo
      ? base44.entities.LicenseRisk.filter({ repo_name: selectedRepo }).catch(() => [])
      : base44.entities.LicenseRisk.list("-created_date", 500).catch(() => []),
    initialData: [],
  });

  const total    = packages.length;
  const direct   = packages.filter(p => p.is_direct).length;
  const outdated = packages.filter(p => p.latest_version && p.version !== p.latest_version).length;
  const eol      = packages.filter(p => p.is_eol).length;
  const vulnPkgs = packages.filter(p => (p.vuln_count || 0) > 0).length;
  const licViol  = packages.filter(p => p.risk_level === "high" || p.risk_level === "critical").length;

  const rows = packages.slice(0, 500).map(p => ({
    _key: p.id,
    _cells: [
      <span className="text-[11px] font-semibold text-white">{p.package_name || "—"}</span>,
      <span className="text-[9px] font-mono text-slate-400">{p.version || "—"}</span>,
      <span className="text-[9px] font-mono" style={{ color: p.latest_version && p.version !== p.latest_version ? WARN : "#64748b" }}>{p.latest_version || "—"}</span>,
      <span className="text-[9px] text-slate-400">{p.license_type || "—"}</span>,
      <span className="text-[9px]" style={{ color: p.is_eol ? DANGER : SUCCESS }}>{p.is_eol ? `⚠ EOL${p.eol_date ? ` (${p.eol_date.slice(0,10)})` : ""}` : "✓ Active"}</span>,
      <span className="text-[10px] font-mono" style={{ color: (p.vuln_count||0) > 0 ? DANGER : "#64748b" }}>{p.vuln_count ?? 0}</span>,
      <span className="text-[9px]" style={{ color: p.is_direct ? CYAN : "#64748b" }}>{p.is_direct ? "Direct" : "Transitive"}</span>,
      <span className="text-[9px] text-slate-500 truncate max-w-24 block">{p.used_in || "—"}</span>,
      (() => {
        const ec = ECO_COLOR[p.registry || p.ecosystem] || "#64748b";
        return <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: ec, background: `${ec}18` }}>{p.registry || p.ecosystem || "—"}</span>;
      })(),
    ],
  }));

  // Build simple tree from packages
  const directPkgs = packages.filter(p => p.is_direct).slice(0, 15).map(p => ({
    package_name: p.package_name,
    version: p.version,
    vuln_count: p.vuln_count || 0,
    is_eol: p.is_eol,
    transitive_deps: packages.filter(t => !t.is_direct && t.parent_package === p.package_name).slice(0, 5).map(t => ({
      package_name: t.package_name, version: t.version, vuln_count: t.vuln_count || 0, is_eol: t.is_eol, transitive_deps: [],
    })),
  }));

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Supply Chain", path: "/supply-chain" }, { label: "SBOM" }]}
      title="Software Bill of Materials" subtitle="PACKAGE INVENTORY · DEPENDENCY GRAPH · VULNERABILITY TRACKING"
      actions={
        <div className="flex items-center gap-2">
          <select value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-300"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <option value="">All Repositories</option>
            {repos.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: "rgba(0,212,255,0.1)", color: CYAN, border: `1px solid rgba(0,212,255,0.2)` }}>
            <Download className="w-3.5 h-3.5" /> CycloneDX
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: "rgba(201,168,76,0.1)", color: GOLD, border: `1px solid rgba(201,168,76,0.2)` }}>
            <Download className="w-3.5 h-3.5" /> SPDX
          </button>
        </div>
      }>

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Packages" value={total} color={CYAN} icon={Package} />
        <StatCard label="Direct Deps" value={direct} color="#a78bfa" icon={Package} />
        <StatCard label="Transitive" value={total - direct} color="#64748b" icon={Package} />
        <StatCard label="Outdated" value={outdated} color={WARN} icon={AlertTriangle} />
        <StatCard label="EOL" value={eol} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Vulnerable" value={vulnPkgs} color={DANGER} icon={AlertTriangle} />
      </div>

      {/* Dependency Tree */}
      {directPkgs.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-3">Dependency Tree</h3>
          <div className="max-h-64 overflow-y-auto pr-2">
            {directPkgs.map((p, i) => <TreeNode key={i} pkg={p} />)}
          </div>
        </div>
      )}

      <GDSTable
        columns={["Package","Version","Latest","License","EOL Status","Vulns","Type","Used In","Ecosystem"]}
        rows={rows} isLoading={isLoading}
        emptyText="No packages found — select a repository or add SBOM data" />
    </GDSPageShell>
  );
}