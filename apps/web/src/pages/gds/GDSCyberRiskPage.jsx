import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, TrendingUp, AlertTriangle, RefreshCw, Shield } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Skeleton, EmptyState, Breadcrumb, Card, KpiCard, PAGE_BG
} from "@/components/gds/GDSOSShared";

const TIER_COLOR = { EXCELLENT: LOW, GOOD: "#00d4ff", FAIR: MEDIUM, POOR: DANGER };
const COMPANY_SIZES = ["SMB", "Mid-Market", "Enterprise"];

function fmt(n) {
  if (!n) return "$0";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function FairTile({ label, value, sub, color }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
      <p className="text-2xl font-black font-mono" style={{ color }}>{value ?? "—"}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: MUTED }}>{sub}</p>}
    </div>
  );
}

export default function GDSCyberRiskPage() {
  const [tab, setTab] = useState("fair");
  const [modelData, setModelData] = useState(null);
  const [roiData, setRoiData] = useState(null);
  const [insuranceData, setInsuranceData] = useState(null);
  const [loading, setLoading] = useState({});
  const [companySize, setCompanySize] = useState("Mid-Market");
  const [coverage, setCoverage] = useState(5);

  const load = async (action, setter, extra = {}) => {
    setLoading(p => ({ ...p, [action]: true }));
    try {
      const res = await base44.functions.invoke("gdsCyberRiskFinance", { action, ...extra });
      if (res.data) setter(res.data);
    } catch {}
    finally { setLoading(p => ({ ...p, [action]: false })); }
  };

  useEffect(() => { load("model", setModelData); }, []);

  const tierColor = TIER_COLOR[modelData?.risk_tier] || CYAN;
  const ale = modelData?.ale || modelData?.annual_loss_exposure;
  const fair = modelData?.fair_model || modelData?.fair || {};
  const benchmarks = modelData?.breach_benchmarks || modelData?.benchmarks || {};
  const regExposure = modelData?.regulatory_exposure || {};

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Cyber Risk Finance" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Cyber Risk Finance</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>FAIR-based financial exposure, breach benchmarks, and insurance modeling</p>
      </div>

      {loading.model ? <Skeleton lines={5} /> : modelData ? (
        <>
          {/* Risk Tier + ALE Hero */}
          <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl"
            style={{ background: CARD, border: `1px solid ${tierColor}30` }}>
            <div className="text-center">
              <span className="text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest"
                style={{ color: tierColor, background: `${tierColor}15`, border: `1px solid ${tierColor}30` }}>
                {modelData.risk_tier || "FAIR"}
              </span>
              <p className="text-[10px] mt-1" style={{ color: MUTED }}>Risk Tier</p>
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Annual Loss Exposure</p>
              <p className="text-5xl font-black font-mono" style={{ color: tierColor }}>{fmt(ale)}</p>
              {modelData.ale_range && <p className="text-sm mt-1" style={{ color: MUTED }}>Range: {fmt(modelData.ale_range.min)} – {fmt(modelData.ale_range.max)}</p>}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {[["fair", "FAIR Model"], ["benchmarks", "Breach Benchmarks"], ["regulatory", "Regulatory Exposure"], ["roi", "ROI Analysis"], ["insurance", "Insurance Estimate"]].map(([k, l]) => (
              <button key={k} onClick={() => { setTab(k); if (k === "roi" && !roiData) load("roi_analysis", setRoiData); }}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: tab === k ? `${CYAN}20` : "transparent", border: `1px solid ${tab === k ? CYAN + "60" : BORDER}`, color: tab === k ? CYAN : MUTED }}>
                {l}
              </button>
            ))}
          </div>

          {/* FAIR Model */}
          {tab === "fair" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FairTile label="Threat Frequency" value={fair.threat_frequency ?? modelData.threat_frequency} sub="events/year" color={DANGER} />
              <FairTile label="Vulnerability Magnitude" value={fair.vulnerability_magnitude ?? modelData.vulnerability_magnitude} sub="0–1 scale" color={HIGH} />
              <FairTile label="Loss Frequency" value={fair.loss_frequency ?? modelData.loss_frequency} sub="events/year" color={MEDIUM} />
              <FairTile label="Probable Loss" value={fmt(fair.probable_loss ?? modelData.probable_loss)} sub="single event" color={CYAN} />
            </div>
          )}

          {/* Breach Benchmarks */}
          {tab === "benchmarks" && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-bold text-white">Industry Breach Benchmarks</h3>
                <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ color: CYAN, background: `${CYAN}10` }}>IBM Cost of Data Breach Report</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Avg Breach Cost", value: fmt(benchmarks.industry_avg_breach_cost ?? 4450000), color: DANGER },
                  { label: "Avg Ransomware Cost", value: fmt(benchmarks.avg_ransomware_cost ?? 1540000), color: HIGH },
                  { label: "Avg Detection Days", value: `${benchmarks.avg_detection_days ?? 194} days`, color: MEDIUM },
                  { label: "Avg Containment Days", value: `${benchmarks.avg_containment_days ?? 73} days`, color: CYAN },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-4 rounded-2xl text-center" style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
                    <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
                    <p className="text-[10px] mt-1" style={{ color: MUTED }}>{label}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Regulatory Exposure */}
          {tab === "regulatory" && (
            <Card className="p-5">
              <h3 className="font-bold text-white mb-4">Regulatory Exposure</h3>
              <div className="space-y-4">
                {(regExposure.frameworks || [{ name: "GDPR", exposure: 20000000 }, { name: "NIS2", exposure: 10000000 }]).map((fw, i) => {
                  const pct = Math.min(100, ((fw.exposure / (regExposure.total_exposure || 30000000)) * 100));
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-white">{fw.name}</span>
                        <span className="font-mono" style={{ color: DANGER }}>{fmt(fw.exposure)}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: DANGER }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t" style={{ borderColor: BORDER }}>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-white">Total Regulatory Exposure</span>
                    <span className="font-black font-mono" style={{ color: DANGER }}>{fmt(regExposure.total_exposure ?? 30000000)}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ROI Analysis */}
          {tab === "roi" && (
            loading.roi_analysis ? <Skeleton lines={5} /> :
            !roiData?.controls?.length ? (
              <EmptyState icon={TrendingUp} title="No ROI data" description="Run ROI analysis" />
            ) : (
              <Card className="overflow-hidden">
                <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                  <h3 className="font-bold text-white">Control ROI Ranking</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                        {["Control","Cost","Risk Reduction","ROI","Effort (days)","Recommendation"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {roiData.controls.map((c, i) => {
                        const isTop = i === 0;
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: isTop ? `${LOW}06` : i % 2 === 0 ? CARD : "#050e1f" }}>
                            <td className="px-4 py-3 text-xs font-bold" style={{ color: isTop ? LOW : "white" }}>{c.control}</td>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{fmt(c.cost)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(c.risk_reduction_pct || 0, 100)}%`, background: LOW }} />
                                </div>
                                <span className="text-[10px] font-mono" style={{ color: LOW }}>{c.risk_reduction_pct}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-black font-mono" style={{ color: c.roi_x >= 10 ? LOW : c.roi_x >= 5 ? MEDIUM : MUTED }}>{c.roi_x}x</td>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{c.effort_days}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize"
                                style={{ color: isTop ? LOW : CYAN, background: isTop ? `${LOW}15` : `${CYAN}10` }}>
                                {c.recommendation || (isTop ? "Top Priority" : "Recommended")}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          )}

          {/* Insurance Estimate */}
          {tab === "insurance" && (
            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="font-bold text-white mb-4">Insurance Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: MUTED }}>Company Size</label>
                    <select value={companySize} onChange={e => setCompanySize(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}>
                      {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: MUTED }}>Coverage: ${coverage}M</label>
                    <input type="range" min={1} max={25} value={coverage} onChange={e => setCoverage(Number(e.target.value))}
                      className="w-full accent-cyan-400" />
                    <div className="flex justify-between text-[9px] mt-1" style={{ color: MUTED }}>
                      <span>$1M</span><span>$25M</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => load("insurance_estimate", setInsuranceData, { company_size: companySize, coverage_m: coverage })}
                  disabled={loading.insurance_estimate}
                  className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ background: `${CYAN}20`, border: `1px solid ${CYAN}50`, color: CYAN }}>
                  {loading.insurance_estimate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Estimate Premium
                </button>
              </Card>

              {insuranceData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl text-center" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}25` }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Annual Premium</p>
                      <p className="text-4xl font-black font-mono mt-1" style={{ color: CYAN }}>{fmt(insuranceData.annual_premium)}</p>
                    </div>
                    <div className="p-5 rounded-2xl text-center" style={{ background: `${LOW}08`, border: `1px solid ${LOW}25` }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Monthly Premium</p>
                      <p className="text-4xl font-black font-mono mt-1" style={{ color: LOW }}>{fmt(insuranceData.monthly_premium)}</p>
                    </div>
                    <div className="p-5 rounded-2xl text-center" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}25` }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Risk Multiplier</p>
                      <p className="text-4xl font-black font-mono mt-1" style={{ color: HIGH }}>{insuranceData.risk_multiplier ?? "—"}x</p>
                    </div>
                  </div>
                  {insuranceData.premium_reduction_opportunities?.length > 0 && (
                    <Card className="p-5">
                      <h3 className="font-bold text-white mb-3">Premium Reduction Opportunities</h3>
                      <div className="space-y-2">
                        {insuranceData.premium_reduction_opportunities.map((opp, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                            style={{ background: `${LOW}06`, border: `1px solid ${BORDER}` }}>
                            <p className="text-xs text-white">{opp.action || opp.opportunity || opp}</p>
                            {opp.reduction_pct && <span className="text-xs font-bold" style={{ color: LOW }}>-{opp.reduction_pct}%</span>}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={DollarSign} title="No risk model data" description="Risk model data unavailable" />
      )}
    </div>
  );
}