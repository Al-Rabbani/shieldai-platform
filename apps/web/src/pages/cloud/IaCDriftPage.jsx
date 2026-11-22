import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Play, X, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie } from "recharts";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const ACCENT = "#f59e0b";

const SEV_STYLE = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)" },
  low:      { color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)" },
};

const DRIFT_STYLE = {
  modified:  { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", label: "MODIFIED" },
  added:     { color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", label: "ADDED" },
  removed:   { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", label: "REMOVED" },
  destroyed: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", label: "DESTROYED" },
};

const PROVIDER_COLORS = { aws: "#f97316", azure: "#3b82f6", gcp: "#10b981" };
const IAC_COLORS = { terraform: "#8b5cf6", cloudformation: "#f97316", pulumi: "#3b82f6", cdk: "#06b6d4", ansible: "#eab308" };

function DriftDetailDrawer({ drift, onClose }) {
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();

  const updateMut = useMutation({
    mutationFn: (status) => base44.entities.IaCDrift.update(drift?.id, { status, ...(status === "remediated" ? { remediated_at: new Date().toISOString() } : {}) }),
    onSuccess: (_, status) => { qc.invalidateQueries({ queryKey: ["iac-drift"] }); toast.success(`Drift event ${status}`); onClose(); },
  });

  if (!drift) return null;

  const sev = SEV_STYLE[drift.severity] || SEV_STYLE.medium;
  const dt = DRIFT_STYLE[drift.drift_type] || DRIFT_STYLE.modified;

  const tfCmd = `terraform apply -target=${drift.resource_type}.${drift.resource_name}`;
  const copyTf = () => { navigator.clipboard.writeText(tfCmd); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="ml-auto w-full max-w-2xl h-full overflow-y-auto animate-slide-in-right"
        style={{ background: "#0d1117", borderLeft: "1px solid rgba(245,158,11,0.2)" }}>
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 rounded font-bold border" style={{ color: dt.color, background: dt.bg, borderColor: dt.border }}>{dt.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold border" style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}>{drift.severity?.toUpperCase()}</span>
              </div>
              <h3 className="text-sm font-bold text-white">{drift.resource_name}</h3>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">{drift.resource_type} · {drift.provider?.toUpperCase()} · {drift.region}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          {/* Resource details */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["IaC Tool", drift.iac_tool?.toUpperCase()],
              ["Field Changed", drift.field_changed],
            ].map(([k, v]) => (
              <div key={k} className="p-3 rounded-xl" style={{ background: "#161b22", border: "1px solid #1e293b" }}>
                <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">{k}</p>
                <p className="text-xs font-mono font-bold text-white">{v || "—"}</p>
              </div>
            ))}
          </div>

          {/* Repo path */}
          {drift.repo_path && (
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">Repo Path</p>
              <a href={drift.repo_path} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-mono hover:underline" style={{ color: ACCENT }}>
                {drift.repo_path} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Diff view */}
          <div>
            <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">State Diff — {drift.field_changed}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: "#030712", border: "1px solid rgba(16,185,129,0.3)" }}>
                <p className="text-[9px] font-mono text-emerald-400 uppercase mb-2">Declared State</p>
                <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap break-all leading-relaxed">
                  {drift.declared_value || "—"}
                </pre>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "#030712", border: "1px solid rgba(239,68,68,0.3)" }}>
                <p className="text-[9px] font-mono text-red-400 uppercase mb-2">Actual State</p>
                <pre className="text-[11px] font-mono text-red-300 whitespace-pre-wrap break-all leading-relaxed">
                  {drift.actual_value || "—"}
                </pre>
              </div>
            </div>
          </div>

          {/* Description */}
          {drift.description && (
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">Description</p>
              <p className="text-sm text-slate-300 leading-relaxed">{drift.description}</p>
            </div>
          )}

          {/* Remediation */}
          {drift.remediation && (
            <div className="p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <p className="text-[10px] font-mono text-emerald-400 uppercase mb-2">✓ Remediation</p>
              <p className="text-sm text-slate-300 leading-relaxed">{drift.remediation}</p>
            </div>
          )}

          {/* Terraform apply command */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono text-slate-500 uppercase">Run to Fix</p>
              <button onClick={copyTf} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded" style={{ background: "#1e293b", border: "1px solid #30363d", color: "#64748b" }}>
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="text-[11px] font-mono text-emerald-300 p-3 rounded-xl" style={{ background: "#030712", border: "1px solid #1e293b" }}>{tfCmd}</pre>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => updateMut.mutate("acknowledged")}
              className="py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: ACCENT }}>
              Acknowledge
            </button>
            <button onClick={() => updateMut.mutate("remediated")}
              className="py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>
              Mark Remediated
            </button>
            <button onClick={() => toast.info("Jira integration coming soon")}
              className="py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: "#1e293b", border: "1px solid #30363d", color: "#64748b" }}>
              Create Jira Issue
            </button>
            <a href={`https://console.aws.amazon.com`} target="_blank" rel="noreferrer"
              className="py-2 rounded-xl text-xs font-semibold text-center transition-all flex items-center justify-center gap-1" style={{ background: "#1e293b", border: "1px solid #30363d", color: "#64748b" }}>
              View Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IaCDriftPage() {
  const [sevFilter, setSevFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [toolFilter, setToolFilter] = useState("all");
  const [driftTypeFilter, setDriftTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: drifts = [], isLoading } = useQuery({
    queryKey: ["iac-drift"],
    queryFn: () => base44.entities.IaCDrift.list("-detected_at", 200),
  });

  const sorted = [...drifts]
    .filter(d => sevFilter === "all" || d.severity === sevFilter)
    .filter(d => providerFilter === "all" || d.provider === providerFilter)
    .filter(d => toolFilter === "all" || d.iac_tool === toolFilter)
    .filter(d => driftTypeFilter === "all" || d.drift_type === driftTypeFilter)
    .filter(d => statusFilter === "all" || d.status === statusFilter)
    .sort((a, b) => {
      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3);
    });

  const totalOpen = drifts.filter(d => d.status === "open").length;
  const criticalCount = drifts.filter(d => d.severity === "critical").length;
  const uniqueResources = new Set(drifts.map(d => d.resource_id).filter(Boolean)).size;

  // Chart data
  const byTool = Object.entries(
    drifts.reduce((acc, d) => { acc[d.iac_tool || "unknown"] = (acc[d.iac_tool || "unknown"] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value, color: IAC_COLORS[name] || "#64748b" }));

  const byProvider = Object.entries(
    drifts.reduce((acc, d) => { acc[d.provider || "unknown"] = (acc[d.provider || "unknown"] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.toUpperCase(), value, color: PROVIDER_COLORS[name] || "#64748b" }));

  const tooltipStyle = { backgroundColor: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 8, color: "#e2e8f0", fontSize: 11 };

  return (
    <div className="min-h-screen -m-6" style={{ background: "#030712" }}>
      {selected && <DriftDetailDrawer drift={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="px-6 py-8" style={{ background: "linear-gradient(135deg, #0a0800, #120e00)", borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] px-2.5 py-1 rounded font-bold font-mono tracking-widest" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: ACCENT }}>
                ◈ IAC DRIFT DETECTION
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">Infrastructure Drift</h1>
            <p className="text-slate-400 text-sm mt-1">Live vs declared state — detect manual changes outside Terraform</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: ACCENT }}>
            <Play className="w-4 h-4" /> Run Drift Scan
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 pb-10">
        {/* How it works */}
        <div className="rounded-xl p-4 flex flex-wrap gap-2 items-center" style={{ background: "#0a0f1e", border: "1px solid rgba(245,158,11,0.15)" }}>
          {[
            { n: "①", text: "Terraform/CloudFormation declares desired state" },
            { n: "→", text: "" },
            { n: "②", text: "ShieldAI scans actual live cloud resources" },
            { n: "→", text: "" },
            { n: "③", text: "Differences flagged as drift events" },
          ].map((s, i) => s.text ? (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono" style={{ color: ACCENT }}>{s.n}</span>
              <span className="text-xs text-slate-400">{s.text}</span>
            </div>
          ) : <span key={i} className="text-slate-600 text-sm">→</span>)}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Drift Events",  val: drifts.length, color: ACCENT },
            { label: "Critical Drift",      val: criticalCount, color: "#ef4444" },
            { label: "Open Events",          val: totalOpen, color: "#f97316" },
            { label: "Resources Affected",   val: uniqueResources, color: "#8b5cf6" },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: `1px solid ${color}20` }}>
              <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {byTool.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid #1e293b" }}>
              <h3 className="text-xs font-semibold text-white mb-4">Drift by IaC Tool</h3>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={byTool} layout="vertical" barSize={12}>
                  <XAxis type="number" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={3}>
                    {byTool.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {byProvider.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid #1e293b" }}>
              <h3 className="text-xs font-semibold text-white mb-4">Drift by Provider</h3>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={byProvider} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {byProvider.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { val: sevFilter, set: setSevFilter, opts: ["all","critical","high","medium","low"], placeholder: "Severity" },
            { val: providerFilter, set: setProviderFilter, opts: ["all","aws","azure","gcp"], placeholder: "Provider" },
            { val: toolFilter, set: setToolFilter, opts: ["all","terraform","cloudformation","pulumi","cdk","ansible"], placeholder: "IaC Tool" },
            { val: driftTypeFilter, set: setDriftTypeFilter, opts: ["all","modified","added","removed","destroyed"], placeholder: "Drift Type" },
            { val: statusFilter, set: setStatusFilter, opts: ["all","open","acknowledged","remediated","accepted"], placeholder: "Status" },
          ].map(({ val, set, opts, placeholder }) => (
            <Select key={placeholder} value={val} onValueChange={set}>
              <SelectTrigger className="w-36 h-8 text-xs" style={{ background: "#0a0f1e", border: "1px solid #1e293b", color: "#e2e8f0" }}><SelectValue placeholder={placeholder} /></SelectTrigger>
              <SelectContent style={{ background: "#111827", borderColor: "#1e293b" }}>
                {opts.map(o => <SelectItem key={o} value={o} className="text-slate-200 capitalize">{o === "all" ? `All ${placeholder}` : o.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          ))}
          <span className="text-xs text-slate-600 ml-auto font-mono self-center">{sorted.length} events</span>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid #1e293b" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#030712", borderBottom: "1px solid #1e293b" }}>
                {["Sev", "Drift Type", "Resource", "Provider", "Region", "IaC Tool", "Field Changed", "Detected", "Status"].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && [1,2,3,4,5].map(i => (
                <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td colSpan={9} className="px-3 py-3"><div className="h-4 rounded animate-pulse" style={{ background: "#1e293b" }} /></td>
                </tr>
              ))}
              {!isLoading && sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/30" />
                    <p className="text-slate-500 text-sm">No drift detected — infrastructure matches declared state ✓</p>
                  </td>
                </tr>
              )}
              {sorted.map(d => {
                const sev = SEV_STYLE[d.severity] || SEV_STYLE.medium;
                const dt = DRIFT_STYLE[d.drift_type] || DRIFT_STYLE.modified;
                const provColor = PROVIDER_COLORS[d.provider] || "#64748b";
                const toolColor = IAC_COLORS[d.iac_tool] || "#64748b";
                return (
                  <tr key={d.id} onClick={() => setSelected(d)}
                    className="cursor-pointer hover:bg-amber-500/5 transition-all"
                    style={{ borderBottom: "1px solid #1e293b", borderLeft: `3px solid ${sev.color}40` }}>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}>{d.severity}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold border" style={{ color: dt.color, background: dt.bg, borderColor: dt.border }}>{dt.label}</span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[160px]">
                      <p className="text-xs font-semibold text-white truncate">{d.resource_name}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate">{d.resource_type}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold uppercase" style={{ color: provColor }}>{d.provider}</span>
                    </td>
                    <td className="px-3 py-2.5"><span className="text-[11px] font-mono text-slate-500">{d.region || "—"}</span></td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase" style={{ color: toolColor, background: `${toolColor}12` }}>{d.iac_tool || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5"><span className="text-[11px] font-mono text-slate-400">{d.field_changed || "—"}</span></td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                        {d.detected_at ? formatDistanceToNow(new Date(d.detected_at), { addSuffix: true }) : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded capitalize" style={{
                        background: d.status === "remediated" ? "rgba(16,185,129,0.1)" : d.status === "acknowledged" ? "rgba(245,158,11,0.08)" : "#1e293b",
                        color: d.status === "remediated" ? "#10b981" : d.status === "acknowledged" ? ACCENT : "#64748b"
                      }}>{d.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}