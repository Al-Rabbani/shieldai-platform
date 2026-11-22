import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cloud, Shield, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  TOOLTIP_STYLE, SevBadge, StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, SearchFilter, timeAgo, ProviderBadge, PAGE_BG
} from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";
import RiskHeatmap from "@/components/gds/RiskHeatmap";
import MultiCloudScanner from "@/components/gds/MultiCloudScanner";

export default function GDSCloudPage() {
  const qc = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [ciemSevFilter, setCiemSevFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: accounts = [], isLoading: loadA } = useQuery({
    queryKey: ["gds-cloud-accounts"],
    queryFn: () => base44.entities.CloudAccount.list().catch(() => []),
  });
  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["gds-cloud-findings"],
    queryFn: () => base44.entities.CloudFinding.list("-detected_at", 200).catch(() => []),
  });
  const { data: ciemFindings = [], isLoading: loadC } = useQuery({
    queryKey: ["gds-ciem"],
    queryFn: () => base44.entities.CIEMFinding.list().catch(() => []),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CloudFinding.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(["gds-cloud-findings"]),
  });

  const filteredFindings = findings.filter(f => {
    const matchSearch = !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.service?.toLowerCase().includes(search.toLowerCase());
    const matchSev = sevFilter === "all" || (f.severity || f.normalized_severity) === sevFilter;
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    const matchAccount = !selectedAccount || f.account_id === selectedAccount;
    return matchSearch && matchSev && matchStatus && matchAccount;
  });

  const filteredCiem = ciemFindings.filter(f =>
    ciemSevFilter === "all" || f.severity === ciemSevFilter
  );

  const serviceData = findings.reduce((acc, f) => {
    const svc = f.service || "Unknown";
    acc[svc] = (acc[svc] || 0) + 1;
    return acc;
  }, {});
  const serviceChart = Object.entries(serviceData).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name,count]) => ({ name, count }));

  const totalCrit = findings.filter(f => f.severity === "critical").length;
  const totalHigh = findings.filter(f => f.severity === "high").length;

  // Build heatmap assets from cloud accounts + findings aggregated by service
  const heatmapAssets = accounts.length > 0
    ? accounts.map(a => ({ ...a, asset_name: a.nickname || a.account_name || a.account_id, service: a.provider }))
    : findings.slice(0, 80).map(f => ({ id: f.id, asset_name: f.title, service: f.service, provider: f.account_id, region: f.region, severity: f.severity, status: f.status }));

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Cloud Security" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Cloud Security</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>CSPM, CIEM, and cloud posture management</p>
      </div>

      {/* Multi-Cloud Scanner */}
      <MultiCloudScanner />

      <div className="border-t pt-6" style={{ borderColor: "#1e3a5f" }} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Cloud Accounts" value={accounts.length} color={CYAN} icon={Cloud} />
        <KpiCard label="Total Findings" value={findings.length} color={HIGH} icon={Shield} />
        <KpiCard label="Critical" value={totalCrit} color={DANGER} icon={Shield} pulse />
        <KpiCard label="High" value={totalHigh} color={HIGH} icon={Shield} />
      </div>

      {/* Risk Heatmap */}
      <RiskHeatmap
        assets={heatmapAssets}
        title="Cloud Asset Risk Heatmap"
      />

      {/* Accounts Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">Cloud Accounts</h3>
          {selectedAccount && (
            <button onClick={() => setSelectedAccount(null)} className="text-xs font-bold hover:opacity-70" style={{ color: CYAN }}>
              Clear filter ×
            </button>
          )}
        </div>
        {loadA ? <Skeleton /> : accounts.length === 0
          ? <EmptyState icon={Cloud} title="No cloud accounts connected" description="Connect AWS, Azure, or GCP to start scanning" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Provider","Account","Account ID","Status","Risk Score","Critical","High","Last Scanned"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a, i) => (
                    <tr key={a.id} onClick={() => setSelectedAccount(a.account_id === selectedAccount ? null : a.account_id)}
                      className="cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ borderBottom: `1px solid ${BORDER}30`, background: selectedAccount === a.account_id ? `${CYAN}08` : i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3"><ProviderBadge provider={a.provider} /></td>
                      <td className="px-4 py-3 text-xs text-white font-medium">{a.nickname || a.account_name || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{a.account_id || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", minWidth: 60 }}>
                            <div className="h-full rounded-full" style={{ width: `${a.risk_score || 0}%`, background: a.risk_score > 70 ? DANGER : a.risk_score > 40 ? MEDIUM : LOW }} />
                          </div>
                          <span className="text-xs font-mono" style={{ color: MUTED }}>{a.risk_score ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: DANGER }}>{a.critical_count ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: HIGH }}>{a.high_count ?? "—"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{timeAgo(a.last_scanned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* Findings Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-white flex-shrink-0">Cloud Findings</h3>
            <SevFilterBar value={sevFilter} onChange={setSevFilter} />
            <div className="ml-auto flex items-center gap-2">
              <SearchFilter value={search} onChange={setSearch} placeholder="Search findings..." className="w-44" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: MUTED }}>
                <option value="all">All Statuses</option>
                {["open","in_remediation","resolved"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        {loadF ? <Skeleton /> : filteredFindings.length === 0
          ? <EmptyState icon={Shield} title="No findings match your filters" description="Try adjusting the filters" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Severity","Title","Service","Region","Status","Detected"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFindings.slice(0, 100).map((f, i) => (
                    <tr key={f.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3"><SevBadge sev={f.severity || f.normalized_severity} /></td>
                      <td className="px-4 py-3 text-xs text-white max-w-xs truncate">{f.title}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{f.service || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{f.region || "—"}</td>
                      <td className="px-4 py-3">
                        <select value={f.status || "open"} onChange={e => updateMutation.mutate({ id: f.id, status: e.target.value })}
                          className="px-2 py-0.5 rounded-lg text-[10px] outline-none cursor-pointer"
                          style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
                          {["open","in_remediation","resolved","accepted_risk"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{timeAgo(f.detected_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* Service Breakdown */}
      <Card className="p-5">
        <h3 className="font-bold text-white mb-4">Findings by Service</h3>
        {serviceChart.length === 0 ? <EmptyState icon={Cloud} title="No service data" description="Run a cloud scan first" /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serviceChart} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} />
              <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill={CYAN} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* CIEM Section */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-white flex items-center gap-2 flex-shrink-0">
              <Users className="w-4 h-4" style={{ color: CYAN }} />
              CIEM — Identity & Entitlement Findings
            </h3>
            <SevFilterBar value={ciemSevFilter} onChange={setCiemSevFilter} />
          </div>
        </div>
        {loadC ? <Skeleton /> : filteredCiem.length === 0
          ? <EmptyState icon={Users} title="No CIEM findings" description="Identity security is clean" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Severity","Identity","Type","Finding","Blast Radius","Days Inactive","Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCiem.slice(0, 50).map((f, i) => {
                    const blastColor = f.blast_radius === "full_account" ? DANGER : f.blast_radius === "service_wide" ? HIGH : MEDIUM;
                    return (
                      <tr key={f.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                        <td className="px-4 py-3"><SevBadge sev={f.severity} /></td>
                        <td className="px-4 py-3 text-xs text-white font-medium">{f.identity_name || "—"}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{f.identity_type || "—"}</td>
                        <td className="px-4 py-3 text-xs text-white max-w-xs truncate">{f.title}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                            style={{ color: blastColor, background: `${blastColor}15` }}>
                            {(f.blast_radius || "—").replace(/_/g," ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: f.days_inactive > 90 ? DANGER : MUTED }}>{f.days_inactive ?? "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  );
}