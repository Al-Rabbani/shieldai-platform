import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, GitBranch } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, Skeleton, EmptyState, PAGE_BG
} from "@/components/gds/GDSOSShared";

const TYPE_COLORS = {
  point_to_point: "#3b82f6", event_driven: "#a855f7", hub_spoke: "#f59e0b",
  data_sync: "#10b981", bidirectional: "#14b8a6"
};
const TRIGGER_COLORS = { webhook: "#3b82f6", schedule: "#f59e0b", event: "#10b981", realtime: "#a855f7" };

export default function GDSIntegrationStudioPage() {
  const [activeTab, setActiveTab] = useState("integrations");
  const { data: integrations = [], isLoading: loadI } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => base44.entities.Integration.list("", 100).catch(() => []),
  });
  const { data: flows = [], isLoading: loadF } = useQuery({
    queryKey: ["integration-flows"],
    queryFn: () => base44.entities.IntegrationFlow.list("", 100).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Integration Hub", path: "/integration-hub" }, { label: "Integration Studio" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Integration Studio</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Build and manage integration workflows</p>
        </div>
        <button className="px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background: CYAN, color: "#020817" }}>
          Create Integration
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: BORDER }}>
        <button onClick={() => setActiveTab("integrations")}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "integrations" ? "text-white border-b-2" : ""}`}
          style={{ borderColor: activeTab === "integrations" ? CYAN : "transparent", color: activeTab === "integrations" ? CYAN : MUTED }}>
          Integrations
        </button>
        <button onClick={() => setActiveTab("flows")}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "flows" ? "text-white border-b-2" : ""}`}
          style={{ borderColor: activeTab === "flows" ? CYAN : "transparent", color: activeTab === "flows" ? CYAN : MUTED }}>
          Flows
        </button>
      </div>

      {activeTab === "integrations" && (
        <Card className="overflow-hidden">
          {loadI ? <Skeleton lines={6} /> : integrations.length === 0 ? (
            <EmptyState icon={Zap} title="No integrations" description="Create your first integration" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Trigger</th>
                    <th className="pb-3 font-semibold">Success Rate</th>
                    <th className="pb-3 font-semibold">Executions</th>
                    <th className="pb-3 font-semibold">Avg Duration</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {integrations.map((int, i) => (
                    <tr key={int.id || i} className="text-white">
                      <td className="py-3 font-semibold">{int.name}</td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: TYPE_COLORS[int.integration_type], background: `${TYPE_COLORS[int.integration_type]}15` }}>
                          {int.integration_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: TRIGGER_COLORS[int.trigger_type], background: `${TRIGGER_COLORS[int.trigger_type]}15` }}>
                          {int.trigger_type}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full" style={{ background: BORDER }}>
                            <div className="h-full rounded-full" style={{ width: `${int.success_rate || 0}%`, background: int.success_rate >= 95 ? LOW : int.success_rate >= 80 ? MEDIUM : DANGER }} />
                          </div>
                          <span className="text-[10px] font-mono">{int.success_rate || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 font-mono">{(int.total_executions || 0).toLocaleString()}</td>
                      <td className="py-3 font-mono">{(int.avg_duration_ms || 0).toLocaleString()} ms</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${int.status === "active" ? "text-green-400 bg-green-400/15" : int.status === "error" ? "text-red-400 bg-red-400/15" : "text-amber-400 bg-amber-400/15"}`}>
                          {int.status}
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

      {activeTab === "flows" && (
        <Card className="overflow-hidden">
          {loadF ? <Skeleton lines={6} /> : flows.length === 0 ? (
            <EmptyState icon={GitBranch} title="No flows" description="Create integration flows" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Flow Type</th>
                    <th className="pb-3 font-semibold">Steps</th>
                    <th className="pb-3 font-semibold">Success Rate</th>
                    <th className="pb-3 font-semibold">Avg Duration</th>
                    <th className="pb-3 font-semibold">Last Run</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {flows.map((flow, i) => (
                    <tr key={flow.id || i} className="text-white">
                      <td className="py-3 font-semibold">{flow.name}</td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{flow.flow_type}</span>
                      </td>
                      <td className="py-3 font-mono">{flow.steps_count || 0}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full" style={{ background: BORDER }}>
                            <div className="h-full rounded-full" style={{ width: `${flow.success_rate || 0}%`, background: flow.success_rate >= 95 ? LOW : LOW }} />
                          </div>
                          <span className="text-[10px] font-mono">{flow.success_rate || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 font-mono">{(flow.avg_duration_ms || 0).toLocaleString()} ms</td>
                      <td className="py-3" style={{ color: MUTED }}>{flow.last_run ? new Date(flow.last_run).toLocaleDateString() : "—"}</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flow.status === "active" ? "text-green-400 bg-green-400/15" : "text-slate-400 bg-slate-400/15"}`}>
                          {flow.status}
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