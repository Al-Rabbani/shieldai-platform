import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Star, Shield } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, Skeleton, EmptyState, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const CATEGORY_COLORS = {
  cloud: "#3b82f6", security: "#ef4444", identity: "#10b981", ai: "#a855f7",
  devops: "#f59e0b", messaging: "#14b8a6", database: "#f97316", business: "#8b5cf6"
};
const AUTH_COLORS = { oauth2: "#10b981", api_key: "#f59e0b", bearer: "#3b82f6", basic: "#6b7280", aws_sigv4: "#f97316" };

export default function GDSConnectorRegistryPage() {
  const [activeTab, setActiveTab] = useState("registrations");
  const { data: connectors = [], isLoading: loadC } = useQuery({
    queryKey: ["connector-registrations"],
    queryFn: () => base44.entities.ConnectorRegistration.list("", 100).catch(() => []),
  });
  const { data: versions = [], isLoading: loadV } = useQuery({
    queryKey: ["connector-versions"],
    queryFn: () => base44.entities.ConnectorVersion.list("-published_at", 100).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Integration Hub", path: "/integration-hub" }, { label: "Connector Registry" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Connector Registry</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Manage connector registrations and versions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background: CYAN, color: "#020817" }}>
          <Plus className="w-4 h-4" /> Add Connector
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: BORDER }}>
        <button onClick={() => setActiveTab("registrations")}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "registrations" ? "text-white border-b-2" : ""}`}
          style={{ borderColor: activeTab === "registrations" ? CYAN : "transparent", color: activeTab === "registrations" ? CYAN : MUTED }}>
          Connectors
        </button>
        <button onClick={() => setActiveTab("versions")}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "versions" ? "text-white border-b-2" : ""}`}
          style={{ borderColor: activeTab === "versions" ? CYAN : "transparent", color: activeTab === "versions" ? CYAN : MUTED }}>
          Versions
        </button>
      </div>

      {activeTab === "registrations" && (
        <Card className="overflow-hidden">
          {loadC ? <Skeleton lines={6} /> : connectors.length === 0 ? (
            <EmptyState icon={Plus} title="No connectors" description="Register your first connector" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold">Auth Method</th>
                    <th className="pb-3 font-semibold">Active</th>
                    <th className="pb-3 font-semibold">Executions</th>
                    <th className="pb-3 font-semibold">Last Sync</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {connectors.map((c, i) => (
                    <tr key={c.id || i} className="text-white">
                      <td className="py-3 font-semibold">{c.name}</td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: CATEGORY_COLORS[c.category], background: `${CATEGORY_COLORS[c.category]}15` }}>
                          {c.category}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: AUTH_COLORS[c.auth_method], background: `${AUTH_COLORS[c.auth_method]}15` }}>
                          {c.auth_method}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold ${c.is_active ? "text-green-400" : "text-slate-500"}`}>{c.is_active ? "✓" : "✗"}</span>
                      </td>
                      <td className="py-3 font-mono">{(c.execution_count || 0).toLocaleString()}</td>
                      <td className="py-3" style={{ color: MUTED }}>{timeAgo(c.last_sync)}</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === "active" ? "text-green-400 bg-green-400/15" : c.status === "error" ? "text-red-400 bg-red-400/15" : "text-amber-400 bg-amber-400/15"}`}>
                          {c.status}
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

      {activeTab === "versions" && (
        <Card className="overflow-hidden">
          {loadV ? <Skeleton lines={6} /> : versions.length === 0 ? (
            <EmptyState icon={Star} title="No versions" description="Connector versions will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Connector</th>
                    <th className="pb-3 font-semibold">Version</th>
                    <th className="pb-3 font-semibold">Current</th>
                    <th className="pb-3 font-semibold">Stable</th>
                    <th className="pb-3 font-semibold">Downloads</th>
                    <th className="pb-3 font-semibold">Published By</th>
                    <th className="pb-3 font-semibold">Published</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {versions.map((v, i) => (
                    <tr key={v.id || i} className="text-white">
                      <td className="py-3 font-semibold">{v.connector_registration_id}</td>
                      <td className="py-3 font-mono">{v.version_tag}</td>
                      <td className="py-3">{v.is_current ? <Star className="w-4 h-4" style={{ color: HIGH }} /> : "—"}</td>
                      <td className="py-3">{v.is_stable ? <Shield className="w-4 h-4" style={{ color: LOW }} /> : "—"}</td>
                      <td className="py-3 font-mono">{(v.downloads || 0).toLocaleString()}</td>
                      <td className="py-3" style={{ color: MUTED }}>{v.published_by}</td>
                      <td className="py-3" style={{ color: MUTED }}>{timeAgo(v.published_at)}</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.status === "published" ? "text-green-400 bg-green-400/15" : v.status === "deprecated" ? "text-red-400 bg-red-400/15" : "text-amber-400 bg-amber-400/15"}`}>
                          {v.status}
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