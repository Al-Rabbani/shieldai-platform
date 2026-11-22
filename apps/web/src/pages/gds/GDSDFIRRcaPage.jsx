import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const CATEGORY_COLORS = {
  credential_compromise: DANGER, misconfiguration: "#f97316", social_engineering: "#eab308",
  supply_chain: DANGER, unpatched_vulnerability: HIGH, insider_threat: "#a855f7",
  third_party: "#f97316", process_failure: MEDIUM, technology_failure: MEDIUM, other: MUTED
};

export default function GDSDFIRRcaPage() {
  const [expandedRca, setExpandedRca] = useState(null);
  const [activeFishboneTab, setActiveFishboneTab] = useState("people");

  const { data: rcas = [], isLoading } = useQuery({
    queryKey: ["dfir-root-causes"],
    queryFn: () => base44.entities.RootCause.list("-created_date", 100).catch(() => []),
  });

  const stats = {
    total: rcas.length,
    completed: rcas.filter(r => r.status === "completed" || r.status === "approved").length,
    avgConfidence: rcas.length > 0 ? Math.round(rcas.reduce((sum, r) => sum + (r.confidence_percent || 0), 0) / rcas.length) : 0,
    avgDwellTime: rcas.length > 0 ? Math.round(rcas.reduce((sum, r) => sum + (r.dwell_time_days || 0), 0) / rcas.length) : 0
  };

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Incident Response", path: "/dfir" }, { label: "Root Cause Analysis" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Search className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Root Cause Analysis Center</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Five-Whys and fishbone analysis</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total RCAs</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Completed</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.completed}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Confidence</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.avgConfidence}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Dwell Time</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.avgDwellTime}d</p>
        </Card>
      </div>

      {/* RCAs Table */}
      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : rcas.length === 0 ? (
          <EmptyState icon={Search} title="No root cause analyses" description="RCAs will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Incident", "Category", "Primary Root Cause", "Attack Vector", "Dwell Time", "Confidence", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rcas.map((rca) => {
                  const categoryColor = CATEGORY_COLORS[rca.category] || CATEGORY_COLORS.other;
                  const isLongDwell = (rca.dwell_time_days || 0) > 7;
                  return (
                    <React.Fragment key={rca.id}>
                      <tr style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5 cursor-pointer" onClick={() => setExpandedRca(expandedRca === rca.id ? null : rca.id)}>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-mono" style={{ color: CYAN }}>{rca.incident_id?.slice(-8)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${categoryColor}15`, color: categoryColor }}>{rca.category?.replace(/_/g, " ") || "UNKNOWN"}</span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs font-semibold text-white max-w-xs truncate">{rca.primary_root_cause}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs" style={{ color: TEXT }}>{rca.attack_vector || "—"}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className={`text-xs font-bold ${isLongDwell ? 'text-red-400' : 'text-green-400'}`}>{rca.dwell_time_days || 0}d</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${rca.confidence_percent || 0}%`, background: rca.confidence_percent >= 80 ? LOW : rca.confidence_percent >= 60 ? HIGH : DANGER }} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: TEXT }}>{rca.confidence_percent || 0}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: STATUS_COLORS[rca.status], background: `${STATUS_COLORS[rca.status]}15` }}>{rca.status || "draft"}</span>
                        </td>
                        <td className="py-3 px-4">
                          {expandedRca === rca.id ? <ChevronDown className="w-4 h-4" style={{ color: MUTED }} /> : <ChevronRight className="w-4 h-4" style={{ color: MUTED }} />}
                        </td>
                      </tr>
                      {expandedRca === rca.id && (
                        <tr>
                          <td colSpan={9} className="p-4" style={{ background: "rgba(0,212,255,0.03)" }}>
                            <div className="space-y-4">
                              {/* Five-Whys */}
                              <div>
                                <p className="text-xs font-bold mb-2" style={{ color: CYAN }}>Five-Whys Analysis</p>
                                <div className="space-y-2">
                                  {(rca.five_whys || []).map((why, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>Why {why.why_number}</span>
                                      <div>
                                        <p className="text-[10px]" style={{ color: MUTED }}>{why.why}</p>
                                        <p className="text-[10px] font-semibold" style={{ color: TEXT }}>{why.answer}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Fishbone */}
                              {rca.fishbone_categories && (
                                <div>
                                  <p className="text-xs font-bold mb-2" style={{ color: CYAN }}>Fishbone Categories</p>
                                  <div className="flex gap-2 mb-2">
                                    {["people", "process", "technology", "environment"].map(tab => (
                                      <button key={tab} onClick={() => setActiveFishboneTab(tab)} className={`px-2 py-1 rounded text-[10px] font-bold capitalize ${activeFishboneTab === tab ? '' : 'hover:opacity-70'}`} style={{ background: activeFishboneTab === tab ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${activeFishboneTab === tab ? CYAN + "40" : BORDER}`, color: activeFishboneTab === tab ? CYAN : MUTED }}>{tab}</button>
                                    ))}
                                  </div>
                                  <p className="text-xs p-2 rounded" style={{ background: "rgba(255,255,255,0.03)", color: TEXT }}>{rca.fishbone_categories[activeFishboneTab] || "No data"}</p>
                                </div>
                              )}
                              {/* AI Analysis */}
                              {rca.ai_analysis && (
                                <div className="p-3 rounded-lg" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}30` }}>
                                  <p className="text-xs font-bold mb-1" style={{ color: CYAN }}>AI Analysis</p>
                                  <p className="text-xs" style={{ color: TEXT }}>{rca.ai_analysis}</p>
                                </div>
                              )}
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
        )}
      </Card>
    </div>
  );
}

const STATUS_COLORS = { draft: MUTED, in_review: HIGH, completed: LOW, approved: CYAN };