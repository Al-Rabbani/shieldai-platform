import React from "react";
import { PageHeader, StatusBanner, StatTile, StatTileSkeleton, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";

const SEV_ICON = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢" };

export default function SOCPage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("soc", "soc_summary");

  return (
    <div>
      <PageHeader branch="defensive" title="SOC Command Center" agentName={agentName} onRun={run} running={loading} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />

      {data?.headline && <p className="text-3xl font-bold mb-5">{data.headline}</p>}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? [...Array(4)].map((_, i) => <StatTileSkeleton key={i} />) : <>
          <StatTile label="Risk Score" value={`${data?.risk_score ?? "—"}/100`} subtitle={`Grade ${data?.grade ?? "?"}`} color={data?.risk_score >= 80 ? "text-emerald-600" : data?.risk_score >= 60 ? "text-amber-500" : "text-destructive"} />
          <StatTile label="Active Incidents" value={data?.active_incidents ?? 0} color={data?.active_incidents > 0 ? "text-destructive" : "text-emerald-600"} />
          <StatTile label="Critical Findings" value={(data?.critical_vulns ?? 0) + (data?.critical_cloud ?? 0)} color={(data?.critical_vulns ?? 0) + (data?.critical_cloud ?? 0) > 0 ? "text-destructive" : "text-foreground"} />
          <StatTile label="Exploited in Wild" value={data?.exploited_in_wild ?? 0} color={data?.exploited_in_wild > 0 ? "text-destructive" : "text-emerald-600"} />
        </>}
      </div>

      {(data?.top_alerts || []).length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Top Alerts</h2>
          <div className="space-y-2">
            {data.top_alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg bg-card">
                <span className="text-lg flex-shrink-0">{SEV_ICON[alert.sev] || "⚪"}</span>
                <div>
                  <p className="font-semibold text-sm">{alert.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{alert.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}