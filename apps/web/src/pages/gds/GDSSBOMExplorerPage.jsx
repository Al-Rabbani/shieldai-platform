import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Package, AlertTriangle, Shield, TrendingUp, CheckCircle, Search } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SearchFilter } from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";

const BG = "#020817";

export default function GDSSBOMExplorerPage() {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => { const t = setTimeout(() => setShowCharts(true), 400); return () => clearTimeout(t); }, []);

  const { data: sboms = [], isLoading: loadS } = useQuery({
    queryKey: ["sbom-records"], queryFn: () => base44.entities.SBOM.list("-created_at", 200).catch(() => []),
  });

  const { data: vulnerabilities = [], isLoading: loadV } = useQuery({
    queryKey: ["sbom-vulns"], queryFn: () => base44.entities.SCAFinding.list("-detected_at", 300).catch(() => []),
  });

  const filteredSBOMs = sboms.filter(s => 
    !search || s.project_name?.toLowerCase().includes(search.toLowerCase()) || s.repository?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVulns = vulnerabilities.filter(v => {
    const matchSearch = !search || v.package_name?.toLowerCase().includes(search.toLowerCase());
    const matchSev = sevFilter === "all" || v.severity === sevFilter;
    return matchSearch && matchSev;
  });

  const totalComponents = sboms.reduce((sum, s) => sum + (s.component_count || 0), 0);
  const criticalVulns = vulnerabilities.filter(v => v.severity === "critical").length;
  const highVulns = vulnerabilities.filter(v => v.severity === "high").length;
  const outdatedPackages = sboms.filter(s => (s.outdated_count || 0) > 0).length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "DevSecOps", path: "/devsecops" }, { label: "SBOM Explorer" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <FileText className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">SBOM Explorer</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Software Bill of Materials tracking and component vulnerability analysis</p>
          </div>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total SBOMs</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{sboms.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Components</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{totalComponents}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Vulns</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{criticalVulns}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Outdated Packages</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{outdatedPackages}</p>
        </Card>
      </div>

      {/* SBOM Projects */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">SBOM Projects</h3>
          </div>
          <SearchFilter value={search} onChange={setSearch} placeholder="Search projects..." className="w-44" />
        </div>
        {loadS ? <Skeleton lines={4} /> : filteredSBOMs.length === 0 ? (
          <EmptyState icon={FileText} title="No SBOM records" description="Scan your repositories to generate software bills of materials" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Project", "Repository", "Components", "Outdated", "License Risks", "Last Generated"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSBOMs.slice(0, 10).map((sbom) => (
                  <tr key={sbom.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <p className="text-sm font-semibold text-white">{sbom.project_name || sbom.name}</p>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono truncate max-w-xs" style={{ color: TEXT }}>{sbom.repository || "—"}</td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{sbom.component_count || 0}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        (sbom.outdated_count || 0) > 5 ? "bg-red-400/15 text-red-400" :
                        (sbom.outdated_count || 0) > 0 ? "bg-orange-400/15 text-orange-400" :
                        "bg-green-400/15 text-green-400"
                      }`}>
                        {sbom.outdated_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        (sbom.license_violations || 0) > 0 ? "bg-red-400/15 text-red-400" : "bg-green-400/15 text-green-400"
                      }`}>
                        {sbom.license_violations || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(sbom.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Component Vulnerabilities */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Component Vulnerabilities</h3>
          </div>
          <SevFilterBar value={sevFilter} onChange={setSevFilter} />
        </div>
        {loadV ? <Skeleton lines={4} /> : filteredVulns.length === 0 ? (
          <EmptyState icon={Shield} title="No component vulnerabilities" description="Your dependencies are secure" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Severity", "Package", "Version", "Vulnerability", "CVSS", "Fixed Version", "Detected"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredVulns.slice(0, 100).map((vuln) => (
                  <tr key={vuln.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        vuln.severity === "critical" ? "bg-red-400/15 text-red-400" :
                        vuln.severity === "high" ? "bg-orange-400/15 text-orange-400" :
                        vuln.severity === "medium" ? "bg-yellow-400/15 text-yellow-400" :
                        "bg-blue-400/15 text-blue-400"
                      }`}>
                        {vuln.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-semibold text-white">{vuln.package_name || "—"}</td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{vuln.current_version || "—"}</td>
                    <td className="py-3 px-3 text-xs font-mono truncate max-w-xs" style={{ color: MUTED }}>{vuln.vulnerability_id || vuln.cve_id || "—"}</td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: vuln.cvss_score >= 9 ? DANGER : vuln.cvss_score >= 7 ? HIGH : MUTED }}>
                      {vuln.cvss_score || "—"}
                    </td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: LOW }}>{vuln.fixed_version || "No fix"}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(vuln.detected_at)}</td>
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