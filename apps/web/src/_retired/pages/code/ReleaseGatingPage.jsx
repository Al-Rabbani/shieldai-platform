import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, Lock, CheckCircle2, XCircle, AlertTriangle, Shield, GitBranch, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const PR_GATING_CONFIG = {
  github: { enabled: true, threshold: "high" },
  gitlab: { enabled: true, threshold: "high" },
  azure: { enabled: false, threshold: "critical" },
  bitbucket: { enabled: false, threshold: "critical" },
};

export default function ReleaseGatingPage() {
  const [activeTab, setActiveTab] = useState("pr");
  const [prGating, setPrGating] = useState({ enabled: true, threshold: "high" });
  const [slaGating, setSlaGating] = useState({ enabled: true, mode: "block" });

  const { data: findings = [] } = useQuery({ queryKey: ["triaged-findings"], queryFn: () => base44.entities.TriagedFinding.filter({ status: "open" }, "-cvss_score", 100) });
  const breachedSLA = findings.filter(f => f.sla_breached);
  const criticalBreaches = breachedSLA.filter(f => f.severity === "critical").length;
  const releaseBlocked = criticalBreaches > 0;

  return (
    <div className="min-h-screen -m-6 p-6 space-y-6" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Zap className="w-6 h-6" style={{ color: "#10b981" }} />
          Release & PR Gating
        </h1>
        <p className="text-sm text-slate-500 mt-1">Block deployments and PRs when findings breach your security thresholds</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        <button onClick={() => setActiveTab("pr")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${activeTab === "pr" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>PR Gating</button>
        <button onClick={() => setActiveTab("sla")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${activeTab === "sla" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>Release Gating — SLA Mode</button>
      </div>

      {activeTab === "pr" && (
        <div className="space-y-6">
          {/* PR Gating config */}
          <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  PR Gating Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Block PRs that introduce new critical/high findings</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Enabled</span>
                <Switch checked={prGating.enabled} onCheckedChange={v => setPrGating(p => ({ ...p, enabled: v }))} />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block mb-2">Severity Threshold</label>
              <div className="flex gap-2">
                {[
                  { v: "critical", label: "Critical Only", desc: "Block only on new critical findings" },
                  { v: "high", label: "High & Critical", desc: "Block on new high or critical" },
                  { v: "warn", label: "Warn Only", desc: "Don't block, just warn" },
                ].map(opt => (
                  <button key={opt.v} onClick={() => setPrGating(p => ({ ...p, threshold: opt.v }))}
                    className={`flex-1 p-3 rounded-lg border text-left transition-all ${prGating.threshold === opt.v ? "border-blue-500/50 bg-blue-500/10" : "border-slate-800 hover:border-slate-700"}`}>
                    <p className="text-sm font-medium text-white">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Integration status */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
            <div className="px-5 py-4" style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
              <h3 className="text-sm font-bold text-white">CI/CD Integration Status</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#0d1117", borderBottom: "1px solid #30363d" }}>
                  {["Provider", "Status", "Threshold", "Last Gate", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ background: "#0d1117" }}>
                {Object.entries(PR_GATING_CONFIG).map(([provider, config]) => (
                  <tr key={provider} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td className="px-4 py-3 text-sm font-medium text-white capitalize">{provider.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 ${config.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                        {config.enabled ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {config.enabled ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 capitalize">{config.threshold}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">2 hours ago</td>
                    <td className="px-4 py-3">
                      <button className="text-[11px] px-2 py-1 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}>Configure</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "sla" && (
        <div className="space-y-6">
          {/* SLA Gating config */}
          <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  SLA Mode — Release Blocking
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Block releases if ANY open finding has breached its SLA</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Enabled</span>
                <Switch checked={slaGating.enabled} onCheckedChange={v => setSlaGating(p => ({ ...p, enabled: v }))} />
              </div>
            </div>

            {/* SLA thresholds */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { severity: "critical", hours: 24, color: "#ef4444" },
                { severity: "high", hours: 168, color: "#f97316" },
                { severity: "medium", hours: 720, color: "#eab308" },
                { severity: "low", hours: 2160, color: "#3b82f6" },
              ].map(sla => (
                <div key={sla.severity} className="p-4 rounded-lg" style={{ background: `${sla.color}08`, border: `1px solid ${sla.color}20` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: sla.color }} />
                    <span className="text-xs font-medium capitalize text-white">{sla.severity}</span>
                  </div>
                  <p className="text-lg font-black font-mono" style={{ color: sla.color }}>{sla.hours}h</p>
                  <p className="text-[10px] text-slate-500 mt-1">SLA deadline</p>
                </div>
              ))}
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block mb-2">When SLA Breached</label>
              <div className="flex gap-2">
                {[
                  { v: "block", label: "Block Release", desc: "Prevent deployment entirely" },
                  { v: "warn", label: "Warn Only", desc: "Allow with warning" },
                  { v: "override", label: "Require Manual Override", desc: "Block unless explicitly approved" },
                ].map(opt => (
                  <button key={opt.v} onClick={() => setSlaGating(p => ({ ...p, mode: opt.v }))}
                    className={`flex-1 p-3 rounded-lg border text-left transition-all ${slaGating.mode === opt.v ? "border-blue-500/50 bg-blue-500/10" : "border-slate-800 hover:border-slate-700"}`}>
                    <p className="text-sm font-medium text-white">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live status */}
          <div className={`rounded-xl p-6 border-2 ${releaseBlocked ? "border-red-500/50" : "border-emerald-500/50"}`}
            style={{ background: releaseBlocked ? "rgba(239,68,68,0.05)" : "rgba(16,185,129,0.05)" }}>
            <div className="flex items-center gap-3 mb-3">
              {releaseBlocked ? <XCircle className="w-6 h-6 text-red-400" /> : <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
              <div>
                <p className={`text-lg font-bold ${releaseBlocked ? "text-red-400" : "text-emerald-400"}`}>
                  {releaseBlocked ? "🚫 RELEASE BLOCKED" : "✅ RELEASE CLEAR"}
                </p>
                <p className="text-sm text-slate-400">
                  {releaseBlocked
                    ? `${criticalBreaches} critical finding${criticalBreaches > 1 ? "s have" : " has"} breached SLA`
                    : "0 SLA breaches — safe to release"}
                </p>
              </div>
            </div>
            {releaseBlocked && (
              <div className="space-y-2 mt-4">
                {breachedSLA.filter(f => f.severity === "critical").slice(0, 3).map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <div>
                      <p className="text-sm font-medium text-red-300">{f.title}</p>
                      <p className="text-xs text-slate-500">{f.asset_name} · SLA breached</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: "#ef4444", color: "#fff" }}>BLOCKING</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Breached findings table */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
            <div className="px-5 py-4" style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
              <h3 className="text-sm font-bold text-white">SLA Breached Findings ({breachedSLA.length})</h3>
            </div>
            {breachedSLA.length === 0 ? (
              <div className="px-4 py-12 text-center text-slate-500 text-sm">No SLA breaches — all findings within their deadlines</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#0d1117", borderBottom: "1px solid #30363d" }}>
                    {["Severity", "Title", "Asset", "SLA Deadline", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ background: "#0d1117" }}>
                  {breachedSLA.slice(0, 10).map(f => (
                    <tr key={f.id} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${f.severity === "critical" ? "bg-red-500/10 text-red-400" : f.severity === "high" ? "bg-orange-500/10 text-orange-400" : "bg-yellow-500/10 text-yellow-400"}`}>{f.severity}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white max-w-[300px] truncate">{f.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{f.asset_name}</td>
                      <td className="px-4 py-3 text-xs text-red-400 font-mono">{f.sla_deadline ? new Date(f.sla_deadline).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: "#ef4444", color: "#fff" }}>BREACHED</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}