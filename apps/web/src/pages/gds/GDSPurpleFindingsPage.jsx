import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Shield, FileText, CheckCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const TYPE_COLORS = {
  detection_gap: DANGER, control_gap: HIGH, telemetry_gap: "#f59e0b",
  coverage_gap: MEDIUM, process_gap: "#8b5cf6"
};

const EFFORT_COLORS = {
  trivial: LOW, low: "#3b82f6", medium: MEDIUM, high: HIGH, critical: DANGER
};

export default function GDSPurpleFindingsPage() {
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["purple-findings"], queryFn: () => base44.entities.PurpleFinding.list("-created_date", 100).catch(() => []),
  });

  const filtered = findings.filter(f => {
    const matchType = typeFilter === "all" || f.finding_type === typeFilter;
    const matchSeverity = severityFilter === "all" || f.severity === severityFilter;
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    return matchType && matchSeverity && matchStatus;
  });

  const total = findings.length;
  const open = findings.filter(f => f.status === 'open').length;
  const critical = findings.filter(f => f.severity === 'critical').length;
  const high = findings.filter(f => f.severity === 'high').length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Purple Team", path: "/purple" }, { label: "Findings" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <AlertTriangle className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Purple Team Findings</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Track and remediate security gaps identified during exercises</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Findings</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{total}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Open</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{open}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{critical}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{high}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Types</option>
            {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
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
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </Card>

      {isLoading ? <Skeleton lines={6} /> : filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No findings" description="Purple team findings will appear here" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Title", "Type", "Severity", "MITRE Technique", "Platform", "Effort", "Risk Score", "Status", "Due Date"].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((finding) => {
                const typeColor = TYPE_COLORS[finding.finding_type] || MUTED;
                const effortColor = EFFORT_COLORS[finding.effort_level] || MUTED;
                const isOverdue = finding.due_date && new Date(finding.due_date) < new Date();
                
                return (
                  <tr key={finding.id} className="hover:bg-white/[0.02] cursor-pointer" style={{ borderBottom: `1px solid ${BORDER}20` }} onClick={() => setSelectedFinding(finding)}>
                    <td className="py-3 px-3"><p className="text-xs font-bold text-white truncate max-w-xs">{finding.title}</p></td>
                    <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${typeColor}15`, color: typeColor }}>{finding.finding_type?.replace(/_/g, ' ')}</span></td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        finding.severity === "critical" ? "bg-red-400/15 text-red-400" :
                        finding.severity === "high" ? "bg-orange-400/15 text-orange-400" :
                        finding.severity === "medium" ? "bg-yellow-400/15 text-yellow-400" :
                        "bg-blue-400/15 text-blue-400"
                      }`}>{finding.severity}</span>
                    </td>
                    <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: `${CYAN}15`, color: CYAN }}>{finding.mitred_technique_id || '—'}</span></td>
                    <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: TEXT }}>{finding.affected_platform || '—'}</span></td>
                    <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${effortColor}15`, color: effortColor }}>{finding.effort_level}</span></td>
                    <td className="py-3 px-3"><span className="text-xs font-bold" style={{ color: finding.risk_score >= 80 ? DANGER : finding.risk_score >= 50 ? HIGH : MEDIUM }}>{finding.risk_score || 0}</span></td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        finding.status === "open" ? "bg-red-400/15 text-red-400" :
                        finding.status === "in_progress" ? "bg-yellow-400/15 text-yellow-400" :
                        "bg-green-400/15 text-green-400"
                      }`}>{finding.status}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs ${isOverdue ? 'font-bold text-red-400' : ''}`} style={{ color: isOverdue ? undefined : MUTED }}>
                        {finding.due_date ? new Date(finding.due_date).toLocaleDateString() : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Finding Detail Modal */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto" style={{ background: "#0a1628" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedFinding.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${TYPE_COLORS[selectedFinding.finding_type] || MUTED}15`, color: TYPE_COLORS[selectedFinding.finding_type] || MUTED }}>{selectedFinding.finding_type?.replace(/_/g, ' ')}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${selectedFinding.severity === 'critical' ? 'bg-red-400/15 text-red-400' : selectedFinding.severity === 'high' ? 'bg-orange-400/15 text-orange-400' : 'bg-yellow-400/15 text-yellow-400'}`}>{selectedFinding.severity}</span>
                </div>
              </div>
              <button onClick={() => setSelectedFinding(null)} className="text-slate-400 hover:text-white"><span className="text-xl">×</span></button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-bold mb-1" style={{ color: MUTED }}>Risk Score</p>
                  <p className="text-lg font-bold" style={{ color: selectedFinding.risk_score >= 80 ? DANGER : selectedFinding.risk_score >= 50 ? HIGH : MEDIUM }}>{selectedFinding.risk_score || 0}</p>
                </div>
                <div>
                  <p className="font-bold mb-1" style={{ color: MUTED }}>Status</p>
                  <p className="text-lg font-bold" style={{ color: selectedFinding.status === 'open' ? DANGER : selectedFinding.status === 'in_progress' ? HIGH : LOW }}>{selectedFinding.status}</p>
                </div>
              </div>
              <div>
                <p className="font-bold mb-2" style={{ color: TEXT }}>Recommendation</p>
                <p style={{ color: MUTED }}>{selectedFinding.recommendation || 'No recommendation'}</p>
              </div>
              {selectedFinding.recommended_sigma_rule && (
                <div>
                  <p className="font-bold mb-2" style={{ color: TEXT }}>Recommended Sigma Rule</p>
                  <pre className="text-[10px] p-3 rounded-lg overflow-x-auto" style={{ background: "rgba(0,0,0,0.3)", color: LOW, fontFamily: 'monospace' }}>{selectedFinding.recommended_sigma_rule}</pre>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}