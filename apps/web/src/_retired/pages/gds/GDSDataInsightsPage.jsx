import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, AlertTriangle, TrendingUp, CheckCircle, Clock, DollarSign } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Breadcrumb, Card, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function InsightTypeBadge({ type }) {
  const map = {
    anomaly: { color: "#ff8c00", label: "ANOMALY" }, trend: { color: "#3b82f6", label: "TREND" },
    correlation: { color: "#a855f7", label: "CORRELATION" }, prediction: { color: "#f59e0b", label: "PREDICTION" },
    recommendation: { color: "#10b981", label: "RECOMMENDATION" }, risk_elevation: { color: "#ef4444", label: "RISK" },
    threshold_breach: { color: "#dc2626", label: "BREACH" }, pattern_detected: { color: "#14b8a6", label: "PATTERN" }
  };
  const m = map[type] || { color: MUTED, label: "INSIGHT" };
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: m.color, background: `${m.color}15`, border: `1px solid ${m.color}30` }}>{m.label}</span>;
}

function ConfidenceGauge({ pct }) {
  const color = pct >= 80 ? LOW : pct >= 60 ? MEDIUM : DANGER;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-12 rounded-full" style={{ background: `conic-gradient(${color} ${pct}%, ${BORDER} ${pct}%)` }}>
        <div className="w-10 h-10 rounded-full bg-[#0a1628] flex items-center justify-center m-0.5">
          <span className="text-[9px] font-bold" style={{ color }}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

function CountdownTimer({ expiresAt }) {
  const [remaining, setRemaining] = useState("");
  React.useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) { setRemaining("EXPIRED"); return; }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setRemaining(`${hours}h ${minutes}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return <span className={`text-[10px] font-mono ${remaining === "EXPIRED" ? "text-red-400" : ""}`}>{remaining || "—"}</span>;
}

export default function GDSDataInsightsPage() {
  const [filterType, setFilterType] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["data-insights"],
    queryFn: () => base44.entities.Insight.list("-created_date", 200).catch(() => []),
  });

  const filteredInsights = insights.filter(i => {
    if (filterType && i.insight_type !== filterType) return false;
    if (filterSeverity && i.severity !== filterSeverity) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    return true;
  });

  const activeInsights = insights.filter(i => i.status === "active");
  const criticalInsights = insights.filter(i => i.severity === "critical" && i.status === "active");
  const actionRequired = insights.filter(i => i.action_required && i.status === "active");
  const avgFinancialImpact = insights.filter(i => i.financial_impact_usd > 0).reduce((sum, i) => sum + i.financial_impact_usd, 0) / (insights.filter(i => i.financial_impact_usd > 0).length || 1);

  const insightTypes = [...new Set(insights.map(i => i.insight_type))];
  const severities = ["critical", "high", "medium", "low", "info"];
  const statuses = ["active", "acknowledged", "resolved", "expired"];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Data Intelligence" }, { label: "Insights" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">AI Intelligence Center</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>AI-generated insights, predictions, and recommendations</p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Active</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{activeInsights.length}</p>
        </Card>
        <Card className="p-5 border-l-4" style={{ borderColor: DANGER }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Critical</span>
          </div>
          <p className={`text-2xl font-black font-mono ${criticalInsights.length > 0 ? "animate-pulse" : ""}`} style={{ color: DANGER }}>{criticalInsights.length}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4" style={{ color: HIGH }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Action Required</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{actionRequired.length}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" style={{ color: LOW }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Avg Impact</span>
          </div>
          <p className="text-xl font-black font-mono" style={{ color: LOW }}>${Math.round(avgFinancialImpact).toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs px-3 py-2 rounded-lg outline-none" style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Types</option>
            {insightTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="text-xs px-3 py-2 rounded-lg outline-none" style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Severities</option>
            {severities.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs px-3 py-2 rounded-lg outline-none" style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(filterType || filterSeverity || filterStatus) && (
            <button onClick={() => { setFilterType(""); setFilterSeverity(""); setFilterStatus(""); }} className="text-xs px-3 py-2 rounded-lg" style={{ color: CYAN, background: `${CYAN}15` }}>Clear</button>
          )}
        </div>
      </Card>

      {/* Insights Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Insights</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{filteredInsights.length} of {insights.length} shown</span>
        </div>
        {isLoading ? <Skeleton lines={8} /> : filteredInsights.length === 0 ? (
          <EmptyState icon={Brain} title="No insights" description="AI insights will appear here as data is analyzed" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Severity</th>
                  <th className="pb-3 font-semibold">Confidence</th>
                  <th className="pb-3 font-semibold">Action</th>
                  <th className="pb-3 font-semibold">Recommended Action</th>
                  <th className="pb-3 font-semibold">Financial Impact</th>
                  <th className="pb-3 font-semibold">Expires</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {filteredInsights.slice(0, 50).map((insight, i) => (
                  <tr key={insight.id || i} className="text-white hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="py-3 font-semibold max-w-xs">{insight.title}</td>
                    <td className="py-3"><InsightTypeBadge type={insight.insight_type} /></td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${insight.severity === "critical" ? "text-red-400 bg-red-400/15" : insight.severity === "high" ? "text-orange-400 bg-orange-400/15" : insight.severity === "medium" ? "text-yellow-400 bg-yellow-400/15" : "text-blue-400 bg-blue-400/15"}`}>
                        {insight.severity}
                      </span>
                    </td>
                    <td className="py-3"><ConfidenceGauge pct={insight.confidence_pct || 0} /></td>
                    <td className="py-3">
                      {insight.action_required && <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15` }}>REQUIRED</span>}
                    </td>
                    <td className="py-3 max-w-xs truncate" style={{ color: MUTED }}>{insight.recommended_action}</td>
                    <td className="py-3 font-mono">
                      {insight.financial_impact_usd > 0 ? <span style={{ color: HIGH }}>${insight.financial_impact_usd.toLocaleString()}</span> : <span style={{ color: MUTED }}>—</span>}
                    </td>
                    <td className="py-3"><CountdownTimer expiresAt={insight.expires_at} /></td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${insight.status === "active" ? "text-green-400 bg-green-400/15" : insight.status === "acknowledged" ? "text-blue-400 bg-blue-400/15" : "text-slate-400 bg-slate-400/15"}`}>
                        {insight.status}
                      </span>
                    </td>
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