import React from "react";
import { PageHeader, StatusBanner, StatTile, StatTileSkeleton, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";

const SEV_BADGE = { critical: "bg-destructive/10 text-destructive border-destructive/30", high: "bg-orange-500/10 text-orange-600 border-orange-500/30", medium: "bg-amber-500/10 text-amber-600 border-amber-500/30" };

export default function IncidentsPage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("ir", "incident_response");

  return (
    <div>
      <PageHeader branch="defensive" title="Incident Response" agentName={agentName} onRun={run} running={loading} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />
      {data?.headline && <p className="text-3xl font-bold mb-5">{data.headline}</p>}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? [...Array(4)].map((_, i) => <StatTileSkeleton key={i} />) : <>
          <StatTile label="Active Incidents" value={data?.active_incidents ?? 0} color={data?.active_incidents > 0 ? "text-destructive" : "text-emerald-600"} />
          <StatTile label="Total" value={data?.total ?? 0} />
          <StatTile label="Critical" value={data?.critical ?? 0} color={data?.critical > 0 ? "text-destructive" : "text-foreground"} />
          <StatTile label="Exploited in Wild" value={data?.exploited_in_wild ?? 0} color={data?.exploited_in_wild > 0 ? "text-destructive" : "text-emerald-600"} />
        </>}
      </div>

      {(data?.active_list || []).length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Active Incidents</h2>
          <div className="space-y-2">
            {data.active_list.map((inc, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg p-3 bg-card">
                <span className={`text-[10px] rounded-full border px-2 py-0.5 capitalize ${SEV_BADGE[inc.severity] || "bg-muted text-muted-foreground border-border"}`}>{inc.severity}</span>
                <span className="font-semibold text-sm flex-1">{inc.title}</span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded capitalize">{inc.type.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data?.exploited_cves || []).length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Exploited CVEs Requiring IR</h2>
          <div className="space-y-2">
            {data.exploited_cves.map((c, i) => (
              <div key={i} className="flex items-center gap-3 border border-destructive/20 rounded-lg p-3 bg-destructive/5">
                <span className="font-mono text-sm font-semibold text-destructive">{c.cve}</span>
                <span className="text-sm text-muted-foreground">{c.asset}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}