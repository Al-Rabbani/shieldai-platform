import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plug, Activity, Layers, Zap, TrendingUp } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, KpiCard, Skeleton, EmptyState, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

export default function GDSIntegrationHubPage() {
  const { data: connectors = [], isLoading: loadC } = useQuery({
    queryKey: ["connector-registrations"],
    queryFn: () => base44.entities.ConnectorRegistration.list("", 100).catch(() => []),
  });
  const { data: integrations = [], isLoading: loadI } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => base44.entities.Integration.list("", 100).catch(() => []),
  });
  const { data: instances = [], isLoading: loadInst } = useQuery({
    queryKey: ["connector-instances"],
    queryFn: () => base44.entities.ConnectorInstance.list("", 100).catch(() => []),
  });
  const { data: marketplace = [], isLoading: loadM } = useQuery({
    queryKey: ["marketplace-listings"],
    queryFn: () => base44.entities.MarketplaceListing.list("", 100).catch(() => []),
  });

  const activeConnectors = connectors.filter(c => c.is_active).length;
  const activeInstances = instances.filter(i => i.is_active).length;
  const publishedListings = marketplace.filter(m => m.status === "published").length;
  const totalInstalls = marketplace.reduce((sum, m) => sum + (m.installs_count || 0), 0);

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Integration Hub" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Universal Integration Hub</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Connectors, integrations, marketplace, and API management</p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Connectors" value={connectors.length} color={CYAN} icon={Plug} />
        <KpiCard label="Active Connectors" value={activeConnectors} color={LOW} icon={Zap} pulse={activeConnectors > 0} />
        <KpiCard label="Active Instances" value={activeInstances} color={CYAN} icon={Layers} />
        <KpiCard label="Marketplace" value={publishedListings} color={HIGH} icon={TrendingUp} />
        <KpiCard label="Total Installs" value={totalInstalls} color={LOW} icon={Activity} />
      </div>

      {/* Integration Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Recent Connectors</h3>
            <span className="text-[10px]" style={{ color: MUTED }}>{connectors.length} total</span>
          </div>
          {loadC ? <Skeleton lines={5} /> : connectors.length === 0 ? (
            <EmptyState icon={Plug} title="No connectors" description="Register connectors to start integrating" />
          ) : (
            <div className="space-y-3">
              {connectors.slice(0, 5).map((c, i) => (
                <div key={c.id || i} className="p-3 rounded-xl" style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{c.name}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{c.connector_type}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.is_active ? "text-green-400 bg-green-400/15" : "text-slate-500 bg-slate-500/15"}`}>
                      {c.is_active ? "active" : "inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Marketplace Highlights</h3>
            <span className="text-[10px]" style={{ color: MUTED }}>{marketplace.length} listings</span>
          </div>
          {loadM ? <Skeleton lines={5} /> : marketplace.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No listings" description="Browse marketplace for integrations" />
          ) : (
            <div className="space-y-3">
              {marketplace.filter(m => m.is_featured).slice(0, 5).map((m, i) => (
                <div key={m.id || i} className="p-3 rounded-xl" style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{m.name}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{m.vendor} • {m.installs_count || 0} installs</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]" style={{ color: HIGH }}>★</span>
                      <span className="text-[10px] font-bold text-white">{m.rating?.toFixed(1) || "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Integration Health */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Integration Health</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{integrations.length} integrations</span>
        </div>
        {loadI ? <Skeleton lines={5} /> : integrations.length === 0 ? (
          <EmptyState icon={Activity} title="No integrations" description="Create integrations to connect services" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Last Sync</th>
                  <th className="pb-3 font-semibold">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {integrations.slice(0, 10).map((int, i) => (
                  <tr key={int.id || i} className="text-white">
                    <td className="py-3 font-semibold">{int.name}</td>
                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{int.integration_type}</span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${int.status === "active" ? "text-green-400 bg-green-400/15" : int.status === "error" ? "text-red-400 bg-red-400/15" : "text-amber-400 bg-amber-400/15"}`}>
                        {int.status}
                      </span>
                    </td>
                    <td className="py-3" style={{ color: MUTED }}>{timeAgo(int.last_synced)}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold ${int.health_score >= 90 ? "text-green-400" : int.health_score >= 70 ? "text-amber-400" : "text-red-400"}`}>
                        {int.health_score || 0}%
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