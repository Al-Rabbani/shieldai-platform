import React from "react";
import { PageHeader, StatusBanner, StatTile, StatTileSkeleton, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";

export default function OSINTPage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("osint", "osint_recon");

  return (
    <div>
      <PageHeader branch="offensive" title="OSINT & Recon" agentName={agentName} onRun={run} running={loading} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />
      {data?.headline && <p className="text-3xl font-bold mb-5">{data.headline}</p>}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? [...Array(4)].map((_, i) => <StatTileSkeleton key={i} />) : <>
          <StatTile label="Total Assets" value={data?.total_assets ?? 0} />
          <StatTile label="Internet Facing" value={data?.internet_facing ?? 0} color={data?.internet_facing > 10 ? "text-orange-500" : "text-foreground"} />
          <StatTile label="Shadow IT" value={data?.shadow_it_count ?? "—"} color="text-foreground" subtitle="no shadow-IT detector exists" />
          <StatTile label="Expiring Certs" value={data?.expiring_certs_count ?? "—"} color="text-foreground" subtitle="no certificate inventory exists" />
        </>}
      </div>

      {(data?.internet_facing_list || []).length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Internet-Facing Assets</h2>
          <div className="space-y-2">
            {data.internet_facing_list.map((a, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg p-3 bg-card">
                <span className="font-semibold text-sm flex-1">{a.name}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">{a.type}</span>
                <span className={`text-xs font-bold ${a.risk_score > 70 ? "text-destructive" : a.risk_score > 40 ? "text-orange-500" : "text-emerald-600"}`}>Risk {a.risk_score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data?.shadow_it_list || []).length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Shadow IT</h2>
          <div className="space-y-2">
            {data.shadow_it_list.map((s, i) => (
              <div key={i} className="flex items-center gap-3 border border-amber-500/20 rounded-lg p-3 bg-card">
                <span className="font-semibold text-sm flex-1">{s.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{s.type}</span>
                <span className="text-xs text-muted-foreground">Discovered: {s.discovered ? new Date(s.discovered).toLocaleDateString() : "N/A"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}