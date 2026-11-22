import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Code2, GitBranch, Package, AlertTriangle, Zap } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SEV_COLOR, TOOLTIP_STYLE, SevBadge, StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, SearchFilter, AnimatedArc, timeAgo, ProviderBadge, PAGE_BG
} from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";
import FindingDetailDrawer from "@/components/gds/FindingDetailDrawer";
import FindingsBulkTable from "@/components/gds/FindingsBulkTable";

export default function GDSCodePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [selectedFinding, setSelectedFinding] = useState(null);

  const { data: repos = [], isLoading: loadR } = useQuery({
    queryKey: ["gds-repos"],
    queryFn: () => base44.entities.CodeRepository.list().catch(() => []),
  });
  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["gds-code-findings"],
    queryFn: () => base44.entities.TriagedFinding.list("-created_date", 200).catch(() => []),
  });
  const { data: licenses = [], isLoading: loadL } = useQuery({
    queryKey: ["gds-licenses"],
    queryFn: () => base44.entities.LicenseRisk.list().catch(() => []),
  });



  const codeScanners = ["sca","sast","iac","sca_osv","secret","secrets","semgrep","trivy"];
  const codeFindings = findings.filter(f => {
    const src = (f.source_scanners || f.scanner || "").toLowerCase();
    return codeScanners.some(s => src.includes(s));
  });

  const filtered = codeFindings.filter(f => {
    const matchSearch = !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.asset_name?.toLowerCase().includes(search.toLowerCase());
    const matchSev = sevFilter === "all" || (f.normalized_severity || f.severity) === sevFilter;
    return matchSearch && matchSev;
  });

  const critCount = codeFindings.filter(f => (f.normalized_severity || f.severity) === "critical").length;
  const highCount = codeFindings.filter(f => (f.normalized_severity || f.severity) === "high").length;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Code & Repos" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Code Security</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>SAST, SCA, secrets scanning, and repository risk</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Repositories" value={repos.length} color={CYAN} icon={GitBranch} />
        <KpiCard label="Code Findings" value={codeFindings.length} color={HIGH} icon={Code2} />
        <KpiCard label="Critical" value={critCount} color={DANGER} icon={AlertTriangle} pulse />
        <KpiCard label="License Risks" value={licenses.length} color={MEDIUM} icon={Package} />
      </div>

      {/* Repo Cards */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Repositories</h3>
        {loadR ? <Skeleton lines={3} /> : repos.length === 0
          ? <EmptyState icon={GitBranch} title="No repositories connected" description="Connect a GitHub, GitLab, or Bitbucket repo to start scanning" />
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map((r, i) => (
                <Card key={r.id || i} glow className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{r.name}</p>
                      <p className="text-[10px] truncate" style={{ color: MUTED }}>{r.full_name}</p>
                    </div>
                    <ProviderBadge provider={r.provider} />
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <AnimatedArc score={r.risk_score} size={56} strokeWidth={6} />
                    <div className="text-right space-y-1">
                      <p className="text-[10px]"><span className="font-bold" style={{ color: DANGER }}>{r.critical_count ?? 0}</span> <span style={{ color: MUTED }}>crit</span></p>
                      <p className="text-[10px]"><span className="font-bold" style={{ color: HIGH }}>{r.high_count ?? 0}</span> <span style={{ color: MUTED }}>high</span></p>
                      <p className="text-[10px]"><span className="font-bold" style={{ color: CYAN }}>{r.open_prs ?? 0}</span> <span style={{ color: MUTED }}>PRs</span></p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span style={{ color: MUTED }}>{r.language || "—"}</span>
                    <span style={{ color: MUTED }}>{timeAgo(r.last_scanned)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
      </div>

      {/* Findings Table with bulk actions + detail drawer */}
      <div>
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h3 className="font-bold text-white flex-shrink-0">Code Findings</h3>
          <SearchFilter value={search} onChange={setSearch} placeholder="Search findings..." className="w-44 ml-auto" />
        </div>
        <FindingsBulkTable
          findings={filtered}
          isLoading={loadF}
          queryKey="gds-code-findings"
          entityName="TriagedFinding"
          emptyTitle="No code findings match filters"
          columns={[
            { key: "severity", label: "Severity", render: f => <span onClick={() => setSelectedFinding(f)} className="cursor-pointer"><SevBadge sev={f.normalized_severity || f.severity} /></span> },
            { key: "title", label: "Title", render: f => <span className="text-xs text-white truncate block max-w-xs cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => setSelectedFinding(f)}>{f.title}</span> },
            { key: "asset_name", label: "Asset", render: f => <span className="text-xs font-mono truncate block max-w-[140px]" style={{ color: MUTED }}>{f.asset_name || "—"}</span> },
            { key: "cve_id", label: "CVE", render: f => <span className="text-xs font-mono" style={{ color: CYAN }}>{f.cve_id || "—"}</span> },
            { key: "package_name", label: "Package", render: f => <span className="text-xs font-mono" style={{ color: MUTED }}>{f.package_name || "—"}</span> },
            { key: "fixed_version", label: "Fixed In", render: f => <span className="text-xs font-mono" style={{ color: LOW }}>{f.fixed_version || "—"}</span> },
            { key: "autofix_available", label: "AutoFix", render: f => f.autofix_available ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}><Zap className="w-3 h-3 inline mr-0.5" />Fix</span> : null },
            { key: "status", label: "Status", render: f => <StatusBadge status={f.status} /> },
          ]}
        />
      </div>

      {selectedFinding && (
        <FindingDetailDrawer finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
      )}

      {/* License Risks */}
      {licenses.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="font-bold text-white">License Risks</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["Package","License","Risk Level","Repository","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {licenses.slice(0, 50).map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <td className="px-4 py-3 text-xs font-mono text-white">{l.package_name || "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{l.license_type || "—"}</td>
                    <td className="px-4 py-3"><SevBadge sev={l.risk_level || l.severity} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{l.repository || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}