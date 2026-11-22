import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, DollarSign, Target, Activity } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Card, Breadcrumb, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function formatUSD(val) {
  if (!val && val !== 0) return "$0";
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val}`;
}

export default function GDSCyberRangeForecastsPage() {
  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ["cyber-range-forecasts"],
    queryFn: () => base44.entities.RiskForecast.list("-generated_at", 50).catch(() => []),
  });

  const avgProb = forecasts.length > 0
    ? Math.round(forecasts.reduce((sum, f) => sum + (f.probability_pct || 0), 0) / forecasts.length)
    : 0;
  const highestImpact = forecasts.reduce((max, f) => f.projected_impact_usd > max ? f.projected_impact_usd : max, 0);
  const totalInvestment = forecasts.reduce((sum, f) => sum + (f.recommended_investments || []).reduce((s, i) => s + (i.cost_usd || 0), 0), 0);

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "Cyber Range", path: "/cyber-range" }, { label: "Risk Forecasts" }]} />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Active Forecasts</p>
          <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{forecasts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Avg Probability</p>
          <p className="text-3xl font-black font-mono" style={{ color: avgProb > 60 ? DANGER : avgProb > 40 ? HIGH : LOW }}>{avgProb}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Highest Impact</p>
          <p className="text-3xl font-black font-mono" style={{ color: DANGER }}>{formatUSD(highestImpact)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Total Investment</p>
          <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{formatUSD(totalInvestment)}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">AI Risk Forecasts</h3>
          </div>
        </div>
        {isLoading ? <Skeleton lines={6} /> : forecasts.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No forecasts" description="Risk forecasts will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.3)" }}>
                <tr>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Type</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Scenario</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Probability</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Impact</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Trajectory</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Confidence</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Valid Until</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Investments</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: `${BORDER}40` }}>
                {forecasts.map(f => (
                  <tr key={f.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{f.forecast_type}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-white max-w-xs truncate">{f.scenario}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <div className={`h-full rounded-full ${f.probability_pct > 60 ? "bg-red-400" : f.probability_pct > 40 ? "bg-amber-400" : "bg-green-400"}`} style={{ width: `${f.probability_pct || 0}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${f.probability_pct > 60 ? "text-red-400" : f.probability_pct > 40 ? "text-amber-400" : "text-green-400"}`}>{f.probability_pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white font-mono">{formatUSD(f.projected_impact_usd)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded uppercase ${
                        f.risk_trajectory === "improving" ? "bg-green-400/20 text-green-400" :
                        f.risk_trajectory === "stable" ? "bg-blue-400/20 text-blue-400" :
                        f.risk_trajectory === "degrading" ? "bg-amber-400/20 text-amber-400" :
                        "bg-red-400/20 text-red-400 animate-pulse"
                      }`}>
                        {f.risk_trajectory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{f.confidence_pct}%</td>
                    <td className="px-4 py-3 text-white">{timeAgo(f.valid_until)}</td>
                    <td className="px-4 py-3 text-white">{f.recommended_investments?.length || 0}</td>
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