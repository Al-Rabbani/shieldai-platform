import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Shield, AlertTriangle, Cloud, CheckCircle, TrendingUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SearchFilter } from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";

const BG = "#020817";

export default function GDSIaCSecurityCenterPage() {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => { const t = setTimeout(() => setShowCharts(true), 400); return () => clearTimeout(t); }, []);

  const { data: scans = [], isLoading: loadS } = useQuery({
    queryKey: ["iac-scans"], queryFn: () => base44.entities.IaCScan.list("-scanned_at", 100).catch(() => []),
  });

  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["iac-findings"], queryFn: () => base44.entities.IaCFinding.list("-detected_at", 200).catch(() => []),
  });

  const { data: drift = [], isLoading: loadD } = useQuery({
    queryKey: ["iac-drift"], queryFn: () => base44.entities.IaCDrift.list("-detected_at", 100).catch(() => []),
  });

  const filteredFindings = findings.filter(f => {
    const matchSearch = !search || f.resource_name?.toLowerCase().includes(search.toLowerCase()) || f.file_path?.toLowerCase().includes(search.toLowerCase());
    const matchSev = sevFilter === "all" || f.severity === sevFilter;
    return matchSearch && matchSev;
  });

  const totalScans = scans.length;
  const totalFindings = findings.length;
  const criticalFindings = findings.filter(f => f.severity === "critical").length;
  const driftDetected = drift.filter(d => d.status === "drift_detected").length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "DevSecOps", path: "/devsecops" }, { label: "IaC Security" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Cloud className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">IaC Security Center</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Infrastructure as Code scanning, drift detection, and policy violations</p>
          </div>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>IaC Scans</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{totalScans}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Findings</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{totalFindings}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Issues</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{criticalFindings}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Drift Detected</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{driftDetected}</p>
        </Card>
      </div>

      {/* IaC Scans */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">IaC Scan History</h3>
          </div>
        </div>
        {loadS ? <Skeleton lines={4} /> : scans.length === 0 ? (
          <EmptyState icon={FileText} title="No IaC scans" description="Scan your Terraform, CloudFormation, or Kubernetes manifests" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Repository", "IaC Type", "Resources", "Violations", "Drift", "Status", "Last Scanned"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.slice(0, 10).map((scan) => (
                  <tr key={scan.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <p className="text-sm font-semibold text-white truncate max-w-xs">{scan.repository || scan.project_name}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${CYAN}15`, color: CYAN }}>
                        {scan.iac_type || "terraform"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{scan.resource_count || 0}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        (scan.violation_count || 0) > 0 ? "bg-red-400/15 text-red-400" : "bg-green-400/15 text-green-400"
                      }`}>
                        {scan.violation_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        (scan.drift_count || 0) > 0 ? "bg-orange-400/15 text-orange-400" : "bg-green-400/15 text-green-400"
                      }`}>
                        {scan.drift_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        scan.status === "completed" ? "bg-green-400/15 text-green-400" :
                        scan.status === "failed" ? "bg-red-400/15 text-red-400" :
                        "bg-blue-400/15 text-blue-400"
                      }`}>
                        {scan.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(scan.scanned_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Policy Violations */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Policy Violations</h3>
          </div>
          <SevFilterBar value={sevFilter} onChange={setSevFilter} />
          <SearchFilter value={search} onChange={setSearch} placeholder="Search resources..." className="w-44" />
        </div>
        {loadF ? <Skeleton lines={4} /> : filteredFindings.length === 0 ? (
          <EmptyState icon={Shield} title="No policy violations" description="Your infrastructure code is compliant" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Severity", "Resource", "File", "Violation", "Policy", "Remediation", "Detected"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFindings.slice(0, 100).map((finding) => (
                  <tr key={finding.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        finding.severity === "critical" ? "bg-red-400/15 text-red-400" :
                        finding.severity === "high" ? "bg-orange-400/15 text-orange-400" :
                        finding.severity === "medium" ? "bg-yellow-400/15 text-yellow-400" :
                        "bg-blue-400/15 text-blue-400"
                      }`}>
                        {finding.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-semibold text-white truncate max-w-xs">{finding.resource_name || "—"}</td>
                    <td className="py-3 px-3 text-xs font-mono truncate max-w-xs" style={{ color: TEXT }}>{finding.file_path || "—"}</td>
                    <td className="py-3 px-3 text-xs text-white">{finding.violation_type || finding.description}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{finding.policy_id || "—"}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: CYAN }}>{finding.remediation ? "Available" : "—"}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(finding.detected_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Drift Detection */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Configuration Drift</h3>
          </div>
        </div>
        {loadD ? <Skeleton lines={4} /> : drift.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No drift detected" description="Your infrastructure matches IaC definitions" />
        ) : (
          <div className="space-y-2">
            {drift.slice(0, 10).map((d) => (
              <div key={d.id} className="p-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                  d.status === "drift_detected" ? "bg-orange-400/15 text-orange-400" : "bg-green-400/15 text-green-400"
                }`}>
                  {d.status === "drift_detected" ? "DRIFT" : "SYNCED"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{d.resource_name}</p>
                  <p className="text-[10px] truncate" style={{ color: MUTED }}>{d.resource_type} • {d.cloud_provider}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(d.detected_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}