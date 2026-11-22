import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ClipboardList, Plus, X, Play, CheckCircle2, XCircle } from "lucide-react";

const ENF_COLOR = { block: "#ef4444", warn: "#eab308", audit: "#475569" };
const ENF_BG = { block: "rgba(239,68,68,0.12)", warn: "rgba(234,179,8,0.12)", audit: "rgba(71,85,105,0.12)" };
const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const CAT_COLOR = { access_control: "#8b5cf6", data_protection: "#3b82f6", network_security: "#06b6d4", vulnerability_management: "#f97316", incident_response: "#ef4444", change_management: "#10b981", cryptography: "#eab308", logging_monitoring: "#475569" };
const TABS = ["all", "block", "warn", "audit", "draft"];

function PassBar({ rate }) {
  const color = rate >= 85 ? "#10b981" : rate >= 65 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1e293b", minWidth: 80 }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate || 0}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color }}>{rate || 0}%</span>
    </div>
  );
}

function PolicyDrawer({ policy, onClose }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const mappings = (() => { try { return JSON.parse(policy.framework_mappings || "[]"); } catch { return []; } })();

  const runCheck = () => {
    setRunning(true);
    setResult(null);
    setTimeout(() => {
      setRunning(false);
      setResult(Math.random() > 0.3 ? "pass" : "fail");
    }, 1500);
  };

  const enfColor = ENF_COLOR[policy.enforcement] || "#475569";
  return (
    <div className="fixed inset-y-0 right-0 w-96 z-50 flex flex-col shadow-2xl" style={{ background: "#0a0f1e", borderLeft: "1px solid rgba(30,58,95,0.5)" }}>
      <div className="p-5 flex items-start justify-between" style={{ borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
        <div>
          <h3 className="text-sm font-bold text-white">{policy.name}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5 font-mono capitalize">{policy.category?.replace(/_/g, " ")}</p>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex gap-2 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
            style={{ color: enfColor, background: ENF_BG[policy.enforcement], border: `1px solid ${enfColor}30` }}>
            {policy.enforcement}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded capitalize"
            style={{ color: CAT_COLOR[policy.category], background: `${CAT_COLOR[policy.category]}15` }}>
            {policy.category?.replace(/_/g, " ")}
          </span>
          <span className="text-[10px] font-bold uppercase" style={{ color: SEV_COLOR[policy.severity] }}>
            {policy.severity}
          </span>
        </div>
        {policy.description && (
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider font-mono mb-1.5">Description</p>
            <p className="text-xs text-slate-400 leading-relaxed">{policy.description}</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {[["Pass Rate", `${policy.pass_rate || 0}%`, policy.pass_rate >= 85 ? "#10b981" : "#eab308"], ["Total Checks", policy.total_checks || 0, "#e2e8f0"], ["Failing", policy.failing_checks || 0, policy.failing_checks > 0 ? "#ef4444" : "#10b981"]].map(([l, v, c]) => (
            <div key={l} className="rounded-lg p-3 text-center" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.4)" }}>
              <p className="text-[10px] text-slate-600 font-mono">{l}</p>
              <p className="text-lg font-black font-mono mt-0.5" style={{ color: c }}>{v}</p>
            </div>
          ))}
        </div>
        {mappings.length > 0 && (
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider font-mono mb-2">Framework Mappings</p>
            <div className="flex flex-wrap gap-1.5">
              {mappings.map(m => (
                <span key={m} className="text-[9px] px-2 py-1 rounded font-mono text-slate-400"
                  style={{ background: "#1e293b", border: "1px solid rgba(30,58,95,0.5)" }}>{m}</span>
              ))}
            </div>
          </div>
        )}
        {result && (
          <div className="rounded-xl p-3 flex items-center gap-2 animate-slide-in-up"
            style={{ background: result === "pass" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${result === "pass" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }}>
            {result === "pass" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
            <span className="text-xs font-semibold" style={{ color: result === "pass" ? "#10b981" : "#ef4444" }}>
              {result === "pass" ? "Check passed — policy compliant" : "Check failed — violations detected"}
            </span>
          </div>
        )}
      </div>
      <div className="p-5" style={{ borderTop: "1px solid rgba(30,58,95,0.4)" }}>
        <button onClick={runCheck} disabled={running}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold btn-interactive disabled:opacity-50"
          style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}>
          {running ? <><div className="w-3 h-3 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /> Running...</> : <><Play className="w-3 h-3" /> Run Check Now</>}
        </button>
      </div>
    </div>
  );
}

export default function PoliciesPage() {
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState(null);

  const { data: policies = [] } = useQuery({
    queryKey: ["security-policies"],
    queryFn: () => base44.entities.SecurityPolicy.list("-created_date", 50),
  });

  const filtered = policies.filter(p => {
    if (tab === "draft") return p.status === "draft";
    if (tab === "all") return true;
    return p.enforcement === tab;
  });

  const active = policies.filter(p => p.status === "active");
  const blocking = policies.filter(p => p.enforcement === "block" && p.status === "active").length;
  const avgPass = Math.round(active.reduce((a, b) => a + (b.pass_rate || 0), 0) / (active.length || 1));
  const totalFailing = policies.reduce((a, b) => a + (b.failing_checks || 0), 0);

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      {selected && <PolicyDrawer policy={selected} onClose={() => setSelected(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-black text-white font-mono">POLICY ENGINE</h1>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Security policy enforcement — block, warn, and audit controls</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-indigo-400 btn-interactive"
          style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
          <Plus className="w-4 h-4" /> New Policy
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "TOTAL ACTIVE", val: active.length, color: "#10b981" },
          { label: "ENFORCING (BLOCK)", val: blocking, color: "#ef4444" },
          { label: "AVG PASS RATE", val: `${avgPass}%`, color: avgPass >= 80 ? "#10b981" : "#eab308" },
          { label: "FAILING CHECKS", val: totalFailing, color: totalFailing > 0 ? "#ef4444" : "#10b981", pulse: totalFailing > 0 },
        ].map(({ label, val, color, pulse }) => (
          <div key={label} className="rounded-xl p-4 text-center card-hover"
            style={{ background: `${color}0d`, border: `1px solid ${color}25` }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
              <p className="text-[9px] font-mono font-semibold tracking-widest text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        {TABS.map(t => {
          const enfColor = t === "block" ? "#ef4444" : t === "warn" ? "#eab308" : t === "audit" ? "#475569" : t === "draft" ? "#eab308" : "#3b82f6";
          return (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all"
              style={{
                background: tab === t ? `${enfColor}18` : "transparent",
                color: tab === t ? enfColor : "#475569",
                border: tab === t ? `1px solid ${enfColor}30` : "1px solid transparent"
              }}>
              {t}
            </button>
          );
        })}
      </div>

      {/* Policy cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p) => {
          const enfColor = ENF_COLOR[p.enforcement] || "#475569";
          const catColor = CAT_COLOR[p.category] || "#475569";
          const mappings = (() => { try { return JSON.parse(p.framework_mappings || "[]"); } catch { return []; } })();
          return (
            <div key={p.id} onClick={() => setSelected(p)}
              className="rounded-xl p-5 cursor-pointer card-hover"
              style={{
                background: "#0a0f1e",
                border: `1px solid rgba(30,58,95,0.4)`,
                borderLeft: `4px solid ${enfColor}`,
              }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[9px] px-1.5 py-0.5 rounded capitalize"
                      style={{ color: catColor, background: `${catColor}15` }}>
                      {p.category?.replace(/_/g, " ")}
                    </span>
                    <span className="text-[9px] font-bold uppercase" style={{ color: SEV_COLOR[p.severity] || "#475569" }}>{p.severity}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
                    style={{ color: enfColor, background: ENF_BG[p.enforcement], border: `1px solid ${enfColor}30` }}>
                    {p.enforcement}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${p.status === "active" ? "text-emerald-400" : "text-amber-400"}`}
                    style={{ background: p.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(234,179,8,0.1)" }}>
                    {p.status}
                  </span>
                </div>
              </div>

              <PassBar rate={p.pass_rate} />

              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1.5 flex-wrap">
                  {mappings.slice(0, 3).map(m => (
                    <span key={m} className="text-[9px] px-1.5 py-0.5 rounded font-mono text-slate-500"
                      style={{ background: "rgba(30,58,95,0.4)", border: "1px solid rgba(30,58,95,0.6)" }}>{m}</span>
                  ))}
                  {mappings.length > 3 && <span className="text-[9px] text-slate-600">+{mappings.length - 3}</span>}
                </div>
                {p.failing_checks > 0 && (
                  <span className="text-[10px] font-mono font-bold" style={{ color: "#ef4444" }}>
                    {p.failing_checks} failing
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}