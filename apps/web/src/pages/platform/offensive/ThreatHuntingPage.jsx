import React from "react";
import { PageHeader, StatusBanner, StatTile, StatTileSkeleton, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";

export default function ThreatHuntingPage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("hunter", "threat_hunt");

  return (
    <div>
      <PageHeader branch="offensive" title="Threat Hunting" agentName={agentName} onRun={run} running={loading} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />
      {data?.headline && <p className="text-3xl font-bold mb-5">{data.headline}</p>}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? [...Array(4)].map((_, i) => <StatTileSkeleton key={i} />) : <>
          <StatTile label="Active IOCs" value={data?.active_iocs ?? 0} color={data?.active_iocs > 10 ? "text-destructive" : "text-foreground"} />
          <StatTile label="Critical Feeds" value={data?.critical_feeds ?? 0} color={data?.critical_feeds > 0 ? "text-destructive" : "text-emerald-600"} />
          <StatTile label="Supply Chain Events" value={data?.supply_chain_events ?? 0} color={data?.supply_chain_events > 0 ? "text-amber-500" : "text-foreground"} />
          <StatTile label="Dark Web Active" value={data?.dark_web_active ?? 0} color={data?.dark_web_active > 0 ? "text-orange-500" : "text-foreground"} />
        </>}
      </div>

      {(data?.ioc_types || []).length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">IOC Types</h2>
          <div className="flex flex-wrap gap-2">
            {data.ioc_types.map((t, i) => (
              <span key={i} className="text-xs bg-muted border rounded-full px-3 py-1 capitalize">{t.type} ({t.count})</span>
            ))}
          </div>
        </div>
      )}

      {(data?.top_iocs || []).length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Top IOCs</h2>
          <div className="space-y-2">
            {data.top_iocs.map((ioc, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg p-3 bg-card text-sm">
                <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">{ioc.type}</span>
                <span className="font-mono flex-1">{ioc.value}</span>
                <span className="text-muted-foreground">{ioc.threat_type}</span>
                <span className="text-xs text-emerald-600">{ioc.confidence}% confidence</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}