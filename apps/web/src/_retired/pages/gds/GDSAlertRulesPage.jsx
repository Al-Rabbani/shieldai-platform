import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Bell, Play, RefreshCw, CheckCircle, XCircle, Zap,
  ToggleLeft, ToggleRight, Webhook, AlertTriangle
} from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, KpiCard, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const PRIORITY_COLOR = { P0: DANGER, P1: HIGH, P2: MEDIUM };

function PriorityBadge({ p }) {
  const color = PRIORITY_COLOR[p] || MUTED;
  return <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>{p}</span>;
}

function ChannelTag({ ch }) {
  const map = { slack: [CYAN, "Slack"], pagerduty: ["#e75480", "PD"], email: [LOW, "Email"], jira: ["#0052cc", "Jira"], splunk: ["#ff5733", "Splunk"] };
  const [color, label] = map[ch] || [MUTED, ch];
  return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>{label}</span>;
}

export default function GDSAlertRulesPage() {
  const [rulesData, setRulesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [evalLoading, setEvalLoading] = useState({});
  const [evalResults, setEvalResults] = useState({});
  const [webhooks, setWebhooks] = useState(null);
  const [testLoading, setTestLoading] = useState({});
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    Promise.all([
      base44.functions.invoke("gdsAlertRuleEngine", { action: "list_rules" }),
      base44.functions.invoke("gdsAlertRuleEngine", { action: "templates" }),
    ]).then(([r, w]) => {
      setRulesData(r.data);
      setWebhooks(w.data?.integrations || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const runAll = async () => {
    setRunLoading(true); setRunResults(null);
    try {
      const res = await base44.functions.invoke("gdsAlertRuleEngine", { action: "run_all_rules" });
      setRunResults(res.data);
    } catch (e) { console.error(e); }
    finally { setRunLoading(false); }
  };

  const evaluate = async (ruleId) => {
    setEvalLoading(p => ({ ...p, [ruleId]: true }));
    try {
      const res = await base44.functions.invoke("gdsAlertRuleEngine", { action: "evaluate_rule", rule_id: ruleId });
      setEvalResults(p => ({ ...p, [ruleId]: res.data }));
    } catch (e) { console.error(e); }
    finally { setEvalLoading(p => ({ ...p, [ruleId]: false })); }
  };

  const testWebhook = async (id) => {
    setTestLoading(p => ({ ...p, [id]: true }));
    try {
      const res = await base44.functions.invoke("gdsAlertRuleEngine", { action: "test", integration: id });
      setTestResults(p => ({ ...p, [id]: res.data }));
    } catch (e) { console.error(e); }
    finally { setTestLoading(p => ({ ...p, [id]: false })); }
  };

  const firedAlerts = runResults?.results?.filter(r => r.fired) || [];

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "Alert Rules" }]} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Custom Alert Rule Engine</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Define, evaluate, and fire security alerts across all channels</p>
        </div>
        <button onClick={runAll} disabled={runLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {runLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {runLoading ? "Evaluating…" : "Run All Rules Now"}
        </button>
      </div>

      {loading ? <Skeleton lines={3} /> : rulesData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Rules Total" value={rulesData.total} color={CYAN} icon={Bell} />
          <KpiCard label="Enabled" value={rulesData.enabled} color={LOW} icon={CheckCircle} />
          <KpiCard label="Last Evaluated" value={timeAgo(rulesData.last_evaluated)} color={MUTED} icon={RefreshCw} />
          <KpiCard label="Rules Fired Today" value={rulesData.rules_fired_today} color={DANGER} icon={Zap} pulse={rulesData.rules_fired_today > 0} />
        </div>
      )}

      {/* Run Results — Fired Alerts */}
      {runResults && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-white">Run Results</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `${DANGER}15`, color: DANGER }}>{runResults.fired_count} fired</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `${LOW}15`, color: LOW }}>{runResults.silent_count} silent</span>
          </div>
          {firedAlerts.length === 0
            ? <p className="text-xs" style={{ color: MUTED }}>No rules fired — all clear.</p>
            : (
              <div className="space-y-2">
                {firedAlerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
                    <PriorityBadge p={a.priority} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{a.rule_name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{a.message}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {a.channels.map(ch => <ChannelTag key={ch} ch={ch} />)}
                    </div>
                    <span className="text-[9px] flex-shrink-0" style={{ color: MUTED }}>{timeAgo(a.evaluated_at)}</span>
                  </div>
                ))}
              </div>
            )}
        </Card>
      )}

      {/* Rules Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Alert Rules</h3>
        </div>
        {!rulesData?.rules?.length
          ? <EmptyState icon={Bell} title="No rules configured" description="Rules will appear here" />
          : (
            <div className="divide-y" style={{ borderColor: BORDER }}>
              {rulesData.rules.map((rule, i) => {
                const ev = evalResults[rule.id];
                return (
                  <div key={rule.id} className="p-4" style={{ background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <PriorityBadge p={rule.priority} />
                      <p className="text-xs font-semibold text-white flex-1 min-w-0 truncate">{rule.name}</p>
                      <span className="text-[10px] font-mono hidden sm:block" style={{ color: CYAN }}>{rule.entity}</span>
                      <div className="flex gap-1">
                        {rule.channels.map(ch => <ChannelTag key={ch} ch={ch} />)}
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: MUTED }}>{rule.fires_count} fires</span>
                      <div className="flex items-center gap-1" style={{ color: rule.enabled ? LOW : MUTED }}>
                        {rule.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </div>
                      <button onClick={() => evaluate(rule.id)} disabled={evalLoading[rule.id]}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold disabled:opacity-50"
                        style={{ background: `${CYAN}12`, color: CYAN, border: `1px solid ${CYAN}25` }}>
                        {evalLoading[rule.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Evaluate
                      </button>
                    </div>
                    <p className="text-[10px] mt-1.5 ml-1 font-mono" style={{ color: MUTED }}>{rule.condition}</p>
                    {ev && (
                      <div className="mt-3 p-3 rounded-xl space-y-1.5" style={{ background: `${CYAN}06`, border: `1px solid ${CYAN}20` }}>
                        <div className="flex items-center gap-3 flex-wrap text-[11px]">
                          <span style={{ color: MUTED }}>Entity: <span className="font-bold text-white">{ev.entity_scanned}</span></span>
                          <span style={{ color: MUTED }}>Scanned: <span className="font-bold text-white">{ev.records_scanned}</span></span>
                          <span style={{ color: MUTED }}>Matches: <span className="font-bold text-white">{ev.matches}</span></span>
                          <span className={`font-black text-[10px] px-2 py-0.5 rounded-full`} style={{ background: ev.would_fire ? `${DANGER}15` : `${LOW}15`, color: ev.would_fire ? DANGER : LOW }}>
                            {ev.would_fire ? "WOULD FIRE" : "SILENT"}
                          </span>
                        </div>
                        {ev.sample_messages?.map((msg, mi) => (
                          <p key={mi} className="text-[10px] font-mono pl-1" style={{ color: HIGH }}>{msg}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </Card>

      {/* Webhook Configuration */}
      {webhooks && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Webhook Integrations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {webhooks.map(wh => {
              const tr = testResults[wh.id];
              return (
                <Card key={wh.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">{wh.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: wh.configured ? LOW : MEDIUM }} />
                      <span className="text-[10px] font-semibold" style={{ color: wh.configured ? LOW : MEDIUM }}>
                        {wh.configured ? "Configured" : "Not Configured"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono" style={{ color: MUTED }}>{wh.secret_key}</p>
                  <button onClick={() => testWebhook(wh.id)} disabled={testLoading[wh.id]}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                    style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}25`, color: CYAN }}>
                    {testLoading[wh.id] ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Test Webhook
                  </button>
                  {tr && (
                    <div className="flex items-center gap-2 p-2 rounded-lg text-[11px]" style={{ background: tr.success ? `${LOW}10` : `${DANGER}10` }}>
                      {tr.success ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: DANGER }} />}
                      <span style={{ color: tr.success ? LOW : DANGER }}>{tr.message}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}