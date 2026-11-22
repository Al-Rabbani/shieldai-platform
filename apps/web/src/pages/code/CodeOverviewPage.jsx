import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Code2, Plus, AlertTriangle, GitBranch, Clock } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { StatCard, SevBadge, ProviderBadge } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const CYAN = "#00d4ff"; const SUCCESS = "#22c55e";
const CARD = "#111827"; const BORDER = "#1a1f2e";

function RiskScore({ score }) {
  const color = score >= 75 ? SUCCESS : score >= 40 ? "#eab308" : DANGER;
  return <span className="font-black font-mono text-sm" style={{ color }}>{score ?? "—"}</span>;
}

export default function CodeOverviewPage() {
  const [search, setSearch] = useState("");

  const { data: repos = [], isLoading } = useQuery({
    queryKey: ["code-repos"],
    queryFn: () => base44.entities.CodeRepository.list("-last_scanned", 100).catch(() => []),
    initialData: [],
  });

  const filtered = repos.filter(r =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.language?.toLowerCase().includes(search.toLowerCase())
  );

  const totalFindings = repos.reduce((s, r) => s + (r.total_findings || 0), 0);
  const totalCritical = repos.reduce((s, r) => s + (r.critical_count || 0), 0);
  const avgRisk = repos.length ? Math.round(repos.reduce((s, r) => s + (r.risk_score || 0), 0) / repos.length) : 0;

  const rows = filtered.map(r => ({
    _key: r.id,
    _data: r,
    _cells: [
      <div className="flex items-center gap-2">
        <ProviderBadge provider={r.provider} />
        <span className="text-white font-semibold text-xs">{r.name}</span>
        {!r.is_private && <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: "rgba(0,212,255,0.1)" }}>Public</span>}
      </div>,
      <span className="text-[10px] text-slate-400">{r.language || "—"}</span>,
      <div className="flex items-center gap-1">
        {r.critical_count > 0 && <SevBadge sev="critical" />}
        {r.high_count > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: "#f97316", background: "rgba(249,115,22,0.1)" }}>{r.high_count}H</span>}
        <span className="text-[10px] text-slate-400">{r.total_findings ?? 0} total</span>
      </div>,
      <RiskScore score={r.risk_score} />,
      <span className="text-[10px] font-mono text-slate-400">{r.tech_debt_hours ? `${r.tech_debt_hours}h` : "—"}</span>,
      <span className="text-[10px] font-mono" style={{ color: (r.test_coverage_pct || 0) >= 70 ? SUCCESS : DANGER }}>
        {r.test_coverage_pct != null ? `${r.test_coverage_pct}%` : "—"}
      </span>,
      <span className="text-[9px] text-slate-500">
        {r.last_scanned ? formatDistanceToNow(new Date(r.last_scanned), { addSuffix: true }) : "Never"}
      </span>,
    ],
  }));

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Code Security" }]}
      title="Code Security" subtitle="SAST · SCA · SECRETS · SBOM · SUPPLY CHAIN"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search repos…"
              className="bg-transparent text-xs text-white placeholder-slate-600 outline-none w-36" />
          </div>
          <Link to="/code/repositories" className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: GOLD, color: "#0a0e17" }}>
            <Plus className="w-3.5 h-3.5" /> Scan New Repo
          </Link>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Repos" value={repos.length} color={CYAN} icon={GitBranch} />
        <StatCard label="Total Findings" value={totalFindings} color="#94a3b8" icon={AlertTriangle} />
        <StatCard label="Critical Findings" value={totalCritical} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Avg Risk Score" value={avgRisk} color={avgRisk >= 75 ? SUCCESS : avgRisk >= 40 ? "#eab308" : DANGER} icon={Code2} />
      </div>

      <GDSTable
        columns={["Repository", "Language", "Findings", "Risk Score", "Tech Debt", "Test Coverage", "Last Scanned"]}
        rows={rows}
        isLoading={isLoading}
        emptyText="No repositories connected yet"
        onRowClick={r => window.location.href = `/code/repositories/${r.id}`}
      />
    </GDSPageShell>
  );
}