import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, AlertTriangle, Shield, TrendingUp, Layers, GitBranch } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SearchFilter } from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";

const BG = "#020817";

export default function GDSDependencySecurityPage() {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => { const t = setTimeout(() => setShowCharts(true), 400); return () => clearTimeout(t); }, []);

  const { data: dependencies = [], isLoading: loadD } = useQuery({
    queryKey: ["dependency-records"], queryFn: () => base44.entities.DependencyRecord.list("-analyzed_at", 200).catch(() => []),
  });

  const { data: vulnerabilities = [], isLoading: loadV } = useQuery({
    queryKey: ["dependency-vulns"], queryFn: () => base44.entities.SCAFinding.filter({ 
      severity: { $in: sevFilter === "all" ? ["critical", "high", "medium", "low"] : [sevFilter] }
    }, "-detected_at", 300).catch(() => []),
  });

  const filteredDeps = dependencies.filter(d => 
    !search || d.package_name?.toLowerCase().includes(search.toLowerCase()) || d.repository?.toLowerCase().includes(search.toLowerCase())
  );

  const totalDeps = dependencies.length;
  const vulnerableDeps = dependencies.filter(d => (d.vulnerability_count || 0) > 0).length;
  const outdatedDeps = dependencies.filter(d => d.is_outdated).length;
  const directDeps = dependencies.filter(d => d.is_direct_dependency).length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "DevSecOps", path: "/devsecops" }, { label: "Dependencies" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Layers className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Dependency Security</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Track and secure your application dependencies across all ecosystems</p>
          </div>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Dependencies</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{totalDeps}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Vulnerable</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{vulnerableDeps}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Outdated</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{outdatedDeps}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Direct Dependencies</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{directDeps}</p>
        </Card>
      </div>

      {/* Dependency Tree */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Dependency Graph</h3>
          </div>
          <SearchFilter value={search} onChange={setSearch} placeholder="Search packages..." className="w-44" />
        </div>
        {loadD ? <Skeleton lines={4} /> : filteredDeps.length === 0 ? (
          <EmptyState icon={Package} title="No dependencies tracked" description="Scan your projects to analyze dependencies" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Package", "Ecosystem", "Version", "Latest", "Vulnerabilities", "Type", "License", "Last Analyzed"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDeps.slice(0, 10).map((dep) => (
                  <tr key={dep.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <p className="text-sm font-semibold text-white">{dep.package_name || dep.name}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${CYAN}15`, color: CYAN }}>
                        {dep.ecosystem || "npm"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{dep.current_version || "—"}</td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: dep.is_outdated ? HIGH : MUTED }}>
                      {dep.latest_version || "—"}
                      {dep.is_outdated && <span className="ml-1 text-[9px]">⚠</span>}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        (dep.vulnerability_count || 0) > 0 ? "bg-red-400/15 text-red-400" : "bg-green-400/15 text-green-400"
                      }`}>
                        {dep.vulnerability_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        dep.is_direct_dependency ? "bg-blue-400/15 text-blue-400" : "bg-gray-400/15 text-gray-400"
                      }`}>
                        {dep.is_direct_dependency ? "Direct" : "Transitive"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{dep.license || "Unknown"}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(dep.analyzed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Security Advisories */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Security Advisories</h3>
          </div>
          <SevFilterBar value={sevFilter} onChange={setSevFilter} />
        </div>
        {loadV ? <Skeleton lines={4} /> : vulnerabilities.length === 0 ? (
          <EmptyState icon={Shield} title="No security advisories" description="Your dependencies have no known vulnerabilities" />
        ) : (
          <div className="space-y-2">
            {vulnerabilities.slice(0, 10).map((adv) => (
              <div key={adv.id} className="p-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                  adv.severity === "critical" ? "bg-red-400/15 text-red-400" :
                  adv.severity === "high" ? "bg-orange-400/15 text-orange-400" :
                  adv.severity === "medium" ? "bg-yellow-400/15 text-yellow-400" :
                  "bg-blue-400/15 text-blue-400"
                }`}>
                  {adv.severity.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{adv.vulnerability_id || adv.cve_id}</p>
                  <p className="text-[10px] truncate" style={{ color: MUTED }}>{adv.package_name} @ {adv.current_version}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-mono" style={{ color: adv.cvss_score >= 9 ? DANGER : adv.cvss_score >= 7 ? HIGH : MUTED }}>
                    CVSS {adv.cvss_score || "—"}
                  </p>
                  <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(adv.detected_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}