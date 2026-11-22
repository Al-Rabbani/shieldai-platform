import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, AlertTriangle, Target, Shield } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const BG = "#020817";

export default function GDSThreatIntelPredictionsPage() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ["threat-predictions"], queryFn: () => base44.entities.ThreatPrediction.list("-confidence", 100).catch(() => []),
  });

  const filtered = predictions.filter(p => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === "all" || p.predicted_severity === severityFilter;
    return matchSearch && matchSeverity;
  });

  const highConfidence = predictions.filter(p => (p.confidence || 0) >= 0.8).length;
  const activeThreats = predictions.filter(p => p.status === "active").length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "Predictions" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <TrendingUp className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Threat Prediction Center</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>AI-powered threat forecasts and predictive intelligence</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Predictions</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{predictions.length}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High Confidence</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{highConfidence}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Threats</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{activeThreats}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Confidence</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{predictions.length > 0 ? Math.round(predictions.reduce((s, p) => s + (p.confidence || 0), 0) / predictions.length * 100) : 0}%</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search predictions..."
            className="px-3 py-2 rounded-xl text-xs font-bold outline-none w-64"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </Card>

      {isLoading ? <Skeleton lines={6} /> : filtered.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No predictions" description="Threat predictions will appear here" />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((pred) => {
            const confidenceColor = pred.confidence >= 0.8 ? LOW : pred.confidence >= 0.6 ? MEDIUM : HIGH;
            return (
              <Card key={pred.id} className="p-5" style={{ background: pred.status === "active" ? `${DANGER}05` : CARD, border: `1px solid ${pred.status === "active" ? DANGER + "30" : BORDER}` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-white">{pred.title}</h3>
                      {pred.status === "active" && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold animate-pulse" style={{ background: `${DANGER}15`, color: DANGER }}>ACTIVE</span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: MUTED }}>{pred.description || "No description"}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Confidence</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(pred.confidence || 0) * 100}%`, background: confidenceColor }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: confidenceColor }}>{((pred.confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>Predicted Severity</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      pred.predicted_severity === "critical" ? "bg-red-400/15 text-red-400" :
                      pred.predicted_severity === "high" ? "bg-orange-400/15 text-orange-400" :
                      pred.predicted_severity === "medium" ? "bg-yellow-400/15 text-yellow-400" :
                      "bg-blue-400/15 text-blue-400"
                    }`}>
                      {pred.predicted_severity}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>Timeframe</p>
                    <p className="text-sm" style={{ color: TEXT }}>{pred.timeframe || "Unspecified"}</p>
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>Target Sector</p>
                    <p className="text-sm" style={{ color: TEXT }}>{pred.predicted_target_sector || "Multiple"}</p>
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>Attack Vector</p>
                    <p className="text-sm" style={{ color: TEXT }}>{pred.predicted_attack_vector || "Unknown"}</p>
                  </div>
                </div>
                {pred.recommended_actions?.length > 0 && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: BORDER }}>
                    <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Recommended Actions</p>
                    <ul className="space-y-1">
                      {pred.recommended_actions.slice(0, 3).map((action, i) => (
                        <li key={i} className="text-xs flex items-center gap-2" style={{ color: TEXT }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: CYAN }} />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}