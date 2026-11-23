import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Folder, FileText, Shield, CheckCircle, AlertTriangle, Lock, Eye, Database } from "lucide-react";
import { CopilotBreadcrumb, CopilotBanner, CopilotStat, CopilotBadge, COPILOT_PAGE_BG, COPILOT_CARD, COPILOT_GRADIENT, COPILOT_ELECTRIC, COPILOT_BLUE, COPILOT_GREEN, COPILOT_RED, COPILOT_AMBER, COPILOT_PURPLE, COPILOT_ORANGE, BORDER, MUTED, TEXT } from "@/components/gds/CopilotShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCoPilotEvidencePage() {
  const { data: evidence = [] } = useQuery({ queryKey: ["copilot-evidence"], queryFn: () => base44.entities.CopilotEvidence.list("-collected_at", 100).catch(() => []) });

  const stats = {
    total: evidence.length,
    findings: evidence.filter(e => e.evidence_type === "finding").length,
    agent_output: evidence.filter(e => e.evidence_type === "agent_output").length,
    compliance: evidence.filter(e => e.evidence_type === "compliance_proof").length,
    sensitive: evidence.filter(e => e.is_sensitive).length,
  };

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Evidence Library" }]} />
      <CopilotBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">EVIDENCE & FORENSICS VAULT</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>GDS CO-PILOT v7.0 · HEART OF THE GDS OS</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <CopilotStat label="Total Evidence" value={stats.total} sub="All collected" color={COPILOT_ELECTRIC} />
        <CopilotStat label="Findings" value={stats.findings} sub="Security findings" color={COPILOT_RED} />
        <CopilotStat label="Agent Output" value={stats.agent_output} sub="AI-generated" color={COPILOT_PURPLE} />
        <CopilotStat label="Sensitive" value={stats.sensitive} sub="Restricted access" color={COPILOT_AMBER} pulse={stats.sensitive > 0} />
      </div>

      <div style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Folder className="w-4 h-4" style={{ color: COPILOT_ELECTRIC }} /> Evidence Collection
          </h3>
          {evidence.length === 0 ? (
            <p className="text-xs" style={{ color: MUTED }}>No evidence collected yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                    <th className="pb-3">Title</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Source</th>
                    <th className="pb-3">Confidence</th>
                    <th className="pb-3">Risk Level</th>
                    <th className="pb-3">Sensitive</th>
                    <th className="pb-3">Chain of Custody</th>
                    <th className="pb-3">Collected</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {evidence.slice(0, 20).map(ev => (
                    <tr key={ev.id} className="border-t" style={{ borderColor: BORDER }}>
                      <td className="py-3 font-bold text-white max-w-[200px] truncate">{ev.title}</td>
                      <td className="py-3"><CopilotBadge color={COPILOT_PURPLE}>{ev.evidence_type.replace(/_/g, " ")}</CopilotBadge></td>
                      <td className="py-3" style={{ color: MUTED }}>{ev.source_function}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                            <div className="h-full rounded-full" style={{ width: `${ev.confidence_pct}%`, background: COPILOT_GRADIENT }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: COPILOT_ELECTRIC }}>{ev.confidence_pct}%</span>
                        </div>
                      </td>
                      <td className="py-3"><CopilotBadge color={ev.risk_level === "critical" ? COPILOT_RED : ev.risk_level === "high" ? COPILOT_ORANGE : ev.risk_level === "medium" ? COPILOT_AMBER : COPILOT_GREEN}>{ev.risk_level}</CopilotBadge></td>
                      <td className="py-3">{ev.is_sensitive ? <Lock className="w-3.5 h-3.5" style={{ color: COPILOT_RED }} /> : <CheckCircle className="w-3.5 h-3.5" style={{ color: COPILOT_GREEN }} />}</td>
                      <td className="py-3 font-mono text-[10px]" style={{ color: MUTED }}>{ev.chain_of_custody_id?.slice(0, 12) || "—"}</td>
                      <td className="py-3" style={{ color: MUTED }}>{new Date(ev.collected_at).toLocaleDateString()}</td>
                      <td className="py-3"><CopilotBadge color={ev.status === "verified" ? COPILOT_GREEN : ev.status === "archived" ? MUTED : COPILOT_BLUE}>{ev.status}</CopilotBadge></td>
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