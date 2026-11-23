import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Server, AlertTriangle, Shield, Flame } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SEV_COLOR, SevBadge, StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, SearchFilter, AnimatedArc, timeAgo, ProviderBadge, PAGE_BG
} from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";
import FindingsBulkTable from "@/components/gds/FindingsBulkTable";
import AdvancedFilterChips from "@/components/gds/AdvancedFilterChips";

export default function GDSVMsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [kevOnly, setKevOnly] = useState(false);
  const [criticalityFilter, setCriticalityFilter] = useState("all");
  const [riskScoreFilter, setRiskScoreFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const { data: scans = [], isLoading: loadS } = useQuery({
    queryKey: ["gds-vm-scans"],
    queryFn: () => base44.entities.VMScan.list("-scanned_at", 50).catch(() => []),
  });
  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["gds-vm-findings"],
    queryFn: () => base44.entities.VMFinding.list("-detected_at", 200).catch(() => []),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.VMFinding.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(["gds-vm-findings"]),
  });

  const filtered = findings.filter(f => {
    const matchSearch = !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.cve_id?.toLowerCase().includes(search.toLowerCase());
    const matchSev = sevFilter === "all" || f.severity === sevFilter;
    const matchKev = !kevOnly || f.exploited_in_wild;
    const matchCriticality = criticalityFilter === "all" || f.business_criticality === criticalityFilter;
    const matchRisk = riskScoreFilter === "all" || 
      (riskScoreFilter === "high" && (f.risk_score || 0) >= 70) ||
      (riskScoreFilter === "medium" && (f.risk_score || 0) >= 40 && (f.risk_score || 0) < 70) ||
      (riskScoreFilter === "low" && (f.risk_score || 0) < 40);
    const matchOwner = ownerFilter === "all" || f.assigned_to_name === ownerFilter;
    return matchSearch && matchSev && matchKev && matchCriticality && matchRisk && matchOwner;
  });

  const critCount = findings.filter(f => f.severity === "critical").length;
  const kevCount = findings.filter(f => f.exploited_in_wild).length;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "VM Vulnerabilities" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">VM Vulnerability Management</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>CVE scanning, EPSS scoring, and patch prioritisation across virtual machines</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="VMs Scanned" value={scans.length} color={CYAN} icon={Server} />
        <KpiCard label="Total Findings" value={findings.length} color={HIGH} icon={Shield} />
        <KpiCard label="Critical CVEs" value={critCount} color={DANGER} icon={AlertTriangle} pulse />
        <KpiCard label="KEV / Exploited" value={kevCount} color={DANGER} icon={Flame} pulse />
      </div>

      {/* VM Cards */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Virtual Machines</h3>
        {loadS ? <Skeleton lines={3} /> : scans.length === 0
          ? <EmptyState icon={Server} title="No VM scans found" description="Connect a cloud account and run a VM scan to see results" />
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scans.map((s, i) => (
                <Card key={s.id || i} glow className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{s.nickname || s.instance_id}</p>
                      <p className="text-[10px] font-mono truncate" style={{ color: MUTED }}>{s.ip_address || s.instance_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProviderBadge provider={s.provider} />
                      <AnimatedArc score={s.risk_score} size={44} strokeWidth={5} />
                    </div>
                  </div>
                  <p className="text-[10px] mb-2" style={{ color: MUTED }}>{s.os_name || "—"}</p>
                  <div className="flex gap-3 text-[10px]">
                    <span><span className="font-bold" style={{ color: DANGER }}>{s.critical_count ?? 0}</span> <span style={{ color: MUTED }}>crit</span></span>
                    <span><span className="font-bold" style={{ color: HIGH }}>{s.high_count ?? 0}</span> <span style={{ color: MUTED }}>high</span></span>
                    <span className="ml-auto" style={{ color: MUTED }}>{timeAgo(s.scanned_at)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
      </div>

      {/* Findings Table with bulk actions */}
      <div>
        <AdvancedFilterChips
          criticalityFilter={criticalityFilter}
          setCriticalityFilter={setCriticalityFilter}
          riskScoreFilter={riskScoreFilter}
          setRiskScoreFilter={setRiskScoreFilter}
          ownerFilter={ownerFilter}
          setOwnerFilter={setOwnerFilter}
          owners={[...new Set(findings.map(f => f.assigned_to_name).filter(Boolean))]}
        />
        <div className="flex items-center gap-3 flex-wrap mb-3 mt-4">
          <h3 className="font-bold text-white flex-shrink-0">VM Findings</h3>
          <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
            <input type="checkbox" checked={kevOnly} onChange={e => setKevOnly(e.target.checked)} className="w-3 h-3 accent-red-500" />
            <span className="text-xs font-bold" style={{ color: DANGER }}>KEV Only</span>
          </label>
          <SearchFilter value={search} onChange={setSearch} placeholder="Search CVE / title..." className="w-44" />
        </div>
        <FindingsBulkTable
          findings={filtered}
          isLoading={loadF}
          queryKey="gds-vm-findings"
          entityName="VMFinding"
          emptyTitle="No VM findings match filters"
          columns={[
            { key: "severity", label: "Severity", render: f => <SevBadge sev={f.severity} /> },
            { key: "cve_id", label: "CVE", render: f => <span className="text-xs font-mono" style={{ color: CYAN }}>{f.cve_id || "—"}</span> },
            { key: "title", label: "Title", render: f => <span className="text-xs text-white truncate block max-w-xs">{f.title || "—"}</span> },
            { key: "package_name", label: "Package", render: f => <span className="text-xs font-mono" style={{ color: MUTED }}>{f.package_name || "—"}</span> },
            { key: "cvss_score", label: "CVSS", render: f => <span className="text-xs font-mono" style={{ color: f.cvss_score >= 9 ? DANGER : MUTED }}>{f.cvss_score ?? "—"}</span> },
            { key: "epss_score", label: "EPSS", render: f => <span className="text-xs font-mono" style={{ color: f.epss_score > 0.5 ? HIGH : MUTED }}>{f.epss_score != null ? (f.epss_score * 100).toFixed(1) + "%" : "—"}</span> },
            { key: "exploited_in_wild", label: "KEV", render: f => f.exploited_in_wild ? <span className="text-[9px] font-black" style={{ color: DANGER }}>🔥 KEV</span> : null },
            { key: "status", label: "Status", render: f => <StatusBadge status={f.status} /> },
          ]}
        />
      </div>
    </div>
  );
}