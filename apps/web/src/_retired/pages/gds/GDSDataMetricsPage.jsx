import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Activity, TrendingUp, DollarSign } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Breadcrumb, Card, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function CategoryBadge({ category, colors }) {
  const color = colors[category] || MUTED;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color, background: `${color}15` }}>{category}</span>;
}

const SECURITY_CATS = { mttd: "#3b82f6", mttr: "#10b981", coverage: "#f59e0b", posture: "#a855f7", vulnerability: "#ef4444", threat: "#dc2626", compliance: "#14b8a6", identity: "#8b5cf6" };
const OPS_CATS = { latency: "#3b82f6", throughput: "#10b981", availability: "#f59e0b", error_rate: "#ef4444", capacity: "#a855f7", performance: "#14b8a6" };
const BUSINESS_CATS = { revenue: "#10b981", cost: "#ef4444", risk: "#f59e0b", customer: "#3b82f6", growth: "#a855f7", efficiency: "#14b8a6" };

function TrendBadge({ delta, direction }) {
  const isGood = direction === "up" ? delta > 0 : direction === "down" ? delta < 0 : true;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isGood ? "text-green-400 bg-green-400/15" : "text-red-400 bg-red-400/15"}`}>
      {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {Math.abs(delta)}
    </span>
  );
}

function PercentileGauge({ pct }) {
  const color = pct >= 75 ? LOW : pct >= 50 ? MEDIUM : DANGER;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full" style={{ background: `${BORDER}` }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={`text-[10px] font-mono font-bold ${color === LOW ? "text-green-400" : color === MEDIUM ? "text-amber-400" : "text-red-400"}`}>{pct}%</span>
    </div>
  );
}

export default function GDSOperationalMetricsPage() {
  const [activeTab, setActiveTab] = useState("security");
  const { data: secMetrics = [], isLoading: loadS } = useQuery({
    queryKey: ["data-sec-metrics"],
    queryFn: () => base44.entities.SecurityMetric.list("", 50).catch(() => []),
  });
  const { data: opsMetrics = [], isLoading: loadO } = useQuery({
    queryKey: ["data-ops-metrics"],
    queryFn: () => base44.entities.OperationalMetric.list("", 50).catch(() => []),
  });
  const { data: bizMetrics = [], isLoading: loadB } = useQuery({
    queryKey: ["data-biz-metrics"],
    queryFn: () => base44.entities.BusinessMetric.list("", 50).catch(() => []),
  });

  const metrics = activeTab === "security" ? secMetrics : activeTab === "operational" ? opsMetrics : bizMetrics;
  const isLoading = activeTab === "security" ? loadS : activeTab === "operational" ? loadO : loadB;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Data Intelligence", path: "/data-intelligence" }, { label: "Metrics" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Operational Intelligence</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Security, operational, and business metrics tracking</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: BORDER }}>
        <button onClick={() => setActiveTab("security")} className={`px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 ${activeTab === "security" ? "text-white border-b-2" : ""}`} style={{ borderColor: activeTab === "security" ? CYAN : "transparent", color: activeTab === "security" ? CYAN : MUTED }}>
          <Shield className="w-3 h-3" /> Security
        </button>
        <button onClick={() => setActiveTab("operational")} className={`px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 ${activeTab === "operational" ? "text-white border-b-2" : ""}`} style={{ borderColor: activeTab === "operational" ? CYAN : "transparent", color: activeTab === "operational" ? CYAN : MUTED }}>
          <Activity className="w-3 h-3" /> Operational
        </button>
        <button onClick={() => setActiveTab("business")} className={`px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 ${activeTab === "business" ? "text-white border-b-2" : ""}`} style={{ borderColor: activeTab === "business" ? CYAN : "transparent", color: activeTab === "business" ? CYAN : MUTED }}>
          <DollarSign className="w-3 h-3" /> Business
        </button>
      </div>

      {/* Metrics Table */}
      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={8} /> : metrics.length === 0 ? (
          <EmptyState icon={TrendingUp} title={`No ${activeTab} metrics`} description={`Create ${activeTab} metrics to track performance`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Value</th>
                  <th className="pb-3 font-semibold">Unit</th>
                  {activeTab === "security" && <th className="pb-3 font-semibold">Benchmark</th>}
                  {activeTab === "security" && <th className="pb-3 font-semibold">Industry %</th>}
                  {activeTab === "operational" && <th className="pb-3 font-semibold">P50</th>}
                  {activeTab === "operational" && <th className="pb-3 font-semibold">P95</th>}
                  {activeTab === "operational" && <th className="pb-3 font-semibold">P99</th>}
                  {activeTab === "operational" && <th className="pb-3 font-semibold">SLA Target</th>}
                  {activeTab === "operational" && <th className="pb-3 font-semibold">SLA Met</th>}
                  {activeTab === "business" && <th className="pb-3 font-semibold">Period</th>}
                  {activeTab === "business" && <th className="pb-3 font-semibold">Financial Impact</th>}
                  {activeTab === "business" && <th className="pb-3 font-semibold">Risk Score</th>}
                  <th className="pb-3 font-semibold">Trend</th>
                  {activeTab === "security" && <th className="pb-3 font-semibold">Last Measured</th>}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {metrics.map((m, i) => (
                  <tr key={m.id || i} className="text-white">
                    <td className="py-3 font-semibold">{m.name}</td>
                    <td className="py-3">
                      <CategoryBadge category={m.category} colors={activeTab === "security" ? SECURITY_CATS : activeTab === "operational" ? OPS_CATS : BUSINESS_CATS} />
                    </td>
                    <td className="py-3 font-mono text-lg font-bold" style={{ color: CYAN }}>{m.value?.toLocaleString()}</td>
                    <td className="py-3" style={{ color: MUTED }}>{m.unit || "—"}</td>
                    {activeTab === "security" && <td className="py-3 font-mono">{m.benchmark_value?.toLocaleString() || "—"}</td>}
                    {activeTab === "security" && <td className="py-3"><PercentileGauge pct={m.industry_percentile || 0} /></td>}
                    {activeTab === "operational" && <td className="py-3 font-mono">{m.p50?.toLocaleString() || "—"}</td>}
                    {activeTab === "operational" && <td className="py-3 font-mono">{m.p95?.toLocaleString() || "—"}</td>}
                    {activeTab === "operational" && <td className="py-3 font-mono">{m.p99?.toLocaleString() || "—"}</td>}
                    {activeTab === "operational" && <td className="py-3 font-mono">{m.target_sla?.toLocaleString() || "—"}</td>}
                    {activeTab === "operational" && (
                      <td className="py-3">{m.sla_met ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}</td>
                    )}
                    {activeTab === "business" && <td className="py-3 capitalize">{m.period || "—"}</td>}
                    {activeTab === "business" && (
                      <td className="py-3 font-mono">{m.financial_impact_usd > 0 ? <span style={{ color: HIGH }}>${m.financial_impact_usd.toLocaleString()}</span> : <span style={{ color: MUTED }}>—</span>}</td>
                    )}
                    {activeTab === "business" && <td className="py-3"><PercentileGauge pct={m.risk_contribution_score || 0} /></td>}
                    <td className="py-3"><TrendBadge delta={m.trend_delta || 0} direction={activeTab === "security" ? m.trend_direction : "neutral"} /></td>
                    {activeTab === "security" && <td className="py-3" style={{ color: MUTED }}>{timeAgo(m.last_measured)}</td>}
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