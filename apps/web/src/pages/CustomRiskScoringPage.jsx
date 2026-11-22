import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ToggleLeft, ToggleRight, Shield, Edit2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GOLD = "#C9A84C";

const ENV_OPTS = ["all", "production", "staging", "development", "testing"];
const CRIT_OPTS = ["all", "critical", "high", "medium", "low"];
const TYPE_OPTS = ["all", "repository", "vm", "cloud", "api", "container", "domain"];
const FACING_OPTS = ["any", "yes", "no"];

const CRIT_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", all: "#6366f1" };
const ENV_COLORS = { production: "#ef4444", staging: "#f97316", development: "#22c55e", testing: "#06b6d4", all: "#8b5cf6" };

const BLANK = { name: "", description: "", environment: "all", business_criticality: "all", asset_type: "all", internet_facing: "any", score_multiplier: 1.0, score_bonus: 0, is_active: true, priority: 1 };

function RuleForm({ initial = BLANK, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ background: "#111827", borderColor: "#374151" }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Rule Name *</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Production Critical Boost"
            className="h-8 text-xs bg-[#1F2937] border-[#374151]" />
        </div>
        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Priority (lower = first)</Label>
          <Input type="number" value={form.priority} onChange={e => set("priority", parseInt(e.target.value) || 1)}
            className="h-8 text-xs bg-[#1F2937] border-[#374151]" />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs text-slate-400 mb-1 block">Description</Label>
          <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="What this rule does…"
            className="h-8 text-xs bg-[#1F2937] border-[#374151]" />
        </div>
      </div>

      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1">Conditions</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Environment</Label>
          <select value={form.environment} onChange={e => set("environment", e.target.value)}
            className="w-full h-8 px-2 rounded-lg text-xs text-slate-200 outline-none"
            style={{ background: "#1F2937", border: "1px solid #374151" }}>
            {ENV_OPTS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Business Criticality</Label>
          <select value={form.business_criticality} onChange={e => set("business_criticality", e.target.value)}
            className="w-full h-8 px-2 rounded-lg text-xs text-slate-200 outline-none"
            style={{ background: "#1F2937", border: "1px solid #374151" }}>
            {CRIT_OPTS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Asset Type</Label>
          <select value={form.asset_type} onChange={e => set("asset_type", e.target.value)}
            className="w-full h-8 px-2 rounded-lg text-xs text-slate-200 outline-none"
            style={{ background: "#1F2937", border: "1px solid #374151" }}>
            {TYPE_OPTS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Internet Facing</Label>
          <select value={form.internet_facing} onChange={e => set("internet_facing", e.target.value)}
            className="w-full h-8 px-2 rounded-lg text-xs text-slate-200 outline-none"
            style={{ background: "#1F2937", border: "1px solid #374151" }}>
            {FACING_OPTS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1">Score Adjustments</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Score Multiplier</Label>
          <Input type="number" step="0.1" min="0.1" max="5" value={form.score_multiplier}
            onChange={e => set("score_multiplier", parseFloat(e.target.value) || 1)}
            className="h-8 text-xs bg-[#1F2937] border-[#374151]" />
          <p className="text-[10px] text-slate-600 mt-1">e.g. 1.5 = +50% to base risk score</p>
        </div>
        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Score Bonus (flat points)</Label>
          <Input type="number" step="1" value={form.score_bonus}
            onChange={e => set("score_bonus", parseInt(e.target.value) || 0)}
            className="h-8 text-xs bg-[#1F2937] border-[#374151]" />
          <p className="text-[10px] text-slate-600 mt-1">Added after multiplier</p>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: "#0d1220", border: "1px solid #1F2937" }}>
        <Shield className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <p className="text-xs text-slate-400">
          Assets matching <span className="text-white">{form.environment}</span> env ·{" "}
          <span className="text-white">{form.business_criticality}</span> criticality ·{" "}
          <span className="text-white">{form.asset_type}</span> type will have their risk score
          multiplied by <span style={{ color: GOLD }}>{form.score_multiplier}x</span>
          {form.score_bonus !== 0 && <> then {form.score_bonus > 0 ? "+" : ""}<span style={{ color: GOLD }}>{form.score_bonus}</span> added</>}.
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="text-xs" style={{ background: GOLD, color: "#000" }}
          onClick={() => onSave(form)} disabled={saving || !form.name}>
          <Check className="w-3.5 h-3.5 mr-1" /> Save Rule
        </Button>
        <Button size="sm" variant="ghost" className="text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function RuleCard({ rule, onToggle, onDelete, onEdit }) {
  const envColor = ENV_COLORS[rule.environment] || "#6366f1";
  const critColor = CRIT_COLORS[rule.business_criticality] || "#6366f1";
  return (
    <div className={`rounded-xl border p-4 transition-all ${rule.is_active ? "border-[#1F2937]" : "border-[#1F2937] opacity-50"}`}
      style={{ background: "#111827" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{rule.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#1F2937", color: GOLD }}>
              P{rule.priority}
            </span>
            {!rule.is_active && <span className="text-[10px] text-slate-600">Disabled</span>}
          </div>
          {rule.description && <p className="text-xs text-slate-500 mt-0.5">{rule.description}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => onEdit(rule)} className="text-slate-500 hover:text-white transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onToggle(rule)} className="transition-colors" style={{ color: rule.is_active ? "#22c55e" : "#6B7280" }}>
            {rule.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button onClick={() => onDelete(rule.id)} className="text-slate-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: envColor + "20", color: envColor }}>
          {rule.environment}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: critColor + "20", color: critColor }}>
          {rule.business_criticality} criticality
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F2937] text-slate-400">
          {rule.asset_type} assets
        </span>
        {rule.internet_facing !== "any" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F2937] text-slate-400">
            {rule.internet_facing === "yes" ? "Internet-facing" : "Internal"}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[10px]">
        <span className="text-slate-500">Multiplier: <span style={{ color: GOLD }} className="font-bold">{rule.score_multiplier}x</span></span>
        {rule.score_bonus !== 0 && (
          <span className="text-slate-500">Bonus: <span style={{ color: GOLD }} className="font-bold">{rule.score_bonus > 0 ? "+" : ""}{rule.score_bonus}</span></span>
        )}
      </div>
    </div>
  );
}

export default function CustomRiskScoringPage() {
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const qc = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["risk-scoring-rules"],
    queryFn: () => base44.entities.RiskScoringRule.list("priority", 200),
    initialData: [],
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.RiskScoringRule.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["risk-scoring-rules"] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RiskScoringRule.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["risk-scoring-rules"] }); setEditRule(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.RiskScoringRule.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risk-scoring-rules"] }),
  });

  const handleSave = (form) => {
    if (editRule) updateMut.mutate({ id: editRule.id, data: form });
    else createMut.mutate(form);
  };

  const handleToggle = (rule) => updateMut.mutate({ id: rule.id, data: { is_active: !rule.is_active } });

  const activeRules = rules.filter(r => r.is_active).length;

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu 0.35s ease both}`}</style>

      <div className="fu flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Shield className="w-3.5 h-3.5" /><span>Platform</span><span>/</span>
            <span style={{ color: GOLD }}>Custom Risk Scoring</span>
          </div>
          <h1 className="text-2xl font-black text-white">Custom Risk Scoring Rules</h1>
          <p className="text-slate-400 text-sm mt-0.5">Define scoring adjustments based on business criticality and environment</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <div className="text-xl font-black" style={{ color: GOLD }}>{activeRules}</div>
            <div className="text-[10px] text-slate-500">Active Rules</div>
          </div>
          <Button size="sm" className="text-xs font-bold" style={{ background: GOLD, color: "#000" }}
            onClick={() => { setEditRule(null); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Rule
          </Button>
        </div>
      </div>

      {(showForm && !editRule) && (
        <div className="fu" style={{ animationDelay: "40ms" }}>
          <RuleForm onSave={handleSave} onCancel={() => setShowForm(false)} saving={createMut.isPending} />
        </div>
      )}

      {/* How it works */}
      <div className="fu rounded-xl p-4 border" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "60ms" }}>
        <p className="text-xs text-slate-400">
          <span className="text-white font-semibold">How scoring works:</span> Rules are applied in priority order. Each matching rule's multiplier is stacked and bonus points added. A production + critical asset with two active rules (×1.5, +10) that starts at score 40 becomes <span style={{ color: GOLD }}>40 × 1.5 + 10 = 70</span>.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-500 py-12">Loading rules…</div>
      ) : rules.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed p-12 text-center" style={{ borderColor: "#374151" }}>
          <Shield className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">No rules yet. Create your first rule to customise asset risk scoring.</p>
          <Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Create First Rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            editRule?.id === rule.id ? (
              <div key={rule.id} className="fu">
                <RuleForm initial={rule} onSave={handleSave} onCancel={() => setEditRule(null)} saving={updateMut.isPending} />
              </div>
            ) : (
              <RuleCard key={rule.id} rule={rule}
                onToggle={handleToggle}
                onDelete={(id) => deleteMut.mutate(id)}
                onEdit={(r) => { setEditRule(r); setShowForm(false); }}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}