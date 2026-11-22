import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock3, Search, Shield, AlertTriangle, FileText, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

const VERDICT_COLORS = { approved: LOW, rejected: DANGER, conditional: HIGH, pending: MUTED };
const RISK_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

export default function GDSPlanningAuditPage() {
  const [filters, setFilters] = useState({ plan_id: "", risk_level: "all", policy_verdict: "all" });

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["planning-status"],
    queryFn: () => base44.functions.invoke("gdsPlanningReasoningEngine", { action: "status", limit: 50 }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: auditData } = useQuery({
    queryKey: ["planning-audit"],
    queryFn: () => base44.entities.PlanningAudit.list("-created_date", 50).catch(() => []),
  });

  const goals = statusData?.recent_goals || [];
  const audit = auditData || [];

  const filteredAudit = audit.filter(a => {
    if (filters.plan_id && !a.plan_id?.includes(filters.plan_id)) return false;
    if (filters.risk_level !== "all" && a.risk_level !== filters.risk_level) return false;
    if (filters.policy_verdict !== "all" && a.policy_verdict !== filters.policy_verdict) return false;
    return true;
  });

  const stats = {
    total: filteredAudit.length,
    approved: filteredAudit.filter(a => a.policy_verdict === "approved").length,
    rejected: filteredAudit.filter(a => a.policy_verdict === "rejected").length,
    flagged: filteredAudit.filter(a => a.flagged).length,
    avgDuration: filteredAudit.reduce((sum, a) => sum + (a.duration_ms || 0), 0) / (filteredAudit.length || 1),
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Planning Audit Timeline" }]} />
      
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Planning Audit Timeline</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Complete Planning & Reasoning Audit Trail</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Entries", value: stats.total, color: CYAN },
          { label: "Approved %", value: `${stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%`, color: LOW },
          { label: "Rejected", value: stats.rejected, color: DANGER },
          { label: "Flagged", value: stats.flagged, color: HIGH },
          { label: "Avg Duration", value: `${Math.round(stats.avgDuration)}ms`, color: "#60a5fa" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: MUTED }} />
            <input value={filters.plan_id} onChange={e => setFilters({ ...filters, plan_id: e.target.value })}
              placeholder="Filter by Plan ID..." className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          </div>
          <select value={filters.risk_level} onChange={e => setFilters({ ...filters, risk_level: e.target.value })}
            className="px-3 py-1.5 rounded-lg text-[11px] outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: filters.risk_level !== "all" ? CYAN : MUTED }}>
            <option value="all">All Risk Levels</option>
            {Object.keys(RISK_COLORS).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filters.policy_verdict} onChange={e => setFilters({ ...filters, policy_verdict: e.target.value })}
            className="px-3 py-1.5 rounded-lg text-[11px] outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: filters.policy_verdict !== "all" ? CYAN : MUTED }}>
            <option value="all">All Verdicts</option>
            {Object.keys(VERDICT_COLORS).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Audit Timeline</h3>
        </div>
        {isLoading ? <Skeleton lines={6} /> : filteredAudit.length === 0 ? (
          <EmptyState icon={Clock3} title="No audit entries" description="Planning activities will appear here" />
        ) : (
          <div className="p-4 space-y-4">
            {filteredAudit.map((entry, i) => {
              const verdictColor = VERDICT_COLORS[entry.policy_verdict] || MUTED;
              const riskColor = RISK_COLORS[entry.risk_level] || MUTED;
              return (
                <div key={entry.id || i} className="relative pl-8 pb-6 border-l-2" style={{ borderColor: BORDER }}>
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full" style={{ background: verdictColor, border: `2px solid ${BORDER}` }} />
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-lg font-black px-3 py-1.5 rounded" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>
                          Stage {entry.pipeline_stage || 1}
                        </span>
                        <span className="text-sm font-bold text-white">{entry.stage_name || "Planning Stage"}</span>
                        {entry.action && (
                          <span className="text-[10px] px-2 py-0.5 rounded uppercase" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>
                            {entry.action}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded uppercase" style={{ color: verdictColor, background: `${verdictColor}18`, border: `1px solid ${verdictColor}30` }}>
                          {entry.policy_verdict || "pending"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded uppercase" style={{ color: riskColor, background: `${riskColor}18`, border: `1px solid ${riskColor}30` }}>
                          {entry.risk_level || "unknown"}
                        </span>
                        {entry.confidence_score !== undefined && (
                          <span className="text-[10px] font-mono" style={{ color: entry.confidence_score >= 70 ? LOW : entry.confidence_score >= 50 ? MEDIUM : DANGER }}>
                            {entry.confidence_score}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Input Summary</p>
                        <p className="text-xs" style={{ color: MUTED }}>{entry.input_summary || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Output Summary</p>
                        <p className="text-xs font-bold text-white">{entry.output_summary || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.events_emitted && entry.events_emitted.length > 0 && (
                          <>
                            <span className="text-[10px] font-bold" style={{ color: MUTED }}>Events:</span>
                            {entry.events_emitted.map((ev, ei) => (
                              <span key={ei} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>
                                {ev}
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px]" style={{ color: MUTED }}>
                        <span className="font-mono">{entry.correlation_id?.slice(0, 12) || "—"}</span>
                        <span>{entry.duration_ms || 0}ms</span>
                        <span>{new Date(entry.created_date).toLocaleString()}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}