import React from "react";
import { PageHeader, StatusBanner, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";

function FrameworkCard({ fw }) {
  const color = fw.score >= 80 ? "text-emerald-600" : fw.score >= 60 ? "text-amber-500" : "text-destructive";
  const barColor = fw.score >= 80 ? "bg-emerald-500" : fw.score >= 60 ? "bg-amber-400" : "bg-destructive";
  const statusCls = fw.score >= 80 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : fw.score >= 60 ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-destructive/10 text-destructive border-destructive/30";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="font-semibold text-sm">{fw.name}</p>
        <span className={`text-[10px] rounded-full border px-2 py-0.5 ${statusCls}`}>{fw.status}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{fw.score}%</p>
      <p className="text-xs text-muted-foreground mt-0.5">{fw.passing}/{fw.total} controls</p>
      <div className="h-2 rounded-full bg-muted mt-3"><div className={`h-full ${barColor} rounded-full`} style={{ width: `${fw.score}%` }} /></div>
    </div>
  );
}

export default function CompliancePage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("compliance", "compliance_check");

  return (
    <div>
      <PageHeader branch="defensive" title="Compliance Center" agentName={agentName} onRun={run} running={loading} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />
      {data?.headline && <p className="text-3xl font-bold mb-5">{data.headline}</p>}

      {loading ? (
        <div className="grid grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="animate-pulse rounded-xl bg-muted h-32" />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(data?.frameworks || []).map((fw, i) => <FrameworkCard key={i} fw={fw} />)}
          {(data?.frameworks || []).length === 0 && <p className="text-sm text-muted-foreground col-span-3">No compliance frameworks configured yet.</p>}
        </div>
      )}

      {(data?.top_failing || []).length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Top Failing Frameworks</h2>
          <div className="space-y-2">
            {data.top_failing.map((f, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-3 bg-card">
                <span className="font-semibold text-sm">{f.name}</span>
                <span className="text-destructive font-bold">{f.score}%</span>
                <span className="text-xs text-muted-foreground">Gap: {f.gap}pp to target</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}