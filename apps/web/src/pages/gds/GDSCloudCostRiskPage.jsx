import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DollarSign, AlertTriangle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, Breadcrumb, Card, PAGE_BG, TOOLTIP_STYLE
} from "@/components/gds/GDSOSShared";

function fmt(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

export default function GDSCloudCostRiskPage() {
  const [activeTab, setActiveTab] = useState("services");
  const [wasteData, setWasteData] = useState(null);
  const [roiData, setRoiData] = useState(null);
  const [tabLoading, setTabLoading] = useState({});

  const { data: correlData, isLoading } = useQuery({
    queryKey: ["gds-cloud-cost-risk"],
    queryFn: () => base44.functions.invoke("gdsCloudCostRisk", { action: "correlate" }).then(r => r.data),
  });

  const load = async (tab, act, setter) => {
    setTabLoading(p => ({ ...p, [tab]: true }));
    try { const r = await base44.functions.invoke("gdsCloudCostRisk", { action: act }); setter(r.data); }
    catch (e) { console.error(e); } finally { setTabLoading(p => ({ ...p, [tab]: false })); }
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    if (tab === "waste" && !wasteData) load("waste", "waste_analysis", setWasteData);
    if (tab === "roi" && !roiData) load("roi", "security_spend", setRoiData);
  };

  const d = correlData || {};
  const services = d.services || [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Cloud Cost & Risk" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Cloud Cost & Risk Correlation</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Financial risk exposure mapped to cloud spend and security findings</p>
      </div>

      {/* Hero tiles */}
      {isLoading ? <Skeleton lines={2} /> : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Monthly Spend", value: fmt(d.monthly_spend || 0), color: CYAN },
            { label: "Annual Spend", value: fmt(d.annual_spend || 0), color: CYAN },
            { label: "Risk Exposure", value: fmt(d.total_risk_exposure || 0), color: DANGER },
            { label: "Risk:Spend Ratio", value: `${d.risk_to_spend_ratio ?? 0}x`, color: HIGH },
            { label: "Security Spend %", value: `${d.security_spend_pct ?? 0}%`, color: LOW },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
              <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="flex border-b" style={{ borderColor: BORDER }}>
        {[["services", "Services"], ["waste", "Waste Analysis"], ["roi", "Security ROI"]].map(([id, label]) => (
          <button key={id} onClick={() => handleTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "services" && (
        isLoading ? <Skeleton lines={5} /> : (
          <Card className="overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["Service", "Monthly Cost", "Findings", "Critical", "Risk Exposure", "Security Impact"].map(h => (
                    <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map((s, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: s.critical > 0 ? `${DANGER}05` : undefined }}>
                    <td className="py-3 px-4">
                      <span className="text-sm mr-2">{s.icon}</span>
                      <span className="text-white font-medium">{s.service}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold" style={{ color: CYAN }}>{fmt(s.monthly_cost)}</td>
                    <td className="py-3 px-4 font-mono" style={{ color: MUTED }}>{s.findings}</td>
                    <td className="py-3 px-4 font-mono font-black" style={{ color: s.critical > 0 ? DANGER : LOW }}>{s.critical}</td>
                    <td className="py-3 px-4 font-mono font-bold" style={{ color: HIGH }}>{fmt(s.risk_exposure)}</td>
                    <td className="py-3 px-4 max-w-xs" style={{ color: s.critical > 0 ? DANGER : MUTED }}>{s.security_impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {activeTab === "waste" && (
        tabLoading.waste ? <Skeleton lines={4} /> : !wasteData ? <div /> : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}>
              <p className="text-xs font-bold" style={{ color: MUTED }}>Total Unmitigated Annual Risk</p>
              <p className="text-3xl font-black font-mono" style={{ color: DANGER }}>{fmt(wasteData.total_unmitigated_annual_risk || 0)}</p>
            </div>
            <Card className="overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">Risk Waste Items</h3></div>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Issue", "Annual Risk", "Fix Cost", "ROI"].map(h => (
                      <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wasteData.items?.map((item, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-4 text-white max-w-xs">{item.issue}</td>
                      <td className="py-3 px-4 font-mono font-black" style={{ color: DANGER }}>{fmt(item.annual_risk)}</td>
                      <td className="py-3 px-4 font-mono" style={{ color: item.fix_cost.includes("$0") ? LOW : HIGH }}>{item.fix_cost}</td>
                      <td className="py-3 px-4"><span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: LOW, background: `${LOW}15` }}>{item.roi_badge}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            {wasteData.quick_wins?.length > 0 && (
              <Card className="p-4" style={{ border: `1px solid ${LOW}40` }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: LOW }}>⚡ Quick Wins (Free Config Changes)</h3>
                {wasteData.quick_wins.map((w, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-white">{w.issue}</span>
                    <span className="font-black font-mono" style={{ color: DANGER }}>{fmt(w.annual_risk)} saved</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )
      )}

      {activeTab === "roi" && (
        tabLoading.roi ? <Skeleton lines={4} /> : !roiData ? <div /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 text-center">
                <p className="text-[10px]" style={{ color: MUTED }}>Monthly Security Budget</p>
                <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{fmt(roiData.monthly_budget || 0)}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-[10px]" style={{ color: MUTED }}>Annual Security Budget</p>
                <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{fmt(roiData.annual_budget || 0)}</p>
              </Card>
            </div>
            {roiData.top_roi && (
              <div className="p-4 rounded-xl" style={{ background: `${LOW}08`, border: `1px solid ${LOW}40` }}>
                <p className="text-xs font-bold mb-1" style={{ color: LOW }}>⭐ Highest ROI Control</p>
                <p className="text-sm text-white font-bold">{roiData.top_roi.control}</p>
                <p className="text-lg font-black font-mono" style={{ color: LOW }}>{roiData.top_roi.roi_multiplier}x ROI</p>
              </div>
            )}
            <Card className="overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Control", "Monthly Cost", "Coverage", "ROI Multiplier", "Status"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roiData.controls?.map((c, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 text-white font-medium">{c.control}</td>
                      <td className="py-2 px-3 font-mono" style={{ color: CYAN }}>{fmt(c.monthly_cost)}</td>
                      <td className="py-2 px-3" style={{ color: MUTED }}>{c.coverage}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.roi_multiplier * 2)}%`, background: LOW }} />
                          </div>
                          <span className="font-mono font-black text-[11px]" style={{ color: LOW }}>{c.roi_multiplier}x</span>
                        </div>
                      </td>
                      <td className="py-2 px-3"><span className="text-[10px] px-2 py-0.5 rounded capitalize" style={{ color: c.status === "active" ? LOW : MEDIUM, background: c.status === "active" ? `${LOW}12` : `${MEDIUM}12` }}>{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )
      )}
    </div>
  );
}