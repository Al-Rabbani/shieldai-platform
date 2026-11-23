import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Database, Search } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, Skeleton, EmptyState, Card, Breadcrumb, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const SEV_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };
const TABS = ["Timeline", "Heatmap", "Query"];

export default function GDSDataLakePage() {
  const [agg, setAgg] = useState(null);
  const [aggLoading, setAggLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Timeline");

  // Timeline
  const [timeline, setTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Heatmap
  const [heatmap, setHeatmap] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  // Query
  const [querySev, setQuerySev] = useState("all");
  const [querySearch, setQuerySearch] = useState("");
  const [queryResults, setQueryResults] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const loadAgg = async () => {
    setAggLoading(true);
    try {
      const r = await base44.functions.invoke("gdsSecurityDataLake", { action: "aggregate" });
      if (r.data) setAgg(r.data);
    } catch (e) { console.error(e); }
    finally { setAggLoading(false); }
  };

  const loadTimeline = async () => {
    setTimelineLoading(true);
    try {
      const r = await base44.functions.invoke("gdsSecurityDataLake", { action: "timeline", days: 30 });
      if (r.data) setTimeline(r.data);
    } catch (e) { console.error(e); }
    finally { setTimelineLoading(false); }
  };

  const loadHeatmap = async () => {
    setHeatmapLoading(true);
    try {
      const r = await base44.functions.invoke("gdsSecurityDataLake", { action: "heatmap" });
      if (r.data) setHeatmap(r.data);
    } catch (e) { console.error(e); }
    finally { setHeatmapLoading(false); }
  };

  const runQuery = async () => {
    setQueryLoading(true); setQueryResults(null);
    try {
      const r = await base44.functions.invoke("gdsSecurityDataLake", {
        action: "query",
        severity: querySev === "all" ? undefined : querySev,
        search: querySearch || undefined,
      });
      if (r.data) setQueryResults(r.data);
    } catch (e) { console.error(e); }
    finally { setQueryLoading(false); }
  };

  useEffect(() => { loadAgg(); }, []);

  useEffect(() => {
    if (activeTab === "Timeline" && !timeline) loadTimeline();
    if (activeTab === "Heatmap" && !heatmap) loadHeatmap();
  }, [activeTab]);

  const sevDist = agg?.by_severity ? Object.entries(agg.by_severity).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: SEV_COLORS[name] || MUTED,
  })) : [];

  const pillarDist = agg?.by_pillar ? Object.entries(agg.by_pillar)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value) : [];

  const hotspots = agg?.hotspots || agg?.top_findings || [];
  const timelineData = timeline?.data || timeline?.timeline || [];
  const heatmapData = heatmap?.matrix || heatmap?.data || {};
  const assetTypes = heatmap?.asset_types || Object.keys(heatmapData);
  const severities = ["critical", "high", "medium", "low"];

  // Heatmap cell intensity
  const maxCell = Math.max(1, ...assetTypes.flatMap(at => severities.map(s => heatmapData[at]?.[s] ?? 0)));
  const cellColor = (count) => {
    if (count === 0) return "transparent";
    const intensity = count / maxCell;
    if (intensity > 0.75) return DANGER;
    if (intensity > 0.5)  return HIGH;
    if (intensity > 0.25) return MEDIUM;
    return `${DANGER}40`;
  };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Security Data Lake" }]} />
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Security Data Lake</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Aggregated intelligence across all GDS OS pillars</p>
        </div>
        <button onClick={loadAgg} disabled={aggLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${aggLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {aggLoading && !agg ? <Skeleton lines={4} /> : !agg ? (
        <EmptyState icon={Database} title="No data" description="Data lake aggregation will appear here" />
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Entities Queried",    value: agg.total_entities_queried ?? "—",    color: CYAN   },
              { label: "Open Findings",        value: agg.total_open_findings ?? "—",       color: DANGER },
              { label: "Compliance Frameworks",value: agg.compliance_frameworks ?? "—",    color: MEDIUM },
              { label: "AI Actions (24h)",     value: agg.ai_agent_actions_24h ?? "—",      color: LOW    },
            ].map(({ label, value, color }) => (
              <Card key={label} className="p-4 text-center" style={{ border: `1px solid ${color}20` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
                <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Severity Donut */}
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3">By Severity</h3>
              {sevDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={sevDist} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      dataKey="value" paddingAngle={3}>
                      {sevDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: "#e2e8f0" }}
                    />
                    <Legend iconType="circle" iconSize={8}
                      formatter={(value) => <span style={{ color: MUTED, fontSize: 11 }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-center py-8" style={{ color: MUTED }}>No severity data</p>}
            </Card>

            {/* Pillar Bar Chart */}
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3">By Pillar</h3>
              {pillarDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={pillarDist} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} width={80} />
                    <Tooltip
                      contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: "#e2e8f0" }}
                    />
                    <Bar dataKey="value" fill={CYAN} radius={[0, 4, 4, 0]} maxBarSize={16} fillOpacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-center py-8" style={{ color: MUTED }}>No pillar data</p>}
            </Card>
          </div>

          {/* Hotspots Table */}
          {hotspots.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                <h3 className="font-bold text-white">Hotspots ({hotspots.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Title", "Pillar", "Severity", "Asset", "CVE"].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hotspots.slice(0, 20).map((h, i) => (
                      <tr key={h.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                        <td className="px-4 py-2 text-xs text-white max-w-[200px] truncate">{h.title}</td>
                        <td className="px-4 py-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: CYAN, background: `${CYAN}12` }}>{h.pillar || "—"}</span>
                        </td>
                        <td className="px-4 py-2"><SevBadge sev={h.severity} /></td>
                        <td className="px-4 py-2 text-[10px] font-mono truncate max-w-[120px]" style={{ color: MUTED }}>{h.asset || "—"}</td>
                        <td className="px-4 py-2 text-[10px] font-mono" style={{ color: HIGH }}>{h.cve_id || h.cve || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Tabs */}
          <Card className="overflow-hidden">
            <div className="flex border-b" style={{ borderColor: BORDER }}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="px-5 py-3 text-sm font-bold transition-all"
                  style={{
                    color: activeTab === tab ? CYAN : MUTED,
                    borderBottom: activeTab === tab ? `2px solid ${CYAN}` : "2px solid transparent",
                    background: "transparent",
                  }}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-5">
              {/* Timeline Tab */}
              {activeTab === "Timeline" && (
                timelineLoading ? <Skeleton lines={3} /> : timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={timelineData} margin={{ left: -10, right: 8, top: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                      <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} />
                      <Legend iconSize={8} formatter={v => <span style={{ color: MUTED, fontSize: 10 }}>{v}</span>} />
                      <Line type="monotone" dataKey="new_findings" name="New Findings" stroke={DANGER} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="ai_actions" name="AI Actions" stroke={CYAN} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-8 text-center">
                    <button onClick={loadTimeline} disabled={timelineLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold mx-auto transition-all hover:opacity-80"
                      style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
                      <RefreshCw className="w-4 h-4" /> Load Timeline
                    </button>
                  </div>
                )
              )}

              {/* Heatmap Tab */}
              {activeTab === "Heatmap" && (
                heatmapLoading ? <Skeleton lines={4} /> : assetTypes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left" style={{ color: MUTED }}>Asset Type</th>
                          {severities.map(s => (
                            <th key={s} className="px-3 py-2 text-center capitalize" style={{ color: SEV_COLORS[s] }}>{s}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {assetTypes.map(at => (
                          <tr key={at} style={{ borderTop: `1px solid ${BORDER}20` }}>
                            <td className="px-3 py-2 font-mono" style={{ color: MUTED }}>{at}</td>
                            {severities.map(s => {
                              const count = heatmapData[at]?.[s] ?? 0;
                              const bg = cellColor(count);
                              return (
                                <td key={s} className="px-3 py-2 text-center font-black font-mono rounded"
                                  style={{ color: count > 0 ? "#fff" : MUTED, background: bg }}>
                                  {count > 0 ? count : "·"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <button onClick={loadHeatmap} disabled={heatmapLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold mx-auto transition-all hover:opacity-80"
                      style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
                      <RefreshCw className="w-4 h-4" /> Load Heatmap
                    </button>
                  </div>
                )
              )}

              {/* Query Tab */}
              {activeTab === "Query" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <select value={querySev} onChange={e => setQuerySev(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: MUTED }}>
                      <option value="all">All Severities</option>
                      {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="relative flex-1 min-w-[160px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
                      <input value={querySearch} onChange={e => setQuerySearch(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && runQuery()}
                        placeholder="Search findings…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none"
                        style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
                    </div>
                    <button onClick={runQuery} disabled={queryLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
                      style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                      {queryLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      {queryLoading ? "Querying…" : "Query"}
                    </button>
                  </div>
                  {queryResults && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                            {["Title", "Pillar", "Severity", "Asset", "Timestamp"].map(h => (
                              <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(queryResults.results || queryResults.findings || []).slice(0, 50).map((r, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                              <td className="px-4 py-2 text-xs text-white max-w-[200px] truncate">{r.title}</td>
                              <td className="px-4 py-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: CYAN, background: `${CYAN}12` }}>{r.pillar || "—"}</span>
                              </td>
                              <td className="px-4 py-2"><SevBadge sev={r.severity} /></td>
                              <td className="px-4 py-2 text-[10px] font-mono truncate" style={{ color: MUTED }}>{r.asset || "—"}</td>
                              <td className="px-4 py-2 text-[10px]" style={{ color: MUTED }}>{timeAgo(r.created_date || r.detected_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}