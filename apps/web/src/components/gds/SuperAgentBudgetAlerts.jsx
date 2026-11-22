import React, { useState, useEffect } from "react";
import { Bell, DollarSign, AlertTriangle, CheckCircle, X, Plus, Trash2, Save } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

const STORAGE_KEY = "gds_super_agent_budgets";
const ALERT_LOG_KEY = "gds_super_agent_alert_log";

function loadBudgets() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveBudgets(b) { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); }
function loadAlertLog() {
  try { return JSON.parse(localStorage.getItem(ALERT_LOG_KEY) || "[]"); } catch { return []; }
}
function saveAlertLog(l) { localStorage.setItem(ALERT_LOG_KEY, JSON.stringify(l)); }

const AGENT_CLASS_COLORS = {
  SOC: DANGER, ThreatHunter: HIGH, CloudSecurity: "#60a5fa",
  IdentitySecurity: "#a855f7", Compliance: LOW, ExecutiveIntelligence: "#fbbf24",
  DevSecOps: CYAN, RiskIntelligence: "#14b8a6",
};

function usageFromSessions(agentId, sessions) {
  // Derive a synthetic cost: 1 credit per 500ms execution time
  const agentSessions = sessions.filter(s => s.agent_id === agentId || s.intent_type === agentId);
  const totalMs = agentSessions.reduce((s, sess) => s + (sess.duration_ms || 0), 0);
  return { sessions: agentSessions.length, cost_usd: parseFloat((totalMs / 1000 * 0.008).toFixed(2)) };
}

export default function SuperAgentBudgetAlerts({ agents = [], sessions = [] }) {
  const [budgets, setBudgets] = useState(loadBudgets);
  const [alertLog, setAlertLog] = useState(loadAlertLog);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ agent_id: "", threshold_usd: "", notify_at_pct: 80 });
  const [saved, setSaved] = useState(false);

  // ── Evaluate budgets every render ────────────────────────────────────────
  useEffect(() => {
    if (budgets.length === 0 || agents.length === 0) return;

    const newAlerts = [];
    budgets.forEach(budget => {
      const usage = usageFromSessions(budget.agent_id, sessions);
      const pct = budget.threshold_usd > 0 ? (usage.cost_usd / budget.threshold_usd) * 100 : 0;
      const breached = pct >= 100;
      const warned = pct >= (budget.notify_at_pct || 80);

      if (breached || warned) {
        const existingKey = `${budget.agent_id}-${breached ? "breach" : "warn"}-${new Date().toISOString().slice(0, 10)}`;
        const alreadyLogged = alertLog.some(a => a.key === existingKey);
        if (!alreadyLogged) {
          const alert = {
            key: existingKey,
            agent_id: budget.agent_id,
            agent_name: agents.find(a => a.super_agent_id === budget.agent_id)?.name || budget.agent_id,
            type: breached ? "breach" : "warn",
            pct: Math.round(pct),
            cost_usd: usage.cost_usd,
            threshold_usd: budget.threshold_usd,
            timestamp: new Date().toISOString(),
            dismissed: false,
          };
          newAlerts.push(alert);
        }
      }
    });

    if (newAlerts.length > 0) {
      const updated = [...newAlerts, ...alertLog].slice(0, 50);
      saveAlertLog(updated);
      setAlertLog(updated);
    }
  }, [budgets, sessions, agents]);

  const addBudget = () => {
    if (!form.agent_id || !form.threshold_usd) return;
    const updated = [
      ...budgets.filter(b => b.agent_id !== form.agent_id),
      { agent_id: form.agent_id, threshold_usd: parseFloat(form.threshold_usd), notify_at_pct: parseInt(form.notify_at_pct) }
    ];
    saveBudgets(updated);
    setBudgets(updated);
    setForm({ agent_id: "", threshold_usd: "", notify_at_pct: 80 });
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const removeBudget = (agentId) => {
    const updated = budgets.filter(b => b.agent_id !== agentId);
    saveBudgets(updated);
    setBudgets(updated);
  };

  const dismissAlert = (key) => {
    const updated = alertLog.map(a => a.key === key ? { ...a, dismissed: true } : a);
    saveAlertLog(updated);
    setAlertLog(updated);
  };

  const activeAlerts = alertLog.filter(a => !a.dismissed);

  const inputStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 8, padding: "6px 10px", fontSize: 12, outline: "none", width: "100%"
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: CYAN }} />
          <span className="text-sm font-bold text-white">Budget Alert System</span>
          {activeAlerts.length > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
              style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
              {activeAlerts.length} active
            </span>
          )}
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <Plus className="w-3 h-3" /> Set Budget
        </button>
      </div>

      {/* Active alerts */}
      {activeAlerts.length > 0 && (
        <div className="px-5 py-3 space-y-2 border-b" style={{ borderColor: BORDER }}>
          {activeAlerts.slice(0, 5).map(alert => (
            <div key={alert.key}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{
                background: alert.type === "breach" ? `${DANGER}08` : `${HIGH}08`,
                border: `1px solid ${alert.type === "breach" ? DANGER : HIGH}30`,
              }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5"
                style={{ color: alert.type === "breach" ? DANGER : HIGH }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black" style={{ color: alert.type === "breach" ? DANGER : HIGH }}>
                  {alert.type === "breach" ? "BUDGET BREACHED" : `WARNING — ${alert.pct}% of budget used`}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: TEXT }}>
                  <span className="font-bold">{alert.agent_name}</span> · ${alert.cost_usd} / ${alert.threshold_usd} limit
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
              <button onClick={() => dismissAlert(alert.key)}
                className="hover:text-white transition-colors flex-shrink-0" style={{ color: MUTED }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add budget form */}
      {showForm && (
        <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: BORDER, background: "rgba(0,212,255,0.02)" }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: CYAN }}>New Budget Threshold</p>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Agent</label>
              <select value={form.agent_id} onChange={e => setForm({ ...form, agent_id: e.target.value })} style={inputStyle}>
                <option value="">Select agent…</option>
                {agents.map(a => <option key={a.super_agent_id} value={a.super_agent_id}>{a.name} ({a.agent_class})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Monthly Budget ($)</label>
                <input type="number" min="0" step="0.01"
                  value={form.threshold_usd} onChange={e => setForm({ ...form, threshold_usd: e.target.value })}
                  placeholder="e.g. 500" style={inputStyle} />
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Warn at (%)</label>
                <input type="number" min="10" max="100" step="5"
                  value={form.notify_at_pct} onChange={e => setForm({ ...form, notify_at_pct: e.target.value })}
                  style={inputStyle} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-lg text-[11px] font-bold"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
              Cancel
            </button>
            <button onClick={addBudget}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold hover:opacity-80 transition-all"
              style={{ background: `${LOW}18`, border: `1px solid ${LOW}35`, color: LOW }}>
              <Save className="w-3 h-3" /> Save Threshold
            </button>
          </div>
          {saved && <p className="text-[10px] text-center" style={{ color: LOW }}>✓ Budget threshold saved</p>}
        </div>
      )}

      {/* Budget table */}
      <div className="p-5">
        {budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <DollarSign className="w-8 h-8 mb-2" style={{ color: MUTED }} />
            <p className="text-xs font-bold text-white mb-1">No budgets configured</p>
            <p className="text-[10px]" style={{ color: MUTED }}>Set monthly thresholds to receive instant alerts</p>
          </div>
        ) : (
          <div className="space-y-2">
            {budgets.map(budget => {
              const agent = agents.find(a => a.super_agent_id === budget.agent_id);
              const usage = usageFromSessions(budget.agent_id, sessions);
              const pct = budget.threshold_usd > 0 ? Math.min((usage.cost_usd / budget.threshold_usd) * 100, 100) : 0;
              const color = pct >= 100 ? DANGER : pct >= budget.notify_at_pct ? HIGH : LOW;
              const agentColor = AGENT_CLASS_COLORS[agent?.agent_class] || MUTED;

              return (
                <div key={budget.agent_id} className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-white truncate">{agent?.name || budget.agent_id}</span>
                      {agent && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{ color: agentColor, background: `${agentColor}15`, border: `1px solid ${agentColor}25` }}>
                          {agent.agent_class}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] font-black font-mono" style={{ color }}>
                        ${usage.cost_usd} <span style={{ color: MUTED }}>/ ${budget.threshold_usd}</span>
                      </span>
                      <button onClick={() => removeBudget(budget.agent_id)}
                        className="p-1 rounded hover:bg-white/10 transition-all" style={{ color: MUTED }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: color, boxShadow: pct >= 80 ? `0 0 4px ${color}55` : "none" }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px]" style={{ color: MUTED }}>
                      Warn at {budget.notify_at_pct}% · {usage.sessions} sessions
                    </span>
                    <span className="text-[9px] font-bold" style={{ color }}>{Math.round(pct)}% used</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}