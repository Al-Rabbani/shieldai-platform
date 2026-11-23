import React, { useState } from "react";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, ChevronDown } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, KpiCard, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const STATUS_ICON = { PASS: <CheckCircle className="w-3.5 h-3.5" style={{ color: "#00ff88" }} />, FAIL: <XCircle className="w-3.5 h-3.5" style={{ color: "#ff3b3b" }} />, WARN: <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#ffd700" }} /> };
const STATUS_COLOR = { PASS: "#00ff88", FAIL: "#ff3b3b", WARN: "#ffd700" };
const DRIFT_COLOR = { IMPROVING: "#00ff88", DEGRADING: "#ff3b3b", STABLE: "#ffd700" };

export default function GDSComplianceAutoPage() {
  const [activeTab, setActiveTab] = useState("checks");
  const [fwTab, setFwTab] = useState("SOC2");
  const [fwData, setFwData] = useState({});
  const [fwLoading, setFwLoading] = useState({});
  const [driftData, setDriftData] = useState(null);
  const [remData, setRemData] = useState(null);
  const [remExpanded, setRemExpanded] = useState(new Set());

  const { data: monData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["gds-compliance-auto"],
    queryFn: () => base44.functions.invoke("gdsComplianceAutomation", { action: "monitor" }).then(r => r.data),
  });

  const loadFW = async (fw) => {
    if (fwData[fw]) return;
    setFwLoading(p => ({ ...p, [fw]: true }));
    try {
      const res = await base44.functions.invoke("gdsComplianceAutomation", { action: "test_controls", framework: fw });
      setFwData(p => ({ ...p, [fw]: res.data }));
    } catch (e) { console.error(e); }
    finally { setFwLoading(p => ({ ...p, [fw]: false })); }
  };

  const loadDrift = async () => {
    if (driftData) return;
    try { const res = await base44.functions.invoke("gdsComplianceAutomation", { action: "drift_detect" }); setDriftData(res.data); } catch (e) { console.error(e); }
  };

  const loadRem = async () => {
    if (remData) return;
    try { const res = await base44.functions.invoke("gdsComplianceAutomation", { action: "remediation_map" }); setRemData(res.data); } catch (e) { console.error(e); }
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    if (tab === "controls") loadFW(fwTab);
    if (tab === "drift") loadDrift();
    if (tab === "remediation") loadRem();
  };

  const handleFwTab = (fw) => { setFwTab(fw); loadFW(fw); };

  const d = monData || {};
  const health = d.health_score ?? 0;
  const healthColor = health >= 80 ? LOW : health >= 60 ? MEDIUM : DANGER;
  const checks = d.checks || [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Compliance Automation" }]} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-white">Compliance Automation</h1><LiveDataBadge /></div>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Continuous compliance monitoring, automated control testing, and drift detection</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh Checks
        </button>
      </div>

      {/* Health Score */}
      <Card className="p-6">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Compliance Health</p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black font-mono" style={{ color: healthColor }}>{health}</span>
              <span className="text-xl" style={{ color: MUTED }}>%</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${health}%`, background: `linear-gradient(90deg, ${DANGER}, ${MEDIUM}, ${healthColor})` }} />
            </div>
            <div className="flex gap-4 text-xs">
              <span style={{ color: LOW }}>✓ {d.passing ?? 0} passing</span>
              <span style={{ color: DANGER }}>✗ {d.failing ?? 0} failing</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b flex-wrap" style={{ borderColor: BORDER }}>
        {[["checks", "Continuous Checks"], ["controls", "Framework Tests"], ["drift", "Drift Detection"], ["remediation", "Remediation Map"]].map(([id, label]) => (
          <button key={id} onClick={() => handleTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "checks" && (
        isLoading ? <Skeleton lines={5} /> : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Check", "Current", "Threshold", "Status", "Frameworks"].map(h => (
                      <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {checks.map((c, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: c.status === "FAIL" ? `${DANGER}05` : undefined }}>
                      <td className="py-3 px-4 text-white font-medium">{c.name}</td>
                      <td className="py-3 px-4 font-mono font-black" style={{ color: STATUS_COLOR[c.status] }}>{c.current_value}{c.unit}</td>
                      <td className="py-3 px-4 font-mono" style={{ color: MUTED }}>{c.threshold}{c.unit}</td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5 font-black text-[10px]" style={{ color: STATUS_COLOR[c.status] }}>
                          {STATUS_ICON[c.status]} {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {c.impact?.map(fw => <span key={fw} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}12` }}>{fw}</span>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {activeTab === "controls" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {["SOC2", "ISO27001"].map(fw => (
              <button key={fw} onClick={() => handleFwTab(fw)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: fwTab === fw ? `${CYAN}15` : "transparent", border: `1px solid ${fwTab === fw ? CYAN : BORDER}`, color: fwTab === fw ? CYAN : MUTED }}>
                {fw}
              </button>
            ))}
          </div>
          {fwLoading[fwTab] ? <Skeleton lines={4} /> : fwData[fwTab] ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}20` }}>
                <span className="text-2xl font-black font-mono" style={{ color: CYAN }}>{fwData[fwTab].score}/100</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${fwData[fwTab].score}%`, background: CYAN }} />
                </div>
                <span className="text-xs" style={{ color: LOW }}>✓ {fwData[fwTab].passing} passing</span>
                <span className="text-xs" style={{ color: DANGER }}>✗ {fwData[fwTab].failing} failing</span>
              </div>
              <Card className="overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Control ID", "Name", "Test", "Status", "Weight", "Score"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fwData[fwTab].controls?.map((c, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3 font-mono" style={{ color: CYAN }}>{c.id}</td>
                        <td className="py-2 px-3 text-white">{c.name}</td>
                        <td className="py-2 px-3 max-w-xs" style={{ color: MUTED }}>{c.description}</td>
                        <td className="py-2 px-3">
                          <span className="flex items-center gap-1 font-black text-[10px]" style={{ color: c.passed ? LOW : DANGER }}>
                            {c.passed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {c.passed ? "PASS" : "FAIL"}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono" style={{ color: MUTED }}>{c.weight}pts</td>
                        <td className="py-2 px-3 font-mono" style={{ color: c.contribution > 0 ? LOW : DANGER }}>{c.contribution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          ) : <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>Select a framework to test controls</p></div>}
        </div>
      )}

      {activeTab === "drift" && (
        !driftData ? <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>Loading drift data…</p></div> : (
          <Card className="overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">Compliance Drift Detection</h3></div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["Framework", "Current", "Previous", "Delta", "Trend", "Drift Status"].map(h => (
                    <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {driftData.drifts?.map((d, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-4 text-white font-medium">{d.framework}</td>
                    <td className="py-3 px-4 font-mono font-black" style={{ color: d.current >= 70 ? LOW : d.current >= 40 ? MEDIUM : DANGER }}>{d.current}%</td>
                    <td className="py-3 px-4 font-mono" style={{ color: MUTED }}>{d.previous}%</td>
                    <td className="py-3 px-4 font-mono font-black" style={{ color: d.delta > 0 ? LOW : d.delta < 0 ? DANGER : MUTED }}>
                      {d.trend} {Math.abs(d.delta)}
                    </td>
                    <td className="py-3 px-4 font-mono" style={{ color: DRIFT_COLOR[d.drift_badge] || MUTED }}>{d.drift_badge}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: DRIFT_COLOR[d.drift_badge] || MUTED, background: `${DRIFT_COLOR[d.drift_badge] || MUTED}15` }}>{d.drift_badge}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {activeTab === "remediation" && (
        !remData ? <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>Loading remediation map…</p></div> : (
          <Card className="overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">Remediation Map ({remData.items?.length ?? 0} items)</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Source", "Framework", "Control", "Issue", "Severity", "Assignee", "Deadline", ""].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {remData.items?.map((item, i) => (
                    <React.Fragment key={i}>
                      <tr className="hover:bg-white/[0.02] cursor-pointer" style={{ borderBottom: `1px solid ${BORDER}20` }}
                        onClick={() => setRemExpanded(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })}>
                        <td className="py-2 px-3"><span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: item.source === "CRITICAL" ? DANGER : HIGH, background: item.source === "CRITICAL" ? `${DANGER}15` : `${HIGH}15` }}>{item.source}</span></td>
                        <td className="py-2 px-3" style={{ color: CYAN }}>{item.framework}</td>
                        <td className="py-2 px-3 font-mono" style={{ color: MUTED }}>{item.control}</td>
                        <td className="py-2 px-3 text-white max-w-[160px]"><p className="truncate">{item.issue}</p></td>
                        <td className="py-2 px-3"><SevBadge sev={item.severity} /></td>
                        <td className="py-2 px-3" style={{ color: MUTED }}>{item.assignee}</td>
                        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{item.deadline}</td>
                        <td className="py-2 px-3">{remExpanded.has(i) ? <ChevronDown className="w-3 h-3" style={{ color: MUTED }} /> : <span className="text-[10px]" style={{ color: MUTED }}>▶</span>}</td>
                      </tr>
                      {remExpanded.has(i) && (
                        <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                          <td colSpan={8} className="px-6 py-2">
                            <p className="text-[10px]" style={{ color: MUTED }}><span style={{ color: CYAN }}>Remediation:</span> {item.remediation}</p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}
    </div>
  );
}