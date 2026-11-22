import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Server, Shield, AlertTriangle, Lock, Activity, Cpu, HardDrive } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";

export default function GDSPodSecurityPage() {
  const [filters, setFilters] = useState({ namespace: "", is_privileged: false, runs_as_root: false });
  const [viewMode, setViewMode] = useState("all");

  const { data: pods = [], isLoading } = useQuery({
    queryKey: ["k8s-pods"],
    queryFn: () => base44.entities.K8sPod.list("-risk_score", 500).catch(() => []),
  });

  const filteredPods = pods.filter(p => {
    const matchNamespace = !filters.namespace || p.namespace?.toLowerCase().includes(filters.namespace.toLowerCase());
    const matchPrivileged = !filters.is_privileged || p.is_privileged === true;
    const matchRoot = !filters.runs_as_root || p.runs_as_root === true;
    return matchNamespace && matchPrivileged && matchRoot;
  });

  const stats = {
    total: pods.length,
    privileged: pods.filter(p => p.is_privileged).length,
    root: pods.filter(p => p.runs_as_root).length,
    hostNetwork: pods.filter(p => p.host_network).length,
    highRisk: pods.filter(p => (p.risk_score || 0) >= 70).length,
  };

  const dangerousCapabilities = ["SYS_ADMIN", "NET_ADMIN", "SYS_PTRACE", "NET_RAW", "SYS_MODULE"];

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "DevSecOps", path: "/devsecops" }, { label: "Pod Security" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Server className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Pod Security</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Kubernetes pod security posture and privilege escalation risks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setViewMode("all"); setFilters({ namespace: "", is_privileged: false, runs_as_root: false }); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "all" ? "" : "hover:opacity-70"}`}
            style={{
              background: viewMode === "all" ? `${CYAN}15` : "rgba(255,255,255,0.04)",
              border: `1px solid ${viewMode === "all" ? CYAN + "40" : BORDER}`,
              color: viewMode === "all" ? CYAN : MUTED
            }}
          >
            All Pods
          </button>
          <button
            onClick={() => { setViewMode("privileged"); setFilters({ ...filters, is_privileged: true }); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "privileged" ? "" : "hover:opacity-70"}`}
            style={{
              background: viewMode === "privileged" ? `${DANGER}15` : "rgba(255,255,255,0.04)",
              border: `1px solid ${viewMode === "privileged" ? DANGER + "40" : BORDER}`,
              color: viewMode === "privileged" ? DANGER : MUTED
            }}
          >
            Privileged
          </button>
          <button
            onClick={() => { setViewMode("root"); setFilters({ ...filters, runs_as_root: true }); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "root" ? "" : "hover:opacity-70"}`}
            style={{
              background: viewMode === "root" ? `${HIGH}15` : "rgba(255,255,255,0.04)",
              border: `1px solid ${viewMode === "root" ? HIGH + "40" : BORDER}`,
              color: viewMode === "root" ? HIGH : MUTED
            }}
          >
            Root Users
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Pods</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.privileged > 0 ? `${DANGER}08` : "transparent", border: stats.privileged > 0 ? `1px solid ${DANGER}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Privileged</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.privileged > 0 ? DANGER : MUTED }}>{stats.privileged}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.root > 0 ? `${HIGH}08` : "transparent", border: stats.root > 0 ? `1px solid ${HIGH}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Root Users</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.root > 0 ? HIGH : MUTED }}>{stats.root}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.hostNetwork > 0 ? `${MEDIUM}08` : "transparent", border: stats.hostNetwork > 0 ? `1px solid ${MEDIUM}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Host Network</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.hostNetwork > 0 ? MEDIUM : MUTED }}>{stats.hostNetwork}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.highRisk > 0 ? `${DANGER}08` : "transparent", border: stats.highRisk > 0 ? `1px solid ${DANGER}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.highRisk > 0 ? DANGER : MUTED }}>{stats.highRisk}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Filter by namespace..."
            value={filters.namespace}
            onChange={(e) => setFilters({ ...filters, namespace: e.target.value })}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, width: "200px" }}
          />
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={filters.is_privileged}
              onChange={(e) => setFilters({ ...filters, is_privileged: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: DANGER }}
            />
            <span style={{ color: MUTED }}>Privileged only</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={filters.runs_as_root}
              onChange={(e) => setFilters({ ...filters, runs_as_root: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: HIGH }}
            />
            <span style={{ color: MUTED }}>Root users only</span>
          </label>
        </div>
      </Card>

      {/* Pods Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Pod Security Details</h3>
        {isLoading ? <Skeleton lines={6} /> : filteredPods.length === 0 ? (
          <EmptyState icon={Server} title="No pods found" description={pods.length === 0 ? "Connect your K8s clusters to see pod security" : "No pods match the current filters"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Pod", "Namespace", "Node", "Images", "Privileged", "Root", "Host Network", "Capabilities", "Read-Only FS", "SA Token", "Resource Limits", "Risk"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPods.slice(0, 100).map((p, i) => {
                  const riskColor = (p.risk_score || 0) >= 80 ? DANGER : (p.risk_score || 0) >= 50 ? HIGH : (p.risk_score || 0) >= 20 ? MEDIUM : LOW;
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-3">
                        <p className="text-sm font-semibold text-white truncate max-w-xs">{p.pod_name}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(p.last_seen)}</p>
                      </td>
                      <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{p.namespace || "default"}</td>
                      <td className="py-3 px-3 text-xs font-mono" style={{ color: MUTED }}>{p.node_name || "—"}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.images || []).slice(0, 2).map((img, j) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>{img}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {p.is_privileged ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>⚠️ YES</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>✓ No</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {p.runs_as_root ? (
                          <AlertTriangle className="w-4 h-4" style={{ color: HIGH }} />
                        ) : (
                          <Shield className="w-4 h-4" style={{ color: LOW }} />
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {p.host_network ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${MEDIUM}15`, color: MEDIUM }}>⚠️ YES</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>✓ No</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.capabilities_added || []).filter(c => dangerousCapabilities.includes(c)).slice(0, 2).map((cap, j) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{cap}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {p.read_only_root_filesystem ? (
                          <Lock className="w-4 h-4" style={{ color: LOW }} />
                        ) : (
                          <AlertTriangle className="w-4 h-4" style={{ color: MEDIUM }} />
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {p.automount_service_account_token ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${MEDIUM}15`, color: MEDIUM }}>⚠️ Auto</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>✓ Off</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {p.has_resource_limits ? (
                          <Cpu className="w-4 h-4" style={{ color: LOW }} />
                        ) : (
                          <AlertTriangle className="w-4 h-4" style={{ color: MEDIUM }} />
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-xs font-black font-mono" style={{ color: riskColor }}>{p.risk_score || 0}</p>
                      </td>
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