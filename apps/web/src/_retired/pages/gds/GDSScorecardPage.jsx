import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Card, Breadcrumb, Skeleton, PAGE_BG
} from "@/components/gds/GDSOSShared";

const STATUS_META = {
  ACHIEVED:  { color: LOW,    bg: `${LOW}15`    },
  ON_TRACK:  { color: CYAN,   bg: `${CYAN}12`   },
  AT_RISK:   { color: HIGH,   bg: `${HIGH}15`   },
  OFF_TRACK: { color: DANGER, bg: `${DANGER}15` },
};

function ProgressBar({ pct }) {
  const color = pct >= 80 ? LOW : pct >= 50 ? HIGH : DANGER;
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: color, boxShadow: `0 0 4px ${color}55` }} />
    </div>
  );
}

function KpiCard({ kpi }) {
  const pct = kpi.target > 0 ? Math.round((kpi.actual / kpi.target) * 100) : 0;
  const { color, bg } = STATUS_META[kpi.status] || { color: MUTED, bg: "rgba(100,116,139,0.1)" };
  const delta = kpi.delta ?? 0;
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>{kpi.pillar}</p>
          <p className="text-sm font-bold text-white mt-0.5">{kpi.kpi_name || kpi.name}</p>
        </div>
        <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0" style={{ color, background: bg }}>{kpi.status}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black font-mono" style={{ color }}>
          {typeof kpi.actual === "number" && kpi.unit === "%" ? `${kpi.actual}%` : kpi.actual ?? "—"}
        </span>
        <span className="text-xs" style={{ color: MUTED }}>/ {kpi.target}{kpi.unit || ""}</span>
      </div>
      <ProgressBar pct={pct} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px]" style={{ color: delta > 0 ? LOW : delta < 0 ? DANGER : MUTED }}>
          {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {delta !== 0 ? `${delta > 0 ? "+" : ""}${delta}` : "—"} {kpi.trend_label}
        </div>
        {kpi.gap != null && <span className="text-[10px]" style={{ color: MUTED }}>Gap: <span className="font-bold" style={{ color: DANGER }}>{kpi.gap}</span></span>}
      </div>
    </Card>
  );
}

function OkrCard({ obj, index }) {
  const pct = obj.overall_progress ?? 0;
  const color = pct >= 80 ? LOW : pct >= 50 ? HIGH : DANGER;
  return (
    <Card className="p-5 space-y-4">
      <div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ color: CYAN, background: `${CYAN}15` }}>{obj.quarter || `Q${index + 3} 2026`}</span>
        <p className="text-sm font-bold text-white mt-2">{obj.objective}</p>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span style={{ color: MUTED }}>Overall Progress</span>
          <span className="font-black font-mono" style={{ color }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} />
      </div>
      <div className="space-y-3">
        {(obj.key_results || []).map((kr, i) => {
          const krPct = kr.target > 0 ? Math.round((kr.actual / kr.target) * 100) : kr.progress ?? 0;
          const { color: sc } = STATUS_META[kr.status] || { color: MUTED };
          return (
            <div key={i} className="space-y-1">
              <p className="text-[10px] text-white">{kr.description}</p>
              <div className="flex items-center gap-2">
                <ProgressBar pct={krPct} />
                <span className="text-[10px] font-mono flex-shrink-0" style={{ color: sc }}>{kr.actual}/{kr.target}</span>
                {kr.status && <span className="text-[8px] font-black px-1.5 py-0.5 rounded flex-shrink-0" style={{ color: sc, background: `${sc}15` }}>{kr.status}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function GDSScorecardPage() {
  const [scorecard, setScorecard] = useState(null);
  const [okrData, setOkrData] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("kpis");
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.functions.invoke("gdsSecurityScorecard", { action: "scorecard" }),
      base44.functions.invoke("gdsSecurityScorecard", { action: "okr_status" }),
      base44.functions.invoke("gdsSecurityScorecard", { action: "history" }),
    ]).then(([sc, okr, hist]) => {
      if (sc.data) setScorecard(sc.data);
      if (okr.data) setOkrData(okr.data);
      if (hist.data) setHistory(hist.data);
    }).catch(e => console.error(e)).finally(() => setLoading(false));
  }, []);

  // Chart.js history chart
  useEffect(() => {
    if (!history || tab !== "history" || !chartRef.current) return;
    const loadChart = async () => {
      if (!window.Chart) {
        await new Promise(resolve => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js";
          s.onload = resolve;
          document.head.appendChild(s);
        });
      }
      if (chartInstance.current) chartInstance.current.destroy();
      const labels = (history.entries || history).map(e => e.date || e.period);
      const datasets = [
        { label: "Overall", data: (history.entries || history).map(e => e.overall_score ?? e.score), borderColor: CYAN, backgroundColor: `${CYAN}15`, tension: 0.4, fill: true },
        { label: "Code",    data: (history.entries || history).map(e => e.code    ?? null), borderColor: "#8b5cf6", backgroundColor: "transparent", tension: 0.4 },
        { label: "Cloud",   data: (history.entries || history).map(e => e.cloud   ?? null), borderColor: "#0ea5e9", backgroundColor: "transparent", tension: 0.4 },
        { label: "Runtime", data: (history.entries || history).map(e => e.runtime ?? null), borderColor: LOW,      backgroundColor: "transparent", tension: 0.4 },
        { label: "Attack",  data: (history.entries || history).map(e => e.attack  ?? null), borderColor: DANGER,   backgroundColor: "transparent", tension: 0.4 },
        { label: "Identity",data: (history.entries || history).map(e => e.identity?? null), borderColor: HIGH,     backgroundColor: "transparent", tension: 0.4 },
      ].filter(d => d.data.some(v => v != null));
      chartInstance.current = new window.Chart(chartRef.current, {
        type: "line",
        data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: MUTED, boxWidth: 10, font: { size: 10 } } } },
          scales: { x: { ticks: { color: MUTED, font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } }, y: { min: 0, max: 100, ticks: { color: MUTED, font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } } },
        },
      });
    };
    loadChart();
    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
  }, [history, tab]);

  const kpis = scorecard?.kpis || [];
  const topGaps = scorecard?.top_gaps || [];
  const achieved = kpis.filter(k => k.status === "ACHIEVED").length;
  const onTrack = kpis.filter(k => k.status === "ON_TRACK").length;
  const atRisk = kpis.filter(k => k.status === "AT_RISK" || k.status === "OFF_TRACK").length;
  const objectives = okrData?.objectives || [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Security Scorecard" }]} />
      <h1 className="text-2xl font-black text-white">Security KPI Scorecard</h1>

      {/* Summary tiles */}
      {loading ? <Skeleton lines={2} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Overall Score",   value: scorecard?.overall_score ?? "—",  color: CYAN   },
            { label: "KPIs Achieved",   value: achieved,                          color: LOW    },
            { label: "KPIs On Track",   value: onTrack,                           color: CYAN   },
            { label: "KPIs At Risk",    value: atRisk,                            color: DANGER },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-5 text-center" style={{ border: `1px solid ${color}25` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
              <p className="text-3xl font-black font-mono" style={{ color }}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {[["kpis","KPI Grid"],["gaps","Top Gaps"],["okr","OKR Status"],["history","Score History"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: tab === key ? `${CYAN}15` : "transparent", border: `1px solid ${tab === key ? CYAN + "40" : BORDER}`, color: tab === key ? CYAN : MUTED }}>
            {label}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      {tab === "kpis" && (
        loading ? <Skeleton lines={4} /> : kpis.length === 0
          ? <p className="text-xs" style={{ color: MUTED }}>No KPI data available.</p>
          : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kpis.map((k, i) => <KpiCard key={i} kpi={k} />)}
            </div>
      )}

      {/* Top Gaps */}
      {tab === "gaps" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">Top Gaps to Close</h3></div>
          {topGaps.length === 0
            ? <div className="p-8 text-center text-xs" style={{ color: MUTED }}>No gap data available.</div>
            : (
              <div className="divide-y" style={{ borderColor: BORDER + "30" }}>
                {topGaps.map((g, i) => (
                  <div key={i} className="p-4 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-bold text-white">{g.gap || g.kpi_name}</p>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span style={{ color: MUTED }}>Actual: <span className="font-black text-white">{g.actual}</span></span>
                        <span style={{ color: MUTED }}>Target: <span className="font-black text-white">{g.target}</span></span>
                      </div>
                    </div>
                    {g.recommended_action && (
                      <p className="text-[10px]" style={{ color: MUTED }}>→ {g.recommended_action}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
        </Card>
      )}

      {/* OKR Status */}
      {tab === "okr" && (
        loading ? <Skeleton lines={4} /> : objectives.length === 0
          ? <p className="text-xs" style={{ color: MUTED }}>No OKR data available.</p>
          : <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {objectives.map((obj, i) => <OkrCard key={i} obj={obj} index={i} />)}
            </div>
      )}

      {/* Score History */}
      {tab === "history" && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Score History</h3>
          <div style={{ height: 320 }}>
            <canvas ref={chartRef} />
          </div>
        </Card>
      )}
    </div>
  );
}