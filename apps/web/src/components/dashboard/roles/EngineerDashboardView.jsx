import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bot, CalendarClock, CheckCircle2, Inbox } from "lucide-react";

const CARD = { background: "#111827", border: "1px solid #1F2937" };
const SEV = {
  critical: "text-red-300 border-red-500/40 bg-red-500/10",
  high: "text-orange-300 border-orange-500/40 bg-orange-500/10",
  medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  low: "text-blue-300 border-blue-500/40 bg-blue-500/10",
};

export default function EngineerDashboardView({ findings, user, agents }) {
  const myName = (user?.full_name || "").toLowerCase();

  const mine = useMemo(
    () => findings.filter((finding) => (finding.assigned_to || "").toLowerCase() === myName),
    [findings, myName]
  );

  const tiles = [
    { label: "Assigned to me", value: mine.length, color: "#3b82f6" },
    { label: "Unassigned queue", value: findings.filter((f) => !f.assigned_to && !f.assigned_agent_id).length, color: "#f59e0b" },
    { label: "In remediation", value: findings.filter((f) => f.status === "in_remediation").length, color: "#a855f7" },
    { label: "SLA breached", value: findings.filter((f) => f.sla_breached).length, color: "#ef4444" },
  ];

  const working = agents.filter((agent) => agent.status === "working" || agent.status === "active").slice(0, 4);
  const priority = [...mine]
    .sort((a, b) => (b.cvss_score || 0) - (a.cvss_score || 0))
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl p-3" style={{ ...CARD, borderLeft: `3px solid ${tile.color}` }}>
            <p className="text-lg font-bold font-mono text-white">{tile.value}</p>
            <p className="text-[10px] text-slate-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={CARD}>
          <div className="flex items-center gap-1.5 mb-2">
            <Inbox size={13} className="text-blue-400" />
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">My remediation queue</p>
            <Link to="/triage" className="ml-auto text-[10px] font-bold text-blue-400 hover:text-blue-300">Triage queue →</Link>
          </div>
          {priority.length === 0 ? (
            <p className="text-[11px] text-slate-600">Nothing assigned to {user?.full_name || "you"} right now.</p>
          ) : (
            <div className="space-y-1.5">
              {priority.map((finding) => (
                <div key={finding.id} className="flex items-center gap-2 text-[11px]">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${SEV[finding.severity] || SEV.low}`}>{finding.severity}</span>
                  <span className="text-slate-200 truncate">{finding.title}</span>
                  {finding.cve_id && <span className="text-[9px] font-mono text-slate-500">{finding.cve_id}</span>}
                  <span className="ml-auto text-[10px] text-slate-500 capitalize">{(finding.status || "").replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl p-3" style={CARD}>
          <div className="flex items-center gap-1.5 mb-2">
            <Bot size={13} className="text-emerald-400" />
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Agents on shift</p>
            <Link to="/settings/agents" className="ml-auto text-[10px] font-bold text-blue-400 hover:text-blue-300">Fleet →</Link>
          </div>
          {working.length === 0 ? (
            <p className="text-[11px] text-slate-600">No active agents reporting.</p>
          ) : (
            <div className="space-y-1.5">
              {working.map((agent) => (
                <div key={agent.id} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${agent.status === "working" ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`} />
                  <span className="text-slate-200 truncate">{agent.display_name || agent.name}</span>
                  <span className="ml-auto font-mono text-slate-500">{agent.executions_total || 0} runs</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: "1px solid #1F2937" }}>
            <Link to="/fix-planner" className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200"><CalendarClock size={10} /> Planning board</Link>
            <Link to="/fix-library" className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200"><CheckCircle2 size={10} /> Fix library</Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3" style={CARD}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Highest CVSS across the queue</p>
        {findings.length === 0 ? (
          <p className="text-[11px] text-slate-600">The queue is empty.</p>
        ) : (
          [...findings].sort((a, b) => (b.cvss_score || 0) - (a.cvss_score || 0)).slice(0, 5).map((finding) => (
            <div key={finding.id} className="flex items-center gap-2 text-[11px] py-0.5">
              <span className="font-mono text-white w-10">{finding.cvss_score?.toFixed?.(1) || finding.cvss_score || "—"}</span>
              <span className="text-slate-200 truncate">{finding.title}</span>
              <span className="ml-auto text-[10px] text-slate-500 truncate">{finding.asset_name}</span>
            </div>
          ))
        )}
      </div>

      <p className="text-[10px] text-slate-600">Engineer view — your assignments, the live queue and the agents working them.</p>
    </div>
  );
}