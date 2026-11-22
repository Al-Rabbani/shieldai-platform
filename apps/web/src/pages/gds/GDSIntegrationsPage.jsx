import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plug, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, LOW, MUTED,
  StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

const INTEGRATION_CATALOG = [
  { category: "Cloud", items: [
    { name: "AWS", icon: "☁️", type: "aws" },
    { name: "Azure", icon: "🔷", type: "azure" },
    { name: "GCP", icon: "🌐", type: "gcp" },
  ]},
  { category: "Code", items: [
    { name: "GitHub", icon: "🐙", type: "github" },
    { name: "GitLab", icon: "🦊", type: "gitlab" },
    { name: "Bitbucket", icon: "🪣", type: "bitbucket" },
  ]},
  { category: "SIEM", items: [
    { name: "Splunk", icon: "📊", type: "splunk" },
    { name: "Datadog", icon: "🐕", type: "datadog" },
  ]},
  { category: "Ticketing", items: [
    { name: "Jira", icon: "🎫", type: "jira" },
    { name: "Linear", icon: "📐", type: "linear" },
    { name: "ServiceNow", icon: "🔧", type: "servicenow" },
  ]},
  { category: "Alerting", items: [
    { name: "Slack", icon: "💬", type: "slack" },
    { name: "PagerDuty", icon: "🚨", type: "pagerduty" },
    { name: "OpsGenie", icon: "🔔", type: "opsgenie" },
  ]},
];

export default function GDSIntegrationsPage() {
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["gds-integrations"],
    queryFn: () => base44.entities.IntegrationConfig.list().catch(() => []),
  });

  const connected = configs.filter(c => c.status === "connected").length;
  const errored = configs.filter(c => c.status === "error").length;

  const getConfig = (type) => configs.find(c => c.integration_type?.toLowerCase() === type.toLowerCase());

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Integrations" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Integrations</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Connect cloud providers, code repositories, SIEMs, and ticketing systems</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total Configured" value={configs.length} color={CYAN} icon={Plug} />
        <KpiCard label="Connected" value={connected} color={LOW} icon={CheckCircle} />
        <KpiCard label="Errors" value={errored} color={DANGER} icon={XCircle} pulse={errored > 0} />
      </div>

      {isLoading ? <Skeleton lines={4} /> : (
        <div className="space-y-6">
          {INTEGRATION_CATALOG.map(cat => (
            <div key={cat.category}>
              <h3 className="text-sm font-bold text-white mb-3">{cat.category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.items.map(intg => {
                  const config = getConfig(intg.type);
                  const status = config?.status || "available";
                  const statusColor = status === "connected" ? LOW : status === "error" ? DANGER : MUTED;
                  return (
                    <Card key={intg.type} className="p-4 flex items-center gap-4">
                      <span className="text-2xl flex-shrink-0">{intg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{intg.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                          <span className="text-[10px] capitalize" style={{ color: statusColor }}>{status}</span>
                        </div>
                        {config?.last_synced && (
                          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Synced {timeAgo(config.last_synced)}</p>
                        )}
                      </div>
                      <button className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                        style={{
                          background: status === "connected" ? `${CYAN}10` : `${LOW}10`,
                          border: `1px solid ${status === "connected" ? CYAN : LOW}30`,
                          color: status === "connected" ? CYAN : LOW,
                        }}>
                        {status === "connected" ? "Configure" : <span className="flex items-center gap-1"><Plus className="w-3 h-3" />Connect</span>}
                      </button>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom configs */}
      {configs.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="font-bold text-white">All Configured Integrations</h3>
          </div>
          <div className="divide-y" style={{ borderColor: `${BORDER}40` }}>
            {configs.map((c, i) => (
              <div key={c.id || i} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{c.config_name}</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>{c.integration_type}</p>
                </div>
                <StatusBadge status={c.status} />
                <span className="text-[10px]" style={{ color: MUTED }}>{timeAgo(c.last_synced)}</span>
                {c.last_error && (
                  <span className="text-[10px] truncate max-w-xs" style={{ color: DANGER }}>{c.last_error}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}