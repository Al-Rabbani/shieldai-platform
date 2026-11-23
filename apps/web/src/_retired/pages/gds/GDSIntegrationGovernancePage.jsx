import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Lock, Activity } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, Skeleton, EmptyState, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const POLICY_TYPE_COLORS = {
  rate_limit: "#3b82f6", circuit_breaker: "#ef4444", pii_filter: "#dc2626",
  geo_restriction: "#f59e0b", auth_required: "#f59e0b", connector_allowlist: "#10b981"
};
const ACTION_COLORS = { block: "#dc2626", throttle: "#f59e0b", log: "#6b7280", alert: "#f97316", fallback: "#3b82f6" };

export default function GDSIntegrationGovernancePage() {
  const [activeTab, setActiveTab] = useState("policies");
  const { data: policies = [], isLoading: loadP } = useQuery({
    queryKey: ["integration-policies"],
    queryFn: () => base44.entities.IntegrationPolicy.list("", 100).catch(() => []),
  });
  const { data: webhooks = [], isLoading: loadW } = useQuery({
    queryKey: ["webhook-endpoints"],
    queryFn: () => base44.entities.WebhookEndpoint.list("", 100).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Integration Hub", path: "/integration-hub" }, { label: "Governance" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Integration Governance</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Policies, webhooks, and compliance enforcement</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: BORDER }}>
        <button onClick={() => setActiveTab("policies")}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "policies" ? "text-white border-b-2" : ""}`}
          style={{ borderColor: activeTab === "policies" ? CYAN : "transparent", color: activeTab === "policies" ? CYAN : MUTED }}>
          Policies
        </button>
        <button onClick={() => setActiveTab("webhooks")}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "webhooks" ? "text-white border-b-2" : ""}`}
          style={{ borderColor: activeTab === "webhooks" ? CYAN : "transparent", color: activeTab === "webhooks" ? CYAN : MUTED }}>
          Webhooks
        </button>
      </div>

      {activeTab === "policies" && (
        <Card className="overflow-hidden">
          {loadP ? <Skeleton lines={6} /> : policies.length === 0 ? (
            <EmptyState icon={Shield} title="No policies" description="Create integration policies" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Rule</th>
                    <th className="pb-3 font-semibold">Threshold</th>
                    <th className="pb-3 font-semibold">Action</th>
                    <th className="pb-3 font-semibold">Active</th>
                    <th className="pb-3 font-semibold">Violations</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {policies.map((p, i) => (
                    <tr key={p.id || i} className="text-white">
                      <td className="py-3 font-semibold">{p.name}</td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: POLICY_TYPE_COLORS[p.policy_type], background: `${POLICY_TYPE_COLORS[p.policy_type]}15` }}>
                          {p.policy_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3" style={{ color: MUTED }}>{p.rule}</td>
                      <td className="py-3 font-mono">{p.threshold || "—"}</td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: ACTION_COLORS[p.action_on_violation], background: `${ACTION_COLORS[p.action_on_violation]}15` }}>
                          {p.action_on_violation}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold ${p.is_active ? "text-green-400" : "text-slate-500"}`}>{p.is_active ? "✓" : "✗"}</span>
                      </td>
                      <td className="py-3 font-mono">
                        <span className={p.violation_count > 0 ? "text-red-400" : "text-green-400"}>{p.violation_count || 0}</span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_active ? "text-green-400 bg-green-400/15" : "text-slate-400 bg-slate-400/15"}`}>
                          {p.is_active ? "enforced" : "inactive"}
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

      {activeTab === "webhooks" && (
        <Card className="overflow-hidden">
          {loadW ? <Skeleton lines={6} /> : webhooks.length === 0 ? (
            <EmptyState icon={Activity} title="No webhooks" description="Configure webhook endpoints" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">URL</th>
                    <th className="pb-3 font-semibold">Events</th>
                    <th className="pb-3 font-semibold">Delivered</th>
                    <th className="pb-3 font-semibold">Failed</th>
                    <th className="pb-3 font-semibold">Last Delivery</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {webhooks.map((w, i) => (
                    <tr key={w.id || i} className="text-white">
                      <td className="py-3 font-semibold">{w.name}</td>
                      <td className="py-3 font-mono truncate max-w-xs">{w.url}</td>
                      <td className="py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(w.events || []).slice(0, 3).map((e, j) => (
                            <span key={j} className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{e}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 font-mono">{(w.delivery_count || 0).toLocaleString()}</td>
                      <td className="py-3 font-mono">
                        <span className={w.failure_count > 0 ? "text-red-400" : "text-green-400"}>{w.failure_count || 0}</span>
                      </td>
                      <td className="py-3" style={{ color: MUTED }}>{timeAgo(w.last_delivery)}</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${w.is_active ? "text-green-400 bg-green-400/15" : "text-slate-400 bg-slate-400/15"}`}>
                          {w.is_active ? "active" : "inactive"}
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