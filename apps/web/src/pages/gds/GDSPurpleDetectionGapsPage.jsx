import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Shield, FileText, Code } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const GAP_TYPE_COLORS = {
  no_detection_rule: DANGER, rule_too_noisy: HIGH, insufficient_telemetry: "#f59e0b",
  misconfigured_rule: MEDIUM, coverage_gap: "#a855f7", validation_failed: DANGER
};

const SEVERITY_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

export default function GDSPurpleDetectionGapsPage() {
  const [expandedRow, setExpandedRow] = useState(null);
  const [gapTypeFilter, setGapTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: gaps = [], isLoading } = useQuery({
    queryKey: ["purple-detection-gaps"], queryFn: () => base44.entities.DetectionGap.list("", 100).catch(() => []),
  });

  const filtered = gaps.filter(g => {
    const matchGapType = gapTypeFilter === "all" || g.gap_type === gapTypeFilter;
    const matchSeverity = severityFilter === "all" || g.severity === severityFilter;
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchGapType && matchSeverity && matchStatus;
  });

  const openGaps = gaps.filter(g => g.status !== 'remediated').length;
  const criticalGaps = gaps.filter(g => g.severity === 'critical' && g.status !== 'remediated').length;
  const highGaps = gaps.filter(g => g.severity === 'high' && g.status !== 'remediated').length;
  const sigmaRules = gaps.filter(g => g.recommended_rule_type === 'sigma').length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Purple Team", path: "/purple" }, { label: "Detection Gaps" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <AlertTriangle className="w-6 h-6" style={{ color: DANGER }} />
          <div>
            <h1 className="text-2xl font-black text-white">Detection Gap Center</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Identify and remediate detection coverage gaps</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Open Gaps</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{openGaps}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Gaps</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{criticalGaps}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High Gaps</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{highGaps}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Sigma Rules</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{sigmaRules}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={gapTypeFilter} onChange={(e) => setGapTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Gap Types</option>
            {Object.keys(GAP_TYPE_COLORS).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="remediated">Remediated</option>
          </select>
        </div>
      </Card>

      {isLoading ? <Skeleton lines={6} /> : filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No detection gaps" description="All detection coverage is adequate" />
      ) : (
        <div className="space-y-2">
          {filtered.sort((a, b) => (b.severity === 'critical' ? 1 : 0) - (a.severity === 'critical' ? 1 : 0)).map((gap) => {
            const gapTypeColor = GAP_TYPE_COLORS[gap.gap_type] || MUTED;
            const sevColor = SEVERITY_COLORS[gap.severity] || MUTED;
            const isExpanded = expandedRow === gap.id;
            
            return (
              <Card key={gap.id} className={`transition-all ${isExpanded ? 'row-span-2' : ''}`} style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedRow(isExpanded ? null : gap.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold" style={{ background: `${gapTypeColor}15`, color: gapTypeColor }}>{gap.mitred_technique_id || 'T1558.003'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(0,212,255,0.08)", color: CYAN }}>{gap.tactic || 'Credential Access'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${sevColor}15`, color: sevColor }}>{gap.severity}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${GAP_TYPE_COLORS[gap.gap_type] || MUTED}15`, color: GAP_TYPE_COLORS[gap.gap_type] || MUTED }}>{gap.gap_type?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs truncate" style={{ color: TEXT }}>{gap.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: gap.status === 'remediated' ? `${LOW}15` : gap.status === 'in_progress' ? `${MEDIUM}15` : `${DANGER}15`, color: gap.status === 'remediated' ? LOW : gap.status === 'in_progress' ? MEDIUM : DANGER }}>{gap.status}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${gap.effort_to_fix === 'trivial' ? 'bg-green-400/15 text-green-400' : gap.effort_to_fix === 'low' ? 'bg-blue-400/15 text-blue-400' : gap.effort_to_fix === 'medium' ? 'bg-yellow-400/15 text-yellow-400' : 'bg-red-400/15 text-red-400'}`}>{gap.effort_to_fix}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t mt-2" style={{ borderColor: BORDER }}>
                    <div className="mt-3">
                      <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Affected Platforms</p>
                      <div className="flex flex-wrap gap-1">
                        {gap.affected_platforms?.map((p, i) => (
                          <span key={i} className="text-[9px] px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>{p}</span>
                        )) || <span style={{ color: MUTED }}>—</span>}
                      </div>
                    </div>
                    {gap.recommended_rule && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold" style={{ color: MUTED }}>Recommended Rule ({gap.recommended_rule_type || 'sigma'})</p>
                          <button className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>Copy</button>
                        </div>
                        <pre className="text-[10px] p-3 rounded-lg overflow-x-auto" style={{ background: "rgba(0,0,0,0.3)", color: LOW, fontFamily: 'monospace' }}>{gap.recommended_rule}</pre>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}