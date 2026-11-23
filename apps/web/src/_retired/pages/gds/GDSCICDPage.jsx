import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, GitBranch, Shield, CheckCircle, XCircle, AlertTriangle, Play, Code2 } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, StatusBadge, Skeleton, EmptyState, Card, KpiCard, Breadcrumb, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

const DECISION_CONFIG = {
  APPROVED: { color: LOW,    bg: `${LOW}12`,    border: `${LOW}40`,    icon: CheckCircle  },
  WARN:     { color: HIGH,   bg: `${HIGH}12`,   border: `${HIGH}40`,   icon: AlertTriangle },
  BLOCKED:  { color: DANGER, bg: `${DANGER}12`, border: `${DANGER}40`, icon: XCircle      },
};

function PolicyCard({ policy }) {
  const blockColor = policy.action === "block" ? DANGER : policy.action === "warn" ? HIGH : LOW;
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-white">{policy.name || policy.policy_name}</p>
        <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase flex-shrink-0"
          style={{ color: blockColor, background: `${blockColor}18`, border: `1px solid ${blockColor}30` }}>
          {policy.action || "—"}
        </span>
      </div>
      {policy.description && <p className="text-[11px]" style={{ color: MUTED }}>{policy.description}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        {(policy.applies_to || []).map(t => (
          <span key={t} className="text-[9px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${CYAN}10`, color: CYAN, border: `1px solid ${CYAN}20` }}>{t}</span>
        ))}
      </div>
      {policy.status && (
        <span className="inline-block text-[9px] font-black px-2 py-0.5 rounded uppercase"
          style={{
            color: policy.status === "PASS" ? LOW : policy.status === "BLOCK" ? DANGER : HIGH,
            background: policy.status === "PASS" ? `${LOW}15` : policy.status === "BLOCK" ? `${DANGER}15` : `${HIGH}15`,
          }}>
          {policy.status}
        </span>
      )}
    </Card>
  );
}

export default function GDSCICDPage() {
  const [status, setStatus] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [repo, setRepo] = useState("Al-Rabbani/gds-os");
  const [branch, setBranch] = useState("main");
  const [trigger, setTrigger] = useState("pull_request");
  const [gateLoading, setGateLoading] = useState(false);
  const [gateResult, setGateResult] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.functions.invoke("gdsCICDPipelineSecurity", { action: "pipeline_status" }).catch(() => ({})),
      base44.functions.invoke("gdsCICDPipelineSecurity", { action: "policy_config" }).catch(() => ({})),
    ]).then(([s, p]) => {
      if (s.data) setStatus(s.data);
      if (p.data?.policies) setPolicies(p.data.policies);
      else if (Array.isArray(p.data)) setPolicies(p.data);
    }).finally(() => setLoading(false));
  }, []);

  const runGate = async () => {
    setGateLoading(true); setGateResult(null);
    try {
      const r = await base44.functions.invoke("gdsCICDPipelineSecurity", {
        action: "gate_check", repo, branch, trigger,
      });
      if (r.data) setGateResult(r.data);
    } catch (e) { console.error(e); }
    finally { setGateLoading(false); }
  };

  const stats = status || {};
  const scans = stats.scan_history || stats.recent_scans || [];
  const decision = gateResult?.decision?.toUpperCase();
  const dc = DECISION_CONFIG[decision] || {};
  const DecisionIcon = dc.icon;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "CI/CD Pipeline Security" }]} />
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">CI/CD Pipeline Security Gate</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Automated security gates for every pipeline run</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-3 py-1.5 rounded-full"
            style={{
              color: stats.ci_gate_enabled ? LOW : DANGER,
              background: stats.ci_gate_enabled ? `${LOW}15` : `${DANGER}15`,
              border: `1px solid ${stats.ci_gate_enabled ? LOW : DANGER}40`,
            }}>
            CI GATE {stats.ci_gate_enabled ? "ENABLED" : "DISABLED"}
          </span>
        </div>
      </div>

      {loading ? <Skeleton lines={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Scans"     value={stats.total_scans ?? stats.scans_total ?? 0}              color={CYAN}   icon={GitBranch} />
          <KpiCard label="Blocked"         value={stats.blocked_count ?? stats.blocked ?? 0}                color={DANGER} icon={XCircle}   pulse />
          <KpiCard label="Block Rate"      value={`${stats.block_rate_pct ?? stats.block_rate ?? 0}%`}      color={HIGH}   icon={Shield}    />
          <KpiCard label="Policies Active" value={stats.policies_active ?? stats.active_policies ?? policies.length} color={LOW} icon={CheckCircle} />
        </div>
      )}

      {/* Policy Cards */}
      {policies.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Active Policies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((p, i) => <PolicyCard key={i} policy={p} />)}
          </div>
        </div>
      )}

      {/* Gate Check Panel */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Run Gate Check</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: MUTED }}>Repository</label>
            <input value={repo} onChange={e => setRepo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: MUTED }}>Branch</label>
            <input value={branch} onChange={e => setBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: MUTED }}>Trigger</label>
            <select value={trigger} onChange={e => setTrigger(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}>
              <option value="pull_request">pull_request</option>
              <option value="push">push</option>
              <option value="main_merge">main_merge</option>
            </select>
          </div>
        </div>
        <button onClick={runGate} disabled={gateLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {gateLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {gateLoading ? "Running…" : "Run Gate Check"}
        </button>

        {gateResult && (
          <div className="space-y-4 pt-2">
            {/* Decision Banner */}
            {decision && (
              <div className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: dc.bg, border: `1px solid ${dc.border}` }}>
                {DecisionIcon && <DecisionIcon className="w-5 h-5 flex-shrink-0" style={{ color: dc.color }} />}
                <p className="text-base font-black" style={{ color: dc.color }}>{decision}</p>
                {gateResult.gate_message && <p className="text-sm" style={{ color: MUTED }}>{gateResult.gate_message}</p>}
              </div>
            )}

            {/* Policy Results */}
            {(gateResult.policy_results || []).length > 0 && (
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">Policy Results</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                        {["Policy","Status","Reason","Count"].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gateResult.policy_results.map((r, i) => {
                        const sc = r.status === "PASS" ? LOW : r.status === "BLOCK" ? DANGER : HIGH;
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                            <td className="px-3 py-2 text-xs text-white">{r.policy || r.name}</td>
                            <td className="px-3 py-2">
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: sc, background: `${sc}18` }}>{r.status}</span>
                            </td>
                            <td className="px-3 py-2 text-[11px]" style={{ color: MUTED }}>{r.reason || "—"}</td>
                            <td className="px-3 py-2 text-xs font-mono" style={{ color: MUTED }}>{r.count ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* GitHub Status */}
            {gateResult.github_status && (
              <div className="p-3 rounded-xl space-y-1" style={{ background: "#050e1f", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-black text-white uppercase tracking-widest mb-2">GitHub Status Update</p>
                {["state","description","context"].map(k => gateResult.github_status[k] && (
                  <p key={k} className="text-[11px]">
                    <span className="font-bold" style={{ color: MUTED }}>{k}: </span>
                    <span className="text-white">{gateResult.github_status[k]}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Autofix */}
            {gateResult.autofix_recommendation && (
              <div className="p-3 rounded-xl" style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: LOW }}>AutoFix Recommendation</p>
                <p className="text-xs text-white">{gateResult.autofix_recommendation}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Recent Scan Jobs */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">Recent Scan Jobs</h3>
        </div>
        {scans.length === 0 ? (
          <EmptyState icon={Code2} title="No scan jobs yet" description="Run a gate check to start tracking" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["Type","Target","Status","Trigger","Branch","Critical","Started"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.slice(0, 20).map((s, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: CYAN }}>{s.job_type || s.type}</td>
                    <td className="px-4 py-2 text-xs text-white truncate max-w-[160px]">{s.target || s.repo}</td>
                    <td className="px-4 py-2"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-2 text-xs" style={{ color: MUTED }}>{s.trigger}</td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: MUTED }}>{s.branch}</td>
                    <td className="px-4 py-2 text-xs font-mono text-center" style={{ color: (s.critical_count ?? 0) > 0 ? DANGER : MUTED }}>{s.critical_count ?? 0}</td>
                    <td className="px-4 py-2 text-xs" style={{ color: MUTED }}>{timeAgo(s.started_at || s.created_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}