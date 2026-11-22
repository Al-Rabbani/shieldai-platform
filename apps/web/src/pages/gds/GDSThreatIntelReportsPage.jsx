import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, AlertTriangle, Shield, Crosshair } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const TYPE_COLORS = {
  fusion_report: CYAN, malware_analysis: HIGH, executive_briefing: "#8b5cf6",
  ioc_report: MEDIUM, threat_assessment: DANGER, incident_report: "#ef4444"
};

export default function GDSThreatIntelReportsPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [affectsMe, setAffectsMe] = useState(false);
  const [actionRequired, setActionRequired] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["threat-reports"], queryFn: () => base44.entities.ThreatReport.list("-published_at", 100).catch(() => []),
  });

  const filtered = reports.filter(r => {
    const matchType = typeFilter === "all" || r.report_type === typeFilter;
    const matchSev = severityFilter === "all" || r.severity === severityFilter;
    const matchAffects = !affectsMe || r.affects_you;
    const matchAction = !actionRequired || r.action_required;
    return matchType && matchSev && matchAffects && matchAction;
  });

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "Intelligence Reports" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <FileText className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Intelligence Reports</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Threat intelligence reports and analysis</p>
          </div>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Types</option>
            {Object.keys(TYPE_COLORS).map(type => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-xl" style={{ background: affectsMe ? `${DANGER}15` : "rgba(255,255,255,0.04)", border: `1px solid ${affectsMe ? DANGER + "40" : BORDER}` }}>
            <input type="checkbox" checked={affectsMe} onChange={(e) => setAffectsMe(e.target.checked)} className="w-4 h-4" style={{ accentColor: DANGER }} />
            <span style={{ color: affectsMe ? DANGER : MUTED }}>Affects Me</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-xl" style={{ background: actionRequired ? `${HIGH}15` : "rgba(255,255,255,0.04)", border: `1px solid ${actionRequired ? HIGH + "40" : BORDER}` }}>
            <input type="checkbox" checked={actionRequired} onChange={(e) => setActionRequired(e.target.checked)} className="w-4 h-4" style={{ accentColor: HIGH }} />
            <span style={{ color: actionRequired ? HIGH : MUTED }}>Action Required</span>
          </label>
        </div>
      </Card>

      {selectedReport ? (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">{selectedReport.title}</h2>
              <div className="flex items-center gap-3 text-[10px]" style={{ color: MUTED }}>
                <span>{selectedReport.report_type?.replace("_", " ")}</span>
                <span>•</span>
                <span>Published: {timeAgo(selectedReport.published_at)}</span>
                <span>•</span>
                <span>Author: {selectedReport.author || "Unknown"}</span>
                <span>•</span>
                <span>TLP: {selectedReport.tlp_classification || "UNKNOWN"}</span>
              </div>
            </div>
            <button onClick={() => setSelectedReport(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>← Back</button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: TEXT }}>Summary</p>
              <p className="text-sm" style={{ color: MUTED }}>{selectedReport.summary || "No summary available"}</p>
            </div>
            {selectedReport.key_findings && selectedReport.key_findings.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: TEXT }}>Key Findings</p>
                <ol className="list-decimal list-inside space-y-1">
                  {selectedReport.key_findings.map((finding, i) => <li key={i} className="text-sm" style={{ color: MUTED }}>{finding}</li>)}
                </ol>
              </div>
            )}
            {selectedReport.recommendations && selectedReport.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: TEXT }}>Recommendations</p>
                <ul className="list-disc list-inside space-y-1">
                  {selectedReport.recommendations.map((rec, i) => <li key={i} className="text-sm" style={{ color: MUTED }}>{rec}</li>)}
                </ul>
              </div>
            )}
          </div>
        </Card>
      ) : isLoading ? <Skeleton lines={6} /> : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No reports" description="Threat intelligence reports will appear here" />
      ) : (
        <Card className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Title", "Type", "Severity", "Confidence", "TLP", "Affects You", "Action Required", "Source", "Published", "Author"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((report) => {
                  const typeColor = TYPE_COLORS[report.report_type] || MUTED;
                  return (
                    <tr key={report.id} className="hover:bg-white/[0.02] cursor-pointer" style={{ borderBottom: `1px solid ${BORDER}20` }} onClick={() => setSelectedReport(report)}>
                      <td className="py-3 px-3"><p className="text-xs font-bold text-white">{report.title}</p></td>
                      <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${typeColor}15`, color: typeColor }}>{report.report_type?.replace("_", " ")}</span></td>
                      <td className="py-3 px-3"><SevBadge sev={report.severity} /></td>
                      <td className="py-3 px-3"><div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}><div className="h-full rounded-full" style={{ width: `${(report.confidence || 0) * 100}%`, background: CYAN }} /></div></td>
                      <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${report.tlp_classification === "red" ? "bg-red-400/15 text-red-400" : report.tlp_classification === "amber" ? "bg-orange-400/15 text-orange-400" : report.tlp_classification === "green" ? "bg-green-400/15 text-green-400" : "bg-gray-400/15 text-gray-400"}`}>TLP:{report.tlp_classification?.toUpperCase() || "WHITE"}</span></td>
                      <td className="py-3 px-3">{report.affects_you ? <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>YES</span> : <span style={{ color: MUTED }}>No</span>}</td>
                      <td className="py-3 px-3">{report.action_required ? <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${HIGH}15`, color: HIGH }}>REQUIRED</span> : <span style={{ color: MUTED }}>No</span>}</td>
                      <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{report.source || "—"}</td>
                      <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(report.published_at)}</td>
                      <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{report.author || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}