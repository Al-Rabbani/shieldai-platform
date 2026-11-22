import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, ToggleLeft, ToggleRight, Sliders } from "lucide-react";

const GOLD = "#C9A84C";
const CRIT_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const ENV_COLORS = { production: "#ef4444", staging: "#eab308", development: "#3b82f6", all: "#22c55e" };

const BLANK = {
  name: "", description: "",
  business_criticality: "critical", environment: "production", provider: "all",
  score_multiplier: 1.5, score_bonus: 0,
  condition_field: "", condition_operator: "equals", condition_value: "",
  is_active: true, priority: 1
};

function RuleFormModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || BLANK);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-xl rounded-2xl border overflow-hidden" style={{ background: "#111827", borderColor: "#374151" }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#1F2937" }}>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4" style={{ color: GOLD }} />
            {initial?.id ? "Edit" : "New"} Risk Scoring Rule
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Rule Name *</label>
            <input value={form.name} onChange={e => f("name", e.target.value)}
              placeholder="e.g. Boost risk for internet-facing prod assets"
              className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none"
              style={{ background: "#1F2937", borderColor: "#374151" }} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none resize-none"
              style={{ background: "#1F2937", borderColor: "#374151" }} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Business Criticality</label>
              <select value={form.business_criticality} onChange={e => f("business_criticality", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none"
                style={{ background: "#1F2937", borderColor: "#374151" }}>
                {["critical", "high", "medium", "low"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Environment</label>
              <select value={form.environment} onChange={e => f("environment", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none"
                style={{ background: "#1F2937", borderColor: "#374151" }}>
                {["all", "production", "staging", "development"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Cloud Provider</label>
              <select value={form.provider} onChange={e => f("provider", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none"
                style={{ background: "#1F2937", borderColor: "#374151" }}>
                {["all", "aws", "gcp", "azure"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0d1220", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold text-slate-300">Score Adjustment</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Multiplier (×)</label>
                <input type="number" min="0.1" max="5" step="0.1" value={form.score_multiplier}
                  onChange={e => f("score_multiplier", parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none"
                  style={{ background: "#1F2937", borderColor: "#374151" }} />
                <p className="text-[10px] text-slate-500 mt-0.5">1.5 = 50% higher risk</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Flat Bonus (+pts)</label>
                <input type="number" min="-50" max="50" step="1" value={form.score_bonus}
                  onChange={e => f("score_bonus", parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none"
                  style={{ background: "#1F2937", borderColor: "#374151" }} />
                <p className="text-[10px] text-slate-500 mt-0.5">Points added after multiplier</p>
              </div>
            </div>
            {/* Live preview */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] text-slate-500">Preview — base score 60:</span>
              <span className="text-sm font-black text-emerald-400">→</span>
              <span className="text-sm font-black text-white">
                {Math.min(100, Math.round(60 * (form.score_multiplier || 1) + (form.score_bonus || 0)))} pts
              </span>
            </div>
          </div>

          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0d1220", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold text-slate-300">Condition (optional)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Field</label>
                <input value={form.condition_field} onChange={e => f("condition_field", e.target.value)}
                  placeholder="e.g. internet_facing"
                  className="w-full px-2 py-1.5 rounded-lg text-xs text-white border outline-none"
                  style={{ background: "#1F2937", borderColor: "#374151" }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Operator</label>
                <select value={form.condition_operator} onChange={e => f("condition_operator", e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg text-xs text-white border outline-none"
                  style={{ background: "#1F2937", borderColor: "#374151" }}>
                  {["equals", "greater_than", "less_than", "contains", "exists"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Value</label>
                <input value={form.condition_value} onChange={e => f("condition_value", e.target.value)}
                  placeholder="e.g. true"
                  className="w-full px-2 py-1.5 rounded-lg text-xs text-white border outline-none"
                  style={{ background: "#1F2937", borderColor: "#374151" }} />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Priority (lower = applied first)</label>
            <input type="number" min="1" max="100" value={form.priority} onChange={e => f("priority", parseInt(e.target.value) || 1)}
              className="w-32 px-3 py-2 rounded-lg text-sm text-white border outline-none"
              style={{ background: "#1F2937", borderColor: "#374151" }} />
          </div>
        </div>

        <div className="flex justify-between items-center px-5 pb-5 pt-3 border-t" style={{ borderColor: "#1F2937" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border text-slate-300"
            style={{ borderColor: "#374151" }}>Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} disabled={!form.name.trim()}
            className="px-5 py-2 rounded-lg text-sm font-bold text-black disabled:opacity-40"
            style={{ background: GOLD }}>
            {initial?.id ? "Save Changes" : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RiskScoringRulesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["risk-scoring-rules"],
    queryFn: () => base44.entities.RiskScoringRule.list("-priority", 100).catch(() => []),
    initialData: [],
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.RiskScoringRule.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risk-scoring-rules"] }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RiskScoringRule.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risk-scoring-rules"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.RiskScoringRule.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risk-scoring-rules"] }),
  });

  const handleSave = (form) => {
    if (editing?.id) {
      updateMut.mutate({ id: editing.id, data: form });
    } else {
      createMut.mutate(form);
    }
    setEditing(null);
  };

  const toggleActive = (rule) => updateMut.mutate({ id: rule.id, data: { is_active: !rule.is_active } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Cloud Asset Risk Scoring Rules</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Define multipliers and bonuses based on business criticality and environment</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-black"
          style={{ background: GOLD }}>
          <Plus className="w-3.5 h-3.5" /> New Rule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Rules", value: rules.filter(r => r.is_active).length, color: "#22c55e" },
          { label: "Total Rules", value: rules.length, color: "#6366f1" },
          { label: "Avg Multiplier", value: rules.length > 0 ? (rules.reduce((s, r) => s + (r.score_multiplier || 1), 0) / rules.length).toFixed(2) + "×" : "—", color: GOLD },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 border" style={{ background: "#0d1220", borderColor: s.color + "33" }}>
            <div className="text-[10px] text-slate-500">{s.label}</div>
            <div className="text-xl font-black mt-0.5" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500 text-sm">Loading rules…</div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#374151] p-12 text-center">
          <Sliders className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No scoring rules yet</p>
          <p className="text-slate-600 text-xs mt-1">Create rules to adjust risk scores based on asset criticality and environment</p>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-black"
            style={{ background: GOLD }}>
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
                {["Rule", "Criticality", "Environment", "Provider", "Adjustment", "Priority", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id} className={`hover:bg-white/5 transition-colors ${!rule.is_active ? "opacity-50" : ""}`}
                  style={{ borderBottom: "1px solid #1F2937" }}>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{rule.name}</div>
                    {rule.description && <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[200px]">{rule.description}</div>}
                    {rule.condition_field && (
                      <div className="text-[10px] text-indigo-400 mt-0.5 font-mono">
                        if {rule.condition_field} {rule.condition_operator} {rule.condition_value}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: CRIT_COLORS[rule.business_criticality], background: CRIT_COLORS[rule.business_criticality] + "22" }}>
                      {rule.business_criticality}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold" style={{ color: ENV_COLORS[rule.environment] || "#9CA3AF" }}>{rule.environment}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 uppercase text-[10px] font-bold">{rule.provider}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-black text-white">{rule.score_multiplier || 1}×</span>
                    {rule.score_bonus !== 0 && (
                      <span className="ml-1 text-[10px]" style={{ color: rule.score_bonus > 0 ? "#ef4444" : "#22c55e" }}>
                        {rule.score_bonus > 0 ? "+" : ""}{rule.score_bonus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{rule.priority}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleActive(rule)} className="text-slate-400 hover:text-white transition-colors">
                        {rule.is_active
                          ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                          : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { setEditing(rule); setShowForm(true); }}
                        className="px-2 py-1 rounded text-[10px] text-slate-400 hover:text-white hover:bg-white/10 transition-colors">Edit</button>
                      <button onClick={() => deleteMut.mutate(rule.id)}
                        className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <RuleFormModal
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}