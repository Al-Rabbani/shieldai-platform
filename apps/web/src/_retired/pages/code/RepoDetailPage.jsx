import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { GitBranch, GitPullRequest, AlertTriangle, Package, Code2, BarChart2 } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, ProviderBadge, StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";
const TABS = ["Findings", "Dependencies", "Tech Debt", "Code Quality"];

export default function RepoDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState("Findings");
  const [sevFilter, setSevFilter] = useState("all");

  const { data: repo, isLoading: loadRepo } = useQuery({
    queryKey: ["repo-detail", id],
    queryFn: () => base44.entities.CodeRepository.filter({ id }).then(r => r[0]).catch(() => null),
    enabled: !!id,
  });

  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["repo-findings", id, repo?.name],
    queryFn: () => base44.entities.TriagedFinding.filter({ asset_name: repo?.name }).catch(() => []),
    enabled: !!repo?.name,
    initialData: [],
  });

  const { data: licenses = [], isLoading: loadL } = useQuery({
    queryKey: ["repo-licenses", repo?.name],
    queryFn: () => base44.entities.LicenseRisk.filter({ repo_name: repo?.name }).catch(() => []),
    enabled: !!repo?.name,
    initialData: [],
  });

  const filteredFindings = sevFilter === "all" ? findings : findings.filter(f => (f.normalized_severity || f.severity) === sevFilter);

  const findingRows = filteredFindings.map(f => ({
    _key: f.id,
    _cells: [
      <SevBadge sev={f.normalized_severity || f.severity} />,
      <span className="text-[11px] text-white font-medium">{f.title || "—"}</span>,
      <span className="text-[9px] font-mono text-slate-500 truncate max-w-32 block">{f.file_path || "—"}</span>,
      <span className="text-[9px] font-mono text-slate-500">{f.line_number ? `L${f.line_number}` : "—"}</span>,
      <StatusBadge status={f.status || f.finding_status} />,
      <span className="text-[10px] font-mono text-slate-300">{f.cvss_score != null ? Number(f.cvss_score).toFixed(1) : "—"}</span>,
    ],
  }));

  const licRows = licenses.map(l => {
    const rColor = l.risk_level === "high" || l.risk_level === "critical" ? DANGER : l.risk_level === "medium" ? "#eab308" : SUCCESS;
    return {
      _key: l.id,
      _cells: [
        <span className="text-[11px] text-white">{l.package_name || "—"}</span>,
        <span className="font-mono text-[10px] text-slate-400">{l.version || "—"}</span>,
        <span className="font-mono text-[10px]" style={{ color: SUCCESS }}>{l.latest_version || "—"}</span>,
        <span className="text-[10px] text-slate-400">{l.license_type || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
          style={{ color: rColor, background: `${rColor}18` }}>{l.risk_level || "—"}</span>,
      ],
    };
  });

  const repoName = repo?.name || "Repository";
  const riskColor = !repo ? "#64748b" : (repo.risk_score >= 75 ? SUCCESS : repo.risk_score >= 40 ? "#eab308" : DANGER);

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Code", path: "/code" }, { label: repoName }]}
      title={repoName}
      subtitle={repo ? `${repo.provider?.toUpperCase() || ""} · ${repo.language || ""}`.trim() : ""}
      actions={
        repo && (
          <div className="flex items-center gap-3">
            <ProviderBadge provider={repo.provider} />
            {repo.open_prs > 0 && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: CYAN }}>
                <GitPullRequest className="w-3.5 h-3.5" /> {repo.open_prs} open PRs
              </span>
            )}
            <span className="text-sm font-black font-mono" style={{ color: riskColor }}>
              Risk: {repo.risk_score ?? "—"}
            </span>
          </div>
        )
      }>

      {/* Repo Stats */}
      {!loadRepo && repo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Findings" value={repo.total_findings ?? 0} color="#94a3b8" icon={AlertTriangle} />
          <StatCard label="Critical" value={repo.critical_count ?? 0} color={DANGER} icon={AlertTriangle} />
          <StatCard label="Tech Debt" value={repo.tech_debt_hours ? `${repo.tech_debt_hours}h` : "—"} color="#f97316" icon={Code2} />
          <StatCard label="Test Coverage" value={repo.test_coverage_pct != null ? `${repo.test_coverage_pct}%` : "—"}
            color={(repo.test_coverage_pct || 0) >= 70 ? SUCCESS : DANGER} icon={BarChart2} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#080c14", border: `1px solid ${BORDER}` }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: tab === t ? "#1a1f2e" : "transparent", color: tab === t ? GOLD : "#64748b" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Findings Tab */}
      {tab === "Findings" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">{filteredFindings.length} findings</span>
            <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {["all", "critical", "high", "medium", "low"].map(s => <option key={s} value={s}>{s === "all" ? "All Severity" : s}</option>)}
            </select>
          </div>
          <GDSTable columns={["Severity", "Title", "File", "Line", "Status", "CVSS"]}
            rows={findingRows} isLoading={loadF} emptyText="No findings for this repository" />
        </div>
      )}

      {/* Dependencies Tab */}
      {tab === "Dependencies" && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatCard label="Outdated Deps" value={repo?.outdated_deps ?? "—"} color="#f97316" icon={Package} />
            <StatCard label="EOL Packages" value={repo?.eol_packages ?? "—"} color={DANGER} icon={Package} />
            <StatCard label="License Issues" value={repo?.license_violations ?? "—"} color="#eab308" icon={Package} />
          </div>
          <GDSTable columns={["Package", "Version", "Latest", "License", "Risk"]}
            rows={licRows} isLoading={loadL} emptyText="No dependency data available" />
        </div>
      )}

      {/* Tech Debt Tab */}
      {tab === "Tech Debt" && repo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatCard label="Tech Debt Hours" value={repo.tech_debt_hours ? `${repo.tech_debt_hours}h` : "—"} color="#f97316" icon={Code2} />
          <StatCard label="Duplicated Lines" value={repo.duplicated_lines_pct != null ? `${repo.duplicated_lines_pct}%` : "—"} color="#eab308" icon={Code2} />
          <StatCard label="Code Quality Score" value={repo.code_quality_score ?? "—"} color={CYAN} icon={BarChart2} />
        </div>
      )}

      {/* Code Quality Tab */}
      {tab === "Code Quality" && repo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatCard label="Test Coverage" value={repo.test_coverage_pct != null ? `${repo.test_coverage_pct}%` : "—"}
            color={(repo.test_coverage_pct || 0) >= 70 ? SUCCESS : DANGER} icon={BarChart2} />
          <StatCard label="Code Quality Score" value={repo.code_quality_score ?? "—"} color={CYAN} icon={BarChart2} />
          <StatCard label="Open PRs" value={repo.open_prs ?? "—"} color="#a78bfa" icon={GitPullRequest} />
        </div>
      )}
    </GDSPageShell>
  );
}