import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, TrendingUp, Activity, AlertTriangle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Breadcrumb, Card, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function ModelTypeBadge({ type }) {
  const map = {
    classification: "#3b82f6", regression: "#10b981", anomaly_detection: "#f59e0b",
    time_series: "#8b5cf6", nlp: "#ec4899", graph_ml: "#14b8a6", llm_analytics: "#6366f1"
  };
  const color = map[type] || MUTED;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color, background: `${color}15` }}>{type.replace(/_/g, " ")}</span>;
}

function UseCaseBadge({ useCase }) {
  return <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{useCase}</span>;
}

function AccuracyGauge({ value }) {
  const color = value >= 90 ? LOW : value >= 70 ? MEDIUM : DANGER;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full" style={{ background: `${BORDER}` }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className={`text-xs font-mono font-bold ${color === LOW ? "text-green-400" : color === MEDIUM ? "text-amber-400" : "text-red-400"}`}>{value}%</span>
    </div>
  );
}

function CountdownDays({ date }) {
  if (!date) return <span style={{ color: MUTED }}>—</span>;
  const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  return <span className={`text-xs font-mono font-bold ${days < 7 ? "text-amber-400" : "text-green-400"}`}>{days > 0 ? `${days}d` : "Overdue"}</span>;
}

export default function GDSAnalyticsStudioPage() {
  const [activeTab, setActiveTab] = useState("models");
  const { data: models = [], isLoading: loadM } = useQuery({
    queryKey: ["data-models"],
    queryFn: () => base44.entities.AnalyticsModel.list("", 50).catch(() => []),
  });
  const { data: features = [], isLoading: loadF } = useQuery({
    queryKey: ["data-features"],
    queryFn: () => base44.entities.Feature.list("", 100).catch(() => []),
  });

  const activeModels = models.filter(m => m.status === "active").length;
  const avgAccuracy = models.length > 0 ? Math.round(models.reduce((sum, m) => sum + (m.accuracy || 0), 0) / models.length) : 0;
  const totalPredictions = models.reduce((sum, m) => sum + (m.predictions_made || 0), 0);
  const degradedModels = models.filter(m => m.status === "degraded").length;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Data Intelligence", path: "/data-intelligence" }, { label: "Analytics Studio" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">AI Analytics Studio</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>ML model performance, features, and analytics management</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5" glow>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Active Models</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{activeModels}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" style={{ color: LOW }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Avg Accuracy</span>
          </div>
          <p className={`text-2xl font-black font-mono ${avgAccuracy >= 90 ? "text-green-400" : avgAccuracy >= 70 ? "text-amber-400" : "text-red-400"}`}>{avgAccuracy}%</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4" style={{ color: HIGH }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Predictions</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{totalPredictions.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: degradedModels > 0 ? DANGER : MUTED }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Degraded</span>
          </div>
          <p className={`text-2xl font-black font-mono ${degradedModels > 0 ? "text-red-400" : "text-green-400"}`}>{degradedModels}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: BORDER }}>
        <button onClick={() => setActiveTab("models")} className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "models" ? "text-white border-b-2" : ""}`} style={{ borderColor: activeTab === "models" ? CYAN : "transparent", color: activeTab === "models" ? CYAN : MUTED }}>Models</button>
        <button onClick={() => setActiveTab("features")} className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "features" ? "text-white border-b-2" : ""}`} style={{ borderColor: activeTab === "features" ? CYAN : "transparent", color: activeTab === "features" ? CYAN : MUTED }}>Features</button>
      </div>

      {activeTab === "models" && (
        <Card className="overflow-hidden">
          {loadM ? <Skeleton lines={6} /> : models.length === 0 ? (
            <EmptyState icon={Brain} title="No models" description="Create analytics models to enable AI-powered insights" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Use Case</th>
                    <th className="pb-3 font-semibold">Accuracy</th>
                    <th className="pb-3 font-semibold">Precision</th>
                    <th className="pb-3 font-semibold">Recall</th>
                    <th className="pb-3 font-semibold">F1</th>
                    <th className="pb-3 font-semibold">Latency</th>
                    <th className="pb-3 font-semibold">Predictions</th>
                    <th className="pb-3 font-semibold">Training</th>
                    <th className="pb-3 font-semibold">Next Retrain</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {models.map((model, i) => (
                    <tr key={model.id || i} className="text-white">
                      <td className="py-3 font-semibold">{model.name}</td>
                      <td className="py-3"><ModelTypeBadge type={model.model_type} /></td>
                      <td className="py-3"><UseCaseBadge useCase={model.use_case} /></td>
                      <td className="py-3"><AccuracyGauge value={model.accuracy || 0} /></td>
                      <td className="py-3 font-mono">{model.precision?.toFixed(2) || "—"}</td>
                      <td className="py-3 font-mono">{model.recall?.toFixed(2) || "—"}</td>
                      <td className="py-3 font-mono">{model.f1_score?.toFixed(2) || "—"}</td>
                      <td className="py-3 font-mono">{model.inference_latency_ms || 0}ms</td>
                      <td className="py-3 font-mono">{(model.predictions_made || 0).toLocaleString()}</td>
                      <td className="py-3" style={{ color: MUTED }}>{timeAgo(model.training_date)}</td>
                      <td className="py-3"><CountdownDays date={model.next_retrain_at} /></td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${model.status === "active" ? "text-green-400 bg-green-400/15" : model.status === "degraded" ? "text-amber-400 bg-amber-400/15" : "text-red-400 bg-red-400/15"}`}>
                          {model.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "features" && (
        <Card className="overflow-hidden">
          {loadF ? <Skeleton lines={6} /> : features.length === 0 ? (
            <EmptyState icon={Activity} title="No features" description="Create features for ML model training" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Entity</th>
                    <th className="pb-3 font-semibold">Null %</th>
                    <th className="pb-3 font-semibold">Cardinality</th>
                    <th className="pb-3 font-semibold">Use Cases</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {features.map((feat, i) => (
                    <tr key={feat.id || i} className="text-white">
                      <td className="py-3 font-semibold">{feat.name}</td>
                      <td className="py-3"><span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{feat.feature_type}</span></td>
                      <td className="py-3" style={{ color: MUTED }}>{feat.entity_type || "—"}</td>
                      <td className="py-3 font-mono">{feat.null_pct?.toFixed(1) || 0}%</td>
                      <td className="py-3 font-mono">{feat.cardinality?.toLocaleString() || 0}</td>
                      <td className="py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(feat.use_cases || []).slice(0, 3).map((uc, j) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{uc}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${feat.status === "active" ? "text-green-400 bg-green-400/15" : "text-slate-400 bg-slate-400/15"}`}>
                          {feat.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}