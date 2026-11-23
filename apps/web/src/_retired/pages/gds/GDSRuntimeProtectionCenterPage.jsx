import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Shield, AlertTriangle, Clock, Zap, Eye } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SearchFilter } from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";

const BG = "#020817";

export default function GDSRuntimeProtectionCenterPage() {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => { const t = setTimeout(() => setShowCharts(true), 400); return () => clearTimeout(t); }, []);

  const { data: threats = [], isLoading: loadT } = useQuery({
    queryKey: ["runtime-threats"], queryFn: () => base44.entities.RuntimeThreat.list("-detected_at", 200).catch(() => []),
  });

  const { data: policies = [], isLoading: loadP } = useQuery({
    queryKey: ["runtime-policies"], queryFn: () => base44.entities.RuntimePolicy.list("-updated_at", 50).catch(() => []),
  });

  const { data: alerts = [], isLoading: loadA } = useQuery({
    queryKey: ["runtime-alerts"], queryFn: () => base44.entities.RuntimeAlert.list("-triggered_at", 100).catch(() => []),
  });

  const filteredThreats = threats.filter(t => {
    const matchSearch = !search || t.host?.toLowerCase().includes(search.toLowerCase()) || t.process_name?.toLowerCase().includes(search.toLowerCase());
    const matchSev = sevFilter === "all" || t.severity === sevFilter;
    return matchSearch && matchSev;
  });

  const activeThreats = threats.filter(t => t.status === "active").length;
  const blockedThreats = threats.filter(t => t.status === "blocked").length;
  const activePolicies = policies.filter(p => p.is_active).length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "DevSecOps", path: "/devsecops" }, { label: "Runtime Protection" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Activity className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Runtime Protection</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time threat detection, behavioral analysis, and runtime security enforcement</p>
          </div>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Threats</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{activeThreats}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Blocked</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{blockedThreats}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Policies</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{activePolicies}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Alerts</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{alerts.length}</p>
        </Card>
      </div>

      {/* Runtime Threats */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Runtime Threats</h3>
          </div>
          <SevFilterBar value={sevFilter} onChange={setSevFilter} />
          <SearchFilter value={search} onChange={setSearch} placeholder="Search hosts..." className="w-44" />
        </div>
        {loadT ? <Skeleton lines={4} /> : filteredThreats.length === 0 ? (
          <EmptyState icon={Shield} title="No runtime threats detected" description="Your workloads are secure" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Severity", "Threat Type", "Host", "Process", "User", "Status", "Detected"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredThreats.slice(0, 100).map((threat) => (
                  <tr key={threat.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        threat.severity === "critical" ? "bg-red-400/15 text-red-400" :
                        threat.severity === "high" ? "bg-orange-400/15 text-orange-400" :
                        threat.severity === "medium" ? "bg-yellow-400/15 text-yellow-400" :
                        "bg-blue-400/15 text-blue-400"
                      }`}>
                        {threat.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-semibold text-white">{threat.threat_type || threat.behavior_type}</td>
                    <td className="py-3 px-3 text-xs font-mono truncate max-w-xs" style={{ color: TEXT }}>{threat.host || threat.container_id}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{threat.process_name || "—"}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{threat.user || "—"}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        threat.status === "active" ? "bg-red-400/15 text-red-400" :
                        threat.status === "blocked" ? "bg-green-400/15 text-green-400" :
                        "bg-gray-400/15 text-gray-400"
                      }`}>
                        {threat.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(threat.detected_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Security Policies */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Runtime Security Policies</h3>
          </div>
        </div>
        {loadP ? <Skeleton lines={4} /> : policies.length === 0 ? (
          <EmptyState icon={Shield} title="No runtime policies" description="Create policies to enforce runtime security controls" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {policies.slice(0, 6).map((policy) => (
              <div key={policy.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-white">{policy.policy_name || policy.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    policy.is_active ? "bg-green-400/15 text-green-400" : "bg-gray-400/15 text-gray-400"
                  }`}>
                    {policy.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <p className="text-[10px] mb-3" style={{ color: MUTED }}>{policy.description || "No description"}</p>
                <div className="flex items-center gap-3 text-[10px]" style={{ color: MUTED }}>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" style={{ color: CYAN }} />
                    {policy.enforcement_mode || "monitor"}
                  </span>
                  <span>{policy.resource_type || "all"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Alerts */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Recent Alerts</h3>
          </div>
        </div>
        {loadA ? <Skeleton lines={4} /> : alerts.length === 0 ? (
          <EmptyState icon={Eye} title="No recent alerts" description="Your runtime environment is stable" />
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="p-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                  alert.severity === "critical" ? "bg-red-400/15 text-red-400" :
                  alert.severity === "high" ? "bg-orange-400/15 text-orange-400" :
                  alert.severity === "medium" ? "bg-yellow-400/15 text-yellow-400" :
                  "bg-blue-400/15 text-blue-400"
                }`}>
                  {alert.severity.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{alert.alert_type || alert.title}</p>
                  <p className="text-[10px] truncate" style={{ color: MUTED }}>{alert.description || alert.message}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(alert.triggered_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}