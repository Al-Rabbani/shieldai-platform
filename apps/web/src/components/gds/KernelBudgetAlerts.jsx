import React, { useState, useEffect, useMemo } from "react";
import { Bell, BellOff, Settings, X, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

const BUDGET_KEY = "gds_kernel_budget_thresholds";
const DISMISSED_KEY = "gds_kernel_dismissed_alerts";

const INTENT_COLORS = {
  scan: DANGER, remediate: HIGH, investigate: MEDIUM,
  report: "#60a5fa", approve: "#8b5cf6", configure: "#06b6d4",
  query: LOW, orchestrate: "#f472b6",
};

function loadBudgets() {
  try { return JSON.parse(localStorage.getItem(BUDGET_KEY) || "{}"); } catch { return {}; }
}
function saveBudgets(b) { localStorage.setItem(BUDGET_KEY, JSON.stringify(b)); }
function loadDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}
function saveDismissed(d) { localStorage.setItem(DISMISSED_KEY, JSON.stringify(d)); }

const INTENT_TYPES = ["scan", "remediate", "investigate", "report", "approve", "configure", "query", "orchestrate"];

export default function KernelBudgetAlerts({ sessions = [] }) {
  const [showSettings, setShowSettings] = useState(false);
  const [budgets, setBudgets] = useState(loadBudgets);
  const [dismissed, setDismissed] = useState(loadDismissed);
  const [editBudgets, setEditBudgets] = useState({});

  // Compute per-agent stats
  const agentStats = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      const key = s.intent_type || "unknown";
      if (!map[key]) map[key] = { runs: 0, total_ms: 0, failed: 0 };
      map[key].runs++;
      map[key].total_ms += s.duration_ms || 0;
      if (s.status === "failed") map[key].failed++;
    });
    return Object.entries(map).map(([agent, d]) => ({
      agent,
      avg_duration: d.runs > 0 ? Math.round(d.total_ms / d.runs) : 0,
      failure_rate: d.runs > 0 ? Math.round((d.failed / d.runs) * 100) : 0,
      runs: d.runs,
    }));
  }, [sessions]);

  // Generate breach alerts
  const alerts = useMemo(() => {
    const result = [];
    agentStats.forEach(({ agent, avg_duration, failure_rate, runs }) => {
      const b = budgets[agent] || {};
      if (b.max_avg_ms && avg_duration > b.max_avg_ms) {
        const key = `${agent}-duration-${Math.floor(avg_duration / 100)}`;
        if (!dismissed.includes(key)) {
          result.push({
            key, agent, type: "duration",
            message: `Avg duration ${avg_duration}ms exceeds budget of ${b.max_avg_ms}ms`,
            severity: avg_duration > b.max_avg_ms * 2 ? "critical" : "high",
          });
        }
      }
      if (b.max_failure_pct && failure_rate > b.max_failure_pct) {
        const key = `${agent}-failure-${failure_rate}`;
        if (!dismissed.includes(key)) {
          result.push({
            key, agent, type: "failure",
            message: `Failure rate ${failure_rate}% exceeds threshold of ${b.max_failure_pct}%`,
            severity: failure_rate > b.max_failure_pct * 2 ? "critical" : "high",
          });
        }
      }
    });
    return result;
  }, [agentStats, budgets, dismissed]);

  const openSettings = () => {
    const init = {};
    INTENT_TYPES.forEach(t => {
      init[t] = { max_avg_ms: budgets[t]?.max_avg_ms || "", max_failure_pct: budgets[t]?.max_failure_pct || "" };
    });
    setEditBudgets(init);
    setShowSettings(true);
  };

  const saveBudgetChanges = () => {
    const cleaned = {};
    Object.entries(editBudgets).forEach(([agent, vals]) => {
      const ms = parseInt(vals.max_avg_ms);
      const pct = parseInt(vals.max_failure_pct);
      if (!isNaN(ms) || !isNaN(pct)) {
        cleaned[agent] = {};
        if (!isNaN(ms) && ms > 0) cleaned[agent].max_avg_ms = ms;
        if (!isNaN(pct) && pct > 0) cleaned[agent].max_failure_pct = pct;
      }
    });
    saveBudgets(cleaned);
    setBudgets(cleaned);
    setShowSettings(false);
  };

  const dismiss = (key) => {
    const next = [...dismissed, key];
    saveDismissed(next);
    setDismissed(next);
  };

  const clearDismissed = () => { saveDismissed([]); setDismissed([]); };

  const inputStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 8, padding: "5px 10px", fontSize: 12, width: "100%", outline: "none",
  };

  const hasBudgets = Object.keys(budgets).length > 0;

  return (
    <div className="mb-6">
      {/* Alert banner — only shown when there are active breaches */}
      {alerts.length > 0 && (
        <div className="rounded-2xl mb-3 overflow-hidden" style={{ border: `1px solid ${DANGER}40`, background: `${DANGER}08` }}>
          <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: `${DANGER}25` }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: DANGER }} />
            <span className="text-xs font-black text-white flex-1">
              {alerts.length} Budget Threshold Breach{alerts.length > 1 ? "es" : ""} Detected
            </span>
            <button onClick={openSettings}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold hover:opacity-80"
              style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}25` }}>
              <Settings className="w-3 h-3" /> Edit Thresholds
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: `${DANGER}15` }}>
            {alerts.map(alert => {
              const color = alert.severity === "critical" ? DANGER : HIGH;
              return (
                <div key={alert.key} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: color }} />
                  <span className="text-[11px] font-bold capitalize flex-shrink-0"
                    style={{ color: INTENT_COLORS[alert.agent] || CYAN }}>{alert.agent}</span>
                  <span className="text-[11px] flex-1" style={{ color: TEXT }}>{alert.message}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded flex-shrink-0"
                    style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
                    {alert.severity}
                  </span>
                  <button onClick={() => dismiss(alert.key)} title="Dismiss"
                    className="p-1 rounded hover:bg-white/10 flex-shrink-0" style={{ color: MUTED }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-2">
        <button onClick={openSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
          style={{
            background: hasBudgets ? `${CYAN}10` : "rgba(255,255,255,0.04)",
            border: `1px solid ${hasBudgets ? CYAN + "35" : BORDER}`,
            color: hasBudgets ? CYAN : MUTED,
          }}>
          <Bell className="w-3.5 h-3.5" />
          {hasBudgets ? `Budget Alerts (${Object.keys(budgets).length} agents)` : "Set Budget Thresholds"}
        </button>
        {dismissed.length > 0 && (
          <button onClick={clearDismissed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80"
            style={{ color: MUTED, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
            <BellOff className="w-3 h-3" /> Reset {dismissed.length} dismissed
          </button>
        )}
        {alerts.length === 0 && hasBudgets && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: LOW }}>
            <CheckCircle className="w-3.5 h-3.5" /> All agents within budget
          </span>
        )}
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
              <div>
                <h2 className="text-sm font-black text-white">Budget Threshold Settings</h2>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                  Set max avg duration (ms) and/or max failure rate (%) per agent type
                </p>
              </div>
              <button onClick={() => setShowSettings(false)} style={{ color: MUTED }} className="hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-5">
              <div className="grid grid-cols-3 gap-2 mb-3 pb-2 border-b" style={{ borderColor: BORDER }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Agent Type</span>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Max Avg Duration (ms)</span>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Max Failure Rate (%)</span>
              </div>
              <div className="space-y-3">
                {INTENT_TYPES.map(agent => {
                  const stat = agentStats.find(s => s.agent === agent);
                  return (
                    <div key={agent} className="grid grid-cols-3 gap-2 items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: INTENT_COLORS[agent] || CYAN }} />
                        <span className="text-xs font-semibold capitalize text-white">{agent}</span>
                        {stat && (
                          <span className="text-[9px]" style={{ color: MUTED }}>({stat.avg_duration}ms / {stat.failure_rate}%)</span>
                        )}
                      </div>
                      <input
                        type="number" min="0" placeholder="e.g. 5000"
                        value={editBudgets[agent]?.max_avg_ms || ""}
                        onChange={e => setEditBudgets(prev => ({
                          ...prev, [agent]: { ...prev[agent], max_avg_ms: e.target.value }
                        }))}
                        style={inputStyle}
                      />
                      <input
                        type="number" min="0" max="100" placeholder="e.g. 20"
                        value={editBudgets[agent]?.max_failure_pct || ""}
                        onChange={e => setEditBudgets(prev => ({
                          ...prev, [agent]: { ...prev[agent], max_failure_pct: e.target.value }
                        }))}
                        style={inputStyle}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: BORDER }}>
              <button onClick={() => setShowSettings(false)}
                className="flex-1 py-2 rounded-xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
                Cancel
              </button>
              <button onClick={() => {
                  saveBudgets({});
                  setBudgets({});
                  setShowSettings(false);
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:opacity-80"
                style={{ color: DANGER, background: `${DANGER}10`, border: `1px solid ${DANGER}25` }}>
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
              <button onClick={saveBudgetChanges}
                className="flex-1 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                Save Thresholds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}