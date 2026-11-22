import React, { useState, useMemo, useEffect } from "react";
import { Bell, TrendingUp, X, Settings, CheckCircle, AlertTriangle, Calendar } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

const MONTHLY_BUDGET_KEY = "gds_kernel_monthly_budgets";
const NOTIFIED_KEY = "gds_kernel_monthly_notified";

const INTENT_TYPES = ["scan", "remediate", "investigate", "report", "approve", "configure", "query", "orchestrate"];
const INTENT_COLORS = {
  scan: DANGER, remediate: HIGH, investigate: MEDIUM,
  report: "#60a5fa", approve: "#8b5cf6", configure: "#06b6d4",
  query: LOW, orchestrate: "#f472b6",
};

function loadBudgets() {
  try { return JSON.parse(localStorage.getItem(MONTHLY_BUDGET_KEY) || "{}"); } catch { return {}; }
}
function saveBudgets(b) { localStorage.setItem(MONTHLY_BUDGET_KEY, JSON.stringify(b)); }
function loadNotified() {
  try { return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]"); } catch { return []; }
}
function saveNotified(n) { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(n)); }

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isWithinMonth(dateStr, monthKey) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return m === monthKey;
}

export default function KernelBudgetNotifications({ sessions = [] }) {
  const [showSettings, setShowSettings] = useState(false);
  const [budgets, setBudgets] = useState(loadBudgets);
  const [notified, setNotified] = useState(loadNotified);
  const [editBudgets, setEditBudgets] = useState({});

  const currentMonth = getMonthKey();

  // Compute monthly usage per agent
  const monthlyUsage = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      if (!isWithinMonth(s.created_date || s.started_at, currentMonth)) return;
      const key = s.intent_type || "unknown";
      if (!map[key]) map[key] = { total_ms: 0, runs: 0 };
      map[key].total_ms += s.duration_ms || 0;
      map[key].runs++;
    });
    return Object.entries(map).map(([agent, d]) => ({
      agent,
      total_ms: d.total_ms,
      total_sec: Math.round(d.total_ms / 100) / 10,
      runs: d.runs,
    }));
  }, [sessions, currentMonth]);

  // Generate notifications for budget breaches
  const notifications = useMemo(() => {
    const result = [];
    monthlyUsage.forEach(({ agent, total_ms, total_sec }) => {
      const b = budgets[agent];
      if (!b || !b.monthly_budget_ms) return;
      const pct = (total_ms / b.monthly_budget_ms) * 100;
      const notifyKey = `${currentMonth}-${agent}-${Math.floor(pct / 10)}`;
      
      if (pct >= 100 && !notified.includes(notifyKey)) {
        result.push({
          key: notifyKey, agent, type: "exceeded",
          message: `Monthly budget exceeded: ${total_sec}s used of ${b.monthly_budget_ms / 1000}s budget`,
          pct: Math.round(pct),
          severity: pct >= 150 ? "critical" : "high",
        });
      } else if (pct >= 80 && pct < 100 && !notified.includes(notifyKey)) {
        result.push({
          key: notifyKey, agent, type: "warning",
          message: `Approaching monthly limit: ${total_sec}s used (${Math.round(pct)}% of ${b.monthly_budget_ms / 1000}s budget)`,
          pct: Math.round(pct),
          severity: "warning",
        });
      }
    });
    return result;
  }, [monthlyUsage, budgets, notified, currentMonth]);

  const openSettings = () => {
    const init = {};
    INTENT_TYPES.forEach(t => {
      init[t] = { monthly_budget_ms: budgets[t]?.monthly_budget_ms || "" };
    });
    setEditBudgets(init);
    setShowSettings(true);
  };

  const saveBudgetChanges = () => {
    const cleaned = {};
    Object.entries(editBudgets).forEach(([agent, vals]) => {
      const ms = parseInt(vals.monthly_budget_ms);
      if (!isNaN(ms) && ms > 0) {
        cleaned[agent] = { monthly_budget_ms: ms };
      }
    });
    saveBudgets(cleaned);
    setBudgets(cleaned);
    setShowSettings(false);
  };

  const dismiss = (key) => {
    const next = [...notified, key];
    saveNotified(next);
    setNotified(next);
  };

  const resetMonthly = () => {
    saveNotified([]);
    setNotified([]);
  };

  const inputStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 8, padding: "6px 12px", fontSize: 13, width: "100%", outline: "none",
  };

  const hasBudgets = Object.keys(budgets).length > 0;

  return (
    <div className="mb-6">
      {/* Notification banner */}
      {notifications.length > 0 && (
        <div className="rounded-2xl mb-3 overflow-hidden" style={{ border: `1px solid ${DANGER}40`, background: `${DANGER}08` }}>
          <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: `${DANGER}25` }}>
            <Bell className="w-4 h-4 flex-shrink-0" style={{ color: DANGER }} />
            <span className="text-xs font-black text-white flex-1">
              {notifications.length} Monthly Budget Alert{notifications.length > 1 ? "s" : ""}
            </span>
            <button onClick={openSettings}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold hover:opacity-80"
              style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}25` }}>
              <Settings className="w-3 h-3" /> Edit Budgets
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: `${DANGER}15` }}>
            {notifications.map(n => {
              const color = n.severity === "critical" ? DANGER : n.severity === "warning" ? HIGH : MEDIUM;
              return (
                <div key={n.key} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: color }} />
                  <span className="text-[11px] font-bold capitalize flex-shrink-0"
                    style={{ color: INTENT_COLORS[n.agent] || CYAN }}>{n.agent}</span>
                  <span className="text-[11px] flex-1" style={{ color: TEXT }}>{n.message}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded"
                      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
                      {n.pct}%
                    </span>
                    <button onClick={() => dismiss(n.key)} title="Dismiss"
                      className="p-1 rounded hover:bg-white/10" style={{ color: MUTED }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={openSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
          style={{
            background: hasBudgets ? `${CYAN}10` : "rgba(255,255,255,0.04)",
            border: `1px solid ${hasBudgets ? CYAN + "35" : BORDER}`,
            color: hasBudgets ? CYAN : MUTED,
          }}>
          <Calendar className="w-3.5 h-3.5" />
          {hasBudgets ? `Monthly Budgets (${Object.keys(budgets).length} agents)` : "Set Monthly Budgets"}
        </button>
        {notifications.length === 0 && hasBudgets && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: LOW }}>
            <CheckCircle className="w-3.5 h-3.5" /> All agents within monthly budget
          </span>
        )}
        <button onClick={resetMonthly}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80"
          style={{ color: MUTED, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
          <TrendingUp className="w-3 h-3" /> Reset notifications
        </button>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
              <div>
                <h2 className="text-sm font-black text-white">Monthly Budget Settings</h2>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                  Set monthly compute budget per agent (in seconds)
                </p>
              </div>
              <button onClick={() => setShowSettings(false)} style={{ color: MUTED }} className="hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-5">
              <div className="grid grid-cols-2 gap-2 mb-3 pb-2 border-b" style={{ borderColor: BORDER }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Agent Type</span>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Monthly Budget (seconds)</span>
              </div>
              <div className="space-y-3">
                {INTENT_TYPES.map(agent => {
                  const usage = monthlyUsage.find(u => u.agent === agent);
                  const b = budgets[agent];
                  const pct = b && usage ? Math.round((usage.total_ms / b.monthly_budget_ms) * 100) : null;
                  return (
                    <div key={agent} className="grid grid-cols-2 gap-2 items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: INTENT_COLORS[agent] || CYAN }} />
                        <span className="text-xs font-semibold capitalize text-white">{agent}</span>
                        {usage && (
                          <span className="text-[9px]" style={{ color: MUTED }}>({usage.total_sec}s this month)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0" placeholder="e.g. 3600"
                          value={editBudgets[agent]?.monthly_budget_ms || ""}
                          onChange={e => setEditBudgets(prev => ({
                            ...prev, [agent]: { ...prev[agent], monthly_budget_ms: e.target.value }
                          }))}
                          style={inputStyle}
                        />
                        {pct !== null && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 w-12 text-center ${pct >= 100 ? 'bg-red-500/20 text-red-400' : pct >= 80 ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {pct}%
                          </span>
                        )}
                      </div>
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
              <button onClick={() => { saveBudgets({}); setBudgets({}); setShowSettings(false); }}
                className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:opacity-80"
                style={{ color: DANGER, background: `${DANGER}10`, border: `1px solid ${DANGER}25` }}>
                Clear All
              </button>
              <button onClick={saveBudgetChanges}
                className="flex-1 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                Save Budgets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}