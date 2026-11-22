import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Plus, X, Edit2, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const CAT_COLORS = {
  sqli: "#dc2626", xss: "#ea580c", path_traversal: "#d97706", ssrf: "#7c3aed",
  rce: "#dc2626", prompt_injection: "#6366f1", bot: "#0891b2", supply_chain: "#059669",
  zero_day: "#be185d", rate_limit: "#374151",
};
const ACTION_STYLE = {
  block: { color: "#f43f5e", bg: "rgba(244,63,94,0.15)", label: "BLOCK" },
  rate_limit: { color: "#eab308", bg: "rgba(234,179,8,0.12)", label: "RATE LIMIT" },
  log: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "LOG" },
  allow: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "ALLOW" },
};
const SOURCE_STYLE = {
  builtin: { color: "#64748b", bg: "rgba(100,116,139,0.12)", label: "BUILT-IN" },
  ai_generated: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", label: "AI" },
  community: { color: "#0891b2", bg: "rgba(8,145,178,0.12)", label: "COMMUNITY" },
  custom: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "CUSTOM" },
};
const SEV_ORDER = ["critical", "high", "medium", "low"];

function TestModal({ rule, onClose }) {
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState(null);
  const test = () => {
    if (!rule?.pattern || !payload) return;
    try {
      const re = new RegExp(rule.pattern, "i");
      const match = re.test(payload);
      setResult(match ? "BLOCKED ⛔" : "ALLOWED ✅");
    } catch {
      setResult("Invalid regex pattern");
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Test Rule: {rule?.name}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Pattern</label>
          <pre className="p-3 rounded-lg text-[11px] font-mono text-emerald-400 overflow-auto" style={{ background: "#030712", border: "1px solid #30363d" }}>
            {rule?.pattern}
          </pre>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Test Payload</label>
          <textarea value={payload} onChange={e => setPayload(e.target.value)} rows={3}
            placeholder="Enter payload to test against pattern..."
            className="w-full px-3 py-2 rounded-lg text-xs font-mono text-white outline-none resize-none"
            style={{ background: "#030712", border: "1px solid #30363d" }} />
        </div>
        {result && (
          <div className="p-3 rounded-lg text-center font-bold text-sm" style={{
            background: result.includes("BLOCKED") ? "rgba(244,63,94,0.1)" : "rgba(16,185,129,0.1)",
            border: `1px solid ${result.includes("BLOCKED") ? "rgba(244,63,94,0.3)" : "rgba(16,185,129,0.3)"}`,
            color: result.includes("BLOCKED") ? "#f43f5e" : "#10b981"
          }}>
            {result}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={test} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#f43f5e" }}>
            Test Rule
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white"
            style={{ background: "#0d1117", border: "1px solid #30363d" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateRuleModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: "", category: "sqli", description: "", pattern: "", action: "block", severity: "high", source: "custom" });
  const [testPayload, setTestPayload] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const testPattern = () => {
    try {
      const re = new RegExp(form.pattern, "i");
      setTestResult(re.test(testPayload) ? "MATCH — Would be blocked ⛔" : "NO MATCH — Would pass ✅");
    } catch {
      setTestResult("Invalid regex pattern");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ruleId = `FW-CUSTOM-${Date.now()}`;
    await onCreate({ ...form, rule_id: ruleId, enabled: true, hits_blocked: 0, false_positives: 0 });
    toast.success("Firewall rule created");
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Add Custom Rule</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Rule Name</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} required placeholder="e.g. Block Custom XSS Pattern"
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ background: "#0d1117", border: "1px solid #30363d" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Category", key: "category", opts: Object.keys(CAT_COLORS) },
              { label: "Action", key: "action", opts: ["block", "rate_limit", "log", "allow"] },
              { label: "Severity", key: "severity", opts: ["critical", "high", "medium", "low"] },
            ].map(({ label, key, opts }) => (
              <div key={key}>
                <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">{label}</label>
                <select value={form[key]} onChange={e => set(key, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "#0d1117", border: "1px solid #30363d", color: "#e6edf3" }}>
                  {opts.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Pattern (Regex)</label>
            <textarea value={form.pattern} onChange={e => set("pattern", e.target.value)} rows={3} placeholder="(?i)(union\s+select|drop\s+table)"
              className="w-full px-3 py-2 rounded-lg text-xs font-mono text-emerald-400 outline-none resize-none" style={{ background: "#030712", border: "1px solid #30363d" }} />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none resize-none" style={{ background: "#0d1117", border: "1px solid #30363d" }} />
          </div>
          {form.pattern && (
            <div className="p-3 rounded-xl space-y-2" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <label className="text-[10px] text-slate-500 uppercase font-mono block">Test Pattern</label>
              <div className="flex gap-2">
                <input value={testPayload} onChange={e => setTestPayload(e.target.value)} placeholder="Enter test payload..."
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs text-white outline-none" style={{ background: "#030712", border: "1px solid #30363d" }} />
                <button type="button" onClick={testPattern} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "#6366f1" }}>Test</button>
              </div>
              {testResult && <p className="text-xs font-semibold" style={{ color: testResult.includes("MATCH") ? "#f43f5e" : "#10b981" }}>{testResult}</p>}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading || !form.name || !form.pattern}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#f43f5e" }}>
              {loading ? "Creating..." : "Create Rule"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white"
              style={{ background: "#0d1117", border: "1px solid #30363d" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RuleRow({ rule, onToggle, onTest, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const catColor = CAT_COLORS[rule.category] || "#64748b";
  const act = ACTION_STYLE[rule.action] || ACTION_STYLE.log;
  const src = SOURCE_STYLE[rule.source] || SOURCE_STYLE.custom;
  const fpRate = rule.hits_blocked > 0 ? ((rule.false_positives / rule.hits_blocked) * 100).toFixed(1) : "0.0";
  return (
    <>
      <tr className="transition-colors cursor-pointer hover:bg-rose-500/3"
        style={{ borderBottom: "1px solid rgba(48,54,61,0.5)", borderLeft: `3px solid ${catColor}` }}
        onClick={() => setExpanded(!expanded)}>
        <td className="px-3 py-3">
          <button onClick={e => { e.stopPropagation(); onToggle(rule, !rule.enabled); }}
            className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
            style={{ background: rule.enabled ? "#f43f5e" : "#374151" }}>
            <div className="absolute w-3.5 h-3.5 rounded-full bg-white top-0.5 transition-all" style={{ left: rule.enabled ? "22px" : "2px" }} />
          </button>
        </td>
        <td className="px-3 py-3"><span className="text-[10px] font-mono text-indigo-400">{rule.rule_id}</span></td>
        <td className="px-3 py-3">
          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase" style={{ color: catColor, background: `${catColor}15` }}>
            {rule.category?.replace(/_/g, " ")}
          </span>
        </td>
        <td className="px-3 py-3"><span className="text-xs text-white">{rule.name}</span></td>
        <td className="px-3 py-3">
          <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: act.color, background: act.bg }}>{act.label}</span>
        </td>
        <td className="px-3 py-3">
          <span className="text-[10px] px-2 py-0.5 rounded font-semibold" style={{ color: src.color, background: src.bg }}>{src.label}</span>
        </td>
        <td className="px-3 py-3"><span className="text-xs font-mono text-white">{rule.hits_blocked?.toLocaleString()}</span></td>
        <td className="px-3 py-3"><span className="text-xs font-mono" style={{ color: rule.false_positives > 10 ? "#eab308" : "#64748b" }}>{rule.false_positives} ({fpRate}%)</span></td>
        <td className="px-3 py-3"><span className="text-[11px] text-slate-600">{rule.last_triggered ? formatDistanceToNow(new Date(rule.last_triggered), { addSuffix: true }) : "Never"}</span></td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => onTest(rule)} className="p-1.5 rounded text-slate-500 hover:text-indigo-400 transition-colors" title="Test Rule">
              <Shield className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(rule.id)} className="p-1.5 rounded text-slate-500 hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: "rgba(15,23,42,0.6)", borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
          <td colSpan={10} className="px-5 py-4">
            <div className="space-y-3">
              {rule.description && <p className="text-xs text-slate-400">{rule.description}</p>}
              {rule.pattern && (
                <div>
                  <p className="text-[10px] text-slate-600 font-mono mb-1">PATTERN</p>
                  <pre className="p-3 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto" style={{ background: "#030712" }}>{rule.pattern}</pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function FirewallPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [testRule, setTestRule] = useState(null);
  const qc = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({ queryKey: ["fw-rules"], queryFn: () => base44.entities.FirewallRule.list("-created_date", 200) });

  const createRule = useMutation({
    mutationFn: (data) => base44.entities.FirewallRule.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fw-rules"] }); toast.success("Rule created"); },
  });
  const updateRule = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FirewallRule.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fw-rules"] }),
  });
  const deleteRule = useMutation({
    mutationFn: (id) => base44.entities.FirewallRule.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fw-rules"] }); toast.success("Rule deleted"); },
  });

  const totalHits = rules.reduce((s, r) => s + (r.hits_blocked || 0), 0);
  const totalFP = rules.reduce((s, r) => s + (r.false_positives || 0), 0);
  const enabled = rules.filter(r => r.enabled).length;

  const grouped = SEV_ORDER.reduce((acc, sev) => {
    const group = rules.filter(r => r.severity === sev);
    if (group.length) acc[sev] = group;
    return acc;
  }, {});

  const SEV_LABEL_COLOR = { critical: "#f43f5e", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      {showCreate && <CreateRuleModal onClose={() => setShowCreate(false)} onCreate={d => createRule.mutateAsync(d)} />}
      {testRule && <TestModal rule={testRule} onClose={() => setTestRule(null)} />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5" style={{ color: "#f43f5e" }} />
          <h1 className="text-xl font-black text-white font-mono">FIREWALL RULES</h1>
          <span className="text-[11px] font-mono text-slate-500">{rules.length} rules</span>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.3)", color: "#f43f5e" }}>
          <Plus className="w-4 h-4" /> Add Custom Rule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Rules", val: rules.length, color: "#e2e8f0" },
          { label: "Enabled", val: enabled, color: "#10b981" },
          { label: "Disabled", val: rules.length - enabled, color: "#64748b" },
          { label: "Hits Blocked", val: totalHits.toLocaleString(), color: "#f43f5e" },
          { label: "False Positives", val: totalFP, color: "#eab308" },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: "1px solid #30363d" }}>
            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-black font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Rules Table — Grouped by Severity */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        {isLoading ? (
          <div className="py-12 text-center text-slate-600">
            <div className="w-6 h-6 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading rules...</p>
          </div>
        ) : (
          Object.entries(grouped).map(([sev, sevRules]) => (
            <div key={sev}>
              <div className="px-4 py-2 flex items-center gap-2" style={{ background: "#030712", borderBottom: "1px solid #30363d" }}>
                <span className="text-[10px] font-bold font-mono uppercase tracking-widest" style={{ color: SEV_LABEL_COLOR[sev] }}>
                  ◆ {sev} — {sevRules.length} rules
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#0d1117", borderBottom: "1px solid #30363d" }}>
                    {["Enable", "Rule ID", "Category", "Name", "Action", "Source", "Hits Blocked", "False Pos.", "Last Triggered", ""].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ background: "#0d1117" }}>
                  {sevRules.map(rule => (
                    <RuleRow key={rule.id} rule={rule}
                      onToggle={(r, v) => updateRule.mutate({ id: r.id, data: { enabled: v } })}
                      onTest={setTestRule}
                      onDelete={(id) => { if (confirm("Delete this rule?")) deleteRule.mutate(id); }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}