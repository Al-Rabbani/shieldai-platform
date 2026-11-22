import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, Shield, AlertTriangle, TrendingUp, Zap, Activity, Database, Lock, Eye, RefreshCw, ArrowRight, Layers } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, SevBadge } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

export default function GDSRiskCorrelationPage() {
  const qc = useQueryClient();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [filterCriticality, setFilterCriticality] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");

  const { data: correlationData, isLoading, refetch } = useQuery({
    queryKey: ["risk-correlations"],
    queryFn: () => base44.functions.invoke("gdsRiskCorrelation", { action: "get_correlations" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const correlateMutation = useMutation({
    mutationFn: () => base44.functions.invoke("gdsRiskCorrelation", { action: "correlate_risks" }),
    onSuccess: () => {
      qc.invalidateQueries(["risk-correlations"]);
      refetch();
    }
  });

  const correlations = correlationData?.correlations || [];
  const assets = correlationData?.assets || [];
  const summary = correlationData?.summary || {};

  const filteredCorrelations = correlations.filter(c => {
    const asset = assets.find(a => a.asset_id === c.asset_id);
    if (filterCriticality !== "all" && asset?.business_criticality !== filterCriticality) return false;
    if (filterRisk !== "all") {
      if (filterRisk === "critical" && c.overall_risk_score < 80) return false;
      if (filterRisk === "high" && (c.overall_risk_score < 60 || c.overall_risk_score >= 80)) return false;
      if (filterRisk === "medium" && (c.overall_risk_score < 40 || c.overall_risk_score >= 60)) return false;
      if (filterRisk === "low" && c.overall_risk_score >= 40) return false;
    }
    return true;
  });

  const topRiskAssets = filteredCorrelations.slice(0, 10);

  const criticalityData = [
    { name: "Critical", value: correlations.filter(c => c.data_exposure_risk === 'critical').length, color: DANGER },
    { name: "High", value: correlations.filter(c => c.data_exposure_risk === 'high').length, color: HIGH },
    { name: "Medium", value: correlations.filter(c => c.data_exposure_risk === 'medium').length, color: MEDIUM },
    { name: "Low", value: correlations.filter(c => c.data_exposure_risk === 'low').length, color: LOW },
    { name: "None", value: correlations.filter(c => c.data_exposure_risk === 'none' || !c.data_exposure_risk).length, color: MUTED }
  ];

  const priorityData = [
    { name: "Immediate", value: correlations.filter(c => c.remediation_priority === 'immediate').length, color: DANGER },
    { name: "Urgent", value: correlations.filter(c => c.remediation_priority === 'urgent').length, color: HIGH },
    { name: "Scheduled", value: correlations.filter(c => c.remediation_priority === 'scheduled').length, color: MEDIUM },
    { name: "Backlog", value: correlations.filter(c => c.remediation_priority === 'backlog').length, color: LOW }
  ];

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Risk Correlation" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Target className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Risk Correlation Dashboard</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Map threat findings to business-critical assets in real-time</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => correlateMutation.mutate()}
            disabled={correlateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <RefreshCw className={`w-4 h-4 ${correlateMutation.isPending ? 'animate-spin' : ''}`} />
            {correlateMutation.isPending ? "Correlating..." : "Refresh Correlations"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton lines={8} />
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Assets</p>
                  <p className="text-2xl font-black font-mono mt-1" style={{ color: CYAN }}>{summary.total_assets || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                  <Database className="w-5 h-5" style={{ color: CYAN }} />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Assets with Findings</p>
                  <p className="text-2xl font-black font-mono mt-1" style={{ color: TEXT }}>{summary.assets_with_findings || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)", border: `1px solid ${BORDER}` }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: TEXT }} />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Critical Assets</p>
                  <p className="text-2xl font-black font-mono mt-1" style={{ color: DANGER }}>{summary.critical_assets || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
                  <Shield className="w-5 h-5" style={{ color: DANGER }} />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>High Risk Assets</p>
                  <p className="text-2xl font-black font-mono mt-1" style={{ color: HIGH }}>{summary.high_risk_assets || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}30` }}>
                  <TrendingUp className="w-5 h-5" style={{ color: HIGH }} />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Active Exploits</p>
                  <p className="text-2xl font-black font-mono mt-1" style={{ color: DANGER }}>{correlations.filter(c => c.active_exploits).length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
                  <Zap className="w-5 h-5" style={{ color: DANGER }} />
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
              <span className="text-[10px] font-bold" style={{ color: MUTED }}>Business Criticality:</span>
              <select
                value={filterCriticality}
                onChange={e => setFilterCriticality(e.target.value)}
                className="text-xs bg-transparent outline-none"
                style={{ color: TEXT }}>
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
              <span className="text-[10px] font-bold" style={{ color: MUTED }}>Risk Level:</span>
              <select
                value={filterRisk}
                onChange={e => setFilterRisk(e.target.value)}
                className="text-xs bg-transparent outline-none"
                style={{ color: TEXT }}>
                <option value="all">All</option>
                <option value="critical">Critical (80+)</option>
                <option value="high">High (60-79)</option>
                <option value="medium">Medium (40-59)</option>
                <option value="low">Low (&lt;40)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Risk Assets Table */}
            <Card className="p-5 lg:col-span-2">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Most Exposed Assets</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Ranked by overall risk score</p>
              </div>
              {topRiskAssets.length === 0 ? (
                <EmptyState icon={Target} title="No correlations" description="Run correlation analysis to see asset risk mapping" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {["Asset", "Criticality", "Risk Score", "Findings", "Data Exposure", "Priority", "Active Exploits"].map(h => (
                          <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topRiskAssets.map((corr, i) => {
                        const asset = assets.find(a => a.asset_id === corr.asset_id);
                        const riskColor = corr.overall_risk_score >= 80 ? DANGER : corr.overall_risk_score >= 60 ? HIGH : corr.overall_risk_score >= 40 ? MEDIUM : LOW;
                        return (
                          <tr key={corr.correlation_id || i} className="hover:bg-white/[0.02] cursor-pointer" style={{ borderBottom: `1px solid ${BORDER}20` }} onClick={() => setSelectedAsset(corr)}>
                            <td className="py-3 px-3">
                              <div>
                                <p className="text-white font-bold truncate max-w-[200px]">{corr.asset_name}</p>
                                <p className="text-[9px]" style={{ color: MUTED }}>{asset?.asset_type || "Unknown"}</p>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${asset?.business_criticality === 'critical' ? 'text-red-400' : asset?.business_criticality === 'high' ? 'text-orange-400' : asset?.business_criticality === 'medium' ? 'text-yellow-400' : 'text-blue-400'}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                                {asset?.business_criticality || "unknown"}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: riskColor, background: `${riskColor}18`, border: `1px solid ${riskColor}30` }}>
                                  {corr.overall_risk_score}
                                </span>
                                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${corr.overall_risk_score}%`, background: riskColor }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]" style={{ color: TEXT }}>{corr.total_findings}</span>
                                {corr.critical_findings > 0 && (
                                  <span className="text-[9px] px-1 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
                                    {corr.critical_findings} crit
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <SevBadge sev={corr.data_exposure_risk || 'none'} />
                            </td>
                            <td className="py-2 px-3">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${corr.remediation_priority === 'immediate' ? 'text-red-400' : corr.remediation_priority === 'urgent' ? 'text-orange-400' : corr.remediation_priority === 'scheduled' ? 'text-blue-400' : 'text-slate-400'}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                                {corr.remediation_priority}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {corr.active_exploits ? (
                                <Zap className="w-4 h-4" style={{ color: DANGER }} />
                              ) : (
                                <span className="text-[9px]" style={{ color: MUTED }}>None</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Risk Distribution Charts */}
            <div className="space-y-4">
              <Card className="p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-white">Data Exposure Risk</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Distribution by exposure level</p>
                </div>
                {criticalityData.every(d => d.value === 0) ? (
                  <EmptyState icon={Lock} title="No data" description="Exposure data will appear after correlation" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={criticalityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {criticalityData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-white">Remediation Priority</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Assets by urgency</p>
                </div>
                {priorityData.every(d => d.value === 0) ? (
                  <EmptyState icon={Activity} title="No data" description="Priority data will appear after correlation" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={priorityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                      <XAxis dataKey="name" stroke={MUTED} fontSize={10} />
                      <YAxis stroke={MUTED} fontSize={10} />
                      <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {priorityData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflow: "auto" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">{selectedAsset.asset_name}</h2>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Risk correlation details</p>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <Eye className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p style={{ color: MUTED }}>Risk Score</p>
                <p className="text-lg font-bold" style={{ color: selectedAsset.overall_risk_score >= 80 ? DANGER : selectedAsset.overall_risk_score >= 60 ? HIGH : LOW }}>{selectedAsset.overall_risk_score}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p style={{ color: MUTED }}>Total Findings</p>
                <p className="text-lg font-bold" style={{ color: TEXT }}>{selectedAsset.total_findings}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p style={{ color: MUTED }}>Critical</p>
                <p className="text-lg font-bold" style={{ color: DANGER }}>{selectedAsset.critical_findings}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p style={{ color: MUTED }}>Priority</p>
                <p className="text-lg font-bold" style={{ color: selectedAsset.remediation_priority === 'immediate' ? DANGER : selectedAsset.remediation_priority === 'urgent' ? HIGH : LOW }}>{selectedAsset.remediation_priority}</p>
              </div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <h4 className="text-xs font-bold mb-2" style={{ color: MUTED }}>Threat Types</h4>
              <div className="flex flex-wrap gap-2">
                {selectedAsset.threat_types?.slice(0, 10).map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded" style={{ color: TEXT, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}