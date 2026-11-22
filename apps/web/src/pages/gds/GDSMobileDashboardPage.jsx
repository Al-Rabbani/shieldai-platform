import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, LayoutDashboard, CreditCard, Bell, Zap, TrendingUp, TrendingDown, X } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, PAGE_BG
} from "@/components/gds/GDSOSShared";

const TAB_META = [
  { key: "overview", label: "Overview", Icon: LayoutDashboard },
  { key: "cards",    label: "Cards",    Icon: CreditCard      },
  { key: "alerts",   label: "Alerts",   Icon: Bell            },
  { key: "actions",  label: "Actions",  Icon: Zap             },
];

function SparkMini({ data = [] }) {
  const max = Math.max(1, ...data);
  const h = 32, w = 80;
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * w},${h - (v / max) * h}`).join(" ");
  if (data.length < 2) return null;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={CYAN} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function SwipeCard({ alert, onDismiss, onAssign }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(null);
  const sev = (alert.severity || "info").toLowerCase();
  const color = sev === "critical" ? DANGER : sev === "high" ? HIGH : sev === "medium" ? MEDIUM : MUTED;
  const handleSwipe = (e) => {
    if (offset > 80) { onDismiss(alert); } else if (offset < -80) { onAssign(alert); }
    setOffset(0);
  };
  return (
    <div
      style={{ transform: `translateX(${offset}px)`, transition: offset === 0 ? "transform 0.3s ease" : "none", background: CARD, border: `1px solid ${color}25`, borderRadius: 16, padding: "12px 16px", cursor: "grab", userSelect: "none", position: "relative" }}
      onMouseDown={e => { startX.current = e.clientX; }}
      onMouseMove={e => { if (startX.current != null) setOffset(e.clientX - startX.current); }}
      onMouseUp={() => { handleSwipe(); startX.current = null; }}
      onMouseLeave={() => { if (startX.current != null) { handleSwipe(); startX.current = null; } }}
    >
      {offset > 40 && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black" style={{ color: LOW }}>Dismiss →</div>}
      {offset < -40 && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black" style={{ color: CYAN }}>← Assign</div>}
      <div className="flex items-start gap-3">
        <SevBadge sev={sev} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{alert.title || alert.message}</p>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: MUTED }}>{alert.detail || alert.source}</p>
        </div>
        <button onClick={() => onDismiss(alert)} className="flex-shrink-0" style={{ color: MUTED }}><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

export default function GDSMobileDashboardPage() {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [actions, setActions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState({});
  const [ran, setRan] = useState({});

  useEffect(() => {
    base44.functions.invoke("gdsMobileDashboard", { action: "overview" })
      .then(r => {
        if (r.data) {
          setData(r.data);
          setAlerts(r.data.quick_alerts || []);
        }
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
    base44.functions.invoke("gdsMobileDashboard", { action: "quick_actions" })
      .then(r => { if (r.data) setActions(r.data.actions || r.data || []); })
      .catch(e => console.error(e));
  }, []);

  const runAction = async (action) => {
    setRunning(p => ({ ...p, [action.key || action.label]: true }));
    try {
      await base44.functions.invoke("gdsMobileDashboard", { action: "run_action", action_key: action.key || action.label });
      setRan(p => ({ ...p, [action.key || action.label]: true }));
      setTimeout(() => setRan(p => ({ ...p, [action.key || action.label]: false })), 3000);
    } catch (e) { console.error(e); }
    finally { setRunning(p => ({ ...p, [action.key || action.label]: false })); }
  };

  const score = data?.score ?? data?.overall_score ?? 0;
  const grade = data?.grade ?? "—";
  const trend = data?.trend;
  const status = data?.status_message || data?.status || "";
  const sparkData = data?.sparkline || data?.trend_data || [];
  const tiles = data?.stat_tiles || data?.tiles || [];
  const cards = data?.cards || [];

  return (
    <div style={{ minHeight: "100vh", background: "#020817", paddingBottom: 80, maxWidth: 480, margin: "0 auto" }}>
      {/* Hero */}
      <div className="p-5 space-y-4" style={{ background: "linear-gradient(180deg,rgba(0,212,255,0.06) 0%,transparent 100%)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin" style={{ color: CYAN }} /></div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>Security Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-6xl font-black font-mono" style={{ color: score >= 70 ? LOW : score >= 40 ? MEDIUM : DANGER }}>{score}</span>
                  <span className="text-2xl font-black" style={{ color: MUTED }}>/100</span>
                  <span className="text-3xl font-black" style={{ color: score >= 70 ? LOW : score >= 40 ? MEDIUM : DANGER }}>{grade}</span>
                </div>
                {trend && (
                  <div className="flex items-center gap-1 mt-1">
                    {trend === "up" ? <TrendingUp className="w-4 h-4" style={{ color: LOW }} /> : <TrendingDown className="w-4 h-4" style={{ color: DANGER }} />}
                    <span className="text-xs font-bold" style={{ color: trend === "up" ? LOW : DANGER }}>{trend === "up" ? "Improving" : "Worsening"}</span>
                  </div>
                )}
              </div>
              <SparkMini data={sparkData} />
            </div>
            {status && <p className="text-sm" style={{ color: MUTED }}>{status}</p>}
          </>
        )}
      </div>

      {/* Tab content */}
      <div className="px-4 space-y-3">
        {tab === "overview" && (
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((t, i) => {
              const color = t.color || (t.severity === "critical" ? DANGER : t.severity === "high" ? HIGH : CYAN);
              return (
                <div key={i} className="p-4 rounded-2xl" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                  <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: MUTED }}>{t.label}</p>
                  <p className="text-2xl font-black font-mono mt-1" style={{ color }}>{t.value}</p>
                  {t.sub && <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>{t.sub}</p>}
                </div>
              );
            })}
          </div>
        )}

        {tab === "cards" && (
          <div className="space-y-3">
            {cards.map((c, i) => (
              <div key={i} className="p-4 rounded-2xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-white">{c.title}</p>
                  {c.severity && <SevBadge sev={c.severity} />}
                </div>
                {c.detail && <p className="text-xs mt-1" style={{ color: MUTED }}>{c.detail}</p>}
                {c.value != null && <p className="text-2xl font-black font-mono mt-2" style={{ color: CYAN }}>{c.value}</p>}
              </div>
            ))}
            {cards.length === 0 && <p className="text-xs text-center py-6" style={{ color: MUTED }}>No cards available</p>}
          </div>
        )}

        {tab === "alerts" && (
          <div className="space-y-2">
            <p className="text-[10px]" style={{ color: MUTED }}>Swipe right to dismiss · Swipe left to assign</p>
            {alerts.map((a, i) => (
              <SwipeCard key={a.id || i} alert={a}
                onDismiss={a => setAlerts(p => p.filter((_, j) => j !== i))}
                onAssign={a => setAlerts(p => p.filter((_, j) => j !== i))} />
            ))}
            {alerts.length === 0 && <p className="text-xs text-center py-8" style={{ color: MUTED }}>No alerts 🎉</p>}
          </div>
        )}

        {tab === "actions" && (
          <div className="space-y-3">
            {actions.map((a, i) => {
              const key = a.key || a.label;
              return (
                <button key={i} onClick={() => runAction(a)} disabled={running[key]}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all hover:opacity-80 disabled:opacity-60"
                  style={{ background: ran[key] ? `${LOW}12` : `${CYAN}10`, border: `1px solid ${ran[key] ? LOW + "30" : CYAN + "25"}` }}>
                  <span className="text-xl">{a.icon || "⚡"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: ran[key] ? LOW : "white" }}>{a.label}</p>
                    {a.description && <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{a.description}</p>}
                  </div>
                  {running[key] && <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: CYAN }} />}
                  {ran[key] && <span className="text-xs font-black flex-shrink-0" style={{ color: LOW }}>✓</span>}
                </button>
              );
            })}
            {actions.length === 0 && <p className="text-xs text-center py-8" style={{ color: MUTED }}>No actions available</p>}
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t" style={{ background: "rgba(2,8,23,0.97)", borderColor: BORDER }}>
        {TAB_META.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-all"
            style={{ color: tab === key ? CYAN : MUTED }}>
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-bold">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}