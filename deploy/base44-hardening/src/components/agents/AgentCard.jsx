import React from "react";
import { Lock } from "lucide-react";

const RUNTIME_COLOR = { sovereign: "bg-purple-500/20 text-purple-400", command: "bg-blue-500/20 text-blue-400", specialist: "bg-emerald-500/20 text-emerald-400", restricted: "bg-red-500/20 text-red-400", scheduled: "bg-slate-500/20 text-slate-400" };
const TYPE_COLOR = { defensive: "bg-indigo-500/15 text-indigo-400", offensive: "bg-red-500/15 text-red-400", governance: "bg-amber-500/15 text-amber-400", intelligence: "bg-cyan-500/15 text-cyan-400", automation: "bg-emerald-500/15 text-emerald-400", orchestration: "bg-purple-500/15 text-purple-400" };

function healthGrade(score) {
  if (score == null) return { grade: "—", color: "text-slate-500" };
  if (score >= 90) return { grade: "A", color: "text-emerald-400" };
  if (score >= 75) return { grade: "B", color: "text-teal-400" };
  if (score >= 60) return { grade: "C", color: "text-amber-400" };
  return { grade: "D", color: "text-red-400" };
}

function timeAgo(dateStr) {
  if (!dateStr) return "never";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function AgentCard({ agent, onActivate }) {
  const isRestricted = agent.runtime_class === "restricted";
  const statusDot = isRestricted ? "bg-red-500" : agent.status === "active" ? "bg-emerald-500 animate-pulse" : agent.status === "working" ? "bg-blue-500 animate-pulse" : "bg-slate-500";
  const health = healthGrade(agent.health_score);
  return (
    <div className="relative rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      {isRestricted && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/70 backdrop-blur-[1px]">
          <Lock className="w-6 h-6 text-red-400" />
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Authorization Required</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <span className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
        <span className="text-[9px] text-slate-500 uppercase">{agent.status}</span>
      </div>
      <p className="text-sm font-bold text-white truncate">{agent.display_name || agent.name}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${RUNTIME_COLOR[agent.runtime_class] || "bg-slate-500/20 text-slate-400"}`}>{agent.runtime_class}</span>
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${TYPE_COLOR[agent.agent_type] || "bg-slate-500/20 text-slate-400"}`}>{agent.agent_type}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
        <div><p className="text-slate-500 text-[10px]">Executions</p><p className="text-white font-semibold">{agent.executions_total == null ? "Unmeasured" : agent.executions_total.toLocaleString()}</p></div>
        <div><p className="text-slate-500 text-[10px]">Avg Duration</p><p className="text-white font-semibold">{agent.avg_duration_ms ? `${(agent.avg_duration_ms / 1000).toFixed(1)}s` : "—"}</p></div>
        <div><p className="text-slate-500 text-[10px]">Health</p><p className={`font-bold ${health.color}`}>{health.grade}</p></div>
      </div>
      {agent.capabilities?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {agent.capabilities.slice(0, 3).map((t, i) => <span key={i} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{t}</span>)}
        </div>
      )}
      <p className="text-[10px] text-slate-600 mt-2">Heartbeat: {timeAgo(agent.last_heartbeat)}</p>
      <button onClick={() => onActivate(agent)} className="w-full mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
        View briefing
      </button>
    </div>
  );
}
