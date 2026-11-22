import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Container, AlertTriangle, Shield } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SEV_COLOR, SevBadge, StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, SearchFilter, AnimatedArc, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";
import AdvancedFilterChips from "@/components/gds/AdvancedFilterChips";

export default function GDSContainersPage() {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [criticalityFilter, setCriticalityFilter] = useState("all");
  const [riskScoreFilter, setRiskScoreFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const { data: scans = [], isLoading: loadS } = useQuery({
    queryKey: ["gds-container-scans"],
    queryFn: () => base44.entities.ContainerScan.list("-scanned_at", 50).catch(() => []),
  });
  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["gds-container-findings"],
    queryFn: () => base44.entities.ContainerFinding.list("-detected_at", 200).catch(() => []),
  });

  const filtered = findings.filter(f => {
    const matchSearch = !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.cve_id?.toLowerCase().includes(search.toLowerCase());
    const matchSev = sevFilter === "all" || f.severity === sevFilter;
    const matchCriticality = criticalityFilter === "all" || f.business_criticality === criticalityFilter;
    const matchRisk = riskScoreFilter === "all" || 
      (riskScoreFilter === "high" && (f.risk_score || 0) >= 70) ||
      (riskScoreFilter === "medium" && (f.risk_score || 0) >= 40 && (f.risk_score || 0) < 70) ||
      (riskScoreFilter === "low" && (f.risk_score || 0) < 40);
    const matchOwner = ownerFilter === "all" || f.assigned_to_name === ownerFilter;
    return matchSearch && matchSev && matchCriticality && matchRisk && matchOwner;
  });

  const critCount = findings.filter(f => f.severity === "critical").length;
  const highCount = findings.filter(f => f.severity === "high").length;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Containers" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Container Security</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Container image scanning, CVE detection, and runtime risk</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Images Scanned" value={scans.length} color={CYAN} icon={Container} />
        <KpiCard label="Total Findings" value={findings.length} color={HIGH} icon={Shield} />
        <KpiCard label="Critical CVEs" value={critCount} color={DANGER} icon={AlertTriangle} pulse />
        <KpiCard label="High CVEs" value={highCount} color={HIGH} icon={AlertTriangle} />
      </div>

      {/* Scan Cards */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Container Images</h3>
        {loadS ? <Skeleton lines={3} /> : scans.length === 0
          ? <EmptyState icon={Container} title="No container scans yet" description="Run gdsScanContainer to scan your images" />
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scans.map((s, i) => (
                <Card key={s.id || i} glow className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate font-mono">{s.image_name || s.image}:{s.image_tag || "latest"}</p>
                      <p className="text-[10px] truncate" style={{ color: MUTED }}>{s.registry || "local"}</p>
                    </div>
                    <AnimatedArc score={s.risk_score} size={52} strokeWidth={5} />
                  </div>
                  <div className="flex gap-3 text-[10px] mb-2">
                    <span><span className="font-bold" style={{ color: DANGER }}>{s.critical_count ?? 0}</span> <span style={{ color: MUTED }}>crit</span></span>
                    <span><span className="font-bold" style={{ color: HIGH }}>{s.high_count ?? 0}</span> <span style={{ color: MUTED }}>high</span></span>
                    <span><span className="font-bold" style={{ color: MEDIUM }}>{s.medium_count ?? 0}</span> <span style={{ color: MUTED }}>med</span></span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span style={{ color: MUTED }}>{s.os_base || "—"} · {s.layers ?? "?"} layers</span>
                    <span style={{ color: MUTED }}>{timeAgo(s.scanned_at)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
      </div>

      {/* Findings Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <AdvancedFilterChips
            criticalityFilter={criticalityFilter}
            setCriticalityFilter={setCriticalityFilter}
            riskScoreFilter={riskScoreFilter}
            setRiskScoreFilter={setRiskScoreFilter}
            ownerFilter={ownerFilter}
            setOwnerFilter={setOwnerFilter}
            owners={[...new Set(findings.map(f => f.assigned_to_name).filter(Boolean))]}
          />
          <div className="flex items-center gap-3 flex-wrap mt-4">
            <h3 className="font-bold text-white flex-shrink-0">CVE Findings</h3>
            <SevFilterBar value={sevFilter} onChange={setSevFilter} />
            <SearchFilter value={search} onChange={setSearch} placeholder="Search CVE / title..." className="w-44 ml-auto" />
          </div>
        </div>
        {loadF ? <Skeleton /> : filtered.length === 0
          ? <EmptyState icon={Shield} title="No findings match filters" description="Your containers may be clean!" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Severity","CVE","Title","Package","Installed","Fixed In","CVSS"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((f, i) => (
                    <tr key={f.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3"><SevBadge sev={f.severity} /></td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{f.cve_id || "—"}</td>
                      <td className="px-4 py-3 text-xs text-white max-w-xs truncate">{f.title}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{f.package_name || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{f.installed_version || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: LOW }}>{f.fixed_version || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: f.cvss_score >= 9 ? DANGER : f.cvss_score >= 7 ? HIGH : MUTED }}>{f.cvss_score ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  );
}