import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DashboardPage, StatTile, SectionCard, StatusBadge, LoadingSpinner } from "@/components/dashboards/DashboardShared";
import { Plug, Webhook, Activity, Cloud } from "lucide-react";

/* This page used to read four entities that have no table behind them (ConnectorRegistration, WebhookEndpoint,
 * ConnectorExecution, EventBusMessage) and, with every read failing into [], printed "No connectors registered" and
 * four zero tiles. That reads as a platform with nothing configured; the truth is a platform with nowhere to record a
 * connector. The tiles now separate what exists from what has no store, and the store list is measured live. */
const STORE_NOTES = {
  integration_configs: "per-configuration records for hand-added integrations",
  connector_registrations: "the connector registry itself",
  webhook_endpoints: "inbound webhook endpoints and their delivery history",
  connector_executions: "one row per connector run",
  event_bus_messages: "the event bus message log",
};

export default function ConnectorsIntegrationsPage() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.integrations.status()
      .then(setStatus)
      .catch(e => setError(e.message || "could not read integration status"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardPage title="Connectors &amp; Integrations" badge="EDP-018"><LoadingSpinner /></DashboardPage>;

  const envs = status?.cloud?.environments || [];
  const teams = status?.linear?.teams || [];
  const stores = status?.stores || {};
  const absent = Object.entries(stores).filter(([, state]) => !state?.exists).map(([name]) => name);
  const present = Object.entries(stores).filter(([, state]) => state?.exists).map(([name]) => name);

  return (
    <DashboardPage
      title="Connectors &amp; Integrations"
      badge="EDP-018"
      subtitle="What this platform can actually speak to, and which connector stores exist"
    >
      {error && <p className="text-xs text-red-400 mb-3">Could not read integration status: {error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Cloud} label="Cloud Environments" value={envs.length} sublabel={envs.map(e => e.provider).join(", ") || "none connected"} accent="#3b82f6" />
        <StatTile icon={Activity} label="Assets Discovered" value={status?.cloud?.total_assets ?? 0} sublabel="across those environments" accent="#10b981" />
        <StatTile icon={Plug} label="Linear Teams" value={status?.linear?.reachable ? teams.length : "—"} sublabel={status?.linear?.reachable ? "visible to this key" : "not reachable"} accent="#f59e0b" />
        <StatTile icon={Webhook} label="Connector Stores" value={`${present.length} of ${Object.keys(stores).length}`} sublabel={absent.length ? `${absent.length} do not exist` : "all present"} accent="#8b5cf6" />
      </div>

      <SectionCard title="Integrations in use">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
            <div className="flex items-center gap-2 mb-2">
              <Plug size={16} className="text-blue-400" />
              <p className="text-sm font-semibold text-white flex-1">Linear</p>
              <span className={`w-2 h-2 rounded-full ${status?.linear?.reachable ? "bg-emerald-500" : "bg-slate-600"}`} />
            </div>
            <p className="text-[11px] text-slate-400">
              {status?.linear?.reachable
                ? `${status.linear.viewer?.name} · ${teams.length} team(s)`
                : status?.linear?.reason || "not reachable"}
            </p>
            <div className="mt-2"><StatusBadge status={status?.linear?.reachable ? "connected" : "unavailable"} /></div>
          </div>

          {envs.map(env => (
            <div key={env.native_id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
              <div className="flex items-center gap-2 mb-2">
                <Cloud size={16} className="text-blue-400" />
                <p className="text-sm font-semibold text-white flex-1">{env.provider.toUpperCase()}</p>
                <span className={`w-2 h-2 rounded-full ${env.discovery_status === "completed" ? "bg-emerald-500" : "bg-slate-600"}`} />
              </div>
              <p className="text-[11px] text-slate-400">{env.name} · {env.native_id}</p>
              <p className="text-[10px] text-slate-500 mt-1">{env.asset_count} asset{env.asset_count === 1 ? "" : "s"} · discovery {env.discovery_status}</p>
              <div className="mt-2"><StatusBadge status={env.discovery_status || env.status} /></div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Connector stores">
        <div className="space-y-2">
          {Object.entries(stores).map(([name, state]) => (
            <div key={name} className="flex items-start gap-3 rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
              <span className={`mt-1 w-2 h-2 rounded-full ${state?.exists ? "bg-emerald-500" : "bg-slate-600"}`} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">{name}</p>
                <p className="text-[11px] text-slate-500">
                  {state?.exists
                    ? `exists · ${state.rows} row(s) for this tenant${state.rows === 0 ? " — the store is there but nothing is configured in it" : ""}`
                    : `does not exist — ${STORE_NOTES[name] || "no table behind this entity"} cannot be recorded`}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-3">
          Read live from the database schema on every load, so a store that is added later appears here without a code change.
        </p>
      </SectionCard>
    </DashboardPage>
  );
}
