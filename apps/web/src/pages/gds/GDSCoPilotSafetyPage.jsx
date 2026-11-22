import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Shield, Lock, Eye, X, CheckCircle, AlertOctagon } from "lucide-react";
import { CopilotBreadcrumb, CopilotBanner, CopilotStat, CopilotBadge, COPILOT_PAGE_BG, COPILOT_CARD, COPILOT_GRADIENT, COPILOT_ELECTRIC, COPILOT_BLUE, COPILOT_GREEN, COPILOT_RED, COPILOT_AMBER, COPILOT_PURPLE, COPILOT_ORANGE, BORDER, MUTED, TEXT } from "@/components/gds/CopilotShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCoPilotSafetyPage() {
  const { data: safetyEvents = [] } = useQuery({ queryKey: ["copilot-safety"], queryFn: () => base44.entities.CopilotSafetyEvent.list("-created_date", 100).catch(() => []) });

  const stats = {
    total: safetyEvents.length,
    blocked: safetyEvents.filter(e => e.action_taken === "blocked").length,
    sanitized: safetyEvents.filter(e => e.action_taken === "sanitized").length,
    flagged: safetyEvents.filter(e => e.action_taken === "flagged").length,
    critical: safetyEvents.filter(e => e.severity === "critical").length,
  };

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Safety Monitor" }]} />
      <CopilotBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">SAFETY & GUARDRAILS MONITOR</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>GDS CO-PILOT v7.0 · HEART OF THE GDS OS</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <CopilotStat label="Total Events" value={stats.total} sub="All safety events" color={COPILOT_ELECTRIC} />
        <CopilotStat label="Blocked" value={stats.blocked} sub="Threats stopped" color={COPILOT_RED} />
        <CopilotStat label="Sanitized" value={stats.sanitized} sub="Inputs cleaned" color={COPILOT_AMBER} />
        <CopilotStat label="Flagged" value={stats.flagged} sub="Under review" color={COPILOT_PURPLE} />
        <CopilotStat label="Critical Severity" value={stats.critical} sub="Highest risk" color={COPILOT_RED} pulse={stats.critical > 0} />
      </div>

      <div style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: COPILOT_ELECTRIC }} /> Safety Event Log
          </h3>
          {safetyEvents.length === 0 ? (
            <p className="text-xs" style={{ color: MUTED }}>No safety events detected</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                    <th className="pb-3">Event Type</th>
                    <th className="pb-3">Severity</th>
                    <th className="pb-3">Input Preview</th>
                    <th className="pb-3">Detection Method</th>
                    <th className="pb-3">Confidence</th>
                    <th className="pb-3">Action Taken</th>
                    <th className="pb-3">User Notified</th>
                    <th className="pb-3">False Positive</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {safetyEvents.slice(0, 20).map(event => (
                    <tr key={event.id} className="border-t" style={{ borderColor: BORDER }}>
                      <td className="py-3 font-bold text-white max-w-[150px] truncate">{event.event_type.replace(/_/g, " ")}</td>
                      <td className="py-3"><CopilotBadge color={event.severity === "critical" ? COPILOT_RED : event.severity === "high" ? COPILOT_ORANGE : event.severity === "medium" ? COPILOT_AMBER : COPILOT_GREEN}>{event.severity}</CopilotBadge></td>
                      <td className="py-3 max-w-[200px] truncate" style={{ color: MUTED }}>{event.input_preview}</td>
                      <td className="py-3"><CopilotBadge color={COPILOT_PURPLE}>{event.detection_method.replace(/_/g, " ")}</CopilotBadge></td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                            <div className="h-full rounded-full" style={{ width: `${event.confidence_pct}%`, background: COPILOT_GRADIENT }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: COPILOT_ELECTRIC }}>{event.confidence_pct}%</span>
                        </div>
                      </td>
                      <td className="py-3"><CopilotBadge color={event.action_taken === "blocked" ? COPILOT_RED : event.action_taken === "sanitized" ? COPILOT_AMBER : COPILOT_BLUE}>{event.action_taken}</CopilotBadge></td>
                      <td className="py-3">{event.user_notified ? <CheckCircle className="w-3.5 h-3.5" style={{ color: COPILOT_GREEN }} /> : <X className="w-3.5 h-3.5" style={{ color: MUTED }} />}</td>
                      <td className="py-3">{event.false_positive ? <CheckCircle className="w-3.5 h-3.5" style={{ color: COPILOT_GREEN }} /> : <X className="w-3.5 h-3.5" style={{ color: MUTED }} />}</td>
                      <td className="py-3"><CopilotBadge color={event.status === "resolved" ? COPILOT_GREEN : event.status === "active" ? COPILOT_RED : event.status === "dismissed" ? MUTED : COPILOT_AMBER}>{event.status}</CopilotBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}