import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Lock, Shield, Users, Key, AlertTriangle, CheckCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SearchFilter } from "@/components/gds/GDSOSShared";

const BG = "#020817";

export default function GDSK8sRBACAdmissionPage() {
  const [search, setSearch] = useState("");
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => { const t = setTimeout(() => setShowCharts(true), 400); return () => clearTimeout(t); }, []);

  const { data: rbacConfigs = [], isLoading: loadR } = useQuery({
    queryKey: ["k8s-rbac"], queryFn: () => base44.entities.K8sRBACConfig.list("-analyzed_at", 100).catch(() => []),
  });

  const { data: admissionLogs = [], isLoading: loadA } = useQuery({
    queryKey: ["k8s-admission"], queryFn: () => base44.entities.K8sAdmissionLog.list("-timestamp", 200).catch(() => []),
  });

  const { data: policies = [], isLoading: loadP } = useQuery({
    queryKey: ["k8s-policies"], queryFn: () => base44.entities.K8sAdmissionPolicy.list("-created_at", 50).catch(() => []),
  });

  const filteredRBAC = rbacConfigs.filter(r => 
    !search || r.subject_name?.toLowerCase().includes(search.toLowerCase()) || r.namespace?.toLowerCase().includes(search.toLowerCase())
  );

  const deniedRequests = admissionLogs.filter(a => a.decision === "denied").length;
  const allowedRequests = admissionLogs.filter(a => a.decision === "allowed").length;
  const activePolicies = policies.filter(p => p.is_active).length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "DevSecOps", path: "/devsecops" }, { label: "K8s RBAC & Admission" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Lock className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Kubernetes RBAC & Admission Control</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Role-based access control auditing and admission policy enforcement</p>
          </div>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>RBAC Configs</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{rbacConfigs.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Allowed Requests</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{allowedRequests}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Denied Requests</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{deniedRequests}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Policies</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{activePolicies}</p>
        </Card>
      </div>

      {/* RBAC Configurations */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">RBAC Configurations</h3>
          </div>
          <SearchFilter value={search} onChange={setSearch} placeholder="Search subjects..." className="w-44" />
        </div>
        {loadR ? <Skeleton lines={4} /> : filteredRBAC.length === 0 ? (
          <EmptyState icon={Lock} title="No RBAC configurations" description="Analyze your Kubernetes clusters to see RBAC settings" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Subject", "Type", "Namespace", "Role", "Privileges", "Risk Level", "Last Analyzed"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRBAC.slice(0, 10).map((rbac) => (
                  <tr key={rbac.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <p className="text-sm font-semibold text-white">{rbac.subject_name || rbac.name}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        rbac.subject_type === "ServiceAccount" ? "bg-blue-400/15 text-blue-400" :
                        rbac.subject_type === "User" ? "bg-purple-400/15 text-purple-400" :
                        "bg-gray-400/15 text-gray-400"
                      }`}>
                        {rbac.subject_type || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{rbac.namespace || "cluster-wide"}</td>
                    <td className="py-3 px-3 text-xs text-white">{rbac.role_name || rbac.role_ref}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(rbac.privileges || []).slice(0, 3).map((p, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        rbac.risk_level === "critical" ? "bg-red-400/15 text-red-400" :
                        rbac.risk_level === "high" ? "bg-orange-400/15 text-orange-400" :
                        rbac.risk_level === "medium" ? "bg-yellow-400/15 text-yellow-400" :
                        "bg-green-400/15 text-green-400"
                      }`}>
                        {rbac.risk_level || "low"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(rbac.analyzed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Admission Control Logs */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Admission Control Logs</h3>
          </div>
        </div>
        {loadA ? <Skeleton lines={4} /> : admissionLogs.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No admission logs" description="Admission controller is not capturing requests" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Decision", "Resource", "Namespace", "User", "Reason", "Policy", "Timestamp"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admissionLogs.slice(0, 100).map((log) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        log.decision === "allowed" ? "bg-green-400/15 text-green-400" :
                        log.decision === "denied" ? "bg-red-400/15 text-red-400" :
                        "bg-gray-400/15 text-gray-400"
                      }`}>
                        {log.decision?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-white">{log.resource_name || `${log.resource_type}/${log.name}`}</td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{log.namespace || "—"}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{log.user || log.service_account}</td>
                    <td className="py-3 px-3 text-xs truncate max-w-xs" style={{ color: MUTED }}>{log.reason || log.message}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: CYAN }}>{log.policy_name || "—"}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(log.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Admission Policies */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Admission Policies</h3>
          </div>
        </div>
        {loadP ? <Skeleton lines={4} /> : policies.length === 0 ? (
          <EmptyState icon={Shield} title="No admission policies" description="Create policies to enforce Kubernetes security controls" />
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
                  <span>Enforcement: {policy.enforcement_action || "deny"}</span>
                  <span>•</span>
                  <span>{policy.match_kind || "all resources"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}