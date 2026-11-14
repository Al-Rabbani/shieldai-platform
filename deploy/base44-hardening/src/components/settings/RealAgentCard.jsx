import React from "react";
import AnimatedProgressBar from "@/components/shared/AnimatedProgressBar";

const STATUS_META = {
  unknown: { dot: "bg-slate-500", label: "UNKNOWN", badge: "bg-slate-500/20 text-slate-400" },
  online: { dot: "bg-emerald-500", label: "HEARTBEAT FRESH", badge: "bg-emerald-500/20 text-emerald-400" },
  degraded: { dot: "bg-amber-400 animate-pulse", label: "DEGRADED", badge: "bg-amber-500/20 text-amber-400" },
  offline: { dot: "bg-red-500 animate-pulse", label: "OFFLINE", badge: "bg-red-500/20 text-red-400" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "unknown";
  const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function RealAgentCard({ agent, onRestart, onDiagnose }) {
  const meta = STATUS_META[agent.status] || STATUS_META.unknown;
  const isTroubled = agent.status !== "online";
  const healthColor = agent.health_score >= 80 ? "#10B981" : agent.health_score >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: `1px solid ${isTroubled ? "#ef4444" : "#1F2937"}` }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-bold text-white flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          {agent.status === "offline" && "🔴 "}{agent.name}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${meta.badge}`}>● {meta.label}</span>
          <span className="text-[10px] text-slate-500">v{agent.version || "1.0"}</span>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-1 capitalize">Type: {agent.type}</p>
      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{agent.description}</p>

      {isTroubled && (
        <p className="text-[11px] font-bold text-red-400 mt-2">⚠️ Last heartbeat: {timeAgo(agent.last_heartbeat)} — runtime verification required</p>
      )}

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>Health</span><span style={{ color: healthColor }}>{agent.health_score == null ? "Unmeasured" : `${agent.health_score}%`}</span>
          </div>
          {agent.health_score != null && <AnimatedProgressBar value={agent.health_score} color={healthColor} />}
        </div>
        <div className="text-xs text-slate-400">
          <p>Tasks: <span className="text-white font-semibold">{agent.tasks_completed ?? "Unmeasured"}</span></p>
          <p className="mt-1">Sessions: <span className="text-white font-semibold">{agent.sessions_count ?? "Unmeasured"}</span></p>
        </div>
      </div>

      {!isTroubled && <p className="text-[10px] text-slate-500 mt-2">Last heartbeat: {timeAgo(agent.last_heartbeat)}</p>}

      <div className="flex flex-wrap gap-1.5 mt-3">
        {(agent.capabilities || []).map(c => (
          <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{c}</span>
        ))}
      </div>

      {isTroubled && (
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={() => onRestart(agent)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">Recovery options</button>
          <button onClick={() => onDiagnose(agent)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition">🤖 Diagnose</button>
        </div>
      )}
    </div>
  );
}
