import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, Zap, AlertTriangle, CheckCircle2, Plus, Terminal, Cloud } from "lucide-react";
import K8sScanModal from "@/components/cloud/K8sScanModal";

function RiskBadge({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f97316" : pct >= 20 ? "#eab308" : "#10b981";
  return (
    <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: `${color}20`, color }}>
      {pct} RISK
    </span>
  );
}

export default function K8sPage() {
  const [showScanModal, setShowScanModal] = useState(false);

  const { data: scans = [], isLoading } = useQuery({
    queryKey: ["k8s-scans"],
    queryFn: () => base44.entities.K8sScan.list("-scanned_at", 50).catch(() => []),
    initialData: [],
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["k8s-findings"],
    queryFn: () => base44.entities.K8sFinding.list("-detected_at", 200).catch(() => []),
    initialData: [],
  });

  const totalResources = scans.reduce((sum, s) => sum + (s.resources_scanned || 0), 0);
  const criticalFindings = findings.filter(f => f.severity === "critical").length;

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      {showScanModal && <K8sScanModal onClose={() => setShowScanModal(false)} />}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Kubernetes Security</h1>
            <p className="text-slate-400 mt-2">CIS Benchmark · RBAC · Pod Security · Network Policies</p>
          </div>
          <button
            onClick={() => setShowScanModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: "0 4px 24px rgba(59,130,246,0.35)" }}
          >
            <Plus className="w-4 h-4" /> Scan Cluster
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "CLUSTERS SCANNED", val: scans.length, color: "#3b82f6", icon: Cloud },
            { label: "RESOURCES", val: totalResources, color: "#10b981", icon: Shield },
            { label: "CRITICAL FINDINGS", val: criticalFindings, color: "#ef4444", icon: AlertTriangle },
            { label: "TOTAL FINDINGS", val: findings.length, color: "#f97316", icon: Zap },
          ].map(({ label, val, color, icon: Icon }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: `1px solid ${color}20` }}>
              <div className="flex items-center justify-center gap-1 mb-2">
                <Icon className="w-3 h-3" style={{ color }} />
                <p className="text-[9px] font-mono font-semibold tracking-widest text-slate-500">{label}</p>
              </div>
              <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
            </div>
          ))}
        </div>

        {/* Scans Table */}
        <div className="rounded-xl" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <div className="p-5 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">Scan History</h3>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : scans.length === 0 ? (
            <div className="p-16 text-center">
              <Cloud className="w-12 h-12 mx-auto text-slate-700 mb-4" />
              <h3 className="text-white font-semibold mb-2">No scans yet</h3>
              <p className="text-slate-500 text-sm mb-4">Scan your first Kubernetes cluster</p>
              <button
                onClick={() => setShowScanModal(true)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "#3b82f6" }}
              >
                Start Scan
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-[10px] uppercase text-slate-500 bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Cluster</th>
                    <th className="px-4 py-3 text-left">Namespace</th>
                    <th className="px-4 py-3 text-left">Mode</th>
                    <th className="px-4 py-3 text-left">Resources</th>
                    <th className="px-4 py-3 text-left">Risk Score</th>
                    <th className="px-4 py-3 text-left">Findings</th>
                    <th className="px-4 py-3 text-left">Scanned</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {scans.map((scan) => (
                    <tr key={scan.id} className="border-t border-slate-700 hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Cloud className="w-4 h-4 text-blue-400" />
                          <span className="font-semibold text-white">{scan.nickname}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono">{scan.namespace}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-1 rounded uppercase font-semibold"
                          style={{ background: scan.scan_mode === "manifest" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)", color: scan.scan_mode === "manifest" ? "#60a5fa" : "#10b981" }}>
                          {scan.scan_mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{scan.resources_scanned || 0}</td>
                      <td className="px-4 py-3"><RiskBadge score={scan.risk_score} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <span className="text-red-400 font-mono">🔴 {scan.critical_count || 0}</span>
                          <span className="text-orange-400 font-mono">🟠 {scan.high_count || 0}</span>
                          <span className="text-yellow-400 font-mono">🟡 {scan.medium_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {new Date(scan.scanned_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Findings by Category */}
        {findings.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Recent Findings</h3>
            <div className="space-y-2">
              {findings.slice(0, 10).map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.3)" }}>
                  <div className={`w-2 h-2 rounded-full ${f.severity === "critical" ? "bg-red-500 animate-pulse" : f.severity === "high" ? "bg-orange-500" : "bg-yellow-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{f.title}</p>
                    <p className="text-[10px] text-slate-500">{f.resource_type} · {f.cis_control}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{f.namespace}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}