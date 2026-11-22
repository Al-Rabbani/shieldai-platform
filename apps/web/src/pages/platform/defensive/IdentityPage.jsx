import React from "react";
import { PageHeader, StatusBanner, StatTile, StatTileSkeleton, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";

export default function IdentityPage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("identity", "identity_analysis");

  return (
    <div>
      <PageHeader branch="defensive" title="Identity & Access" agentName={agentName} onRun={run} running={loading} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />
      {data?.headline && <p className="text-3xl font-bold mb-5">{data.headline}</p>}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? [...Array(4)].map((_, i) => <StatTileSkeleton key={i} />) : <>
          <StatTile label="CIEM Open" value={data?.ciem_open ?? 0} />
          <StatTile label="CIEM Critical" value={data?.ciem_critical ?? 0} color={data?.ciem_critical > 0 ? "text-destructive" : "text-foreground"} />
          <StatTile label="Identity Threats" value={data?.identity_threats ?? 0} color={data?.identity_threats > 0 ? "text-orange-500" : "text-foreground"} />
          <StatTile label="Active Sessions" value={data?.active_sessions ?? 0} />
        </>}
      </div>

      {(data?.top_ciem || []).length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">CIEM Findings</h2>
          <div className="space-y-2">
            {data.top_ciem.map((f, i) => (
              <div key={i} className="rounded-lg border border-destructive/20 bg-card p-3">
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Identity: <span className="font-mono">{f.identity}</span></p>
                <p className="text-xs text-muted-foreground">Remediation: {f.remediation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}