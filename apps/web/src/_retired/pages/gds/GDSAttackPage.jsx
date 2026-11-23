import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, Zap, Globe, Radio, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SEV_COLOR, SevBadge, StatusBadge, Skeleton, EmptyState,
  Card, KpiCard, SearchFilter, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";
import AnimatedChartTooltip, { TrendTooltip } from "@/components/gds/AnimatedChartTooltip";

// Build 30-day daily new findings trend from real data
function buildDailyTrend(findings) {
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end   = new Date(d); end.setHours(23, 59, 59, 999);
    const slice = findings.filter(f => {
      const t = new Date(f.created_date || f.detected_at || 0).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    days.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      critical: slice.filter(f => (f.severity || f.normalized_severity) === "critical").length,
      high:     slice.filter(f => (f.severity || f.normalized_severity) === "high").length,
      medium:   slice.filter(f => (f.severity || f.normalized_severity) === "medium").length,
      low:      slice.filter(f => (f.severity || f.normalized_severity) === "low").length,
      total:    slice.length,
    });
  }
  return days;
}

export default function GDSAttackPage() {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [dastSevFilter, setDastSevFilter] = useState("all");
  const [showChart, setShowChart] = useState(false);

  useEffect(() => { const t = setTimeout(() => setShowChart(true), 400); return () => clearTimeout(t); }, []);

  const { data: surfaces = [], isLoading: loadS } = useQuery({
    queryKey: ["gds-attack-surface"], queryFn: () => base44.entities.AttackSurface.list().catch(() => []),
  });
  const { data: dastScans = [], isLoading: loadD } = useQuery({
    queryKey: ["gds-dast-scans"], queryFn: () => base44.entities.DASTScan.list("-created_date", 50).catch(() => []),
  });
  const { data: dastFindings = [], isLoading: loadDF } = useQuery({
    queryKey: ["gds-dast-findings"], queryFn: () => base44.entities.DASTFinding.list("-detected_at", 300).catch(() => []),
  });

  const filteredSurfaces = surfaces.filter(s => {
    const matchSearch = !search || s.asset?.toLowerCase().includes(search.toLowerCase()) || s.url?.toLowerCase().includes(search.toLowerCase());
    const matchSev = sevFilter === "all" || s.risk_level === sevFilter;
    return matchSearch && matchSev;
  });

  const filteredDastFindings = dastFindings.filter(f =>
    dastSevFilter === "all" || (f.severity || f.normalized_severity) === dastSevFilter
  );

  const internetFacing = surfaces.filter(s => s.is_internet_facing).length;
  const highRisk = surfaces.filter(s => s.risk_level === "critical" || s.risk_level === "high").length;
  const critDast = dastFindings.filter(f => (f.severity || f.normalized_severity) === "critical").length;

  // Trend data from DAST findings
  const trendData = buildDailyTrend(dastFindings);
  const trendSampled = trendData.filter((_, i) => i % 3 === 0 || i === trendData.length - 1);

  // Exposure score over last 30 days (sum severity-weighted)
  const exposureData = trendData.filter((_, i) => i % 3 === 0 || i === trendData.length - 1).map(d => ({
    date: d.date,
    exposure: d.critical * 10 + d.high * 5 + d.medium * 2 + d.low,
  }));

  // Service frequency for bar chart
  const serviceMap = dastFindings.reduce((acc, f) => { acc[f.endpoint_path || f.target_url || "unknown"] = (acc[f.endpoint_path || f.target_url || "unknown"] || 0) + 1; return acc; }, {});
  const serviceChart = Object.entries(serviceMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name, count]) => ({ name: name.length > 24 ? name.slice(-24) : name, count }));

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div>
        <h1 className="text-2xl font-black text-white">Attack Surface & Vulnerability Assessment</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>External asset discovery, DAST scanning, and 30-day exposure tracking</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Assets Discovered" value={surfaces.length} color={CYAN} icon={Globe} />
        <KpiCard label="Internet-Facing" value={internetFacing} color={HIGH} icon={Radio} />
        <KpiCard label="High Risk Assets" value={highRisk} color={DANGER} icon={Target} pulse />
        <KpiCard label="Critical DAST Findings" value={critDast} color={DANGER} icon={Zap} pulse />
      </div>

      {/* ── 30-Day Vulnerability Trend ─────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
              30-Day Vulnerability Discovery Trend
            </h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>New DAST findings detected per day — hover for animated breakdown</p>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            {[["critical", DANGER], ["high", HIGH], ["medium", MEDIUM], ["low", LOW]].map(([s, c]) => (
              <span key={s} className="flex items-center gap-1">
                <span className="w-2.5 h-1.5 rounded-sm" style={{ background: c }} />
                <span className="capitalize" style={{ color: MUTED }}>{s}</span>
              </span>
            ))}
          </div>
        </div>
        {loadDF ? <Skeleton lines={4} /> : (
          <div style={{ opacity: showChart ? 1 : 0, transition: "opacity 0.6s ease" }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendSampled} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  {[["critical", DANGER], ["high", HIGH], ["medium", MEDIUM], ["low", LOW]].map(([k, c]) => (
                    <linearGradient key={k} id={`atk-grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} allowDecimals={false} />
                <Tooltip content={<TrendTooltip />} />
                {[["critical", DANGER], ["high", HIGH], ["medium", MEDIUM], ["low", LOW]].map(([k, c]) => (
                  <Area key={k} type="monotone" dataKey={k} name={k} stroke={c} strokeWidth={1.5}
                    fill={`url(#atk-grad-${k})`} dot={false}
                    style={{ filter: `drop-shadow(0 0 3px ${c}55)` }} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* ── Exposure Score Trend ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 p-5">
          <h3 className="text-sm font-bold text-white mb-1">30-Day Exposure Score</h3>
          <p className="text-[10px] mb-4" style={{ color: MUTED }}>Weighted risk exposure (critical×10 + high×5 + medium×2 + low×1)</p>
          {loadDF ? <Skeleton lines={3} /> : (
            <div style={{ opacity: showChart ? 1 : 0, transition: "opacity 0.8s ease 0.2s" }}>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={exposureData} margin={{ left: -20, right: 8 }}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CYAN} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CYAN} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                  <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                  <Tooltip content={<AnimatedChartTooltip />} />
                  <Area type="monotone" dataKey="exposure" name="Exposure Score" stroke={CYAN} strokeWidth={2}
                    fill="url(#expGrad)" dot={false}
                    style={{ filter: `drop-shadow(0 0 4px ${CYAN}55)` }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Top Affected Endpoints</h3>
          {loadDF ? <Skeleton lines={4} /> : serviceChart.length === 0
            ? <EmptyState icon={Zap} title="No DAST findings yet" description="Run a scan to see data" />
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={serviceChart} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} width={80} />
                  <Tooltip content={<AnimatedChartTooltip />} />
                  <Bar dataKey="count" name="Findings" fill={CYAN} radius={[0,4,4,0]}>
                    {serviceChart.map((_, i) => {
                      const c = i === 0 ? DANGER : i === 1 ? HIGH : i === 2 ? MEDIUM : CYAN;
                      return <Cell key={i} fill={c} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </Card>
      </div>

      {/* Attack Surface Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-white flex-shrink-0">Attack Surface Assets</h3>
            <SevFilterBar value={sevFilter} onChange={setSevFilter} />
            <SearchFilter value={search} onChange={setSearch} placeholder="Search assets..." className="w-44 ml-auto" />
          </div>
        </div>
        {loadS ? <Skeleton /> : filteredSurfaces.length === 0
          ? <EmptyState icon={Target} title="No attack surface assets detected" description="Run a DAST scan to discover your external footprint" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Risk","Asset","Type","URL/IP","Protocol","Technologies","Internet-Facing","Findings","First Seen"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSurfaces.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3"><SevBadge sev={s.risk_level} /></td>
                      <td className="px-4 py-3 text-xs text-white font-medium truncate max-w-32">{s.asset || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${CYAN}15`, color: CYAN }}>{s.asset_type || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono truncate max-w-xs" style={{ color: MUTED }}>{s.url || s.ip || s.host || "—"}{s.port ? `:${s.port}` : ""}</td>
                      <td className="px-4 py-3 text-xs uppercase" style={{ color: MUTED }}>{s.protocol || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(s.technologies || "").split(",").filter(Boolean).slice(0,3).map((t, j) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>{t.trim()}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.is_internet_facing && <span className="text-[10px] font-bold" style={{ color: DANGER }}>⚡ YES</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: s.finding_count > 0 ? DANGER : MUTED }}>{s.finding_count ?? "—"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{timeAgo(s.first_seen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* DAST Findings Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-white flex-shrink-0 flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: CYAN }} />DAST Findings
            </h3>
            <SevFilterBar value={dastSevFilter} onChange={setDastSevFilter} />
          </div>
        </div>
        {loadDF ? <Skeleton /> : filteredDastFindings.length === 0
          ? <EmptyState icon={Zap} title="No DAST findings" description="Run a dynamic scan to surface vulnerabilities" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Severity","Title","CWE","Endpoint","Status","Detected"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDastFindings.slice(0, 100).map((f, i) => (
                    <tr key={f.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3"><SevBadge sev={f.severity || f.normalized_severity} /></td>
                      <td className="px-4 py-3 text-xs text-white max-w-xs truncate">{f.title || f.vulnerability_type}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{f.cwe_id || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono truncate max-w-xs" style={{ color: MUTED }}>{f.endpoint_path || f.target_url || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{timeAgo(f.detected_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* DAST Scans Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4" style={{ color: CYAN }} />DAST Scan History</h3>
        </div>
        {loadD ? <Skeleton /> : dastScans.length === 0
          ? <EmptyState icon={Zap} title="No DAST scans found" description="Run a dynamic application security test to discover vulnerabilities" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Target URL","Scan Type","Status","Risk Score","Critical","High","Medium","Duration","Completed"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dastScans.map((d, i) => {
                    const statusColor = d.status === "completed" ? LOW : d.status === "running" ? CYAN : d.status === "failed" ? DANGER : MUTED;
                    return (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                        <td className="px-4 py-3 text-xs font-mono text-white truncate max-w-xs">{d.target_url || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${CYAN}15`, color: CYAN }}>{d.scan_type || "dast"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: statusColor }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                            {d.status || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: d.risk_score > 70 ? DANGER : MUTED }}>{d.risk_score ?? "—"}</td>
                        <td className="px-4 py-3 text-xs font-bold" style={{ color: DANGER }}>{d.critical_count ?? "—"}</td>
                        <td className="px-4 py-3 text-xs font-bold" style={{ color: HIGH }}>{d.high_count ?? "—"}</td>
                        <td className="px-4 py-3 text-xs font-bold" style={{ color: MEDIUM }}>{d.medium_count ?? "—"}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{d.duration ? `${d.duration}s` : "—"}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{timeAgo(d.completed_at)}</td>
                      </tr>
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