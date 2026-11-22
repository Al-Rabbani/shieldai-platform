import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, TrendingUp } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, Skeleton, EmptyState, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function GDSIntegrationAnalyticsPage() {
  const { data: executions = [], isLoading: loadE } = useQuery({
    queryKey: ["connector-executions"],
    queryFn: () => base44.entities.ConnectorInstance.list("", 100).catch(() => []),
  });
  const { data: listings = [], isLoading: loadL } = useQuery({
    queryKey: ["marketplace-listings"],
    queryFn: () => base44.entities.MarketplaceListing.list("", 100).catch(() => []),
  });

  const categoryData = executions.reduce((acc, e) => {
    acc[e.connector_type || "unknown"] = (acc[e.connector_type || "unknown"] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  const topByInstalls = [...listings].sort((a, b) => (b.installs_count || 0) - (a.installs_count || 0)).slice(0, 10);
  const topByRating = [...listings].filter(l => l.rating).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Integration Hub", path: "/integration-hub" }, { label: "Analytics" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Integration Analytics</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Performance metrics and usage analytics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Executions by Category</h3>
          {chartData.length === 0 ? (
            <EmptyState icon={Activity} title="No data" description="Execution data will appear here" />
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke={MUTED} fontSize={10} />
                  <YAxis stroke={MUTED} fontSize={10} />
                  <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}` }} />
                  <Bar dataKey="value" fill={CYAN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Top Listings by Installs</h3>
          {topByInstalls.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No data" description="Marketplace data will appear here" />
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={topByInstalls} layout="vertical">
                  <XAxis type="number" stroke={MUTED} fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke={MUTED} fontSize={10} width={100} />
                  <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}` }} />
                  <Bar dataKey="installs_count" fill={HIGH} radius={[4, 0, 0, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Recent Executions</h3>
        {loadE ? <Skeleton lines={6} /> : executions.length === 0 ? (
          <EmptyState icon={Activity} title="No executions" description="Connector executions will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Connector</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Duration</th>
                  <th className="pb-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {executions.slice(0, 20).map((e, i) => (
                  <tr key={e.id || i} className="text-white">
                    <td className="py-3 font-semibold">{e.name}</td>
                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{e.connector_type}</span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.status === "active" ? "text-green-400 bg-green-400/15" : "text-red-400 bg-red-400/15"}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono">{(e.avg_latency_ms || 0).toLocaleString()} ms</td>
                    <td className="py-3" style={{ color: MUTED }}>{timeAgo(e.last_health_check)}</td>
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