import React from "react";
import { PageHeader, StatusBanner, StatTile, StatTileSkeleton, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";

export default function CloudPage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("cloud", "cloud_review");

  return (
    <div>
      <PageHeader branch="defensive" title="Cloud Security" agentName={agentName} onRun={run} running={loading} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />
      {data?.headline && <p className="text-3xl font-bold mb-5">{data.headline}</p>}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? [...Array(4)].map((_, i) => <StatTileSkeleton key={i} />) : <>
          <StatTile label="Critical" value={data?.critical ?? 0} color={data?.critical > 0 ? "text-destructive" : "text-foreground"} />
          <StatTile label="High" value={data?.high ?? 0} color={data?.high > 0 ? "text-orange-500" : "text-foreground"} />
          <StatTile label="Medium" value={data?.medium ?? 0} color="text-amber-500" />
          <StatTile label="Accounts" value={data?.accounts ?? 0} />
        </>}
      </div>

      {(data?.by_service || []).length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">By Service</h2>
          <div className="grid grid-cols-3 gap-2">
            {data.by_service.map((s, i) => (
              <div key={i} className="rounded-lg border bg-card p-3 flex items-center justify-between">
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-lg font-bold text-destructive">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data?.critical_findings || []).length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Critical Findings</h2>
          <div className="space-y-2">
            {data.critical_findings.map((f, i) => (
              <div key={i} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs rounded px-1.5 py-0.5 bg-muted text-muted-foreground">{f.service}</span>
                  <span className="font-semibold text-sm">{f.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">Fix: {f.fix}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}