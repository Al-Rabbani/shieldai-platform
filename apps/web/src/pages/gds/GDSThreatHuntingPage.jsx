import React, { useState, useEffect } from "react";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Search, Target, Shield, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, KpiCard, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const TACTIC_COLORS = { "Execution": CYAN, "Credential Access": DANGER, "Lateral Movement": HIGH, "Exfiltration": "#8b5cf6", "Privilege Escalation": HIGH, "Initial Access": MEDIUM, "Persistence": MEDIUM, "Impact": DANGER, "Reconnaissance": MUTED, "Command and Control": "#f97316" };

function TacticPill({ tactic, covered }) {
  const color = covered ? (TACTIC_COLORS[tactic] || CYAN) : MEDIUM;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>{tactic}</span>
  );
}

function CircleGauge({ pct, size = 80 }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color = pct >= 60 ? LOW : pct >= 40 ? MEDIUM : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ filter: `drop-shadow(0 0 6px ${color}66)`, transition: "stroke-dasharray 1s" }} />
      <text x={size/2} y={size/2 + 5} fill={color} fontSize={size * 0.22} textAnchor="middle" fontWeight="900" fontFamily="monospace">{pct}%</text>
    </svg>
  );
}

function HuntRow({ r }) {
  const [expanded, setExpanded] = useState(false);
  const found = r.status === "INDICATORS_FOUND";
  return (
    <>
      <tr className="hover:bg-white/[0.02] cursor-pointer transition-all"
        style={{ borderBottom: `1px solid ${BORDER}20`, borderLeft: found ? `3px solid ${DANGER}` : `3px solid transparent` }}
        onClick={() => setExpanded(e => !e)}>
        <td className="py-2 px-3">
          <span className="text-[10px] font-black px-2 py-0.5 rounded font-mono" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{r.id}</span>
        </td>
        <td className="py-2 px-3 text-xs text-white font-medium max-w-[200px]"><p className="truncate">{r.name}</p></td>
        <td className="py-2 px-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: TACTIC_COLORS[r.tactic] || MUTED, background: `${TACTIC_COLORS[r.tactic] || MUTED}15` }}>{r.tactic}</span>
        </td>
        <td className="py-2 px-3">
          <div className="flex flex-wrap gap-1">
            {(r.techniques || []).map(t => <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.05)" }}>{t}</span>)}
          </div>
        </td>
        <td className="py-2 px-3"><SevBadge sev={r.severity} /></td>
        <td className="py-2 px-3">
          {found
            ? <span className="flex items-center gap-1 text-[10px] font-black" style={{ color: DANGER }}><AlertTriangle className="w-3 h-3" />INDICATORS FOUND</span>
            : <span className="flex items-center gap-1 text-[10px] font-black" style={{ color: LOW }}><CheckCircle className="w-3 h-3" />CLEAR</span>}
        </td>
        <td className="py-2 px-3 font-mono text-xs" style={{ color: found ? DANGER : MUTED }}>{r.indicators_found}</td>
        <td className="py-2 px-3">{expanded ? <ChevronDown className="w-3 h-3" style={{ color: MUTED }} /> : <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />}</td>
      </tr>
      {expanded && (
        <tr style={{ background: "rgba(0,0,0,0.2)" }}>
          <td colSpan={8} className="px-6 py-3">
            <p className="text-xs mb-2" style={{ color: MUTED }}><span className="font-bold" style={{ color: CYAN }}>Recommendation:</span> {r.recommendation}</p>
            {r.indicators?.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Indicators</p>
                {r.indicators.map((ind, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs px-3 py-1.5 rounded-lg" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
                    <span style={{ color: MUTED }}>{ind.entity}</span>
                    <span className="text-white">{ind.title}</span>
                    <SevBadge sev={ind.severity} />
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function GDSThreatHuntingPage() {
  const [iocInput, setIocInput] = useState("");
  const [iocResults, setIocResults] = useState(null);
  const [iocLoading, setIocLoading] = useState(false);
  const [mitreData, setMitreData] = useState(null);

  const { data: huntData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["gds-threat-hunt"],
    queryFn: () => base44.functions.invoke("gdsThreatHunterProactive", { action: "hunt" }).then(r => r.data),
  });

  useEffect(() => {
    base44.functions.invoke("gdsThreatHunterProactive", { action: "mitre_coverage" }).then(r => setMitreData(r.data)).catch(() => {});
  }, []);

  const runIOCHunt = async () => {
    if (!iocInput.trim()) return;
    setIocLoading(true); setIocResults(null);
    try {
      const res = await base44.functions.invoke("gdsThreatHunterProactive", { action: "ioc_hunt", iocs: iocInput });
      setIocResults(res.data);
    } catch (e) { console.error(e); }
    finally { setIocLoading(false); }
  };

  const d = huntData || {};
  const results = d.results || [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Threat Hunting" }]} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-white">Threat Hunting</h1><LiveDataBadge /></div>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Proactive hypothesis-driven threat hunting with MITRE ATT&CK coverage</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Re-Hunt All Hypotheses
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Hypotheses Tested" value={d.hypotheses_tested ?? 8} color={CYAN} icon={Target} />
        <KpiCard label="Indicators Found" value={d.indicators_found ?? 0} color={HIGH} icon={AlertTriangle} />
        <KpiCard label="Critical Positives" value={d.critical_positives ?? 0} color={DANGER} icon={AlertTriangle} pulse={d.critical_positives > 0} />
        <Card className="p-5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Status</span>
          {d.all_clear
            ? <span className="flex items-center gap-2 text-lg font-black mt-2" style={{ color: LOW }}><CheckCircle className="w-5 h-5" />ALL CLEAR</span>
            : <span className="flex items-center gap-2 text-lg font-black mt-2" style={{ color: DANGER }}><AlertTriangle className="w-5 h-5" />THREATS FOUND</span>}
        </Card>
      </div>

      {/* MITRE Coverage */}
      {mitreData && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">MITRE ATT&CK Coverage</h3>
          <div className="flex items-start gap-6 flex-wrap">
            <CircleGauge pct={mitreData.coverage_pct} size={90} />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LOW }}>Covered Tactics</p>
                <div className="flex flex-wrap gap-1.5">{mitreData.covered_tactics?.map(t => <TacticPill key={t} tactic={t} covered />)}</div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MEDIUM }}>Uncovered Tactics</p>
                <div className="flex flex-wrap gap-1.5">{mitreData.uncovered_tactics?.map(t => <TacticPill key={t} tactic={t} covered={false} />)}</div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{mitreData.techniques_covered}</p>
              <p className="text-[10px]" style={{ color: MUTED }}>techniques covered</p>
              <p className="text-xs mt-1" style={{ color: MUTED }}>of {mitreData.total_techniques} total</p>
            </div>
          </div>
        </Card>
      )}

      {/* Hunt Results Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">Hunt Results</h3>
        </div>
        {isLoading ? <Skeleton lines={5} /> : results.length === 0
          ? <EmptyState icon={Target} title="No hunt results" description="Click Re-Hunt to run hypothesis tests" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["ID", "Hypothesis", "Tactic", "Techniques", "Severity", "Status", "Indicators", ""].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{results.map((r, i) => <HuntRow key={r.id || i} r={r} />)}</tbody>
              </table>
            </div>
          )}
      </Card>

      {/* IOC Hunt Tool */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-3">IOC Hunt Tool</h3>
        <p className="text-xs mb-3" style={{ color: MUTED }}>Enter IOCs (CVE IDs, IPs, domains, hashes) — one per line</p>
        <div className="flex gap-3 flex-col sm:flex-row">
          <textarea value={iocInput} onChange={e => setIocInput(e.target.value)} rows={4}
            placeholder={"CVE-2021-44228\n192.168.1.100\nmalware.example.com"}
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none font-mono resize-none"
            style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }} />
          <button onClick={runIOCHunt} disabled={iocLoading || !iocInput.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50 self-start"
            style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40`, color: DANGER }}>
            {iocLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Hunt IOCs
          </button>
        </div>
        {iocResults && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold text-white">{iocResults.iocs_checked} IOCs checked</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: iocResults.matches_found > 0 ? DANGER : LOW, background: iocResults.matches_found > 0 ? `${DANGER}15` : `${LOW}15` }}>
                {iocResults.matches_found} matches
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["IOC", "Type", "Matched", "Entity", "Title", "Severity"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {iocResults.matches?.map((m, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono" style={{ color: CYAN }}>{m.ioc}</td>
                      <td className="py-2 px-3" style={{ color: MUTED }}>{m.type}</td>
                      <td className="py-2 px-3">{m.matched ? <span style={{ color: DANGER }}>✓ MATCH</span> : <span style={{ color: MUTED }}>—</span>}</td>
                      <td className="py-2 px-3" style={{ color: MUTED }}>{m.entity || "—"}</td>
                      <td className="py-2 px-3 text-white">{m.title || "—"}</td>
                      <td className="py-2 px-3"><SevBadge sev={m.severity} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}