import React, { useState } from "react";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, KpiCard, PAGE_BG
} from "@/components/gds/GDSOSShared";

const RAG_COLOR = { GREEN: LOW, AMBER: MEDIUM, RED: DANGER };
const EFFORT_COLOR = { Low: LOW, Medium: MEDIUM, High: DANGER };

function PillarCard({ p }) {
  const color = RAG_COLOR[p.rag] || MUTED;
  return (
    <Card className="p-4" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-white">{p.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color, background: `${color}18` }}>{p.rag}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.05)" }}>w:{p.weight}%</span>
        </div>
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: MUTED }}>Score</span>
          <span className="text-sm font-black font-mono" style={{ color }}>{p.score}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: color }} />
        </div>
      </div>
      <div className="space-y-1 mb-2">
        {p.controls?.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]" style={{ color: LOW }}>
            <CheckCircle className="w-3 h-3 flex-shrink-0" /> {c}
          </div>
        ))}
      </div>
      {p.gaps?.length > 0 && (
        <div className="space-y-1 pt-2 border-t" style={{ borderColor: BORDER }}>
          {p.gaps.map((g, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]" style={{ color: DANGER }}>
              <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {g}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function GDSZeroTrustPage() {
  const [activeTab, setActiveTab] = useState("pillars");
  const [gapData, setGapData] = useState(null);
  const [segData, setSegData] = useState(null);
  const [tabLoading, setTabLoading] = useState({});

  const { data: ztData, isLoading } = useQuery({
    queryKey: ["gds-zero-trust-engine"],
    queryFn: () => base44.functions.invoke("gdsZeroTrustEngine", { action: "score" }).then(r => r.data),
  });

  const loadTab = async (tab) => {
    const actionMap = { gaps: "gap_analysis", segments: "network_segments" };
    const act = actionMap[tab];
    if (!act) return;
    setTabLoading(p => ({ ...p, [tab]: true }));
    try {
      const res = await base44.functions.invoke("gdsZeroTrustEngine", { action: act });
      if (tab === "gaps") setGapData(res.data);
      if (tab === "segments") setSegData(res.data);
    } catch (e) { console.error(e); }
    finally { setTabLoading(p => ({ ...p, [tab]: false })); }
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    if (tab === "gaps" && !gapData) loadTab("gaps");
    if (tab === "segments" && !segData) loadTab("segments");
  };

  const d = ztData || {};
  const score = d.score ?? 76;
  const grade = d.grade ?? "B";
  const maturity = d.maturity_level ?? "Intermediate";
  const gradeColor = grade === "A" ? LOW : grade === "B" ? CYAN : grade === "C" ? MEDIUM : DANGER;

  const STATUS_STYLE = { IMPLEMENTED: [LOW, "✓"], PARTIAL: [MEDIUM, "~"], GAP: [DANGER, "✗"], NOT_IMPLEMENTED: [MUTED, "○"] };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Zero Trust" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Zero Trust Architecture</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>NIST SP 800-207 aligned Zero Trust maturity scoring and gap analysis</p>
      </div>

      {/* Header score */}
      <Card className="p-6">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${gradeColor}15`, border: `2px solid ${gradeColor}60` }}>
            <span className="text-4xl font-black" style={{ color: gradeColor }}>{grade}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-1">Zero Trust Architecture Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black font-mono" style={{ color: gradeColor }}>{score}</span>
              <span className="text-xl" style={{ color: MUTED }}>/100</span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block" style={{ color: CYAN, background: `${CYAN}15` }}>{maturity}</span>
          </div>
          <div className="flex-1 ml-4 hidden md:block">
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${DANGER}, ${MEDIUM}, ${LOW})`, transition: "width 1s" }} />
            </div>
            <div className="flex justify-between mt-1 text-[9px]" style={{ color: MUTED }}>
              <span>Initial</span><span>Basic</span><span>Intermediate</span><span>Advanced</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: BORDER }}>
        {[["pillars", "Pillars"], ["gaps", "Gap Analysis"], ["segments", "Network Segments"], ["roadmap", "Roadmap"]].map(([id, label]) => (
          <button key={id} onClick={() => handleTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "pillars" && (
        isLoading ? <Skeleton lines={4} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(d.pillars || []).map((p, i) => <PillarCard key={i} p={p} />)}
          </div>
        )
      )}

      {activeTab === "gaps" && (
        tabLoading.gaps ? <Skeleton lines={5} /> : !gapData
          ? <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>Loading gap analysis…</p></div>
          : (
            <Card className="overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                <h3 className="font-bold text-white">Control Gap Analysis</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Control", "Status", "Priority", "Findings"].map(h => (
                        <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gapData.controls?.map((c, i) => {
                      const [sc, icon] = STATUS_STYLE[c.status] || [MUTED, "○"];
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                          <td className="py-3 px-4 text-white font-medium">{c.name}</td>
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-1 text-[10px] font-black" style={{ color: sc }}>
                              {icon} {c.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: c.priority === "P0" ? DANGER : c.priority === "P1" ? HIGH : MEDIUM, background: "rgba(255,255,255,0.05)" }}>{c.priority}</span>
                          </td>
                          <td className="py-3 px-4 font-mono" style={{ color: c.finding_count > 0 ? DANGER : MUTED }}>{c.finding_count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )
      )}

      {activeTab === "segments" && (
        tabLoading.segments ? <Skeleton lines={4} /> : !segData
          ? <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>Loading…</p></div>
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {segData.segments?.map((seg, i) => {
                const rc = { CRITICAL: DANGER, HIGH: HIGH, MEDIUM: MEDIUM, LOW: LOW }[seg.risk] || MUTED;
                return (
                  <Card key={i} className="p-5" style={{ borderLeft: `3px solid ${rc}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-white">{seg.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: rc, background: `${rc}18` }}>{seg.risk}</span>
                        <span className="text-[10px]" style={{ color: MUTED }}>{seg.assets} assets</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">{seg.controls?.map((c, j) => <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: LOW, background: `${LOW}12` }}>{c}</span>)}</div>
                    {seg.gaps?.map((g, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-[10px] mt-1" style={{ color: DANGER }}>
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />{g}
                      </div>
                    ))}
                  </Card>
                );
              })}
            </div>
          )
      )}

      {activeTab === "roadmap" && (
        <div className="space-y-3">
          {(d.roadmap || []).map((item, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
                  style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>P{item.phase}</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{item.action}</p>
                  <p className="text-[10px] mt-1" style={{ color: MUTED }}>{item.timeframe}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: LOW, background: `${LOW}15` }}>+{item.impact} score</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: EFFORT_COLOR[item.effort] || MUTED, background: "rgba(255,255,255,0.05)" }}>{item.effort}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}