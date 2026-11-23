import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, Shield, Lock, Network, Activity, AlertTriangle, Server, Users } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";
import { AnimatedChartTooltip } from "@/components/gds/AnimatedChartTooltip";

const TYPE_COLORS = { eks: "#ff9900", aks: "#0078d4", gke: "#4285f4", vanilla: "#64748b" };

export default function GDSKubernetesExplorerPage() {
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [viewMode, setViewMode] = useState("clusters");

  const { data: clusters = [], isLoading } = useQuery({
    queryKey: ["k8s-clusters"],
    queryFn: () => base44.entities.KubernetesCluster.list("-last_assessed", 100).catch(() => []),
  });

  const { data: namespaces = [] } = useQuery({
    queryKey: ["k8s-namespaces"],
    queryFn: () => base44.entities.K8sNamespace.list().catch(() => []),
  });

  const { data: pods = [] } = useQuery({
    queryKey: ["k8s-pods"],
    queryFn: () => base44.entities.K8sPod.list().catch(() => []),
  });

  const filteredNamespaces = selectedCluster ? namespaces.filter(ns => ns.cluster_name === selectedCluster.cluster_name) : [];
  const clusterPods = selectedCluster ? pods.filter(p => p.cluster_name === selectedCluster.cluster_name) : [];

  const stats = {
    total: clusters.length,
    eks: clusters.filter(c => c.cloud_provider === "eks").length,
    aks: clusters.filter(c => c.cloud_provider === "aks").length,
    gke: clusters.filter(c => c.cloud_provider === "gke").length,
    critical: clusters.filter(c => (c.risk_score || 0) >= 80).length,
  };

  const nsStats = {
    withNetworkPolicy: filteredNamespaces.filter(ns => ns.has_network_policy).length,
    privilegedPods: filteredNamespaces.reduce((sum, ns) => sum + (ns.privileged_pods || 0), 0),
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "DevSecOps", path: "/devsecops" }, { label: "Kubernetes Explorer" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Database className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Kubernetes Explorer</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Multi-cluster K8s security posture and namespace governance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setViewMode("clusters"); setSelectedCluster(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "clusters" ? "" : "hover:opacity-70"}`}
            style={{
              background: viewMode === "clusters" ? `${CYAN}15` : "rgba(255,255,255,0.04)",
              border: `1px solid ${viewMode === "clusters" ? CYAN + "40" : BORDER}`,
              color: viewMode === "clusters" ? CYAN : MUTED
            }}
          >
            Clusters
          </button>
          <button
            onClick={() => setViewMode("namespaces")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "namespaces" ? "" : "hover:opacity-70"}`}
            style={{
              background: viewMode === "namespaces" ? `${CYAN}15` : "rgba(255,255,255,0.04)",
              border: `1px solid ${viewMode === "namespaces" ? CYAN + "40" : BORDER}`,
              color: viewMode === "namespaces" ? CYAN : MUTED
            }}
          >
            Namespaces
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Clusters</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#ff9900" }}>EKS</p>
          <p className="text-2xl font-black font-mono" style={{ color: "#ff9900" }}>{stats.eks}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#0078d4" }}>AKS</p>
          <p className="text-2xl font-black font-mono" style={{ color: "#0078d4" }}>{stats.aks}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#4285f4" }}>GKE</p>
          <p className="text-2xl font-black font-mono" style={{ color: "#4285f4" }}>{stats.gke}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.critical > 0 ? `${DANGER}08` : "transparent", border: stats.critical > 0 ? `1px solid ${DANGER}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.critical > 0 ? DANGER : MUTED }}>{stats.critical}</p>
        </Card>
      </div>

      {viewMode === "clusters" && (
        <>
          {/* Clusters Table */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-4">Kubernetes Clusters</h3>
            {isLoading ? <Skeleton lines={5} /> : clusters.length === 0 ? (
              <EmptyState icon={Database} title="No clusters found" description="Connect your K8s clusters to see security posture" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {["Cluster", "Type", "Version", "Nodes", "Pods", "API Public", "RBAC", "Network Policy", "etcd Encrypted", "Audit Log", "CIS Score", "Risk", "Grade"].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clusters.map((c, i) => {
                      const riskColor = (c.risk_score || 0) >= 80 ? DANGER : (c.risk_score || 0) >= 50 ? HIGH : LOW;
                      const grade = (c.risk_score || 0) >= 80 ? "F" : (c.risk_score || 0) >= 60 ? "D" : (c.risk_score || 0) >= 40 ? "C" : (c.risk_score || 0) >= 20 ? "B" : "A";
                      return (
                        <tr key={c.id} className="hover:bg-white/[0.02] cursor-pointer" style={{ borderBottom: `1px solid ${BORDER}20` }} onClick={() => setSelectedCluster(c)}>
                          <td className="py-3 px-3">
                            <p className="text-sm font-semibold text-white">{c.cluster_name}</p>
                            <p className="text-[10px]" style={{ color: MUTED }}>{c.region || "unknown"}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${TYPE_COLORS[c.cloud_provider] || MUTED}15`, color: TYPE_COLORS[c.cloud_provider] || MUTED }}>
                              {(c.cloud_provider || "vanilla").toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs font-mono" style={{ color: MUTED }}>{c.kubernetes_version || "—"}</td>
                          <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{c.node_count || "—"}</td>
                          <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{c.pod_count || "—"}</td>
                          <td className="py-3 px-3">
                            {c.api_server_public ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>⚠️ PUBLIC</span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>✓ Private</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {c.rbac_enabled ? <Shield className="w-4 h-4" style={{ color: LOW }} /> : <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />}
                          </td>
                          <td className="py-3 px-3">
                            {c.network_policy_enabled ? <Network className="w-4 h-4" style={{ color: LOW }} /> : <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />}
                          </td>
                          <td className="py-3 px-3">
                            {c.etcd_encrypted ? <Lock className="w-4 h-4" style={{ color: LOW }} /> : <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />}
                          </td>
                          <td className="py-3 px-3">
                            {c.audit_logging_enabled ? <Activity className="w-4 h-4" style={{ color: LOW }} /> : <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />}
                          </td>
                          <td className="py-3 px-3">
                            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full" style={{ width: `${c.cis_benchmark_score || 0}%`, background: (c.cis_benchmark_score || 0) >= 80 ? LOW : (c.cis_benchmark_score || 0) >= 50 ? MEDIUM : DANGER }} />
                            </div>
                            <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>{c.cis_benchmark_score || 0}%</p>
                          </td>
                          <td className="py-3 px-3">
                            <p className="text-xs font-black font-mono" style={{ color: riskColor }}>{c.risk_score || 0}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ background: `${riskColor}15`, color: riskColor }}>{grade}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Selected Cluster Details */}
          {selectedCluster && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5" style={{ color: CYAN }} />
                  <h3 className="text-sm font-bold text-white">{selectedCluster.cluster_name} — Namespace Overview</h3>
                </div>
                <button onClick={() => setSelectedCluster(null)} className="text-slate-400 hover:text-white">
                  <span className="text-xs">✕ Close</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Card className="p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Namespaces</p>
                  <p className="text-xl font-black font-mono" style={{ color: TEXT }}>{filteredNamespaces.length}</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: LOW }}>With Network Policy</p>
                  <p className="text-xl font-black font-mono" style={{ color: LOW }}>{nsStats.withNetworkPolicy}</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: DANGER }}>Privileged Pods</p>
                  <p className="text-xl font-black font-mono" style={{ color: DANGER }}>{nsStats.privilegedPods}</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Pods</p>
                  <p className="text-xl font-black font-mono" style={{ color: TEXT }}>{clusterPods.length}</p>
                </Card>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {["Namespace", "Pods", "Privileged Pods", "Network Policy", "Resource Quota", "Limit Range"].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNamespaces.map((ns, i) => (
                      <tr key={ns.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-3 px-3">
                          <p className="text-sm font-semibold text-white">{ns.namespace_name}</p>
                        </td>
                        <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{ns.pod_count || 0}</td>
                        <td className="py-3 px-3">
                          {ns.privileged_pods > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{ns.privileged_pods} privileged</span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>✓ None</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {ns.has_network_policy ? (
                            <Network className="w-4 h-4" style={{ color: LOW }} />
                          ) : (
                            <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {ns.has_resource_quota ? <span className="text-[10px] font-bold" style={{ color: LOW }}>✓ Yes</span> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}
                        </td>
                        <td className="py-3 px-3">
                          {ns.has_limit_range ? <span className="text-[10px] font-bold" style={{ color: LOW }}>✓ Yes</span> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {viewMode === "namespaces" && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">All Namespaces</h3>
          {namespaces.length === 0 ? (
            <EmptyState icon={Users} title="No namespaces found" description="Namespaces will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Namespace", "Cluster", "Pods", "Network Policy", "Privileged Pods", "Resource Quota"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {namespaces.map((ns, i) => (
                    <tr key={ns.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-3">
                        <p className="text-sm font-semibold text-white">{ns.namespace_name}</p>
                      </td>
                      <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{ns.cluster_name || "—"}</td>
                      <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{ns.pod_count || 0}</td>
                      <td className="py-3 px-3">
                        {ns.has_network_policy ? <Network className="w-4 h-4" style={{ color: LOW }} /> : <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />}
                      </td>
                      <td className="py-3 px-3">
                        {ns.privileged_pods > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{ns.privileged_pods}</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>0</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {ns.has_resource_quota ? <span className="text-[10px] font-bold" style={{ color: LOW }}>✓ Yes</span> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}