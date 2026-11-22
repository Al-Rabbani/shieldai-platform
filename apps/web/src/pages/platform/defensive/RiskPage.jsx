import React from "react";
import { PageHeader, StatusBanner, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";

const GRADE_COLOR = { A: "text-emerald-600", B: "text-teal-600", C: "text-amber-500", D: "text-orange-500", F: "text-destructive" };

export default function RiskPage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("risk", "risk_assessment");

  return (
    <div>
      <PageHeader branch="defensive" title="Risk & Governance" agentName={agentName} onRun={run} running={loading} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />

      {loading ? <div className="animate-pulse rounded-xl bg-muted h-32 mb-6" /> : data && (
        <div className="rounded-xl border bg-card p-6 mb-6 flex items-center gap-8">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-1">Risk Score</p>
            <p className="text-6xl font-black">{data.score}</p>
            <p className="text-sm text-muted-foreground mt-1">/100</p>
          </div>
          <div>
            <span className={`text-4xl font-black ${GRADE_COLOR[data.grade] || "text-foreground"}`}>Grade {data.grade}</span>
            <p className={`text-lg mt-1 ${data.trend === "improving" ? "text-emerald-600" : data.trend === "degrading" ? "text-destructive" : "text-muted-foreground"}`}>
              {data.trend === "improving" ? "↗ Improving" : data.trend === "degrading" ? "↘ Degrading" : "→ Stable"}
            </p>
          </div>
          <div className="ml-auto grid grid-cols-2 gap-4 text-center">
            <div><p className="text-2xl font-bold text-destructive">{data.sla_breaches}</p><p className="text-xs text-muted-foreground">SLA Breaches</p></div>
            <div><p className="text-2xl font-bold text-destructive">{data.kev_unpatched}</p><p className="text-xs text-muted-foreground">KEV Unpatched</p></div>
          </div>
        </div>
      )}

      {(data?.domains || []).length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Risk Domains</h2>
          <div className="grid grid-cols-3 gap-3">
            {data.domains.map((d, i) => {
              const sc = d.score || 0;
              const color = sc >= 80 ? "bg-emerald-500" : sc >= 60 ? "bg-amber-400" : "bg-destructive";
              return (
                <div key={i} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{d.name}</p>
                    <p className={`font-bold ${GRADE_COLOR[sc >= 80 ? "A" : sc >= 60 ? "C" : "F"]}`}>{sc}/100</p>
                  </div>
                  <div className="h-2 rounded-full bg-muted"><div className={`h-full ${color} rounded-full`} style={{ width: `${sc}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}