import React, { useState, useMemo } from "react";
import { Card } from "@/components/gds/GDSOSShared";
import { TrendingUp, Map, Radio, Factory, AlertTriangle } from "lucide-react";
import { CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, BORDER } from "@/components/gds/GDSOSShared";

export default function PredictiveRiskHeatmap({ 
  incidents = [], 
  threats = [], 
  assets = [],
  predictions = []
}) {
  const [timeRange, setTimeRange] = useState(30);

  const heatmapData = useMemo(() => {
    const regionRisk = {};

    incidents?.forEach(inc => {
      const regions = inc.regions_affected || inc.regions || [inc.location || "Unknown"];
      regions.forEach(region => {
        if (!regionRisk[region]) {
          regionRisk[region] = { region, incidentCount: 0, threatCount: 0, totalImpact: 0, avgSeverity: 0, riskScore: 0 };
        }
        const severityScore = inc.severity === "critical" ? 100 : inc.severity === "high" ? 75 : inc.severity === "medium" ? 50 : 25;
        regionRisk[region].incidentCount += 1;
        regionRisk[region].totalImpact += inc.subscribers_affected || inc.citizens_impacted || 0;
        regionRisk[region].avgSeverity = (regionRisk[region].avgSeverity + severityScore) / 2;
      });
    });

    threats?.forEach(threat => {
      const regions = threat.origin_country ? [threat.origin_country] : ["Unknown"];
      regions.forEach(region => {
        if (!regionRisk[region]) {
          regionRisk[region] = { region, incidentCount: 0, threatCount: 0, totalImpact: 0, avgSeverity: 0, riskScore: 0 };
        }
        const severityScore = threat.severity === "critical" ? 100 : threat.severity === "high" ? 75 : threat.severity === "medium" ? 50 : 25;
        regionRisk[region].threatCount += 1;
        regionRisk[region].avgSeverity = (regionRisk[region].avgSeverity + severityScore) / 2;
      });
    });

    Object.values(regionRisk).forEach(r => {
      r.riskScore = Math.min(100, Math.round((r.incidentCount * 15) + (r.threatCount * 20) + (r.avgSeverity * 0.3) + Math.min(50, r.totalImpact / 10000)));
    });

    return Object.values(regionRisk).sort((a, b) => b.riskScore - a.riskScore);
  }, [incidents, threats, timeRange]);

  const getRiskColor = (score) => score >= 75 ? DANGER : score >= 50 ? HIGH : score >= 25 ? MEDIUM : LOW;
  const getRiskLabel = (score) => score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";

  return (
    <Card className="p-5" glow>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Map className="w-4 h-4" style={{ color: CYAN }} />
          Predictive Risk Heatmap
        </h3>
        <select value={timeRange} onChange={(e) => setTimeRange(Number(e.target.value))}
          className="px-2.5 py-1 rounded-lg text-[9px] font-bold bg-white/5 border border-white/10 text-slate-300" style={{ color: TEXT }}>
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {heatmapData.length === 0 ? (
          <div className="col-span-full py-8 text-center">
            <p className="text-sm" style={{ color: MUTED }}>No risk data available</p>
          </div>
        ) : (
          heatmapData.slice(0, 12).map((region) => {
            const riskColor = getRiskColor(region.riskScore);
            return (
              <div key={region.region} className="p-4 rounded-xl"
                style={{ background: `linear-gradient(135deg, ${riskColor}15, ${riskColor}05)`, border: `2px solid ${riskColor}40` }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{region.region}</p>
                    <p className="text-[9px]" style={{ color: MUTED }}>{region.incidentCount} incidents · {region.threatCount} threats</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: riskColor }}>{region.riskScore}</p>
                    <p className="text-[8px] font-bold" style={{ color: riskColor }}>{getRiskLabel(region.riskScore)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" style={{ color: region.riskScore > 50 ? DANGER : region.riskScore > 30 ? HIGH : LOW }} />
                  <span className="text-[8px] font-bold uppercase" style={{ color: MUTED }}>
                    {region.riskScore > 70 ? "Critical" : region.riskScore > 50 ? "Elevated" : region.riskScore > 30 ? "Guarded" : "Low"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}