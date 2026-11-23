import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, BarChart, Bar, Cell
} from "recharts";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, KpiCard, PAGE_BG, TOOLTIP_STYLE
} from "@/components/gds/GDSOSShared";

const TREND_COLOR = { IMPROVING: LOW, STABLE: MEDIUM, DEGRADING: DANGER };
const TREND_ICON = { IMPROVING: TrendingUp, STABLE: Minus, DEGRADING: TrendingDown };
const RISK_COLOR = { HIGH: DANGER, MEDIUM: MEDIUM, LOW: LOW };

function TrendBadge({ trend }) {
  const color = TREND_COLOR[trend] || MUTED;
  const Icon = TREND_ICON[trend] || Minus;
  return (
    <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      <Icon className="w-3 h-3" />{trend}
    </span>
  );
}

function MLAnomalySection() {
  const [activeTab, setActiveTab] = useState("detect");
  const [burstData, setBurstData] = useState(null);
  const [authData, setAuthData] = useState(null);
  const [tabLoading, setTabLoading] = useState({});

  const { data: detectData, isLoading } = useQuery({
    queryKey: ["gds-ml-anomaly-detect"],
    queryFn: () => base44.functions.invoke("gdsMLAnomalyEngine", { action: "detect" }).then(r => r.data),
  });

  const loadTab = async (tab) => {
    const actionMap = { burst: "finding_burst", auth: "auth_anomaly" };
    const act = actionMap[tab];
    if (!act) return;
    setTabLoading(p => ({ ...p, [tab]: true }));
    try {
      const res = await base44.functions.invoke("gdsMLAnomalyEngine", { action: act });
      if (tab === "burst") setBurstData(res.data);
      if (tab === "auth") setAuthData(res.data);
    } catch (e) { console.error(e); }
    finally { setTabLoading(p => ({ ...p, [tab]: false })); }
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    if (tab === "burst" && !burstData) loadTab("burst");
    if (tab === "auth" && !authData) loadTab("auth");
  };

  const d = detectData || {};

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-white">ML Anomaly Engine</h2>

      {/* All-clear banner */}
      {!isLoading && (
        <div className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: d.all_clear ? `${LOW}08` : `${DANGER}08`, border: `1px solid ${d.all_clear ? LOW : DANGER}30` }}>
          {d.all_clear
            ? <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: LOW }} />
            : <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: DANGER }} />}
          <div>
            <p className="text-sm font-black" style={{ color: d.all_clear ? LOW : DANGER }}>
              {d.all_clear ? "✅ No Anomalies Detected" : `🚨 ${d.anomalies_count} Anomalies Detected`}
            </p>
            {d.data_analyzed && (
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                Analyzed: {d.data_analyzed.score_history} score history · {d.data_analyzed.audit_events} audit events · {d.data_analyzed.open_findings} open findings · {d.data_analyzed.notifications} notifications
              </p>
            )}
          </div>
        </div>
      )}

      {/* Anomaly cards */}
      {d.anomalies?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {d.anomalies.map((a, i) => (
            <Card key={i} className="p-4" style={{ borderLeft: `3px solid ${DANGER}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: CYAN, background: `${CYAN}15` }}>{a.type}</span>
                <SevBadge sev={a.severity} />
              </div>
              <p className="text-xs text-white">{a.description}</p>
              <p className="text-[10px] mt-2" style={{ color: MUTED }}>{a.detected_at ? new Date(a.detected_at).toLocaleString() : "—"}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex border-b" style={{ borderColor: BORDER }}>
        {[["detect", "Detection Summary"], ["burst", "Finding Burst"], ["auth", "Auth Anomalies"]].map(([id, label]) => (
          <button key={id} onClick={() => handleTab(id)}
            className="px-5 py-2.5 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "detect" && isLoading && <Skeleton lines={3} />}
      {activeTab === "detect" && !isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Score History", value: d.data_analyzed?.score_history ?? 0, color: CYAN },
            { label: "Audit Events", value: d.data_analyzed?.audit_events ?? 0, color: CYAN },
            { label: "Open Findings", value: d.data_analyzed?.open_findings ?? 0, color: HIGH },
            { label: "Notifications", value: d.data_analyzed?.notifications ?? 0, color: MEDIUM },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
              <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "burst" && (
        tabLoading.burst ? <Skeleton lines={3} /> : !burstData ? <div /> : (
          <Card className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-[10px]" style={{ color: MUTED }}>Daily Mean</p>
                <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{burstData.mean}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px]" style={{ color: MUTED }}>Std Dev</p>
                <p className="text-xl font-black font-mono" style={{ color: MEDIUM }}>{burstData.std}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px]" style={{ color: MUTED }}>Burst Days</p>
                <p className="text-xl font-black font-mono" style={{ color: burstData.burst_days?.length > 0 ? DANGER : LOW }}>{burstData.burst_days?.length ?? 0}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={burstData.daily_counts || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${BORDER}40`} />
                <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill: MUTED, fontSize: 9 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                {burstData.burst_days?.map(d => <ReferenceLine key={d} x={d} stroke={DANGER} strokeDasharray="3 3" />)}
                <Line type="monotone" dataKey="count" stroke={CYAN} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            {burstData.burst_days?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {burstData.burst_days.map(d => (
                  <span key={d} className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15` }}>{d}</span>
                ))}
              </div>
            )}
          </Card>
        )
      )}

      {activeTab === "auth" && (
        tabLoading.auth ? <Skeleton lines={3} /> : !authData ? <div /> : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 text-center">
                <p className="text-[9px]" style={{ color: MUTED }}>Anomaly Types</p>
                <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{authData.anomaly_types}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-[9px]" style={{ color: MUTED }}>Impossible Travel</p>
                <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{authData.impossible_travel}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-[9px]" style={{ color: MUTED }}>Total Anomalies</p>
                <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{authData.anomalies?.length ?? 0}</p>
              </Card>
            </div>
            {authData.anomalies?.length > 0 && (
              <Card className="overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["User", "Type", "Detail", "Risk"].map(h => (
                        <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {authData.anomalies.map((a, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-4 font-mono text-white">{a.user}</td>
                        <td className="py-2 px-4" style={{ color: CYAN }}>{a.type?.replace(/_/g, " ")}</td>
                        <td className="py-2 px-4 max-w-xs" style={{ color: MUTED }}>{a.detail}</td>
                        <td className="py-2 px-4"><SevBadge sev={a.risk} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default function GDSPostureMLPage() {
  const [baselineData, setBaselineData] = useState(null);
  const [predData, setPredData] = useState(null);
  const [anomalyData, setAnomalyData] = useState(null);

  const { data: trendData, isLoading } = useQuery({
    queryKey: ["gds-posture-ml"],
    queryFn: () => base44.functions.invoke("gdsPostureMLEngine", { action: "trend_analysis" }).then(r => r.data),
  });

  useEffect(() => {
    Promise.all([
      base44.functions.invoke("gdsPostureMLEngine", { action: "predict_degradation" }),
      base44.functions.invoke("gdsPostureMLEngine", { action: "baseline" }),
      base44.functions.invoke("gdsPostureMLEngine", { action: "anomaly_detect" }),
    ]).then(([pred, base, anom]) => {
      setPredData(pred.data);
      setBaselineData(base.data);
      setAnomalyData(anom.data);
    }).catch(() => {});
  }, []);

  const d = trendData || {};
  const history = d.score_history || [];
  const forecast = d.forecast || [];
  const anomalyDates = anomalyData?.anomalies?.map(a => a.date) || [];

  const chartData = [
    ...history.map(p => ({ date: p.date, score: p.score })),
    ...forecast.slice(0, 15).map(p => ({ date: p.date, forecast: p.forecast_score })),
  ];

  const trendColor = TREND_COLOR[d.trend_direction] || MUTED;
  const riskColor = RISK_COLOR[predData?.degradation_risk] || MUTED;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Posture Analytics" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Posture Analytics</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>ML-powered security posture trend analysis, anomaly detection, and degradation prediction</p>
      </div>

      {/* Trend Overview */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-white">Score Trend & 30-Day Forecast</h3>
          <div className="flex items-center gap-3">
            {d.trend_direction && <TrendBadge trend={d.trend_direction} />}
            {d.r_squared != null && <span className="text-[10px] font-mono" style={{ color: MUTED }}>R² = {d.r_squared}</span>}
            {d.slope != null && <span className="text-[10px] font-mono" style={{ color: trendColor }}>slope: {d.slope > 0 ? "+" : ""}{d.slope}/day</span>}
          </div>
        </div>
        {isLoading ? <Skeleton lines={3} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${BORDER}40`} />
              <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} tickFormatter={v => v.slice(5)} interval={6} />
              <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 9 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              {anomalyDates.map(d => <ReferenceLine key={d} x={d} stroke={DANGER} strokeDasharray="2 2" label={{ value: "⚠", fill: DANGER, fontSize: 10 }} />)}
              <Line type="monotone" dataKey="score" stroke={CYAN} dot={false} strokeWidth={2} name="Score" />
              <Line type="monotone" dataKey="forecast" stroke={MEDIUM} dot={false} strokeWidth={2} strokeDasharray="5 3" name="Forecast" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Pillar Trends */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Pillar Trends</h3>
        {isLoading ? <Skeleton lines={3} /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(d.pillar_trends || []).map((p, i) => {
              const tc = TREND_COLOR[p.trend] || MUTED;
              return (
                <Card key={i} className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2 truncate" style={{ color: MUTED }}>{p.pillar}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-black font-mono" style={{ color: tc }}>{p.current}</span>
                    <span className="text-[11px]" style={{ color: p.delta > 0 ? LOW : p.delta < 0 ? DANGER : MUTED }}>
                      {p.delta > 0 ? "▲" : p.delta < 0 ? "▼" : "→"}{Math.abs(p.delta)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${p.current}%`, background: tc }} />
                  </div>
                  <TrendBadge trend={p.trend} />
                  {p.anomalies > 0 && <p className="text-[9px] mt-1" style={{ color: DANGER }}>⚠ {p.anomalies} anomalies</p>}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Anomaly Detection + Baseline Drift */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-3">Anomaly Detection</h3>
          {!anomalyData ? <Skeleton lines={2} /> : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-[9px]" style={{ color: MUTED }}>Mean Score</p>
                  <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{anomalyData.mean}</p>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-[9px]" style={{ color: MUTED }}>Std Dev</p>
                  <p className="text-xl font-black font-mono" style={{ color: MEDIUM }}>{anomalyData.std}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: anomalyData.anomalies_detected > 0 ? `${DANGER}08` : `${LOW}08`, border: `1px solid ${anomalyData.anomalies_detected > 0 ? DANGER : LOW}30` }}>
                <p className="text-xs font-bold" style={{ color: anomalyData.anomalies_detected > 0 ? DANGER : LOW }}>
                  {anomalyData.anomalies_detected > 0 ? `⚠ ${anomalyData.anomalies_detected} anomalies detected (>2σ)` : "✓ No anomalies beyond 2σ"}
                </p>
              </div>
              <p className="text-[10px]" style={{ color: MUTED }}>{anomalyData.description}</p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-3">Baseline Drift</h3>
          {!baselineData ? <Skeleton lines={2} /> : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-[9px]" style={{ color: MUTED }}>Baseline</p>
                  <p className="text-xl font-black font-mono" style={{ color: MUTED }}>{baselineData.baseline_score}</p>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-[9px]" style={{ color: MUTED }}>Current</p>
                  <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{baselineData.current_score}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black font-mono" style={{ color: baselineData.drift > 0 ? LOW : baselineData.drift < 0 ? DANGER : MUTED }}>
                  {baselineData.drift > 0 ? "▲" : baselineData.drift < 0 ? "▼" : "→"} {Math.abs(baselineData.drift)} pts ({baselineData.drift_pct > 0 ? "+" : ""}{baselineData.drift_pct}%)
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase"
                  style={{ color: baselineData.drift_status === "ABOVE" ? LOW : baselineData.drift_status === "BELOW" ? DANGER : MEDIUM, background: "rgba(255,255,255,0.05)" }}>
                  {baselineData.drift_status}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Degradation Prediction */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-white">30-Day Degradation Prediction</h3>
          {predData?.degradation_risk && (
            <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase"
              style={{ color: riskColor, background: `${riskColor}18`, border: `1px solid ${riskColor}40` }}>
              {predData.degradation_risk} RISK
            </span>
          )}
        </div>
        {!predData ? <Skeleton lines={3} /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={predData.forecast || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${BORDER}40`} />
                  <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} tickFormatter={v => v.slice(5)} interval={5} />
                  <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 9 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine y={45} stroke={DANGER} strokeDasharray="4 2" label={{ value: "Risk Zone", fill: DANGER, fontSize: 9 }} />
                  <Line type="monotone" dataKey="forecast_score" stroke={riskColor} dot={false} strokeWidth={2} name="Forecast" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {predData.risk_factors?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Risk Factors</p>
                  {predData.risk_factors.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] mb-1" style={{ color: DANGER }}>
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />{f}
                    </div>
                  ))}
                </div>
              )}
              <div className="p-3 rounded-xl" style={{ background: `${riskColor}08`, border: `1px solid ${riskColor}25` }}>
                <p className="text-[10px]" style={{ color: riskColor }}>{predData.recommendation}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ML Anomaly Engine section */}
      <div className="border-t pt-6" style={{ borderColor: BORDER }}>
        <MLAnomalySection />
      </div>
    </div>
  );
}