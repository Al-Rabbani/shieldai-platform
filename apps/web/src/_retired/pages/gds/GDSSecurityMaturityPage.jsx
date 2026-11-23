import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Award } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Skeleton, Breadcrumb, Card, PAGE_BG
} from "@/components/gds/GDSOSShared";

const EFFORT_COLOR = { Low: LOW, Medium: MEDIUM, High: DANGER };
const LEVEL_COLOR = { 1: DANGER, 2: HIGH, 3: MEDIUM, 4: CYAN, 5: LOW };

function CircleGauge({ score, size = 100 }) {
  const r = size / 2 - 9;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 75 ? LOW : score >= 55 ? CYAN : score >= 40 ? MEDIUM : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={9}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 1s", filter: `drop-shadow(0 0 8px ${color}88)` }} />
      <text x={size/2} y={size/2 + 5} fill={color} fontSize={size * 0.22} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score}</text>
    </svg>
  );
}

function PercentileBar({ benchmarks, yourScore }) {
  const bands = [
    { label: "P25", value: benchmarks?.p25 ?? 35, color: DANGER },
    { label: "P50", value: benchmarks?.p50 ?? 52, color: HIGH },
    { label: "P75", value: benchmarks?.p75 ?? 68, color: MEDIUM },
    { label: "P90", value: benchmarks?.p90 ?? 79, color: CYAN },
    { label: "Leader", value: benchmarks?.leader ?? 91, color: LOW },
  ];
  return (
    <div className="relative mt-4">
      <div className="h-6 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${DANGER}, ${HIGH}, ${MEDIUM}, ${CYAN}, ${LOW})` }} />
      </div>
      {bands.map(b => (
        <div key={b.label} className="absolute top-0 flex flex-col items-center" style={{ left: `${b.value}%`, transform: "translateX(-50%)" }}>
          <div className="w-0.5 h-6" style={{ background: "rgba(0,0,0,0.5)" }} />
          <span className="text-[9px] mt-1 font-bold" style={{ color: b.color }}>{b.label}</span>
          <span className="text-[8px]" style={{ color: MUTED }}>{b.value}</span>
        </div>
      ))}
      {/* Your score marker */}
      <div className="absolute top-0 flex flex-col items-center" style={{ left: `${yourScore}%`, transform: "translateX(-50%)" }}>
        <div className="w-1 h-6 rounded" style={{ background: "white", boxShadow: "0 0 6px rgba(255,255,255,0.8)" }} />
        <span className="text-[10px] mt-1 font-black text-white">YOU</span>
        <span className="text-[8px]" style={{ color: CYAN }}>{yourScore}</span>
      </div>
    </div>
  );
}

export default function GDSSecurityMaturityPage() {
  const [activeTab, setActiveTab] = useState("domains");
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [roadmapData, setRoadmapData] = useState(null);
  const [tabLoading, setTabLoading] = useState({});

  const { data: scoreData, isLoading } = useQuery({
    queryKey: ["gds-maturity-score"],
    queryFn: () => base44.functions.invoke("gdsSecurityMaturityBenchmark", { action: "score" }).then(r => r.data),
  });

  const load = async (tab, act, setter) => {
    setTabLoading(p => ({ ...p, [tab]: true }));
    try { const r = await base44.functions.invoke("gdsSecurityMaturityBenchmark", { action: act }); setter(r.data); }
    catch (e) { console.error(e); } finally { setTabLoading(p => ({ ...p, [tab]: false })); }
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    if (tab === "benchmark" && !benchmarkData) load("benchmark", "benchmark", setBenchmarkData);
    if (tab === "roadmap" && !roadmapData) load("roadmap", "roadmap", setRoadmapData);
  };

  useEffect(() => { load("benchmark", "benchmark", setBenchmarkData); }, []);

  const d = scoreData || {};
  const score = d.score ?? 65;
  const level = d.level ?? 3;
  const grade = d.grade ?? "B";
  const gradeColor = { A: LOW, B: CYAN, C: MEDIUM, D: DANGER }[grade] || MUTED;
  const levelColor = LEVEL_COLOR[level] || CYAN;
  const domains = d.domains || [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Security Maturity" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Security Maturity</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>CMMI-based security maturity scoring across 5 domains with industry benchmarking</p>
      </div>

      {/* Header */}
      {isLoading ? <Skeleton lines={3} /> : (
        <Card className="p-6">
          <div className="flex items-center gap-6 flex-wrap">
            <CircleGauge score={score} size={110} />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl font-black text-white">Level {level}</span>
                <span className="text-sm font-bold px-3 py-1 rounded-xl" style={{ color: levelColor, background: `${levelColor}15`, border: `1px solid ${levelColor}40` }}>{d.maturity_label}</span>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black flex-shrink-0"
                  style={{ background: `${gradeColor}15`, border: `2px solid ${gradeColor}60`, color: gradeColor }}>{grade}</span>
              </div>
              <p className="text-sm" style={{ color: MUTED }}>{d.maturity_description}</p>
            </div>
            {benchmarkData && (
              <div className="flex-1 min-w-64">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Industry Percentile</p>
                <p className="text-lg font-black" style={{ color: CYAN }}>{benchmarkData.percentile_text}</p>
                <div className="flex gap-4 mt-1 text-xs">
                  <span style={{ color: MUTED }}>Gap to median: <span style={{ color: HIGH }}>+{benchmarkData.gap_to_median}</span></span>
                  <span style={{ color: MUTED }}>Gap to leader: <span style={{ color: MEDIUM }}>+{benchmarkData.gap_to_leader}</span></span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex border-b flex-wrap" style={{ borderColor: BORDER }}>
        {[["domains", "Domains"], ["benchmark", "Industry Benchmark"], ["roadmap", "Roadmap"]].map(([id, label]) => (
          <button key={id} onClick={() => handleTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "domains" && (
        isLoading ? <Skeleton lines={4} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((d, i) => {
              const dc = LEVEL_COLOR[d.maturity_level] || CYAN;
              return (
                <Card key={i} className="p-4" style={{ borderLeft: `3px solid ${dc}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-white">{d.name}</p>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: dc, background: `${dc}15` }}>L{d.maturity_level} {d.maturity_label}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: MUTED }}>Score</span>
                    <span className="text-sm font-black font-mono" style={{ color: dc }}>{d.score}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: dc }} />
                  </div>
                  <div className="space-y-1">
                    {d.key_indicators?.map((ki, j) => <p key={j} className="text-[10px]" style={{ color: MUTED }}>• {ki}</p>)}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {activeTab === "benchmark" && (
        tabLoading.benchmark ? <Skeleton lines={4} /> : !benchmarkData ? <div /> : (
          <Card className="p-6">
            <h3 className="text-sm font-bold text-white mb-2">Industry Benchmark — {benchmarkData.industry}</h3>
            <p className="text-2xl font-black mb-1" style={{ color: CYAN }}>{benchmarkData.percentile_text}</p>
            <p className="text-sm mb-6" style={{ color: MUTED }}>Your score of <strong style={{ color: "white" }}>{benchmarkData.your_score}</strong> vs industry benchmarks</p>
            <PercentileBar benchmarks={benchmarkData.benchmarks} yourScore={benchmarkData.your_score} />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8">
              {Object.entries(benchmarkData.benchmarks || {}).map(([label, val]) => (
                <div key={label} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>{label}</p>
                  <p className="text-xl font-black font-mono" style={{ color: val <= benchmarkData.your_score ? LOW : MUTED }}>{val}</p>
                </div>
              ))}
            </div>
          </Card>
        )
      )}

      {activeTab === "roadmap" && (
        tabLoading.roadmap ? <Skeleton lines={4} /> : !roadmapData ? <div /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roadmapData.quarters?.map((q, i) => (
              <Card key={i} className="p-4" style={{ borderTop: `3px solid ${[CYAN, MEDIUM, LOW][i] || CYAN}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-white">{q.quarter}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}12` }}>{q.theme}</span>
                </div>
                <p className="text-[10px] mb-3" style={{ color: MUTED }}>→ Level {q.projected_maturity_level} projected</p>
                <div className="space-y-2">
                  {q.initiatives?.map((init, j) => (
                    <div key={j} className="p-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                      <p className="text-xs text-white mb-1.5">{init.action}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: EFFORT_COLOR[init.effort] || MUTED, background: `${EFFORT_COLOR[init.effort] || MUTED}12` }}>{init.effort}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: LOW, background: `${LOW}12` }}>+{init.impact} maturity</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.05)" }}>{init.team}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}