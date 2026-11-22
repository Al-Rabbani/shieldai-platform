import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DashboardPage, StatTile, SectionCard, StatusBadge, LoadingSpinner, EmptyState, Tag } from "@/components/dashboards/DashboardShared";
import { Plug, Webhook, Activity, Radio } from "lucide-react";

export default function ConnectorsIntegrationsPage() {
  const [connectors, setConnectors] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ConnectorRegistration.list().catch(() => []),
      base44.entities.WebhookEndpoint.list("-last_delivery", 20).catch(() => []),
      base44.entities.ConnectorExecution.list("-created_date", 20).catch(() => []),
      base44.entities.EventBusMessage.list("-timestamp", 20).catch(() => []),
    ]).then(([c, w, e, ev]) => {
      setConnectors(c); setWebhooks(w); setExecutions(e); setEvents(ev); setLoading(false);
    });
  }, []);

  if (loading) return <DashboardPage title="Connectors & Integrations" badge="EDP-018"><LoadingSpinner /></DashboardPage>;

  const activeConnectors = connectors.filter(c => c.is_active).length;

  return (
    <DashboardPage title="Connectors & Integrations" badge="EDP-018" subtitle="Manage connector registrations, webhook endpoints, executions, and event bus messages">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Plug} label="Connectors" value={connectors.length} sublabel={`${connectors.filter(c => c.category === "cloud").length} cloud`} accent="#3b82f6" />
        <StatTile icon={Plug} label="Active Connectors" value={activeConnectors} sublabel={`${connectors.length - activeConnectors} inactive`} accent="#10b981" />
        <StatTile icon={Webhook} label="Webhooks" value={webhooks.length} sublabel={`${webhooks.filter(w => w.is_active).length} active`} accent="#f59e0b" />
        <StatTile icon={Radio} label="Event Messages" value={events.length} sublabel="Recent bus activity" accent="#8b5cf6" />
      </div>

      <SectionCard title="Connector Registrations">
        {connectors.length === 0 ? <EmptyState message="No connectors registered" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {connectors.map(c => (
              <div key={c.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Plug size={16} className="text-blue-400" />
                  <p className="text-sm font-semibold text-white flex-1">{c.name}</p>
                  <span className={`w-2 h-2 rounded-full ${c.is_active ? "bg-emerald-500" : "bg-slate-600"}`} />
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  <Tag>{c.category}</Tag>
                  <Tag>{c.auth_method}</Tag>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{c.execution_count} executions</span>
                  <span>{c.last_sync ? new Date(c.last_sync).toLocaleDateString() : "Never synced"}</span>
                </div>
                <div className="mt-2"><StatusBadge status={c.status} /></div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Webhook Endpoints">
          {webhooks.length === 0 ? <EmptyState message="No webhooks configured" /> : (
            <div className="space-y-2">
              {webhooks.map(w => (
                <div key={w.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Webhook size={14} className="text-amber-400" />
                    <p className="text-sm font-semibold text-white flex-1">{w.name}</p>
                    <span className={`w-2 h-2 rounded-full ${w.is_active ? "bg-emerald-500" : "bg-slate-600"}`} />
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(w.events || []).map((ev, i) => <Tag key={i}>{ev}</Tag>)}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500">
                    <span className="text-emerald-400">{w.delivery_count} delivered</span>
                    <span className="text-red-400">{w.failure_count} failed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Executions">
          {executions.length === 0 ? <EmptyState message="No recent executions" /> : (
            <div className="space-y-2">
              {executions.map(e => (
                <div key={e.id} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <Activity size={14} className={e.status === "success" ? "text-emerald-400" : "text-red-400"} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white">{e.connector_name} · {e.action}</p>
                    <p className="text-[10px] text-slate-500">By {e.executed_by || "system"} · {e.response_time_ms ? `${e.response_time_ms}ms` : ""}</p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Event Bus">
        {events.length === 0 ? <EmptyState message="No event bus messages" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-2 px-3">Event Type</th><th className="text-left py-2 px-3">Source</th><th className="text-left py-2 px-3">Consumed By</th><th className="text-left py-2 px-3">Status</th><th className="text-left py-2 px-3">Timestamp</th>
              </tr></thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} className="border-b border-slate-800 hover:bg-blue-500/5">
                    <td className="py-2 px-3 text-white font-medium">{ev.event_type}</td>
                    <td className="py-2 px-3 text-slate-400">{ev.source}</td>
                    <td className="py-2 px-3 text-slate-400">{ev.consumed_by}</td>
                    <td className="py-2 px-3"><StatusBadge status={ev.status} /></td>
                    <td className="py-2 px-3 text-slate-500">{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </DashboardPage>
  );
}