import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, Lock, Activity } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, KpiCard, Skeleton, EmptyState, PAGE_BG
} from "@/components/gds/GDSOSShared";

const METHOD_COLORS = { GET: "#10b981", POST: "#3b82f6", PUT: "#f59e0b", PATCH: "#f97316", DELETE: "#ef4444", STREAM: "#a855f7", SUBSCRIBE: "#14b8a6" };
const PROTOCOL_COLORS = { rest: "#3b82f6", graphql: "#a855f7", grpc: "#f59e0b", websocket: "#14b8a6", sse: "#10b981", webhook: "#ef4444" };

export default function GDSAPIFederationPage() {
  const { data: endpoints = [], isLoading: loadE } = useQuery({
    queryKey: ["api-endpoints"],
    queryFn: () => base44.entities.APIEndpoint.list("", 100).catch(() => []),
  });
  const { data: subscriptions = [], isLoading: loadS } = useQuery({
    queryKey: ["event-subscriptions"],
    queryFn: () => base44.entities.EventSubscription.list("", 100).catch(() => []),
  });

  const activeEndpoints = endpoints.filter(e => e.is_active).length;
  const avgLatency = endpoints.length > 0 ? Math.round(endpoints.reduce((sum, e) => sum + (e.avg_response_ms || 0), 0) / endpoints.length) : 0;
  const p95Latency = endpoints.length > 0 ? Math.round(endpoints.reduce((sum, e) => sum + (e.p95_latency_ms || 0), 0) / endpoints.length) : 0;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Integration Hub", path: "/integration-hub" }, { label: "API Federation" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">API Federation Center</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Manage API endpoints and event subscriptions</p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Endpoints" value={endpoints.length} color={CYAN} icon={Zap} />
        <KpiCard label="Active Endpoints" value={activeEndpoints} color={LOW} icon={Activity} />
        <KpiCard label="Avg Latency" value={`${avgLatency}ms`} color={MEDIUM} icon={Zap} />
        <KpiCard label="P95 Latency" value={`${p95Latency}ms`} color={HIGH} icon={Activity} />
      </div>

      {/* API Endpoints */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">API Endpoints</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{endpoints.length} endpoints</span>
        </div>
        {loadE ? <Skeleton lines={6} /> : endpoints.length === 0 ? (
          <EmptyState icon={Zap} title="No API endpoints" description="Register API endpoints to enable federation" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Method</th>
                  <th className="pb-3 font-semibold">Path</th>
                  <th className="pb-3 font-semibold">Protocol</th>
                  <th className="pb-3 font-semibold">Auth</th>
                  <th className="pb-3 font-semibold">Rate Limit</th>
                  <th className="pb-3 font-semibold">Latency</th>
                  <th className="pb-3 font-semibold">Calls</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {endpoints.map((ep, i) => (
                  <tr key={ep.id || i} className="text-white">
                    <td className="py-3 font-semibold">{ep.name}</td>
                    <td className="py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: METHOD_COLORS[ep.method], background: `${METHOD_COLORS[ep.method]}15` }}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="py-3 font-mono">{ep.path}</td>
                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: PROTOCOL_COLORS[ep.protocol], background: `${PROTOCOL_COLORS[ep.protocol]}15` }}>
                        {ep.protocol}
                      </span>
                    </td>
                    <td className="py-3">
                      {ep.auth_required ? <Lock className="w-3 h-3" style={{ color: MUTED }} /> : <span className="text-[10px]" style={{ color: MUTED }}>None</span>}
                    </td>
                    <td className="py-3 font-mono">{ep.rate_limit_per_min || "—"}</td>
                    <td className="py-3 font-mono">{(ep.avg_response_ms || 0).toLocaleString()} ms</td>
                    <td className="py-3 font-mono">{(ep.total_calls || 0).toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ep.is_active ? "text-green-400 bg-green-400/15" : "text-slate-400 bg-slate-400/15"}`}>
                        {ep.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Event Subscriptions */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Event Subscriptions</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{subscriptions.length} subscriptions</span>
        </div>
        {loadS ? <Skeleton lines={6} /> : subscriptions.length === 0 ? (
          <EmptyState icon={Activity} title="No subscriptions" description="Subscribe to events from integrations" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Event Type</th>
                  <th className="pb-3 font-semibold">Target</th>
                  <th className="pb-3 font-semibold">Delivered</th>
                  <th className="pb-3 font-semibold">Failed</th>
                  <th className="pb-3 font-semibold">Last Delivery</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {subscriptions.map((sub, i) => (
                  <tr key={sub.id || i} className="text-white">
                    <td className="py-3 font-semibold">{sub.name}</td>
                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{sub.event_type}</span>
                    </td>
                    <td className="py-3 font-mono truncate max-w-xs">{sub.webhook_url}</td>
                    <td className="py-3 font-mono">{(sub.events_delivered || 0).toLocaleString()}</td>
                    <td className="py-3 font-mono">
                      <span className={sub.events_failed > 0 ? "text-red-400" : "text-green-400"}>
                        {(sub.events_failed || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3" style={{ color: MUTED }}>{sub.last_delivery ? new Date(sub.last_delivery).toLocaleString() : "—"}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.is_active ? "text-green-400 bg-green-400/15" : "text-slate-400 bg-slate-400/15"}`}>
                        {sub.is_active ? "active" : "inactive"}
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