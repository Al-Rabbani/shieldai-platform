import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Play, CheckCircle, XCircle, Zap } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Skeleton, Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

const STEP_FN_COLOR = { 'shieldAutoTriage': CYAN, 'shieldAutoFix': LOW, 'shieldSlackCriticalAlert': HIGH, 'gdsJiraIntegration': MEDIUM, 'gdsRegulatoryIntel': "#8b5cf6", 'gdsRuntimeProtectionEngine': DANGER, 'shieldDarkWebMonitor': DANGER, 'gdsWeeklyReport': CYAN, 'shieldWeeklySummary': MUTED, 'AuditLog.create': LOW, 'TriagedFinding.filter': CYAN };

function PlaybookCard({ pb, onRun, running }) {
  return (
    <Card glow className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white mb-1">{pb.name}</p>
          <p className="text-[10px] mb-2" style={{ color: MUTED }}>{pb.trigger}</p>
          <p className="text-xs" style={{ color: TEXT }}>{pb.description}</p>
        </div>
        <button onClick={() => onRun(pb.id)} disabled={running === pb.id}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50 flex-shrink-0"
          style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
          {running === pb.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {pb.functions_called?.map(fn => (
          <span key={fn} className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ color: STEP_FN_COLOR[fn] || MUTED, background: `${STEP_FN_COLOR[fn] || MUTED}12`, border: `1px solid ${STEP_FN_COLOR[fn] || MUTED}20` }}>{fn}</span>
        ))}
      </div>
      <p className="text-[10px]" style={{ color: MUTED }}>{pb.steps_count} steps</p>
    </Card>
  );
}

function CaseResult({ result }) {
  if (!result) return null;
  const statusColor = result.status === 'completed' ? LOW : result.status === 'partial' ? MEDIUM : DANGER;
  return (
    <Card className="p-5" style={{ border: `1px solid ${statusColor}40` }}>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-xs font-black px-2 py-1 rounded-lg" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>🔴 LIVE EXECUTION</span>
        <span className="font-mono text-xs" style={{ color: MUTED }}>{result.case_id}</span>
        <span className="text-xs font-black px-2 py-0.5 rounded uppercase" style={{ color: statusColor, background: `${statusColor}15` }}>{result.status}</span>
        <span className="text-xs ml-auto" style={{ color: MUTED }}>{result.total_duration_ms}ms · {result.steps_completed}/{result.steps_total} steps</span>
      </div>
      <div className="space-y-2">
        {result.step_results?.map((step, i) => {
          const sc = step.status === 'success' ? LOW : DANGER;
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              {step.status === 'success' ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: DANGER }} />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold" style={{ color: STEP_FN_COLOR[step.function] || CYAN }}>{step.function}</span>
                  <span className="text-[9px]" style={{ color: MUTED }}>{step.duration_ms}ms</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase ml-auto" style={{ color: sc, background: `${sc}15` }}>{step.status}</span>
                </div>
                {step.result && <pre className="text-[10px] font-mono overflow-x-auto" style={{ color: MUTED }}>{JSON.stringify(step.result, null, 2)}</pre>}
                {step.error && <p className="text-[10px]" style={{ color: DANGER }}>{step.error}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function GDSSOARPage() {
  const [running, setRunning] = useState(null);
  const [caseResult, setCaseResult] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["gds-soar-cases"],
    queryFn: () => base44.functions.invoke("gdsRealSOAR", { action: "list_cases" }).then(r => r.data),
  });

  const runPlaybook = async (id) => {
    setRunning(id); setCaseResult(null);
    try {
      const r = await base44.functions.invoke("gdsRealSOAR", { action: "run_case", playbook_id: id });
      setCaseResult(r.data);
      refetch();
    } catch (e) { console.error(e); }
    finally { setRunning(null); }
  };

  const playbooks = data?.playbooks || [];
  const recentCases = data?.recent_cases || [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "SOAR Playbooks" }]} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">SOAR Playbooks</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Security Orchestration, Automation & Response — real function execution</p>
        </div>
        <LiveDataBadge />
      </div>

      {/* Live execution banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: `${LOW}08`, border: `2px solid ${LOW}40` }}>
        <span className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0" style={{ background: LOW }} />
        <span className="text-sm font-bold" style={{ color: LOW }}>🔴 LIVE — Real Function Execution, No Simulation</span>
        <span className="text-xs ml-auto" style={{ color: MUTED }}>All playbook runs write to AuditLog entity and call real backend functions</span>
      </div>

      {/* Playbooks */}
      {isLoading ? <Skeleton lines={3} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {playbooks.map(pb => <PlaybookCard key={pb.id} pb={pb} onRun={runPlaybook} running={running} />)}
        </div>
      )}

      {/* Case result */}
      {caseResult && <CaseResult result={caseResult} />}

      {/* Recent Cases */}
      {recentCases.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="text-sm font-bold text-white">Recent Cases <span className="text-[10px] ml-2" style={{ color: MUTED }}>(from AuditLog entity)</span></h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Case ID", "Playbook", "Actor", "Resource", "When"].map(h => (
                  <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentCases.map((c, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}15` }}>
                  <td className="py-2 px-4 font-mono text-[10px]" style={{ color: CYAN }}>{c.case_id?.slice(0, 8)}…</td>
                  <td className="py-2 px-4 text-white">{c.playbook}</td>
                  <td className="py-2 px-4" style={{ color: MUTED }}>{c.actor}</td>
                  <td className="py-2 px-4" style={{ color: MUTED }}>{c.resource}</td>
                  <td className="py-2 px-4" style={{ color: MUTED }}>{timeAgo(c.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}