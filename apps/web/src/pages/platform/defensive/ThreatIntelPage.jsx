import React from "react";
import { PageHeader, StatusBanner, StatTile, StatTileSkeleton, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";

const SEV_COLOR = { critical: "text-destructive", high: "text-orange-500", medium: "text-amber-500", low: "text-emerald-600" };

export default function ThreatIntelPage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("intel", "threat_intel");

  return (
    <div>
      <PageHeader branch="defensive" title="Threat Intelligence" agentName={agentName} onRun={run} running={loading} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />
      {data?.headline && <p className="text-3xl font-bold mb-5">{data.headline}</p>}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? [...Array(4)].map((_, i) => <StatTileSkeleton key={i} />) : <>
          <StatTile label="Active Feeds" value={data?.active_feeds ?? 0} />
          <StatTile label="Dark Web Alerts" value={data?.dark_web_alerts ?? 0} color={data?.dark_web_alerts > 0 ? "text-orange-500" : "text-foreground"} />
          <StatTile label="Supply Chain Events" value={data?.supply_chain_events ?? 0} color={data?.supply_chain_events > 0 ? "text-amber-500" : "text-foreground"} />
          <StatTile label="Critical Threats" value={data?.critical_threats ?? 0} color={data?.critical_threats > 0 ? "text-destructive" : "text-emerald-600"} />
        </>}
      </div>

      {(data?.threat_feeds || []).length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Threat Feeds</h2>
          <div className="space-y-2">
            {data.threat_feeds.map((f, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-3 bg-card">
                <span className="font-semibold text-sm">{f.title}</span>
                <span className={`text-xs font-medium capitalize ${SEV_COLOR[f.severity] || "text-muted-foreground"}`}>{f.severity}</span>
                <span className="text-xs text-muted-foreground">{f.action_required}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data?.dark_web_alerts || []).length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Dark Web Alerts</h2>
          <div className="space-y-2">
            {data.dark_web_alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg p-3 bg-card text-sm">
                <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{a.type}</span>
                <span>Target: <span className="font-semibold">{a.target}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}