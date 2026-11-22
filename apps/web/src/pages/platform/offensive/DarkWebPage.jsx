import React from "react";
import { PageHeader, StatusBanner, StatTile, StatTileSkeleton, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";

const SEV_CLS = { critical: "text-destructive", high: "text-orange-500", medium: "text-amber-500", low: "text-foreground" };

export default function DarkWebPage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("dark-web", "dark_web_scan");

  return (
    <div>
      <PageHeader branch="offensive" title="Dark Web Operations" agentName={agentName} onRun={run} running={loading} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />
      {data?.headline && <p className="text-3xl font-bold mb-5">{data.headline}</p>}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? [...Array(4)].map((_, i) => <StatTileSkeleton key={i} />) : <>
          <StatTile label="Active Alerts" value={data?.active_alerts ?? 0} color={data?.active_alerts > 0 ? "text-orange-500" : "text-foreground"} />
          <StatTile label="Critical" value={data?.critical ?? 0} color={data?.critical > 0 ? "text-destructive" : "text-emerald-600"} />
          <StatTile label="Credential Leaks" value={data?.credential_leaks ?? 0} color={data?.credential_leaks > 0 ? "text-destructive" : "text-foreground"} />
          <StatTile label="Ransomware Groups" value={data?.ransomware_groups ?? 0} color="text-orange-500" />
        </>}
      </div>

      {(data?.top_alerts || []).length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Top Alerts</h2>
          <div className="space-y-2">
            {data.top_alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg p-3 bg-card">
                <span className={`text-xs font-bold capitalize ${SEV_CLS[a.severity] || "text-muted-foreground"}`}>{a.severity}</span>
                <span className="font-semibold text-sm flex-1">{a.title}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{a.type}</span>
                <span className="text-xs text-muted-foreground">{a.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data?.ransomware_groups || []).length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Active Ransomware Groups</h2>
          <div className="space-y-2">
            {data.ransomware_groups.map((r, i) => (
              <div key={i} className="flex items-center gap-3 border border-destructive/20 rounded-lg p-3 bg-card">
                <span className="font-semibold text-sm">{r.name}</span>
                <span className="text-xs text-destructive">{r.victims_month} victims this month</span>
                <span className="text-xs text-muted-foreground ml-auto">{r.sectors}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data?.credential_leaks || []).length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Credential Leaks</h2>
          <div className="space-y-2">
            {data.credential_leaks.map((c, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg p-3 bg-card text-sm">
                <span className="font-mono">{c.email}</span>
                <span className="text-muted-foreground">{c.breach}</span>
                <span className={`text-xs capitalize ml-auto ${SEV_CLS[c.severity] || "text-muted-foreground"}`}>{c.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}