import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Search, Filter, ChevronDown, Shield, BookOpen } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge, timeAgo } from "@/components/gds/GDSOSShared";

function FindingTypeBadge({ type }) {
  const colors = {
    kerberoasting: { bg: DANGER, text: DANGER },
    dcsync: { bg: "#dc2626", text: "#dc2626" },
    golden_ticket: { bg: "#a855f7", text: "#a855f7" },
    silver_ticket: { bg: "#ec4899", text: "#ec4899" },
    asrep_roasting: { bg: HIGH, text: HIGH },
    privilege_escalation: { bg: "#f97316", text: "#f97316" },
    lateral_movement: { bg: MEDIUM, text: MEDIUM },
    credential_dump: { bg: "#14b8a6", text: "#14b8a6" },
  };
  const color = colors[type] || { bg: MUTED, text: MUTED };
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${color.bg}15`, color: color.text, border: `1px solid ${color.bg}30` }}>
      {type?.toUpperCase() || "UNKNOWN"}
    </span>
  );
}

function MITREBadge({ technique }) {
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
      {technique}
    </span>
  );
}

export default function GDSIdentityFindingsPage() {
  const [filterType, setFilterType] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedRows, setExpandedRows] = useState({});

  const { data: findings = [] } = useQuery({
    queryKey: ["identity-findings"],
    queryFn: () => base44.entities.IdentityFinding?.list("-risk_score", 500).catch(() => []),
  });

  // Filter findings
  const filteredFindings = findings.filter(f => {
    if (filterType && f.finding_type !== filterType) return false;
    if (filterSeverity && f.severity !== filterSeverity) return false;
    if (filterStatus && f.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  const toggleExpand = (findingId) => {
    setExpandedRows(prev => ({
      ...prev,
      [findingId]: !prev[findingId]
    }));
  };

  // Get unique finding types for filter
  const findingTypes = [...new Set(findings.map(f => f.finding_type))].filter(Boolean);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Security" }, { label: "Identity Findings" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Identity Findings</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Detected identity-based security vulnerabilities and attacks</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4" style={{ color: MUTED }} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="">All Finding Types</option>
            {findingTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="confirmed">Confirmed</option>
            <option value="mitigated">Mitigated</option>
            <option value="false_positive">False Positive</option>
          </select>
          <div className="flex-1" />
          <span className="text-xs font-bold" style={{ color: CYAN }}>{filteredFindings.length} findings</span>
        </div>
      </Card>

      {/* Findings Table */}
      <Card className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Title", "Type", "Severity", "Affected Identity", "MITRE", "Risk Score", "Status", "Detected", "Actions"].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFindings.map((finding, i) => {
                const isExpanded = expandedRows[finding.id];
                return (
                  <React.Fragment key={finding.id || i}>
                    <tr className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-3">
                        <p className="text-sm font-semibold text-white">{finding.title}</p>
                      </td>
                      <td className="py-3 px-3">
                        <FindingTypeBadge type={finding.finding_type} />
                      </td>
                      <td className="py-3 px-3">
                        <SevBadge sev={finding.severity} />
                      </td>
                      <td className="py-3 px-3" style={{ color: TEXT }}>{finding.affected_identity || "—"}</td>
                      <td className="py-3 px-3">
                        {finding.mitre_technique && <MITREBadge technique={finding.mitre_technique} />}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm font-black" style={{ color: finding.risk_score >= 80 ? DANGER : finding.risk_score >= 60 ? HIGH : finding.risk_score >= 40 ? MEDIUM : LOW }}>
                          {finding.risk_score || 0}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                          finding.status === "open" ? "bg-red-400/15 text-red-400" :
                          finding.status === "confirmed" ? "bg-orange-400/15 text-orange-400" :
                          finding.status === "mitigated" ? "bg-green-400/15 text-green-400" :
                          "bg-gray-400/15 text-gray-400"
                        }`}>
                          {finding.status || "open"}
                        </span>
                      </td>
                      <td className="py-3 px-3" style={{ color: MUTED }}>{timeAgo(finding.detected_at)}</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => toggleExpand(finding.id)}
                          className="px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5"
                          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
                        >
                          <BookOpen className="w-3 h-3" />
                          {isExpanded ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-4" style={{ background: "rgba(0,212,255,0.03)" }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Exploitation Steps</p>
                              <ol className="space-y-2">
                                {(finding.exploitation_steps || []).map((step, j) => (
                                  <li key={j} className="text-xs p-2 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
                                    <span className="text-[9px] font-bold" style={{ color: CYAN }}>{j + 1}.</span>
                                    <span className="ml-2" style={{ color: TEXT }}>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Remediation Guidance</p>
                              <div className="p-3 rounded-lg" style={{ background: `${LOW}05`, border: `1px solid ${LOW}30` }}>
                                <p className="text-xs" style={{ color: TEXT }}>{finding.remediation || "No remediation guidance available"}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}