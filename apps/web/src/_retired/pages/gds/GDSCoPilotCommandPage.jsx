import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, FileText, Clock, Shield, Zap, AlertTriangle, CheckCircle, X } from "lucide-react";
import { CopilotBreadcrumb, CopilotBanner, CopilotStat, CopilotBadge, COPILOT_PAGE_BG, COPILOT_CARD, COPILOT_GRADIENT, COPILOT_ELECTRIC, COPILOT_BLUE, COPILOT_INDIGO, COPILOT_PURPLE, COPILOT_RED, COPILOT_AMBER, COPILOT_GREEN, COPILOT_ORANGE, COPILOT_TEAL, BORDER, MUTED, TEXT, COMMAND_TYPES } from "@/components/gds/CopilotShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCoPilotCommandPage() {
  const { data: commands = [] } = useQuery({ queryKey: ["copilot-commands"], queryFn: () => base44.entities.CopilotCommand.list("-created_date", 100).catch(() => []) });
  const { data: intents = [] } = useQuery({ queryKey: ["copilot-intents"], queryFn: () => base44.entities.CopilotIntent.list("-created_date", 50).catch(() => []) });

  const stats = {
    total: commands.length,
    completed: commands.filter(c => c.status === "completed").length,
    blocked: commands.filter(c => c.status === "blocked").length,
    awaiting: commands.filter(c => c.status === "awaiting_approval").length,
  };

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Command Center" }]} />
      <CopilotBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">CO-PILOT COMMAND CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>GDS CO-PILOT v7.0 · HEART OF THE GDS OS</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <CopilotStat label="Total Commands" value={stats.total} sub="All time" color={COPILOT_ELECTRIC} />
        <CopilotStat label="Completed" value={stats.completed} sub="Successfully executed" color={COPILOT_GREEN} />
        <CopilotStat label="Blocked by Safety" value={stats.blocked} sub="Safety engine blocked" color={COPILOT_RED} pulse={stats.blocked > 0} />
        <CopilotStat label="Awaiting Approval" value={stats.awaiting} sub="Pending human review" color={COPILOT_AMBER} pulse={stats.awaiting > 0} />
      </div>

      <div className="mb-6" style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: COPILOT_ELECTRIC }} /> Recent Commands
          </h3>
          {commands.length === 0 ? (
            <p className="text-xs" style={{ color: MUTED }}>No commands yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                    <th className="pb-3">Command ID</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Channel</th>
                    <th className="pb-3">Risk Level</th>
                    <th className="pb-3">Approval</th>
                    <th className="pb-3">Safety</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {commands.slice(0, 20).map(cmd => (
                    <tr key={cmd.id} className="border-t" style={{ borderColor: BORDER }}>
                      <td className="py-3 font-mono truncate max-w-[120px]" style={{ color: COPILOT_ELECTRIC }}>{cmd.command_id?.slice(0, 12)}...</td>
                      <td className="py-3"><CopilotBadge color={COMMAND_TYPES.find(t => t.value === cmd.command_type) ? COPILOT_BLUE : MUTED}>{cmd.command_type}</CopilotBadge></td>
                      <td className="py-3"><CopilotBadge color={cmd.input_channel === "web_ui" ? COPILOT_BLUE : cmd.input_channel === "voice" ? COPILOT_PURPLE : COPILOT_TEAL}>{cmd.input_channel}</CopilotBadge></td>
                      <td className="py-3"><CopilotBadge color={cmd.risk_level === "critical" ? COPILOT_RED : cmd.risk_level === "high" ? COPILOT_ORANGE : cmd.risk_level === "medium" ? COPILOT_AMBER : COPILOT_GREEN}>{cmd.risk_level}</CopilotBadge></td>
                      <td className="py-3">{cmd.requires_approval ? <Shield className="w-3.5 h-3.5" style={{ color: COPILOT_AMBER }} /> : <CheckCircle className="w-3.5 h-3.5" style={{ color: COPILOT_GREEN }} />}</td>
                      <td className="py-3">{cmd.safety_passed ? <CheckCircle className="w-3.5 h-3.5" style={{ color: COPILOT_GREEN }} /> : cmd.safety_checked ? <X className="w-3.5 h-3.5" style={{ color: COPILOT_RED }} /> : <Clock className="w-3.5 h-3.5" style={{ color: MUTED }} />}</td>
                      <td className="py-3" style={{ color: MUTED }}>{cmd.duration_ms}ms</td>
                      <td className="py-3"><CopilotBadge color={cmd.status === "completed" ? COPILOT_GREEN : cmd.status === "failed" || cmd.status === "blocked" ? COPILOT_RED : COPILOT_AMBER}>{cmd.status}</CopilotBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: COPILOT_PURPLE }} /> Detected Intents
          </h3>
          {intents.length === 0 ? (
            <p className="text-xs" style={{ color: MUTED }}>No intents classified yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {intents.slice(0, 6).map(intent => (
                <div key={intent.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <CopilotBadge color={COPILOT_PURPLE}>{intent.intent_type}</CopilotBadge>
                    <span className="text-[10px] font-bold" style={{ color: intent.confidence_pct >= 80 ? COPILOT_GREEN : COPILOT_RED }}>{intent.confidence_pct}%</span>
                  </div>
                  <p className="text-[10px]" style={{ color: MUTED }}>Urgency: {intent.urgency} · Scope: {intent.scope}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}