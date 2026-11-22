import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock3, Shield, FileText, Activity, Lock, CheckCircle, X } from "lucide-react";
import { CopilotBreadcrumb, CopilotBanner, CopilotStat, CopilotBadge, COPILOT_PAGE_BG, COPILOT_CARD, COPILOT_GRADIENT, COPILOT_ELECTRIC, COPILOT_BLUE, COPILOT_GREEN, COPILOT_RED, COPILOT_AMBER, COPILOT_PURPLE, COPILOT_ORANGE, BORDER, MUTED, TEXT } from "@/components/gds/CopilotShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCoPilotAuditPage() {
  const { data: auditLogs = [] } = useQuery({ queryKey: ["copilot-audit"], queryFn: () => base44.entities.CopilotAuditLog.list("-created_date", 100).catch(() => []) });

  const stats = {
    total: auditLogs.length,
    commands: auditLogs.filter(a => a.event_type === "command_received").length,
    executions: auditLogs.filter(a => a.event_type === "execution_completed" || a.event_type === "execution_failed").length,
    approvals: auditLogs.filter(a => a.event_type === "approval_requested" || a.event_type === "approval_granted" || a.event_type === "approval_denied").length,
    blocked: auditLogs.filter(a => a.event_type === "safety_blocked").length,
  };

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Audit Trail" }]} />
      <CopilotBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">COMPLETE AUDIT TRAIL</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>GDS CO-PILOT v7.0 · HEART OF THE GDS OS</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <CopilotStat label="Total Events" value={stats.total} sub="All audit logs" color={COPILOT_ELECTRIC} />
        <CopilotStat label="Commands" value={stats.commands} sub="Received" color={COPILOT_BLUE} />
        <CopilotStat label="Executions" value={stats.executions} sub="Completed/Failed" color={COPILOT_GREEN} />
        <CopilotStat label="Approvals" value={stats.approvals} sub="Requested/Decided" color={COPILOT_AMBER} />
        <CopilotStat label="Safety Blocked" value={stats.blocked} sub="Prevented" color={COPILOT_RED} />
      </div>

      <div style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Clock3 className="w-4 h-4" style={{ color: COPILOT_ELECTRIC }} /> Audit Log Timeline
          </h3>
          {auditLogs.length === 0 ? (
            <p className="text-xs" style={{ color: MUTED }}>No audit logs yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                    <th className="pb-3">Event Type</th>
                    <th className="pb-3">Pipeline Stage</th>
                    <th className="pb-3">Action Summary</th>
                    <th className="pb-3">Risk Level</th>
                    <th className="pb-3">Policy Verdict</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3">Actor</th>
                    <th className="pb-3">Sensitive</th>
                    <th className="pb-3">Correlation ID</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {auditLogs.slice(0, 20).map(log => (
                    <tr key={log.id} className="border-t" style={{ borderColor: BORDER }}>
                      <td className="py-3 font-bold text-white max-w-[150px] truncate">{log.event_type.replace(/_/g, " ")}</td>
                      <td className="py-3"><CopilotBadge color={COPILOT_PURPLE}>{log.pipeline_stage}</CopilotBadge></td>
                      <td className="py-3 max-w-[200px] truncate" style={{ color: MUTED }}>{log.action_summary}</td>
                      <td className="py-3"><CopilotBadge color={log.risk_level === "critical" ? COPILOT_RED : log.risk_level === "high" ? COPILOT_ORANGE : log.risk_level === "medium" ? COPILOT_AMBER : COPILOT_GREEN}>{log.risk_level}</CopilotBadge></td>
                      <td className="py-3"><CopilotBadge color={log.policy_verdict === "pass" ? COPILOT_GREEN : log.policy_verdict === "fail" ? COPILOT_RED : log.policy_verdict === "warn" ? COPILOT_AMBER : COPILOT_BLUE}>{log.policy_verdict}</CopilotBadge></td>
                      <td className="py-3" style={{ color: MUTED }}>{log.duration_ms}ms</td>
                      <td className="py-3 font-mono text-[10px]" style={{ color: MUTED }}>{log.actor_id?.slice(0, 12) || "—"}</td>
                      <td className="py-3">{log.is_sensitive ? <Lock className="w-3.5 h-3.5" style={{ color: COPILOT_RED }} /> : <CheckCircle className="w-3.5 h-3.5" style={{ color: COPILOT_GREEN }} />}</td>
                      <td className="py-3 font-mono text-[10px]" style={{ color: MUTED }}>{log.correlation_id?.slice(0, 12) || "—"}</td>
                      <td className="py-3"><CopilotBadge color={log.status === "verified" ? COPILOT_GREEN : log.status === "archived" ? MUTED : COPILOT_BLUE}>{log.status}</CopilotBadge></td>
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