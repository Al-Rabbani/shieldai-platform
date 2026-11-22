import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Card, Breadcrumb, Skeleton, PAGE_BG
} from "@/components/gds/GDSOSShared";

const SEV_COLS = ["critical","high","medium","low"];

function HeatCell({ cell, maxVal }) {
  const val = cell?.value ?? 0;
  const color = cell?.color || (val === 0 ? "transparent" : val > maxVal * 0.7 ? DANGER : val > maxVal * 0.4 ? HIGH : MEDIUM);
  const [hovered, setHovered] = useState(false);
  return (
    <td className="relative" style={{ padding: "2px" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="rounded-lg flex items-center justify-center cursor-default transition-all"
        style={{ background: val === 0 ? "rgba(255,255,255,0.03)" : `${color}30`, border: `1px solid ${val === 0 ? BORDER : color + "40"}`, minWidth: 56, minHeight: 44, position: "relative" }}>
        <span className="text-sm font-black font-mono" style={{ color: val === 0 ? MUTED : color }}>{val}</span>
        {hovered && val > 0 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap z-10 font-bold"
            style={{ background: "#0a1628", border: `1px solid ${BORDER}`, color: TEXT }}>
            {val} finding{val !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </td>
  );
}

function AssetSeverityTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    base44.functions.invoke("gdsRiskHeatmap", { action: "asset_severity" })
      .then(r => { if (r.data) setData(r.data); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Skeleton lines={4} />;
  if (!data) return <p className="text-xs" style={{ color: MUTED }}>No data</p>;
  const rows = data.y_axis || data.rows || [];
  const cols = data.x_axis || data.cols || SEV_COLS;
  const cells = data.cells || {};
  const hotspot = data.hotspot;
  const maxVal = Math.max(1, ...rows.flatMap(r => cols.map(c => cells[r]?.[c]?.value ?? cells[r]?.[c] ?? 0)));
  const rowTotals = rows.map(r => cols.reduce((s, c) => s + (cells[r]?.[c]?.value ?? cells[r]?.[c] ?? 0), 0));
  const colTotals = cols.map(c => rows.reduce((s, r) => s + (cells[r]?.[c]?.value ?? cells[r]?.[c] ?? 0), 0));
  return (
    <div className="space-y-4">
      {hotspot && (
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}25` }}>
          <span className="text-xs font-black" style={{ color: DANGER }}>🔥 Hotspot:</span>
          <span className="text-xs text-white">{hotspot.asset || hotspot.row} / {hotspot.severity || hotspot.col}</span>
          {hotspot.value && <span className="text-xs font-black font-mono" style={{ color: DANGER }}>{hotspot.value} findings</span>}
        </div>
      )}
      <Card className="overflow-x-auto p-4">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-bold uppercase pr-4 py-2" style={{ color: MUTED }}>Asset Type</th>
              {cols.map(c => <th key={c} className="text-center text-[10px] font-bold uppercase px-1 py-2 capitalize" style={{ color: MUTED }}>{c}</th>)}
              <th className="text-center text-[10px] font-bold uppercase px-2 py-2" style={{ color: MUTED }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row}>
                <td className="text-xs font-semibold text-white pr-4 py-1 whitespace-nowrap">{row}</td>
                {cols.map(col => {
                  const raw = cells[row]?.[col];
                  const cell = typeof raw === "object" ? raw : { value: raw ?? 0 };
                  return <HeatCell key={col} cell={cell} maxVal={maxVal} />;
                })}
                <td className="text-center text-xs font-black font-mono px-2" style={{ color: CYAN }}>{rowTotals[ri]}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `1px solid ${BORDER}` }}>
              <td className="text-[10px] font-black uppercase py-2 pr-4" style={{ color: MUTED }}>Total</td>
              {colTotals.map((t, i) => <td key={i} className="text-center text-xs font-black font-mono py-2 px-1" style={{ color: CYAN }}>{t}</td>)}
              <td className="text-center text-xs font-black font-mono py-2 px-2" style={{ color: CYAN }}>{colTotals.reduce((a, b) => a + b, 0)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function TeamRiskTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const chartInst = useRef(null);
  useEffect(() => {
    base44.functions.invoke("gdsRiskHeatmap", { action: "team_risk" })
      .then(r => { if (r.data) setData(r.data); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!data || !chartRef.current) return;
    const load = async () => {
      if (!window.Chart) { await new Promise(res => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"; s.onload = res; document.head.appendChild(s); }); }
      if (chartInst.current) chartInst.current.destroy();
      const teams = (data.teams || []).map(t => t.team || t.name);
      chartInst.current = new window.Chart(chartRef.current, {
        type: "bar",
        data: {
          labels: teams,
          datasets: [
            { label: "Critical", data: (data.teams||[]).map(t=>t.critical||0), backgroundColor: `${DANGER}80`, stack: "s" },
            { label: "High",     data: (data.teams||[]).map(t=>t.high||0),     backgroundColor: `${HIGH}80`,   stack: "s" },
            { label: "Medium",   data: (data.teams||[]).map(t=>t.medium||0),   backgroundColor: `${MEDIUM}80`, stack: "s" },
            { label: "Low",      data: (data.teams||[]).map(t=>t.low||0),      backgroundColor: `${LOW}80`,    stack: "s" },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: MUTED, boxWidth: 10, font: { size: 10 } } } }, scales: { x: { stacked: true, ticks: { color: MUTED } }, y: { stacked: true, ticks: { color: MUTED }, grid: { color: "rgba(255,255,255,0.04)" } } } },
      });
    };
    load();
    return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
  }, [data]);
  if (loading) return <Skeleton lines={4} />;
  if (!data) return <p className="text-xs" style={{ color: MUTED }}>No data</p>;
  return (
    <div className="space-y-4">
      <Card className="p-5"><div style={{ height: 280 }}><canvas ref={chartRef} /></div></Card>
      <Card className="overflow-x-auto">
        <table className="w-full">
          <thead><tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
            {["Team","Critical","High","Medium","Low","Risk Score","SLA Breach","KEV"].map(h => <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {(data.teams || []).map((t, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i%2===0?CARD:"#050e1f" }}>
                <td className="px-4 py-2.5 text-xs font-bold text-white">{t.team||t.name}</td>
                <td className="px-4 py-2.5 text-xs font-mono font-black" style={{ color: DANGER }}>{t.critical??0}</td>
                <td className="px-4 py-2.5 text-xs font-mono font-black" style={{ color: HIGH   }}>{t.high??0}</td>
                <td className="px-4 py-2.5 text-xs font-mono" style={{ color: MEDIUM  }}>{t.medium??0}</td>
                <td className="px-4 py-2.5 text-xs font-mono" style={{ color: LOW     }}>{t.low??0}</td>
                <td className="px-4 py-2.5 text-xs font-mono font-black" style={{ color: CYAN   }}>{t.risk_score??0}</td>
                <td className="px-4 py-2.5 text-xs font-mono" style={{ color: t.sla_breached>0?DANGER:MUTED }}>{t.sla_breached??0}</td>
                <td className="px-4 py-2.5 text-xs font-mono" style={{ color: t.kev>0?DANGER:MUTED }}>{t.kev??0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PillarRadarTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const chartInst = useRef(null);
  useEffect(() => {
    base44.functions.invoke("gdsRiskHeatmap", { action: "pillar_matrix" })
      .then(r => { if (r.data) setData(r.data); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!data || !chartRef.current) return;
    const load = async () => {
      if (!window.Chart) { await new Promise(res => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"; s.onload = res; document.head.appendChild(s); }); }
      if (chartInst.current) chartInst.current.destroy();
      const labels = (data.pillars||[]).map(p=>p.pillar||p.name);
      chartInst.current = new window.Chart(chartRef.current, {
        type: "radar",
        data: {
          labels,
          datasets: [
            { label: "Current",  data: (data.pillars||[]).map(p=>p.score??0),    borderColor: CYAN,  backgroundColor: `${CYAN}15`,    pointBackgroundColor: CYAN },
            { label: "Previous", data: (data.pillars||[]).map(p=>p.previous??0), borderColor: MUTED, backgroundColor: `${MUTED}10`,   pointBackgroundColor: MUTED, borderDash: [5,3] },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: MUTED } } }, scales: { r: { min: 0, max: 100, ticks: { color: MUTED, font: { size: 9 }, stepSize: 20 }, grid: { color: "rgba(255,255,255,0.08)" }, pointLabels: { color: MUTED, font: { size: 10 } }, angleLines: { color: "rgba(255,255,255,0.06)" } } } },
      });
    };
    load();
    return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
  }, [data]);
  if (loading) return <Skeleton lines={4} />;
  if (!data) return <p className="text-xs" style={{ color: MUTED }}>No data</p>;
  const weakest  = [...(data.pillars||[])].sort((a,b)=>(a.score??0)-(b.score??0))[0];
  const strongest = [...(data.pillars||[])].sort((a,b)=>(b.score??0)-(a.score??0))[0];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        {weakest  && <div className="px-4 py-2 rounded-xl" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}25` }}><span className="text-[10px]" style={{ color: MUTED }}>Weakest: </span><span className="text-xs font-black" style={{ color: DANGER }}>{weakest.pillar||weakest.name} ({weakest.score})</span></div>}
        {strongest && <div className="px-4 py-2 rounded-xl" style={{ background: `${LOW}10`, border: `1px solid ${LOW}25` }}><span className="text-[10px]" style={{ color: MUTED }}>Strongest: </span><span className="text-xs font-black" style={{ color: LOW }}>{strongest.pillar||strongest.name} ({strongest.score})</span></div>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5"><div style={{ height: 300 }}><canvas ref={chartRef} /></div></Card>
        <Card className="overflow-x-auto p-4">
          <table className="w-full">
            <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>{["Pillar","Score","Delta","Status"].map(h=><th key={h} className="text-left text-[10px] font-bold uppercase py-2 pr-3" style={{ color: MUTED }}>{h}</th>)}</tr></thead>
            <tbody>
              {(data.pillars||[]).map((p,i)=>{
                const delta = (p.score??0)-(p.previous??0);
                const color = (p.score??0)>=70?LOW:(p.score??0)>=40?HIGH:DANGER;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="text-xs font-semibold text-white py-2 pr-3">{p.pillar||p.name}</td>
                    <td className="text-xs font-black font-mono py-2 pr-3" style={{ color }}>{p.score??0}</td>
                    <td className="text-xs font-bold py-2 pr-3" style={{ color: delta>0?LOW:delta<0?DANGER:MUTED }}>{delta>0?"+":""}{delta}</td>
                    <td className="py-2"><SevBadge sev={p.rag||((p.score??0)>=70?"low":(p.score??0)>=40?"medium":"critical")} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function TimeSeriesTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const chartInst = useRef(null);
  const load = async (d) => {
    setLoading(true);
    try { const r = await base44.functions.invoke("gdsRiskHeatmap", { action: "time_series", days: d }); if (r.data) setData(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(days); }, [days]);
  useEffect(() => {
    if (!data || !chartRef.current) return;
    const go = async () => {
      if (!window.Chart) { await new Promise(res => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"; s.onload = res; document.head.appendChild(s); }); }
      if (chartInst.current) chartInst.current.destroy();
      const entries = data.entries || data || [];
      chartInst.current = new window.Chart(chartRef.current, {
        type: "line",
        data: {
          labels: entries.map(e=>e.date),
          datasets: [
            { label: "New Findings", data: entries.map(e=>e.new_findings??0), borderColor: HIGH, backgroundColor: `${HIGH}15`, fill: true, tension: 0.4 },
            { label: "Critical",     data: entries.map(e=>e.critical??0),     borderColor: DANGER, backgroundColor: "transparent", tension: 0.4 },
            { label: "AI Actions",   data: entries.map(e=>e.ai_actions??0),   borderColor: CYAN,  backgroundColor: "transparent", tension: 0.4, borderDash: [4,2] },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: MUTED, boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { color: MUTED, maxTicksLimit: 10 }, grid: { color: "rgba(255,255,255,0.04)" } }, y: { ticks: { color: MUTED }, grid: { color: "rgba(255,255,255,0.04)" } } } },
      });
    };
    go();
    return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
  }, [data]);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {[7,14,30,90].map(d=>(
          <button key={d} onClick={()=>setDays(d)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: days===d?`${CYAN}15`:"transparent", border:`1px solid ${days===d?CYAN+"40":BORDER}`, color: days===d?CYAN:MUTED }}>
            {d}d
          </button>
        ))}
        {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: MUTED }} />}
      </div>
      <Card className="p-5"><div style={{ height: 320 }}><canvas ref={chartRef} /></div></Card>
    </div>
  );
}

export default function GDSHeatmapPage() {
  const [tab, setTab] = useState("asset");
  const TABS = [
    { key: "asset",  label: "Asset × Severity"  },
    { key: "team",   label: "Team Risk"          },
    { key: "radar",  label: "Pillar Radar"       },
    { key: "time",   label: "Time Series"        },
  ];
  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Risk Heatmap" }]} />
      <h1 className="text-2xl font-black text-white">Multi-Dimensional Risk Heatmap</h1>
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: tab===t.key?`${CYAN}15`:"transparent", border:`1px solid ${tab===t.key?CYAN+"40":BORDER}`, color: tab===t.key?CYAN:MUTED }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "asset" && <AssetSeverityTab />}
      {tab === "team"  && <TeamRiskTab />}
      {tab === "radar" && <PillarRadarTab />}
      {tab === "time"  && <TimeSeriesTab />}
    </div>
  );
}