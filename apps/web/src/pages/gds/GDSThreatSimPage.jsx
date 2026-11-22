import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, AlertTriangle, CheckCircle, Minus, Play } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, Card, Breadcrumb, PAGE_BG
} from "@/components/gds/GDSOSShared";

const SCENARIOS = [
  { id: "ransomware_lockbit3",       name: "Ransomware Attack",             subtitle: "LockBit 3.0",       threat_actor: "LockBit Group",    phases: 6, icon: "🔒" },
  { id: "npm_supply_chain_lazarus",  name: "NPM Supply Chain Compromise",   subtitle: "Lazarus Group",     threat_actor: "Lazarus (DPRK)",   phases: 5, icon: "📦" },
  { id: "cloud_account_takeover",    name: "Cloud Account Takeover",        subtitle: "Scattered Spider",  threat_actor: "Scattered Spider", phases: 5, icon: "☁️" },
  { id: "api_exploitation",          name: "API Exploitation",              subtitle: "Generic APT",       threat_actor: "Unknown APT",      phases: 4, icon: "🔌" },
];

const PROB_COLOR = (p) => p > 70 ? DANGER : p > 50 ? HIGH : p > 25 ? MEDIUM : LOW;

function ProbGauge({ prob }) {
  const color = PROB_COLOR(prob);
  const r = 44, cx = 52, cy = 52, circ = 2 * Math.PI * r;
  const pct = Math.min(prob, 100) / 100;
  return (
    <svg width={104} height={104} viewBox="0 0 104 104">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: "stroke-dasharray 0.8s ease" }} />
      <text x={cx} y={cy + 5} fill={color} fontSize={18} textAnchor="middle" fontWeight="900" fontFamily="monospace">{prob}%</text>
    </svg>
  );
}

function KillChainStep({ phase }) {
  const status = phase.status || "MONITOR";
  const color = status === "VULNERABLE" ? DANGER : status === "BLOCKED" ? LOW : MEDIUM;
  const Icon = status === "VULNERABLE" ? AlertTriangle : status === "BLOCKED" ? CheckCircle : Minus;
  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <p className="text-[9px] text-center font-semibold text-white">{phase.phase || phase.name}</p>
      <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color, background: `${color}18` }}>{status}</span>
    </div>
  );
}

export default function GDSThreatSimPage() {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [allResults, setAllResults] = useState(null);

  const runSim = async (scenario) => {
    setSelected(scenario.id); setResult(null); setLoading(true);
    try {
      const r = await base44.functions.invoke("gdsThreatSimulation", { action: "simulate", scenario_id: scenario.id });
      if (r.data) setResult(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const runAll = async () => {
    setRunningAll(true); setAllResults(null);
    const results = [];
    for (const s of SCENARIOS) {
      try {
        const r = await base44.functions.invoke("gdsThreatSimulation", { action: "simulate", scenario_id: s.id });
        results.push({ ...s, ...r.data });
      } catch (e) { results.push({ ...s, success_probability: 0, risk_level: "unknown", gaps_count: 0 }); }
    }
    setAllResults(results); setRunningAll(false);
  };

  const phases = result?.kill_chain || result?.phases || [];
  const gaps = result?.gaps_detected || result?.gaps || [];
  const iocs = result?.iocs || [];
  const mitigations = result?.recommended_mitigations || result?.mitigations || [];
  const decision = (result?.decision || result?.risk_level || "").toUpperCase();
  const decisionColor = decision === "BLOCKED" ? DANGER : decision === "HIGH" || decision === "WARN" ? HIGH : decision === "APPROVED" || decision === "LOW" ? LOW : CYAN;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Threat Simulation" }]} />
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Red Team Threat Simulation</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>AI-driven adversary simulation against your real security posture</p>
        </div>
        <button onClick={runAll} disabled={runningAll || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${DANGER}12`, border: `1px solid ${DANGER}30`, color: DANGER }}>
          <RefreshCw className={`w-4 h-4 ${runningAll ? "animate-spin" : ""}`} />
          {runningAll ? "Running All…" : "Run All Scenarios"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCENARIOS.map(s => (
          <button key={s.id} onClick={() => runSim(s)} disabled={loading}
            className="text-left p-5 rounded-2xl transition-all hover:scale-[1.01] disabled:opacity-60"
            style={{ background: selected === s.id ? `${DANGER}10` : CARD, border: `1px solid ${selected === s.id ? DANGER + "50" : BORDER}` }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{s.name}</p>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>{s.subtitle}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: DANGER, background: `${DANGER}15` }}>{s.threat_actor}</span>
                  <span className="text-[10px]" style={{ color: MUTED }}>{s.phases} phases</span>
                </div>
              </div>
              {selected === s.id && loading && <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: CYAN }} />}
            </div>
          </button>
        ))}
      </div>

      {result && !loading && (
        <Card className="p-5 space-y-5" style={{ border: `1px solid ${DANGER}30` }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-base font-black text-white">Simulation Results — {SCENARIOS.find(s => s.id === selected)?.name}</h3>
            {result.risk_level && <SevBadge sev={result.risk_level} />}
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex flex-col items-center gap-1">
              <ProbGauge prob={result.success_probability ?? 0} />
              <p className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Success Probability</p>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1">
              {result.avg_dwell_time_days != null && (
                <div className="p-3 rounded-xl text-center" style={{ background: `${HIGH}10`, border: `1px solid ${HIGH}20` }}>
                  <p className="text-[9px] uppercase" style={{ color: MUTED }}>Avg Dwell</p>
                  <p className="text-xl font-black font-mono" style={{ color: HIGH }}>{result.avg_dwell_time_days}d</p>
                </div>
              )}
              {gaps.length > 0 && (
                <div className="p-3 rounded-xl text-center" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}20` }}>
                  <p className="text-[9px] uppercase" style={{ color: MUTED }}>Gaps</p>
                  <p className="text-xl font-black font-mono" style={{ color: DANGER }}>{gaps.length}</p>
                </div>
              )}
            </div>
          </div>

          {gaps.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Gaps Detected</h4>
              {gaps.map((g, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: DANGER }} />
                  <p className="text-xs text-white">{typeof g === "string" ? g : g.description || g.gap}</p>
                </div>
              ))}
            </div>
          )}

          {phases.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Kill Chain Timeline</h4>
              <div className="flex items-start gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {phases.map((p, i) => (
                  <React.Fragment key={i}>
                    <KillChainStep phase={p} />
                    {i < phases.length - 1 && <div className="flex-shrink-0 mt-4 h-0.5 w-6" style={{ background: BORDER }} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {iocs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-white uppercase tracking-widest">IOCs</h4>
              <div className="p-3 rounded-xl space-y-1" style={{ background: "#050e1f", border: `1px solid ${BORDER}` }}>
                {iocs.map((ioc, i) => <p key={i} className="text-[11px] font-mono" style={{ color: HIGH }}>{typeof ioc === "string" ? ioc : ioc.value || ioc.indicator}</p>)}
              </div>
            </div>
          )}

          {mitigations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Recommended Mitigations</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Control","Risk Reduction","MITRE"].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {mitigations.map((m, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                        <td className="px-3 py-2 text-xs text-white">{m.control || m.name}</td>
                        <td className="px-3 py-2 text-xs font-bold font-mono" style={{ color: LOW }}>{m.risk_reduction != null ? `${m.risk_reduction}%` : "—"}</td>
                        <td className="px-3 py-2 text-[10px] font-mono" style={{ color: MUTED }}>{Array.isArray(m.mitre_techniques) ? m.mitre_techniques.join(", ") : m.mitre_techniques || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {loading && selected && (
        <Card className="p-8 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: DANGER }} />
          <p className="text-sm" style={{ color: MUTED }}>Simulating attack scenario…</p>
        </Card>
      )}

      {allResults && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">Scenario Comparison</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Scenario","Probability","Risk Level","Gaps"].map(h => <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {allResults.map((r, i) => {
                  const prob = r.success_probability ?? 0;
                  const color = PROB_COLOR(prob);
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3"><span className="mr-2">{r.icon}</span><span className="text-sm text-white">{r.name}</span></td>
                      <td className="px-4 py-3 text-lg font-black font-mono" style={{ color }}>{prob}%</td>
                      <td className="px-4 py-3"><SevBadge sev={r.risk_level} /></td>
                      <td className="px-4 py-3 text-sm font-mono" style={{ color: DANGER }}>{r.gaps_count ?? (r.gaps_detected?.length ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}