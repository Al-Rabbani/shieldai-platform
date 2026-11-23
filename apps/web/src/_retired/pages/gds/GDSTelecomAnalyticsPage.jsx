import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import {
  TelBreadcrumb, TelBadge, TEL_PAGE_BG, BORDER, MUTED, TEXT,
  TEL_BLUE, TEL_CYAN, TEL_RED, TEL_GREEN, TEL_ORANGE, TEL_AMBER, TEL_PURPLE, TEL_CRITICAL,
  OPERATOR_TYPE_COLORS, NODE_TYPE_COLORS, formatSubscribers, formatDataGB, formatCurrencyUSD, timeAgo
} from "@/components/gds/TelecomSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import PredictiveRiskHeatmap from "@/components/gds/PredictiveRiskHeatmap";
import { RadioTower, Globe, AlertTriangle, Activity, TrendingUp, Map, Shield, Zap, Radio } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from "recharts";
import { format } from "date-fns";

// Network node colors by type
const NODE_COLORS = {
  core_router: "#3b82f6",
  bgp_route_reflector: "#8b5cf6",
  "5g_amf": "#06b6d4",
  "5g_upf": "#0ea5e9",
  dns_server: "#10b981",
  sepp: "#f59e0b",
  mec_host: "#ec4899",
  hss: "#6366f1",
  mme: "#14b8a6",
  sgw: "#3b82f6",
  pgw: "#60a5fa",
  pcrf: "#a855f7",
  oss: "#f97316",
  bsc: "#fb923c",
  rnc: "#fbbf24",
  enodeb: "#34d399",
  gnodeb: "#22d3ee",
  v2x_edge: "#c084fc",
  iot_gateway: "#f472b6",
  submarine_cable_station: "#60a5fa",
};

// Threat severity colors
const THREAT_COLORS = {
  carrier_catastrophic: "#dc2626",
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

export default function GDSTelecomAnalyticsPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState(30);
  const [mapView, setMapView] = useState("threats"); // 'threats' | 'traffic' | 'nodes'

  // Fetch data
  const { data: networkNodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ["networkNodes"],
    queryFn: () => base44.entities.NetworkNode.list(),
  });
  const { data: telecomIncidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ["telecomIncidents-analytics"],
    queryFn: () => base44.entities.TelecomIncident.filter({}, "-detected_at", 100),
  });
  const { data: fraudCases = [], isLoading: fraudLoading } = useQuery({
    queryKey: ["fraudCases-analytics"],
    queryFn: () => base44.entities.FraudCase.filter({}, "-detected_at", 200),
  });
  const { data: baseStations = [], isLoading: stationsLoading } = useQuery({
    queryKey: ["baseStations"],
    queryFn: () => base44.entities.BaseStation.filter({}),
  });
  const { data: roamingSessions = [], isLoading: roamingLoading } = useQuery({
    queryKey: ["roamingSessions"],
    queryFn: () => base44.entities.RoamingSession.filter({ status: "active" }),
  });
  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: ["telecomOperators"],
    queryFn: () => base44.entities.TelecomOperator.list(),
  });

  // Calculate fraud trend data (last 30 days)
  const fraudTrendData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = selectedTimeRange - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = format(date, "MMM dd");
      
      const dayFraud = fraudCases?.filter(f => {
        const fDate = new Date(f.detected_at || f.created_at);
        return fDate.toDateString() === date.toDateString();
      }) || [];

      const totalAmount = dayFraud.reduce((sum, f) => sum + (f.amount_usd || 0), 0);
      
      days.push({
        date: dateStr,
        cases: dayFraud.length,
        amount: Math.round(totalAmount),
        sim_swap: dayFraud.filter(f => f.fraud_type === "sim_swap").length,
        ifraud: dayFraud.filter(f => f.fraud_type === "international_fraud").length,
        subscription: dayFraud.filter(f => f.fraud_type === "subscription").length,
      });
    }
    return days;
  }, [fraudCases, selectedTimeRange]);

  // Calculate network traffic by region
  const trafficData = useMemo(() => {
    const regionTraffic = {};
    baseStations?.forEach(bs => {
      const region = bs.location || "Unknown";
      if (!regionTraffic[region]) {
        regionTraffic[region] = { region, throughput: 0, subscribers: 0, stations: 0 };
      }
      regionTraffic[region].throughput += bs.throughput_gbps || 0;
      regionTraffic[region].subscribers += bs.connected_subscribers || 0;
      regionTraffic[region].stations += 1;
    });
    return Object.values(regionTraffic).sort((a, b) => b.throughput - a.throughput).slice(0, 10);
  }, [baseStations]);

  // Threat map data
  const threatMapData = useMemo(() => {
    const threats = [];
    
    // Add incidents as threats
    telecomIncidents?.forEach(inc => {
      if (inc.regions_affected && inc.regions_affected.length > 0) {
        inc.regions_affected.forEach(region => {
          threats.push({
            id: `inc-${inc.id}`,
            type: "incident",
            region,
            severity: inc.severity,
            title: inc.incident_type,
            impact: inc.subscribers_affected,
            financial: inc.financial_impact_usd,
          });
        });
      }
    });

    // Add high-risk roaming sessions
    roamingSessions?.forEach(session => {
      if (session.fraud_score > 70 || session.imsi_catcher_suspected) {
        threats.push({
          id: `roam-${session.id}`,
          type: "roaming_threat",
          region: session.visited_country,
          severity: session.fraud_score > 80 ? "critical" : "high",
          title: session.imsi_catcher_suspected ? "IMSI Catcher" : "Fraudulent Roaming",
          impact: 1,
          financial: 0,
        });
      }
    });

    return threats;
  }, [telecomIncidents, roamingSessions]);

  // Node status summary
  const nodeStats = useMemo(() => {
    const stats = {
      total: networkNodes.length,
      operational: networkNodes.filter(n => n.status === "operational").length,
      degraded: networkNodes.filter(n => n.status === "degraded").length,
      compromised: networkNodes.filter(n => n.status === "compromised").length,
      offline: networkNodes.filter(n => n.status === "offline").length,
      anomaly: networkNodes.filter(n => n.anomaly_detected).length,
    };
    return stats;
  }, [networkNodes]);

  const totalFraudAmount = fraudCases?.reduce((sum, f) => sum + (f.amount_usd || 0), 0) || 0;
  const activeIncidents = telecomIncidents?.filter(i => i.status !== "closed").length || 0;
  const suspiciousRoaming = roamingSessions?.filter(r => r.status === "suspicious" || r.status === "fraudulent").length || 0;

  return (
    <div style={TEL_PAGE_BG}>
      <div className="flex items-center justify-between mb-4">
        <TelBreadcrumb items={[{ label: "Visual Analytics" }]} />
        <LiveDataBadge />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Globe className="w-7 h-7" style={{ color: TEL_CYAN }} />
            Telecom Network Analytics
          </h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>
            Real-time Network Traffic & Fraud Intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMapView("threats")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              mapView === "threats" ? "bg-red-500/20 border-red-400/40 text-red-400" : "bg-white/5 border-white/10 text-slate-400"
            }`}
            style={{ border: `1px solid ${mapView === "threats" ? "#ef444440" : "rgba(255,255,255,0.1)"}` }}
          >
            Threats
          </button>
          <button
            onClick={() => setMapView("traffic")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              mapView === "traffic" ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-400" : "bg-white/5 border-white/10 text-slate-400"
            }`}
            style={{ border: `1px solid ${mapView === "traffic" ? "#22d3ee40" : "rgba(255,255,255,0.1)"}` }}
          >
            Traffic
          </button>
          <button
            onClick={() => setMapView("nodes")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              mapView === "nodes" ? "bg-purple-500/20 border-purple-400/40 text-purple-400" : "bg-white/5 border-white/10 text-slate-400"
            }`}
            style={{ border: `1px solid ${mapView === "nodes" ? "#a855f740" : "rgba(255,255,255,0.1)"}` }}
          >
            Nodes
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card className="p-4" glow>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${TEL_BLUE}15`, border: `1px solid ${TEL_BLUE}30` }}>
              <Shield className="w-5 h-5" style={{ color: TEL_BLUE }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Active Incidents</p>
              <p className="text-2xl font-black" style={{ color: TEL_BLUE }}>{activeIncidents}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" glow>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${TEL_RED}15`, border: `1px solid ${TEL_RED}30` }}>
              <AlertTriangle className="w-5 h-5" style={{ color: TEL_RED }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Fraud Loss (Total)</p>
              <p className="text-xl font-black" style={{ color: TEL_RED }}>{formatCurrencyUSD(totalFraudAmount)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" glow>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${TEL_ORANGE}15`, border: `1px solid ${TEL_ORANGE}30` }}>
              <Radio className="w-5 h-5" style={{ color: TEL_ORANGE }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Suspicious Roaming</p>
              <p className="text-2xl font-black" style={{ color: TEL_ORANGE }}>{suspiciousRoaming}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" glow>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${TEL_GREEN}15`, border: `1px solid ${TEL_GREEN}30` }}>
              <Zap className="w-5 h-5" style={{ color: TEL_GREEN }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Network Nodes</p>
              <p className="text-2xl font-black" style={{ color: TEL_GREEN }}>{nodeStats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" glow>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${TEL_PURPLE}15`, border: `1px solid ${TEL_PURPLE}30` }}>
              <Activity className="w-5 h-5" style={{ color: TEL_PURPLE }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Anomalies Detected</p>
              <p className="text-2xl font-black" style={{ color: TEL_PURPLE }}>{nodeStats.anomaly}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Interactive Network Map */}
        <Card className="p-5 col-span-2" glow>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Map className="w-4 h-4" style={{ color: TEL_CYAN }} />
              Live Network Threat Map
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold" style={{ color: MUTED }}>
                {threatMapData.length} active threats
              </span>
            </div>
          </div>

          {/* Map Visualization */}
          <div className="relative h-96 rounded-xl overflow-hidden" style={{ background: "linear-gradient(180deg, #0a1628 0%, #0f2342 100%)", border: `1px solid ${BORDER}` }}>
            {/* World map placeholder with grid */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `
                linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px"
            }} />

            {/* Threat markers */}
            {threatMapData.map((threat, idx) => {
              const color = THREAT_COLORS[threat.severity] || TEL_ORANGE;
              // Pseudo-random positions based on region hash
              const hash = threat.region.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const left = (hash * 37) % 80 + 10;
              const top = (hash * 53) % 60 + 20;
              
              return (
                <div
                  key={threat.id}
                  className="absolute cursor-pointer transition-transform hover:scale-125"
                  style={{ left: `${left}%`, top: `${top}%` }}
                  title={`${threat.title} - ${threat.region}`}
                >
                  <div
                    className="w-4 h-4 rounded-full animate-pulse"
                    style={{
                      background: color,
                      boxShadow: `0 0 20px ${color}80`,
                      border: "2px solid white"
                    }}
                  />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded text-[8px] font-bold whitespace-nowrap"
                    style={{ background: "#0a1628", color, border: `1px solid ${color}40` }}>
                    {threat.region}
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex gap-3">
              {Object.entries(THREAT_COLORS).map(([sev, color]) => (
                <div key={sev} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-[8px] font-bold" style={{ color: TEXT }}>{sev.replace("_", " ")}</span>
                </div>
              ))}
            </div>

            {threatMapData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm" style={{ color: MUTED }}>No active threats detected</p>
              </div>
            )}
          </div>
        </Card>

        {/* Node Status */}
        <Card className="p-5" glow>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <RadioTower className="w-4 h-4" style={{ color: TEL_PURPLE }} />
              Network Node Health
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: `${TEL_GREEN}08`, border: `1px solid ${TEL_GREEN}20` }}>
              <span className="text-xs font-semibold text-white">Operational</span>
              <span className="text-lg font-black" style={{ color: TEL_GREEN }}>{nodeStats.operational}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: `${TEL_ORANGE}08`, border: `1px solid ${TEL_ORANGE}20` }}>
              <span className="text-xs font-semibold text-white">Degraded</span>
              <span className="text-lg font-black" style={{ color: TEL_ORANGE }}>{nodeStats.degraded}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: `${TEL_RED}08`, border: `1px solid ${TEL_RED}20` }}>
              <span className="text-xs font-semibold text-white">Compromised</span>
              <span className="text-lg font-black" style={{ color: TEL_RED }}>{nodeStats.compromised}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: `${MUTED}08`, border: `1px solid ${MUTED}20` }}>
              <span className="text-xs font-semibold text-white">Offline</span>
              <span className="text-lg font-black" style={{ color: MUTED }}>{nodeStats.offline}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: `${TEL_PURPLE}08`, border: `1px solid ${TEL_PURPLE}20` }}>
              <span className="text-xs font-semibold text-white">Anomalies</span>
              <span className="text-lg font-black" style={{ color: TEL_PURPLE }}>{nodeStats.anomaly}</span>
            </div>
          </div>

          {/* Node Type Distribution */}
          <div className="mt-4">
            <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Node Types</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(
                networkNodes.reduce((acc, node) => {
                  acc[node.node_type] = (acc[node.node_type] || 0) + 1;
                  return acc;
                }, {})
              ).slice(0, 6).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[type] || MUTED }} />
                  <span className="text-[9px] text-white truncate flex-1">{type.replace(/_/g, " ")}</span>
                  <span className="text-[9px] font-bold" style={{ color: MUTED }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Predictive Risk Heatmap */}
      <div className="mb-6">
        <PredictiveRiskHeatmap
          incidents={telecomIncidents}
          threats={[]}
          assets={networkNodes}
          predictions={[]}
        />
      </div>

      {/* Fraud Trend Chart */}
      <Card className="p-5 mb-6" glow>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: TEL_RED }} />
            Fraud Cases Trend (Last {selectedTimeRange} Days)
          </h3>
          <div className="flex items-center gap-2">
            {[7, 14, 30].map(days => (
              <button
                key={days}
                onClick={() => setSelectedTimeRange(days)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  selectedTimeRange === days ? "bg-red-500/20 border-red-400/40 text-red-400" : "bg-white/5 border-white/10 text-slate-400"
                }`}
                style={{ border: `1px solid ${selectedTimeRange === days ? "#ef444440" : "rgba(255,255,255,0.1)"}` }}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>

        <div className="h-64">
          {fraudLoading ? (
            <Skeleton lines={8} />
          ) : fraudTrendData.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No fraud data" description="No fraud cases detected in selected period" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fraudTrendData}>
                <defs>
                  <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke={MUTED} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={MUTED} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#0a1628", border: `1px solid ${BORDER}`, borderRadius: 8 }}
                  labelStyle={{ color: TEXT, fontSize: 11 }}
                  itemStyle={{ fontSize: 10 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="cases" name="Fraud Cases" stroke="#ef4444" fillOpacity={1} fill="url(#colorCases)" strokeWidth={2} />
                <Area type="monotone" dataKey="amount" name="Amount (USD)" stroke="#f97316" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Traffic & Roaming Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Regional Traffic */}
        <Card className="p-5" glow>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: TEL_CYAN }} />
              Regional Traffic Distribution
            </h3>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="region" stroke={MUTED} fontSize={9} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke={MUTED} fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#0a1628", border: `1px solid ${BORDER}`, borderRadius: 8 }}
                  labelStyle={{ color: TEXT, fontSize: 11 }}
                  itemStyle={{ fontSize: 10 }}
                />
                <Bar dataKey="throughput" name="Throughput (Gbps)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Roaming Sessions */}
        <Card className="p-5" glow>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4" style={{ color: TEL_AMBER }} />
              Active Roaming Sessions
            </h3>
            <span className="text-[10px] font-bold" style={{ color: MUTED }}>
              {roamingSessions?.length || 0} total
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {roamingLoading ? (
              <Skeleton lines={6} />
            ) : roamingSessions?.length === 0 ? (
              <EmptyState icon={Globe} title="No roaming sessions" description="No active roaming sessions" />
            ) : (
              roamingSessions?.slice(0, 8).map(session => (
                <div key={session.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-white">{session.home_operator}</span>
                      <span className="text-[9px]" style={{ color: MUTED }}>→</span>
                      <span className="text-xs font-semibold text-white">{session.visited_operator}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px]" style={{ color: MUTED }}>
                      <span>{session.visited_country}</span>
                      <span>•</span>
                      <span>{formatDataGB(session.data_usage_gb)}</span>
                      <span>•</span>
                      <span>{session.duration_min} min</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <TelBadge color={session.fraud_score > 70 ? TEL_RED : session.fraud_score > 40 ? TEL_ORANGE : TEL_GREEN}>
                      {session.fraud_score}
                    </TelBadge>
                    {session.imsi_catcher_suspected && (
                      <div className="text-[8px] text-red-400 mt-1">⚠️ IMSI</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}