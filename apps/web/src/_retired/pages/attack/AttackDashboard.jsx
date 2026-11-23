import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Sword, Target, Zap, RefreshCw, ExternalLink, Globe, Server, AlertTriangle, Play, Shield, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import SeverityBadge from "@/components/shared/SeverityBadge";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };
const STATUS_STYLE = {
  completed: { color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  running: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  queued: { color: "#eab308", bg: "rgba(234,179,8,0.1)" },
  failed: { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  discovering: { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  attacking: { color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  reporting: { color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { color: "#64748b", bg: "rgba(100,116,139,0.1)" };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: s.color, background: s.bg }}>
      {status}
    </span>
  );
}

function RiskBar({ score }) {
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f97316" : "#10b981";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-800">
        <div className="h-full rounded-full" style={{ width: `${Math.min(score, 100)}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-800 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function AttackDashboard() {
  const [activeTab, setActiveTab] = useState("dast");
  const [selectedScan, setSelectedScan] = useState(null);
  const qc = useQueryClient();

  const { data: dastScans = [], isLoading: loadDAST } = useQuery({
    queryKey: ["dast-scans"],
    queryFn: () => base44.entities.DASTScan.list("-started_at", 50).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: dastFindings = [] } = useQuery({
    queryKey: ["dast-findings"],
    queryFn: () => base44.entities.DASTFinding.list("-detected_at", 200).catch(() => []),
    initialData: [],
  });

  const { data: pentestJobs = [], isLoading: loadPentest } = useQuery({
    queryKey: ["pentest-jobs"],
    queryFn: () => base44.entities.PentestJob.list("-started_at", 50).catch(() => []),
    initialData: [],
  });

  const { data: pentestFindings = [] } = useQuery({
    queryKey: ["pentest-findings-all"],
    queryFn: () => base44.entities.PentestFinding.list("-created_date", 200).catch(() => []),
    initialData: [],
  });

  const { data: attackSurfaces = [], isLoading: loadSurface } = useQuery({
    queryKey: ["attack-surface"],
    queryFn: () => base44.entities.AttackSurface.list("-last_seen", 100).catch(() => []),
    initialData: [],
    refetchInterval: 60000,
  });

  // Stats
  const exposedEndpoints = attackSurfaces.filter(a => a.is_internet_facing).length;
  const activeDAST = dastScans.filter(s => s.status === "running" || s.status === "discovering" || s.status === "attacking").length;
  const criticalVulns = [...dastFindings, ...pentestFindings].filter(f => f.severity === "critical").length;

  // Findings for selected scan drawer
  const scanFindings = selectedScan
    ? dastFindings.filter(f => f.scan_id === selectedScan.id)
    : [];

  return (
    <div className="space-y-6 min-h-screen" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <Sword className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Attack Surface Management</h1>
            <p className="text-xs text-slate-500">DAST scanning · Pentesting · Attack surface discovery</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => qc.invalidateQueries()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-400 hover:text-white transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link to="/attack/dast"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", boxShadow: "0 0 16px rgba(239,68,68,0.3)" }}>
            <Zap className="w-3.5 h-3.5" /> New DAST Scan
          </Link>
          <Link to="/attack/pentest"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", boxShadow: "0 0 16px rgba(139,92,246,0.3)" }}>
            <Target className="w-3.5 h-3.5" /> Launch Pentest
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Exposed Endpoints", value: exposedEndpoints, color: "#ef4444", icon: Globe, pulse: exposedEndpoints > 0 },
          { label: "Active DAST Scans", value: activeDAST, color: "#3b82f6", icon: Zap, pulse: activeDAST > 0 },
          { label: "Pentest Jobs", value: pentestJobs.length, color: "#8b5cf6", icon: Target },
          { label: "Critical Vulns Found", value: criticalVulns, color: "#ef4444", icon: AlertTriangle, pulse: criticalVulns > 0 },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              {s.pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />}
            </div>
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        {[
          { id: "dast", label: "DAST Scans", count: dastScans.length },
          { id: "pentest", label: "Pentests", count: pentestJobs.length },
          { id: "surface", label: "Attack Surface", count: attackSurfaces.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === tab.id ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
            {tab.label}
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-400">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* DAST Scans Tab */}
      {activeTab === "dast" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                {["Target URL", "Status", "Findings", "Risk Score", "Duration", "Started"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadDAST ? (
                [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
              ) : dastScans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Zap className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm text-slate-500 mb-2">No DAST scans yet</p>
                    <Link to="/attack/dast" className="text-xs text-blue-400 hover:underline">Launch your first DAST scan →</Link>
                  </td>
                </tr>
              ) : (
                dastScans.map((scan, i) => {
                  const findings = dastFindings.filter(f => f.scan_id === scan.id);
                  const critical = findings.filter(f => f.severity === "critical").length;
                  const high = findings.filter(f => f.severity === "high").length;
                  const duration = scan.started_at && scan.completed_at
                    ? `${Math.round((new Date(scan.completed_at) - new Date(scan.started_at)) / 60000)}m`
                    : scan.started_at ? "Running…" : "—";
                  return (
                    <tr key={scan.id}
                      style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                      className="hover:bg-red-500/3 transition-colors cursor-pointer"
                      onClick={() => setSelectedScan(scan)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="text-xs text-blue-400 font-mono truncate max-w-48">{scan.target_url}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={scan.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-[10px]">
                          {critical > 0 && <span className="text-red-400 font-bold">🔴 {critical}</span>}
                          {high > 0 && <span className="text-orange-400 font-bold">🟠 {high}</span>}
                          <span className="text-slate-500">{scan.total_findings || findings.length} total</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RiskBar score={scan.risk_score || 0} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">{duration}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        {scan.started_at ? formatDistanceToNow(new Date(scan.started_at), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pentests Tab */}
      {activeTab === "pentest" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                {["Title", "Target", "Mode", "Status", "Coverage", "Risk Score", "Started"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadPentest ? (
                [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
              ) : pentestJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Target className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm text-slate-500 mb-2">No pentest jobs yet</p>
                    <Link to="/attack/pentest" className="text-xs text-blue-400 hover:underline">Launch your first pentest →</Link>
                  </td>
                </tr>
              ) : (
                pentestJobs.map((job, i) => (
                  <tr key={job.id}
                    style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                    className="hover:bg-purple-500/3 transition-colors cursor-pointer">
                    <td className="px-4 py-3"><span className="text-xs font-medium text-white">{job.title}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-slate-400 font-mono truncate max-w-32 block">{job.target_app_name || job.target_url}</span></td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize"
                        style={{ color: job.mode === "whitebox" ? "#10b981" : job.mode === "greybox" ? "#f59e0b" : "#ef4444", background: "rgba(0,0,0,0.3)" }}>
                        {job.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <div className="w-16 h-1.5 rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-purple-500" style={{ width: `${job.coverage_percent || 0}%` }} />
                        </div>
                        {job.coverage_percent || 0}%
                      </div>
                    </td>
                    <td className="px-4 py-3"><RiskBar score={job.risk_score || 0} /></td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {job.started_at ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true }) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Attack Surface Tab */}
      {activeTab === "surface" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                {["Asset", "Type", "IP / URL", "Port", "Risk Level", "Technologies", "Findings", "Last Seen"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadSurface ? (
                [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
              ) : attackSurfaces.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Globe className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm text-slate-500">No attack surface assets discovered</p>
                  </td>
                </tr>
              ) : (
                attackSurfaces.map((a, i) => {
                  const riskColor = SEV_COLOR[a.risk_level] || "#64748b";
                  const techs = a.technologies ? a.technologies.split(",").slice(0, 3) : [];
                  return (
                    <tr key={a.id}
                      style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                      className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {a.is_internet_facing && <Globe className="w-3 h-3 text-orange-400 flex-shrink-0" title="Internet-facing" />}
                          <span className="text-xs font-medium text-white truncate max-w-32">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-slate-400 bg-slate-800">{a.asset_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-mono text-blue-400 truncate max-w-32 block">{a.url || a.ip_address || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-mono text-slate-400">{a.port || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: riskColor, background: `${riskColor}20` }}>
                          {a.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {techs.map(t => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t.trim()}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">{a.finding_count || 0}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        {a.last_seen ? formatDistanceToNow(new Date(a.last_seen), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* DAST Findings Drawer */}
      {selectedScan && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setSelectedScan(null)}>
          <div className="rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" style={{ background: "#0d1117", border: "1px solid #30363d" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#30363d" }}>
              <div>
                <h3 className="text-sm font-bold text-white">{selectedScan.target_url}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{scanFindings.length} findings from this scan</p>
              </div>
              <button onClick={() => setSelectedScan(null)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              {scanFindings.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No findings recorded for this scan</p>
              ) : (
                scanFindings.map((f, i) => (
                  <div key={f.id || i} className="p-3 rounded-lg" style={{ background: "#161b22", border: "1px solid #30363d" }}>
                    <div className="flex items-start gap-2 mb-1">
                      <SeverityBadge severity={f.severity} />
                      <span className="text-xs font-medium text-white">{f.title || f.vulnerability_type}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{f.endpoint} {f.method && `· ${f.method}`}</p>
                    {f.description && <p className="text-xs text-slate-400 mt-1">{f.description}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}