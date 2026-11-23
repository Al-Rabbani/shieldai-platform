import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Target, AlertTriangle, CheckCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Breadcrumb, Card, Skeleton, EmptyState, PAGE_BG
} from "@/components/gds/GDSOSShared";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

function StatusBadge({ status }) {
  const map = {
    on_track: { color: "#00ff88", label: "ON TRACK" },
    at_risk: { color: "#ffd700", label: "AT RISK" },
    breached: { color: "#ff3b3b", label: "BREACHED" },
    exceeded: { color: "#a855f7", label: "EXCEEDED" }
  };
  const m = map[status] || { color: MUTED, label: status };
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: m.color, background: `${m.color}15` }}>{m.label}</span>;
}

function TrendArrow({ delta }) {
  if (delta === 0) return <span className="text-[10px]" style={{ color: MUTED }}>→</span>;
  return <span className={`text-[10px] font-bold ${delta > 0 ? "text-green-400" : "text-red-400"}`}>{delta > 0 ? "↑" : "↓"} {Math.abs(delta)}</span>;
}

export default function GDSKPIDashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { data: kpis = [], isLoading: loadK } = useQuery({
    queryKey: ["data-kpis-all"],
    queryFn: () => base44.entities.KPI.list("", 200).catch(() => []),
  });

  const categories = ["all", "security", "compliance", "operational", "business", "ai_performance", "soc", "risk", "executive"];
  const filteredKPIs = selectedCategory === "all" ? kpis : kpis.filter(k => k.category === selectedCategory);
  const breachedKPIs = kpis.filter(k => k.status === "breached");

  const statusCounts = kpis.reduce((acc, k) => {
    acc[k.status] = (acc[k.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name, value, color: name === "breached" ? DANGER : name === "at_risk" ? HIGH : name === "exceeded" ? "#a855f7" : LOW
  }));

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Data Intelligence", path: "/data-intelligence" }, { label: "KPI Dashboard" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">KPI Executive Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Track key performance indicators across all business domains</p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedCategory === cat ? "text-white" : ""}`}
            style={{ background: selectedCategory === cat ? `${CYAN}20` : `${BORDER}40`, border: `1px solid ${selectedCategory === cat ? CYAN : BORDER}`, color: selectedCategory === cat ? CYAN : MUTED }}
          >
            {cat.replace(/_/g, " ").toUpperCase()}
          </button>
        ))}
      </div>

      {/* Overall Scorecard */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Overall Status</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{kpis.length} total KPIs</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                  <span className="text-xs font-semibold" style={{ color: TEXT }}>{d.name.replace(/_/g, " ")}</span>
                </div>
                <span className="text-sm font-black font-mono" style={{ color: d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Breached KPIs Alert */}
      {breachedKPIs.length > 0 && (
        <Card className="p-4 border-l-4" style={{ borderColor: DANGER, background: `${DANGER}08` }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
            <div>
              <p className="text-sm font-bold" style={{ color: DANGER }}>{breachedKPIs.length} KPI(s) Breached</p>
              <p className="text-xs" style={{ color: MUTED }}>Immediate attention required</p>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Grid */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">KPI Tiles</h3>
        {loadK ? <Skeleton lines={8} /> : filteredKPIs.length === 0 ? (
          <EmptyState icon={Target} title="No KPIs" description="Create KPIs to track performance metrics" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredKPIs.map((kpi, i) => (
              <Card key={kpi.id || i} className="p-4" glow>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold text-white line-clamp-2">{kpi.name}</p>
                  <StatusBadge status={kpi.status} />
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className={`text-2xl font-black font-mono ${kpi.status === "breached" ? "text-red-400" : kpi.status === "at_risk" ? "text-amber-400" : "text-green-400"}`}>
                    {kpi.current_value?.toLocaleString()}
                  </span>
                  <span className="text-xs" style={{ color: MUTED }}>{kpi.unit}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderColor: `${BORDER}40` }}>
                  <div>
                    <p className="text-[9px]" style={{ color: MUTED }}>Target: <span className="text-white font-mono">{kpi.target_value?.toLocaleString()}</span></p>
                    <p className="text-[9px]" style={{ color: MUTED }}>Previous: <span className="text-white font-mono">{kpi.previous_value?.toLocaleString()}</span></p>
                  </div>
                  <TrendArrow delta={kpi.trend_delta} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}