import React from "react";
import { PageHeader, StatusBanner, StatTile, StatTileSkeleton, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";

export default function AISecurityPage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("ai-security", "ai_security_scan");

  return (
    <div>
      <PageHeader branch="defensive" title="AI/LLM Security" agentName={agentName} onRun={run} running={loading} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />
      {data?.headline && <p className="text-3xl font-bold mb-5">{data.headline}</p>}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? [...Array(4)].map((_, i) => <StatTileSkeleton key={i} />) : <>
          <StatTile label="Total Attacks" value={data?.total_attacks ?? 0} color={data?.total_attacks > 0 ? "text-orange-500" : "text-foreground"} />
          <StatTile label="Succeeded" value={data?.succeeded ?? 0} color={data?.succeeded > 0 ? "text-destructive" : "text-emerald-600"} />
          <StatTile label="High Risk Models" value={data?.high_risk_models ?? 0} color={data?.high_risk_models > 0 ? "text-orange-500" : "text-foreground"} />
          <StatTile label="Hallucinations" value={data?.hallucinations ?? 0} color={data?.hallucinations > 5 ? "text-amber-500" : "text-foreground"} />
        </>}
      </div>

      {(data?.attack_types || []).length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Attack Type Breakdown</h2>
          <div className="flex flex-wrap gap-2">
            {data.attack_types.map((t, i) => (
              <span key={i} className="text-xs bg-muted border rounded-full px-3 py-1 text-muted-foreground capitalize">
                {t.type} ({t.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {(data?.top_attacks || []).length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Top Attacks</h2>
          <div className="space-y-2">
            {data.top_attacks.map((a, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-3 bg-card">
                <span className="text-sm capitalize">{a.type}</span>
                <span className="text-xs text-muted-foreground">Target: {a.target}</span>
                <span className={`text-xs font-bold ${a.succeeded ? "text-destructive" : "text-emerald-600"}`}>{a.succeeded ? "✕ Succeeded" : "✓ Blocked"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}