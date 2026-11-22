import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Plus, Trash2, ChevronDown, ChevronUp, Play, FileText } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, Skeleton, EmptyState, Card, KpiCard, Breadcrumb, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

const CATEGORY_COLORS = { security: DANGER, compliance: CYAN, quality: LOW, governance: "#8b5cf6", default: MUTED };
const ENTITIES = ["TriagedFinding","CloudFinding","CIEMFinding","ContainerFinding","VMFinding","SASTFinding","SCAFinding"];
const OPERATORS = ["equals","not_equals","gt","gte","lt","lte","contains","not_contains","exists","not_exists"];

function CategoryBadge({ cat }) {
  const c = CATEGORY_COLORS[cat?.toLowerCase()] || CATEGORY_COLORS.default;
  return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase"
      style={{ color: c, background: `${c}18`, border: `1px solid ${c}30` }}>{cat || "—"}</span>
  );
}

export default function GDSPolicyBuilderPage() {
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [evalResults, setEvalResults] = useState({});
  const [evalLoading, setEvalLoading] = useState({});

  // Custom rule state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleEntity, setRuleEntity] = useState("TriagedFinding");
  const [ruleSeverity, setRuleSeverity] = useState("critical");
  const [ruleFramework, setRuleFramework] = useState("");
  const [ruleControlId, setRuleControlId] = useState("");
  const [conditions, setConditions] = useState([{ field: "", operator: "equals", value: "" }]);
  const [customResult, setCustomResult] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

  useEffect(() => {
    base44.functions.invoke("gdsPolicyRuleBuilder", { action: "list_rules" })
      .then(r => {
        if (r.data?.rules) setRules(r.data.rules);
        else if (Array.isArray(r.data)) setRules(r.data);
        if (r.data?.templates) setTemplates(r.data.templates);
        if (r.data?.stats) setStats(r.data.stats);
        if (r.data?.summary) setStats(r.data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const runAll = async () => {
    setRunningAll(true);
    try {
      const r = await base44.functions.invoke("gdsPolicyRuleBuilder", { action: "run_all" });
      if (r.data?.results) setRules(r.data.results);
      else if (Array.isArray(r.data)) setRules(r.data);
      setLastRun(new Date().toISOString());
    } catch (e) { console.error(e); }
    finally { setRunningAll(false); }
  };

  const evaluateTemplate = async (tid) => {
    setEvalLoading(p => ({ ...p, [tid]: true }));
    try {
      const r = await base44.functions.invoke("gdsPolicyRuleBuilder", { action: "evaluate", template_id: tid });
      setEvalResults(p => ({ ...p, [tid]: r.data }));
    } catch (e) { setEvalResults(p => ({ ...p, [tid]: { error: e.message } })); }
    finally { setEvalLoading(p => ({ ...p, [tid]: false })); }
  };

  const evaluateCustom = async () => {
    setCustomLoading(true); setCustomResult(null);
    try {
      const r = await base44.functions.invoke("gdsPolicyRuleBuilder", {
        action: "evaluate",
        custom_rule: {
          name: ruleName, entity: ruleEntity, severity: ruleSeverity,
          framework: ruleFramework, control_id: ruleControlId,
          conditions: conditions.filter(c => c.field),
        },
      });
      setCustomResult(r.data);
    } catch (e) { setCustomResult({ error: e.message }); }
    finally { setCustomLoading(false); }
  };

  const addCondition = () => setConditions(c => [...c, { field: "", operator: "equals", value: "" }]);
  const removeCondition = (i) => setConditions(c => c.filter((_, idx) => idx !== i));
  const updateCondition = (i, key, val) => setConditions(c => c.map((cond, idx) => idx === i ? { ...cond, [key]: val } : cond));

  const s = stats || {};
  const displayTemplates = templates.length > 0 ? templates : rules.filter(r => r.is_template || r.type === "template");

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Policy Rule Builder" }]} />
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Custom Policy Rule Builder</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Define, evaluate, and enforce security policies across all entities</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && <span className="text-[10px]" style={{ color: MUTED }}>Last run: {timeAgo(lastRun)}</span>}
          <button onClick={runAll} disabled={runningAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <RefreshCw className={`w-4 h-4 ${runningAll ? "animate-spin" : ""}`} />
            {runningAll ? "Running…" : "Run All Policies"}
          </button>
        </div>
      </div>

      {loading ? <Skeleton lines={3} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Built-in Templates" value={s.builtin_templates ?? s.templates ?? displayTemplates.length} color={CYAN}   icon={FileText} />
          <KpiCard label="Total Violations"   value={s.total_violations ?? s.violations ?? 0}                         color={DANGER} icon={RefreshCw} pulse />
          <KpiCard label="Critical"           value={s.critical_violations ?? s.critical ?? 0}                        color={DANGER} icon={RefreshCw} />
          <KpiCard label="High"               value={s.high_violations ?? s.high ?? 0}                                color={HIGH}   icon={RefreshCw} />
        </div>
      )}

      {/* Policy Results Table */}
      {rules.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="font-bold text-white">Policy Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["ID","Name","Category","Severity","Violations","Status"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r, i) => {
                  const compliant = (r.violations_count ?? r.violations ?? 0) === 0;
                  const sc = compliant ? LOW : DANGER;
                  return (
                    <tr key={r.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-2 text-[10px] font-mono" style={{ color: MUTED }}>{r.id || `P-${i+1}`}</td>
                      <td className="px-4 py-2 text-xs text-white">{r.name}</td>
                      <td className="px-4 py-2"><CategoryBadge cat={r.category} /></td>
                      <td className="px-4 py-2"><SevBadge sev={r.severity} /></td>
                      <td className="px-4 py-2 text-xs font-mono font-bold" style={{ color: (r.violations_count ?? 0) > 0 ? DANGER : LOW }}>
                        {r.violations_count ?? r.violations ?? 0}
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color: sc, background: `${sc}18` }}>
                          {compliant ? "COMPLIANT" : "VIOLATION"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Template Cards */}
      {displayTemplates.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Policy Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayTemplates.slice(0, 8).map((t, i) => {
              const tid = t.id || t.template_id || `tpl-${i}`;
              const er = evalResults[tid];
              const el = evalLoading[tid];
              return (
                <Card key={tid} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{t.name || t.template_name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{t.description}</p>
                    </div>
                    <CategoryBadge cat={t.category} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.framework && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>{t.framework}</span>
                    )}
                    {t.control_id && (
                      <span className="text-[9px] font-mono" style={{ color: MUTED }}>{t.control_id}</span>
                    )}
                  </div>
                  <button onClick={() => evaluateTemplate(tid)} disabled={el}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
                    {el ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    {el ? "Evaluating…" : "Evaluate"}
                  </button>
                  {er && (
                    <div className="p-2 rounded-lg text-[10px]" style={{ background: `${CYAN}06`, border: `1px solid ${BORDER}` }}>
                      {er.error
                        ? <span style={{ color: DANGER }}>{er.error}</span>
                        : <>
                            <span className="font-bold" style={{ color: MUTED }}>Violations: </span>
                            <span className="font-black font-mono" style={{ color: (er.violations_found ?? 0) > 0 ? DANGER : LOW }}>{er.violations_found ?? 0}</span>
                            {er.summary && <span className="ml-2" style={{ color: MUTED }}>{er.summary}</span>}
                          </>}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Rule Builder */}
      <Card className="overflow-hidden">
        <button className="w-full flex items-center justify-between p-4"
          onClick={() => setBuilderOpen(o => !o)}>
          <span className="text-sm font-bold text-white">Custom Rule Builder</span>
          {builderOpen ? <ChevronUp className="w-4 h-4" style={{ color: MUTED }} /> : <ChevronDown className="w-4 h-4" style={{ color: MUTED }} />}
        </button>
        {builderOpen && (
          <div className="px-4 pb-5 space-y-4 border-t" style={{ borderColor: BORDER }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
              {[
                { label: "Rule Name", val: ruleName, set: setRuleName, placeholder: "My Custom Rule" },
                { label: "Framework", val: ruleFramework, set: setRuleFramework, placeholder: "e.g. SOC2" },
                { label: "Control ID", val: ruleControlId, set: setRuleControlId, placeholder: "e.g. CC6.1" },
              ].map(({ label, val, set, placeholder }) => (
                <div key={label}>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: MUTED }}>{label}</label>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: MUTED }}>Entity</label>
                <select value={ruleEntity} onChange={e => setRuleEntity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}>
                  {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: MUTED }}>Severity</label>
                <select value={ruleSeverity} onChange={e => setRuleSeverity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}>
                  {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Conditions</label>
                <button onClick={addCondition} disabled={conditions.length >= 5}
                  className="flex items-center gap-1 text-[10px] font-bold disabled:opacity-40"
                  style={{ color: CYAN }}>
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={c.field} onChange={e => updateCondition(i, "field", e.target.value)}
                      placeholder="field (e.g. severity)"
                      className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
                    <select value={c.operator} onChange={e => updateCondition(i, "operator", e.target.value)}
                      className="px-2 py-2 rounded-xl text-xs outline-none"
                      style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}>
                      {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input value={c.value} onChange={e => updateCondition(i, "value", e.target.value)}
                      placeholder="value"
                      className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
                    <button onClick={() => removeCondition(i)} className="p-1 hover:text-red-400 transition-colors" style={{ color: MUTED }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={evaluateCustom} disabled={customLoading || !ruleName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40`, color: DANGER }}>
              {customLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {customLoading ? "Evaluating…" : "Evaluate Custom Rule"}
            </button>

            {customResult && (
              <div className="p-4 rounded-xl space-y-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                {customResult.error ? (
                  <p className="text-xs" style={{ color: DANGER }}>{customResult.error}</p>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold" style={{ color: MUTED }}>Violations Found:</span>
                      <span className="text-2xl font-black font-mono" style={{ color: (customResult.violations_found ?? 0) > 0 ? DANGER : LOW }}>
                        {customResult.violations_found ?? 0}
                      </span>
                    </div>
                    {customResult.summary && <p className="text-xs" style={{ color: MUTED }}>{customResult.summary}</p>}
                    {customResult.sample_violations?.slice(0, 3).map((v, i) => (
                      <p key={i} className="text-[11px] font-mono" style={{ color: HIGH }}>• {v.title || v.id || JSON.stringify(v)}</p>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}