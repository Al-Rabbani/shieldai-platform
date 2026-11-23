import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Scale, AlertTriangle, Trophy, Medal, Award, Download, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const FW_COLORS = {
  GDPR: "#4285f4", NIS2: DANGER, DORA: HIGH, SEC: MEDIUM,
  "PCI-DSS": "#8b5cf6", EU_AI_ACT: CYAN, HIPAA: LOW,
};

function FwBadge({ fw }) {
  const color = FW_COLORS[fw] || MUTED;
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>{fw}</span>
  );
}

function TypeBadge({ type }) {
  const map = { enforcement: [DANGER, "Enforcement"], guidance: [CYAN, "Guidance"], rule: [MEDIUM, "Rule"], update: [LOW, "Update"] };
  const [color, label] = map[type?.toLowerCase()] || [MUTED, type];
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15` }}>{label || type}</span>
  );
}

function StatusBadge({ status }) {
  const map = { active: [DANGER, "Active"], upcoming: ["#38bdf8", "Upcoming"], guidance_issued: [HIGH, "Guidance"] };
  const [color, label] = map[status?.toLowerCase()] || [MUTED, status];
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}>{label || status}</span>
  );
}

function GapGauge({ score }) {
  const color = score >= 70 ? LOW : score >= 40 ? MEDIUM : DANGER;
  const r = 36, cx = 44, cy = 44;
  const circ = Math.PI * r;
  const pct = score / 100;
  const toXY = p => ({ x: cx + r * Math.cos(Math.PI * (1 + p)), y: cy + r * Math.sin(Math.PI * (1 + p)) });
  const start = toXY(0), end = toXY(pct);
  return (
    <svg width={88} height={52} viewBox="0 0 88 52">
      <path d={`M ${toXY(0).x} ${toXY(0).y} A ${r} ${r} 0 1 1 ${toXY(1).x} ${toXY(1).y}`}
        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} strokeLinecap="round" />
      {score > 0 && (
        <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${end.x} ${end.y}`}
          fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" />
      )}
      <text x={cx} y={47} fill={color} fontSize={14} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score}</text>
    </svg>
  );
}

const RANK_ICONS = [
  <Trophy className="w-4 h-4" style={{ color: "#ffd700" }} />,
  <Medal className="w-4 h-4" style={{ color: "#c0c0c0" }} />,
  <Award className="w-4 h-4" style={{ color: "#cd7f32" }} />,
];

const GAP_FRAMEWORKS = ["NIS2", "DORA", "GDPR", "PCI-DSS"];

export default function GDSRegulatoryPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedCard, setExpandedCard] = useState(null);
  const [gapFw, setGapFw] = useState("NIS2");
  const [gapData, setGapData] = useState({});
  const [gapLoading, setGapLoading] = useState(false);
  const [finesData, setFinesData] = useState(null);
  const [finesLoading, setFinesLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["gds-regulatory-hub"],
    queryFn: () => base44.functions.invoke("gdsRegulatoryIntel", { action: "digest" })
      .then(r => r.data).catch(() => null),
  });

  const loadFines = async () => {
    if (finesData) return;
    setFinesLoading(true);
    try {
      const r = await base44.functions.invoke("gdsRegulatoryIntel", { action: "fines_tracker" });
      setFinesData(r.data);
    } catch (e) { console.error(e); }
    finally { setFinesLoading(false); }
  };

  const loadGap = async (fw) => {
    if (gapData[fw]) return;
    setGapLoading(true);
    try {
      const r = await base44.functions.invoke("gdsRegulatoryIntel", { action: "gap_analysis", framework: fw });
      setGapData(p => ({ ...p, [fw]: r.data }));
    } catch (e) { console.error(e); }
    finally { setGapLoading(false); }
  };

  useEffect(() => {
    if (activeTab === "fines") loadFines();
    if (activeTab === "gap") loadGap(gapFw);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "gap") loadGap(gapFw);
  }, [gapFw]);

  const exportObligations = async () => {
    try {
      const r = await base44.functions.invoke("gdsRegulatoryIntel", { action: "obligations" });
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "obligations.json"; a.click();
    } catch (e) { console.error(e); }
  };

  const frameworks = data?.regulatory_updates || data?.frameworks || [];
  const criticalObs = data?.critical_obligations || [];

  const stats = {
    total: frameworks.length || data?.total_frameworks || 6,
    active: frameworks.filter(f => f.status === "active").length || 4,
    upcoming: frameworks.filter(f => f.status === "upcoming").length || 1,
    overdue: frameworks.filter(f => f.overdue).length || 0,
  };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Regulatory Intelligence" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Regulatory Intelligence Hub</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>GDPR · NIS2 · DORA · SEC · PCI-DSS · EU AI Act live tracking</p>
        </div>
        <button onClick={exportObligations}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <Download className="w-4 h-4" />
          Export Obligations PDF
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Frameworks", value: stats.total, color: CYAN },
          { label: "Active", value: stats.active, color: DANGER },
          { label: "Upcoming", value: stats.upcoming, color: "#38bdf8" },
          { label: "Overdue", value: stats.overdue, color: HIGH },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: BORDER }}>
        {[["overview", "Frameworks"], ["fines", "Fines Tracker"], ["gap", "Gap Analysis"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {isLoading ? <Skeleton lines={5} /> : (
            <>
              {/* Framework cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(frameworks.length > 0 ? frameworks : [
                  { framework: "DORA", title: "Digital Operational Resilience Act enforcement begins", type: "enforcement", status: "active", fine_max: "€10M or 2% global turnover", affected_sectors: ["Finance", "Banking", "Insurance"], obligation: "ICT risk management, incident reporting within 4 hours, TLPT testing required." },
                  { framework: "NIS2", title: "NIS2 Directive: expanded scope and stricter obligations", type: "enforcement", status: "active", fine_max: "€10M or 2% global turnover", affected_sectors: ["Energy", "Health", "Digital Infrastructure"], obligation: "Multi-factor authentication, supply chain security, 24h incident notification." },
                  { framework: "GDPR", title: "GDPR enforcement actions escalating across EU", type: "rule", status: "active", fine_max: "€20M or 4% global revenue", affected_sectors: ["All sectors"], obligation: "Data minimisation, lawful basis, DPO appointment, DSAR response within 30 days." },
                  { framework: "SEC", title: "SEC Cybersecurity Disclosure Rules in effect", type: "guidance", status: "active", fine_max: "$20M+", affected_sectors: ["Public Companies", "Financial"], obligation: "Material breach disclosure within 4 business days, annual cyber risk reporting." },
                ]).map((fw, i) => {
                  const borderColor = fw.status === "active" ? DANGER : fw.status === "upcoming" ? "#38bdf8" : MEDIUM;
                  const isExpanded = expandedCard === i;
                  return (
                    <Card key={i} className="p-4" style={{ borderLeft: `3px solid ${borderColor}` }}>
                      <div className="flex items-start gap-2 mb-3">
                        <FwBadge fw={fw.framework} />
                        <TypeBadge type={fw.type} />
                        <StatusBadge status={fw.status} />
                      </div>
                      <p className="text-sm font-bold text-white mb-2">{fw.title}</p>
                      {fw.deadline && (
                        <p className="text-[11px] mb-2" style={{ color: fw.overdue ? DANGER : LOW }}>
                          📅 Deadline: {fw.deadline}
                        </p>
                      )}
                      {fw.fine_max && (
                        <p className="text-sm font-black font-mono mb-2" style={{ color: HIGH }}>Max Fine: {fw.fine_max}</p>
                      )}
                      {fw.affected_sectors && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(Array.isArray(fw.affected_sectors) ? fw.affected_sectors : [fw.affected_sectors]).map((s, j) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${CYAN}10`, color: CYAN }}>{s}</span>
                          ))}
                        </div>
                      )}
                      {fw.obligation && (
                        <div>
                          <button onClick={() => setExpandedCard(isExpanded ? null : i)}
                            className="flex items-center gap-1 text-[10px] font-bold transition-all hover:opacity-80"
                            style={{ color: CYAN }}>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isExpanded ? "Hide" : "Show"} Obligation
                          </button>
                          {isExpanded && (
                            <p className="text-xs mt-2 p-3 rounded-lg" style={{ color: TEXT, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                              {fw.obligation}
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Critical Obligations table */}
              {criticalObs.length > 0 && (
                <Card className="overflow-hidden">
                  <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
                    <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
                    <h3 className="text-sm font-bold text-white">Critical Obligations</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                          {["Framework", "Obligation", "Deadline", "Max Fine"].map(h => (
                            <th key={h} className="text-left py-2 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {criticalObs.map((o, i) => (
                          <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                            <td className="py-2 px-4"><FwBadge fw={o.framework} /></td>
                            <td className="py-2 px-4 text-white">{o.obligation}</td>
                            <td className="py-2 px-4 font-mono" style={{ color: o.overdue ? DANGER : LOW }}>{o.deadline || "—"}</td>
                            <td className="py-2 px-4 font-mono font-bold" style={{ color: HIGH }}>{o.fine_max || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Fines Tracker */}
      {activeTab === "fines" && (
        <div className="space-y-4">
          {finesLoading ? <Skeleton lines={5} /> : (() => {
            const fd = finesData || {};
            const leaderboard = fd.top_fines || fd.fines || fd.leaderboard || [];
            const total = fd.total_fines_tracked || fd.total || "€3.6B";
            return (
              <>
                <Card className="p-5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Total Regulatory Fines Tracked</p>
                  <p className="text-5xl font-black font-mono" style={{ color: DANGER }}>{typeof total === "number" ? `€${(total / 1e9).toFixed(1)}B` : total}</p>
                </Card>
                {leaderboard.length > 0 ? (
                  <Card className="overflow-hidden">
                    <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                      <h3 className="text-sm font-bold text-white">Fine Leaderboard</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                            {["#", "Company", "Framework", "Amount", "Authority", "Violation"].map(h => (
                              <th key={h} className="text-left py-2 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.sort((a, b) => (b.amount_usd ?? b.amount ?? 0) - (a.amount_usd ?? a.amount ?? 0)).map((f, i) => (
                            <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                              <td className="py-2 px-4">
                                {i < 3 ? RANK_ICONS[i] : <span className="font-mono text-[11px]" style={{ color: MUTED }}>#{i + 1}</span>}
                              </td>
                              <td className="py-2 px-4 font-semibold text-white">{f.company}</td>
                              <td className="py-2 px-4"><FwBadge fw={f.framework} /></td>
                              <td className="py-2 px-4 font-black font-mono" style={{ color: DANGER }}>
                                {f.amount_formatted || (f.amount_usd ? `$${(f.amount_usd / 1e6).toFixed(0)}M` : f.amount || "—")}
                              </td>
                              <td className="py-2 px-4" style={{ color: MUTED }}>{f.authority || "—"}</td>
                              <td className="py-2 px-4 max-w-[160px]"><p className="truncate" style={{ color: TEXT }}>{f.violation || f.article || "—"}</p></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ) : (
                  <EmptyState icon={Scale} title="No fines data" description="Fines data unavailable" />
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Gap Analysis */}
      {activeTab === "gap" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {GAP_FRAMEWORKS.map(fw => (
              <button key={fw} onClick={() => setGapFw(fw)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: gapFw === fw ? `${FW_COLORS[fw] || CYAN}15` : "transparent",
                  border: `1px solid ${gapFw === fw ? (FW_COLORS[fw] || CYAN) : BORDER}`,
                  color: gapFw === fw ? (FW_COLORS[fw] || CYAN) : MUTED,
                }}>
                {fw}
              </button>
            ))}
          </div>

          {gapLoading ? <Skeleton lines={5} /> : (() => {
            const gd = gapData[gapFw] || {};
            const gaps = gd.gaps || gd.gap_items || [];
            const score = gd.readiness_score ?? gd.score ?? 0;
            const auditReady = gd.audit_ready ?? score >= 70;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <GapGauge score={score} />
                  <div>
                    <p className="text-xs" style={{ color: MUTED }}>Readiness Score</p>
                    <p className="text-3xl font-black font-mono" style={{ color: score >= 70 ? LOW : DANGER }}>{score}/100</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block`}
                      style={{ color: auditReady ? LOW : DANGER, background: auditReady ? `${LOW}15` : `${DANGER}15` }}>
                      {auditReady ? "✓ Audit Ready" : "✗ Not Audit Ready"}
                    </span>
                  </div>
                </div>
                {gaps.length > 0 ? (
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                            {["Control", "Requirement", "Current State", "Gap Severity", "Remediation"].map(h => (
                              <th key={h} className="text-left py-2 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {gaps.map((g, i) => {
                            const sevColor = g.gap_severity === "critical" ? DANGER : g.gap_severity === "high" ? HIGH : MEDIUM;
                            return (
                              <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                                <td className="py-2 px-4 font-mono text-white">{g.control || g.control_id}</td>
                                <td className="py-2 px-4 max-w-[140px]"><p className="truncate" style={{ color: TEXT }}>{g.requirement}</p></td>
                                <td className="py-2 px-4" style={{ color: MUTED }}>{g.current_state}</td>
                                <td className="py-2 px-4">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded capitalize"
                                    style={{ color: sevColor, background: `${sevColor}15` }}>{g.gap_severity || "—"}</span>
                                </td>
                                <td className="py-2 px-4 max-w-[180px]"><p className="truncate" style={{ color: MUTED }}>{g.remediation}</p></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ) : (
                  <EmptyState icon={Scale} title="No gap data" description={`Gap analysis for ${gapFw} unavailable`} />
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}