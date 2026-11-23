import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cpu, Activity, Zap } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, KpiCard, Skeleton, EmptyState, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

export default function GDSMCPHubPage() {
  const { data: servers = [], isLoading } = useQuery({
    queryKey: ["mcp-servers"],
    queryFn: () => base44.entities.MCPServer.list("", 100).catch(() => []),
  });

  const activeServers = servers.filter(s => s.health_status === "healthy").length;
  const totalTools = servers.reduce((sum, s) => sum + (s.tools_count || 0), 0);
  const avgLatency = servers.length > 0 ? Math.round(servers.reduce((sum, s) => sum + (s.avg_response_ms || 0), 0) / servers.length) : 0;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Integration Hub", path: "/integration-hub" }, { label: "MCP Hub" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">MCP Hub — Model Context Protocol</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Manage MCP servers, tools, and resources</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Servers" value={activeServers} color={LOW} icon={Cpu} pulse={activeServers > 0} />
        <KpiCard label="Total Servers" value={servers.length} color={CYAN} icon={Activity} />
        <KpiCard label="Total Tools" value={totalTools} color={HIGH} icon={Zap} />
        <KpiCard label="Avg Latency" value={`${avgLatency}ms`} color={MEDIUM} icon={Activity} />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={6} /> : servers.length === 0 ? (
          <EmptyState icon={Cpu} title="No MCP servers" description="Register MCP servers to enable tool access" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Protocol</th>
                  <th className="pb-3 font-semibold">Tools</th>
                  <th className="pb-3 font-semibold">Resources</th>
                  <th className="pb-3 font-semibold">Success Rate</th>
                  <th className="pb-3 font-semibold">Latency</th>
                  <th className="pb-3 font-semibold">Last Seen</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {servers.map((s, i) => (
                  <tr key={s.id || i} className="text-white">
                    <td className="py-3 font-semibold">{s.name}</td>
                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{s.server_type}</span>
                    </td>
                    <td className="py-3 font-mono">{s.protocol}</td>
                    <td className="py-3 font-mono">{s.tools_count || 0}</td>
                    <td className="py-3 font-mono">{s.resources_count || 0}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold ${s.success_rate >= 95 ? "text-green-400" : s.success_rate >= 80 ? "text-amber-400" : "text-red-400"}`}>
                        {s.success_rate || 0}%
                      </span>
                    </td>
                    <td className="py-3 font-mono">{(s.avg_response_ms || 0).toLocaleString()} ms</td>
                    <td className="py-3" style={{ color: MUTED }}>{timeAgo(s.last_health_check)}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.health_status === "healthy" ? "text-green-400 bg-green-400/15 animate-pulse" : s.health_status === "degraded" ? "text-amber-400 bg-amber-400/15" : "text-red-400 bg-red-400/15"}`}>
                        {s.health_status}
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