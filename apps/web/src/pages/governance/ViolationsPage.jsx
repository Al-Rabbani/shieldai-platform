import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { FrameworkBadge, SeverityBadge } from "@/components/shared/PillarBadge";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { subDays, format } from "date-fns";

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export default function ViolationsPage() {
  const [fwFilter, setFwFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const qc = useQueryClient();

  const { data: violations = [] } = useQuery({ queryKey: ["gov-violations"], queryFn: () => base44.entities.PolicyViolation.list("-detected_at", 500) });

  const updateViolation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PolicyViolation.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gov-violations"] }); toast.success("Violation updated"); },
  });

  const filtered = useMemo(() => violations.filter(v => {
    if (fwFilter !== "all" && v.framework !== fwFilter) return false;
    if (sevFilter !== "all" && v.severity !== sevFilter) return false;
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (sourceFilter !== "all" && v.source !== sourceFilter) return false;
    return true;
  }).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]), [violations, fwFilter, sevFilter, statusFilter, sourceFilter]);

  const counts = { critical: violations.filter(v => v.severity === "critical").length, high: violations.filter(v => v.severity === "high").length, medium: violations.filter(v => v.severity === "medium").length, low: violations.filter(v => v.severity === "low").length };

  // Sparkline data — last 14 days
  const sparkData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      const dateStr = format(d, "MM/dd");
      const count = violations.filter(v => v.detected_at && format(new Date(v.detected_at), "MM/dd") === dateStr).length;
      return { date: dateStr, count };
    });
  }, [violations]);

  const fws = [...new Set(violations.map(v => v.framework).filter(Boolean))];
  const sources = [...new Set(violations.map(v => v.source).filter(Boolean))];

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#0d1117" }}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h1 className="text-xl font-black text-white font-mono">POLICY VIOLATIONS</h1>
        <span className="text-[11px] px-2 py-0.5 rounded font-mono text-red-400" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)" }}>{violations.filter(v => v.status === "open").length} OPEN</span>
      </div>

      {/* Stats + sparkline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="grid grid-cols-2 gap-3 lg:col-span-1">
          {[
            { label: "Critical", count: counts.critical, color: "#dc2626" },
            { label: "High", count: counts.high, color: "#ea580c" },
            { label: "Medium", count: counts.medium, color: "#d97706" },
            { label: "Low", count: counts.low, color: "#16a34a" },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-xl font-black font-mono" style={{ color }}>{count}</p>
              <p className="text-[10px] text-slate-500 uppercase">{label}</p>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <p className="text-xs font-semibold text-white mb-3">Violations Over Time (14 days)</p>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="violGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
              <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#violGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { val: fwFilter, set: setFwFilter, opts: ["all", ...fws], label: "Framework" },
          { val: sevFilter, set: setSevFilter, opts: ["all", "critical", "high", "medium", "low"], label: "Severity" },
          { val: statusFilter, set: setStatusFilter, opts: ["all", "open", "resolved", "accepted", "in_progress"], label: "Status" },
          { val: sourceFilter, set: setSourceFilter, opts: ["all", ...sources], label: "Source" },
        ].map(({ val, set, opts, label }) => (
          <select key={label} value={val} onChange={e => set(e.target.value)}
            className="text-xs rounded-lg px-3 py-2 outline-none"
            style={{ background: "#161b22", border: "1px solid #30363d", color: "#94a3b8" }}>
            <option value="all">All {label}s</option>
            {opts.filter(o => o !== "all").map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
          </select>
        ))}
        <span className="flex items-center text-[11px] text-slate-500 ml-2">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
              {["Severity", "Framework", "Control ID", "Policy Name", "Resource", "Source", "Status", "Detected"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, i) => (
              <tr key={v.id} style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                className="hover:bg-indigo-500/5 transition-colors">
                <td className="px-4 py-3"><SeverityBadge severity={v.severity} /></td>
                <td className="px-4 py-3"><FrameworkBadge framework={v.framework} size="xs" /></td>
                <td className="px-4 py-3"><span className="text-[11px] font-mono text-indigo-400">{v.control_id || "—"}</span></td>
                <td className="px-4 py-3"><span className="text-xs text-white max-w-[160px] block truncate">{v.policy_name || v.title || "—"}</span></td>
                <td className="px-4 py-3"><span className="text-[11px] font-mono text-slate-400 max-w-[120px] block truncate">{v.resource || "—"}</span></td>
                <td className="px-4 py-3">
                  {v.source ? <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-blue-400" style={{ background: "rgba(59,130,246,0.1)" }}>{v.source}</span> : <span className="text-slate-700">—</span>}
                </td>
                <td className="px-4 py-3">
                  <select value={v.status || "open"} onChange={e => updateViolation.mutate({ id: v.id, data: { status: e.target.value } })}
                    className="text-[10px] px-2 py-1 rounded outline-none cursor-pointer"
                    style={{ background: "#0d1117", border: "1px solid #30363d", color: "#94a3b8" }}>
                    {["open", "resolved", "accepted", "in_progress"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3"><span className="text-[11px] text-slate-500 whitespace-nowrap">{v.detected_at ? new Date(v.detected_at).toLocaleDateString() : "—"}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-600">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                <p className="text-sm">No violations match current filters</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}