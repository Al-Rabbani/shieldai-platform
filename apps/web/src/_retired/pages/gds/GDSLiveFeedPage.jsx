import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Activity, Pause, Play, Bell } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis
} from "recharts";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, StatusBadge, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, PAGE_BG, SEV_COLOR
} from "@/components/gds/GDSOSShared";

const CATEGORY_COLORS = {
  incident: DANGER, threat_intel: HIGH, compliance: MEDIUM,
  scan: CYAN, governance: "#8b5cf6", alert: DANGER, default: MUTED,
};

const FILTERS = ["All","Incident","Threat Intel","Compliance","Scan","Governance","Alert"];

function EventCard({ event }) {
  const sev = (event.severity || "info").toLowerCase();
  const color = SEV_COLOR[sev] || MUTED;
  const cat = (event.category || "").toLowerCase().replace(/ /g, "_");
  const catColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.02]"
      style={{ border: `1px solid ${color}18`, background: `${color}04` }}>
      <span className="text-xl flex-shrink-0">{event.icon || "🔔"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-xs font-bold text-white">{event.title || event.action}</p>
          <span className="text-[9px] flex-shrink-0" style={{ color: MUTED }}>{event.relative || timeAgo(event.timestamp || event.created_date)}</span>
        </div>
        {event.detail && <p className="text-[10px] mt-0.5 truncate" style={{ color: MUTED }}>{event.detail}</p>}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <SevBadge sev={sev} />
          {event.category && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
              style={{ color: catColor, background: `${catColor}18` }}>
              {event.category}
            </span>
          )}
          {event.actor_type && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ color: MUTED, background: "rgba(255,255,255,0.05)" }}>
              {event.actor_type}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GDSLiveFeedPage() {
  const [feedData, setFeedData] = useState(null);
  const [criticalFeed, setCriticalFeed] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filter, setFilter] = useState("All");
  const intervalRef = useRef(null);

  const fetchFeed = useCallback(async () => {
    if (paused) return;
    try {
      const [feedRes, critRes, statsRes] = await Promise.all([
        base44.functions.invoke("gdsRealTimeEventStream", { action: "feed" }),
        base44.functions.invoke("gdsRealTimeEventStream", { action: "critical_feed" }),
        base44.functions.invoke("gdsRealTimeEventStream", { action: "event_stats" }),
      ]);
      if (feedRes.data) setFeedData(feedRes.data);
      if (critRes.data) setCriticalFeed(critRes.data.events || critRes.data || []);
      if (statsRes.data) setStats(statsRes.data);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [paused]);

  useEffect(() => {
    fetchFeed();
  }, []);

  useEffect(() => {
    if (paused) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(fetchFeed, 30000);
    return () => clearInterval(intervalRef.current);
  }, [paused, fetchFeed]);

  const allEvents = feedData?.events || [];
  const filteredEvents = filter === "All"
    ? allEvents
    : allEvents.filter(e => (e.category || "").toLowerCase().replace(/ /g, "_") === filter.toLowerCase().replace(/ /g, "_"));

  const severityPie = stats?.severity_breakdown
    ? Object.entries(stats.severity_breakdown).map(([k, v]) => ({ name: k, value: v, color: SEV_COLOR[k] || MUTED }))
    : [];
  const topActions = stats?.top_actions || [];
  const byActor = stats?.by_actor_type ? Object.entries(stats.by_actor_type) : [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Live Event Feed" }]} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0" style={{ background: paused ? MUTED : DANGER }} />
            Real-Time Security Event Stream
          </h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Auto-refreshes every 30 seconds</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {feedData && (
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span style={{ color: MUTED }}>
                <span className="font-black font-mono text-white">{feedData.total_events ?? allEvents.length}</span> events
              </span>
              {feedData.unread_notifications != null && (
                <span className="flex items-center gap-1" style={{ color: DANGER }}>
                  <Bell className="w-3 h-3" />
                  <span className="font-black font-mono">{feedData.unread_notifications}</span> unread
                </span>
              )}
              {lastRefresh && <span style={{ color: MUTED }}>Refreshed {timeAgo(lastRefresh)}</span>}
            </div>
          )}
          <button onClick={() => setPaused(p => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: paused ? `${LOW}15` : `${DANGER}12`, border: `1px solid ${paused ? LOW + "30" : DANGER + "30"}`, color: paused ? LOW : DANGER }}>
            {paused ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
          </button>
          <button onClick={fetchFeed} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-80"
            style={{ background: filter === f ? `${CYAN}20` : "rgba(255,255,255,0.05)", border: `1px solid ${filter === f ? CYAN + "50" : BORDER}`, color: filter === f ? CYAN : MUTED }}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Critical feed pinned */}
          {criticalFeed.length > 0 && (
            <div className="rounded-2xl p-4 space-y-2" style={{ background: `${DANGER}08`, border: `2px solid ${DANGER}30` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: DANGER }} />
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: DANGER }}>🔥 LIVE — Critical Events</span>
              </div>
              {criticalFeed.slice(0, 3).map((e, i) => <EventCard key={i} event={{ ...e, severity: "critical" }} />)}
            </div>
          )}

          {/* All events */}
          {loading && !feedData ? <Skeleton lines={5} /> : filteredEvents.length === 0 ? (
            <EmptyState icon={Activity} title="No events" description="Events will appear here as they stream in" />
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((e, i) => <EventCard key={i} event={e} />)}
            </div>
          )}
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <Card className="p-4">
            <h4 className="text-xs font-bold text-white mb-3">Severity Distribution</h4>
            {severityPie.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={severityPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                      {severityPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, fontSize: 11, borderRadius: 8, color: TEXT }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {severityPie.map(({ name, value, color }) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: color }} /><span className="text-[10px] capitalize" style={{ color: MUTED }}>{name}</span></div>
                      <span className="text-[10px] font-black font-mono" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-xs" style={{ color: MUTED }}>No data</p>}
          </Card>

          {topActions.length > 0 && (
            <Card className="p-4">
              <h4 className="text-xs font-bold text-white mb-3">Top Actions</h4>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={topActions.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                  <YAxis type="category" dataKey="action" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} width={90} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, fontSize: 11, borderRadius: 8, color: TEXT }} />
                  <Bar dataKey="count" fill={CYAN} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {byActor.length > 0 && (
            <Card className="p-4">
              <h4 className="text-xs font-bold text-white mb-3">By Actor Type</h4>
              <div className="space-y-2">
                {byActor.map(([actor, count]) => (
                  <div key={actor} className="flex items-center gap-2">
                    <span className="text-[10px] capitalize w-20 flex-shrink-0" style={{ color: MUTED }}>{actor}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min((count / Math.max(...byActor.map(([,c]) => c))) * 100, 100)}%`, background: CYAN }} />
                    </div>
                    <span className="text-[10px] font-mono font-black w-6 text-right" style={{ color: CYAN }}>{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}