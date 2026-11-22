import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, AlertTriangle, ArrowUp, X } from "lucide-react";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const SEV_BG = { critical: "rgba(239,68,68,0.08)", high: "rgba(249,115,22,0.08)", medium: "rgba(234,179,8,0.08)", low: "rgba(59,130,246,0.08)" };
const SEV_BORDER = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const SRC_COLOR = { sast: "#8b5cf6", sca: "#3b82f6", cloud_misconfiguration: "#f97316", runtime_threat: "#ef4444", pentest: "#ec4899", dast: "#06b6d4" };
const STATUS_ORDER = { breached: 0, at_risk: 1, on_track: 2, resolved: 3 };
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function SLACountdown({ hours, status }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(p => p + 1), 60000); return () => clearInterval(t); }, []);
  if (status === "resolved") return <span className="text-slate-500 text-xs font-mono">RESOLVED</span>;
  const isNeg = hours < 0;
  const color = isNeg || status === "breached" ? "#ef4444" : hours < 4 ? "#eab308" : "#10b981";
  return (
    <div className="flex items-center gap-1">
      <Clock className="w-3 h-3" style={{ color }} />
      <span className="text-sm font-black font-mono" style={{ color }}>
        {isNeg ? `-${Math.abs(hours).toFixed(0)}h` : `+${hours.toFixed(0)}h`}
      </span>
    </div>
  );
}

function SLAProgressBar({ slaHours, hoursRemaining, status }) {
  if (!slaHours) return null;
  const elapsed = slaHours - (hoursRemaining || 0);
  const pct = Math.min(Math.max((elapsed / slaHours) * 100, 0), 100);
  const color = status === "breached" ? "#ef4444" : status === "at_risk" ? "#eab308" : "#10b981";
  return (
    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "#1e293b" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function SLATrackerPage() {
  const qc = useQueryClient();
  const [dismissBanner, setDismissBanner] = useState(false);
  const { data: items = [] } = useQuery({ queryKey: ["sla-tracker"], queryFn: () => base44.entities.SLATracker.list("-created_at", 50) });

  const escalate = useMutation({
    mutationFn: (id) => base44.entities.SLATracker.update(id, { escalated: true, escalated_to: "CISO" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sla-tracker"] }),
  });

  const sorted = [...items].sort((a, b) => {
    const sd = (STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4);
    return sd !== 0 ? sd : (SEV_ORDER[a.severity] ?? 4) - (SEV_ORDER[b.severity] ?? 4);
  });

  const breached = items.filter(i => i.status === "breached").length;
  const atRisk = items.filter(i => i.status === "at_risk").length;
  const onTrack = items.filter(i => i.status === "on_track").length;
  const resolved = items.filter(i => i.status === "resolved").length;
  const criticalBreached = items.filter(i => i.status === "breached" && i.severity === "critical");

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      {/* Breach Alert Banner */}
      {breached > 0 && !dismissBanner && (
        <div className="rounded-xl px-5 py-4 flex items-center gap-3 animate-pulse-red"
          style={{ background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.4)", boxShadow: "0 0 24px rgba(239,68,68,0.15)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.2)" }}>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-red-400">⚠️ CRITICAL: {breached} SLA BREACH{breached > 1 ? "ES" : ""} ACTIVE — Immediate Action Required</p>
            {criticalBreached.length > 0 && (
              <p className="text-[11px] text-red-400/60 mt-0.5 font-mono">{criticalBreached.slice(0, 3).map(i => i.finding_title).join(" · ")}</p>
            )}
          </div>
          <button onClick={() => setDismissBanner(true)} className="text-red-400/50 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-orange-400" />
            <h1 className="text-xl font-black text-white font-mono tracking-tight">SLA TRACKER</h1>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Finding SLA monitoring — breach detection and escalation tracking</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "BREACHED", val: breached, color: "#ef4444", pulse: breached > 0 },
          { label: "AT RISK", val: atRisk, color: "#eab308", pulse: false },
          { label: "ON TRACK", val: onTrack, color: "#10b981", pulse: false },
          { label: "RESOLVED", val: resolved, color: "#475569", pulse: false },
          { label: "MTD BREACH RATE", val: `${items.length > 0 ? Math.round((breached / items.length) * 100) : 0}%`, color: "#8b5cf6", pulse: false },
        ].map(({ label, val, color, pulse }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{
            background: `linear-gradient(145deg, ${color}10, #0a0f1e)`,
            border: `1px solid ${color}25`,
          }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
              <p className="text-[9px] font-mono font-semibold tracking-widest text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* SLA Grid */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
          <h3 className="text-sm font-semibold text-white">SLA Status — All Findings</h3>
        </div>
        <div className="divide-y" style={{ borderColor: "rgba(30,58,95,0.3)" }}>
          {sorted.map((item) => {
            const sevColor = SEV_COLOR[item.severity] || "#475569";
            const isBreached = item.status === "breached";
            return (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors"
                style={{ borderLeft: `4px solid ${isBreached ? "#ef4444" : "transparent"}` }}>
                {/* Finding */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{item.finding_title}</p>
                  {item.asset_name && <p className="text-[10px] font-mono text-slate-500 mt-0.5">{item.asset_name}</p>}
                </div>

                {/* Severity */}
                <span className="text-[10px] px-2 py-0.5 rounded border font-bold uppercase flex-shrink-0"
                  style={{ color: sevColor, background: SEV_BG[item.severity], border: `1px solid ${sevColor}40` }}>
                  {item.severity}
                </span>

                {/* Source type */}
                <span className="text-[10px] px-1.5 py-0.5 rounded capitalize flex-shrink-0"
                  style={{ color: SRC_COLOR[item.source_type] || "#475569", background: `${SRC_COLOR[item.source_type] || "#475569"}15` }}>
                  {item.source_type?.replace(/_/g, " ")}
                </span>

                {/* SLA window */}
                <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{item.sla_hours}h SLA</span>

                {/* Progress bar */}
                <SLAProgressBar slaHours={item.sla_hours} hoursRemaining={item.hours_remaining} status={item.status} />

                {/* Countdown */}
                <div className="flex-shrink-0 w-20">
                  <SLACountdown hours={item.hours_remaining} status={item.status} />
                </div>

                {/* Status chip */}
                <span className="text-[10px] px-2 py-0.5 rounded capitalize font-semibold flex-shrink-0"
                  style={{
                    color: isBreached ? "#ef4444" : item.status === "at_risk" ? "#eab308" : item.status === "on_track" ? "#10b981" : "#475569",
                    background: isBreached ? "rgba(239,68,68,0.1)" : item.status === "at_risk" ? "rgba(234,179,8,0.1)" : item.status === "on_track" ? "rgba(16,185,129,0.1)" : "rgba(71,85,105,0.1)",
                    border: `1px solid ${isBreached ? "rgba(239,68,68,0.3)" : item.status === "at_risk" ? "rgba(234,179,8,0.3)" : item.status === "on_track" ? "rgba(16,185,129,0.3)" : "rgba(71,85,105,0.3)"}`,
                  }}>
                  {item.status?.replace(/_/g, " ")}
                </span>

                {/* Escalated */}
                {item.escalated && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                    ↑ {item.escalated_to}
                  </span>
                )}

                {/* Escalate button */}
                {isBreached && !item.escalated && (
                  <button onClick={() => escalate.mutate(item.id)}
                    className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg font-semibold flex-shrink-0 btn-interactive transition-all"
                    style={{ color: "#f97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" }}>
                    <ArrowUp className="w-3 h-3" /> Escalate
                  </button>
                )}
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className="py-12 text-center text-slate-600">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No SLA records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}