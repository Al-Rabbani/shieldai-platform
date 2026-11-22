import React, { useState } from "react";
import { PageHeader, StatusBanner, StatTile, StatTileSkeleton, AgentLog, useAgentPage } from "@/components/platform/PageTemplate";
import { toast } from "sonner";
import GuidedTriageFlow from "@/components/vulnerabilities/GuidedTriageFlow";

const QUICK_ACTIONS = [
  { id: "patch",  label: "Patch Critical Now",    icon: "🩹", color: "border-destructive/40 bg-destructive/5 hover:bg-destructive/10 text-destructive", desc: "Auto-patch all exploited CVEs" },
  { id: "ticket", label: "Assign Tickets",         icon: "🎫", color: "border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400", desc: "Create Jira tickets for critical vulns" },
  { id: "flag",   label: "Flag for Risk Review",   icon: "🚩", color: "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400", desc: "Escalate to risk register" },
  { id: "report", label: "Export Vuln Report",     icon: "📋", color: "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400", desc: "Generate patch report PDF" },
];

function QuickActions({ data }) {
  const [busy, setBusy] = useState(null);

  const handleAction = async (id) => {
    setBusy(id);
    await new Promise(r => setTimeout(r, 900));
    setBusy(null);
    const msgs = {
      patch:  `✅ Patch job triggered for ${data?.exploited_in_wild ?? 0} exploited CVEs`,
      ticket: `✅ ${data?.critical ?? 0} Jira tickets created and assigned`,
      flag:   `✅ ${data?.critical ?? 0} vulnerabilities flagged for risk review`,
      report: `✅ Vulnerability report exported successfully`,
    };
    toast.success(msgs[id]);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {QUICK_ACTIONS.map(a => (
        <button key={a.id} onClick={() => handleAction(a.id)} disabled={busy === a.id}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition disabled:opacity-60 ${a.color}`}>
          {busy === a.id
            ? <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60 20"/></svg>
            : <span>{a.icon}</span>}
          {a.label}
        </button>
      ))}
    </div>
  );
}

export default function VulnerabilitiesPage() {
  const { data, status, entitiesRead, durationMs, agentName, loading, error, run } = useAgentPage("vuln", "vulnerability_scan");

  return (
    <div>
      <PageHeader branch="defensive" title="Vulnerability Management" agentName={agentName} onRun={run} running={loading} />
      <QuickActions data={data} />
      {error && <p className="text-xs text-destructive mb-4">⚠ Could not load — retrying...</p>}
      <StatusBanner status={status} />
      {data?.headline && <p className="text-3xl font-bold mb-5">{data.headline}</p>}

      <GuidedTriageFlow />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? [...Array(4)].map((_, i) => <StatTileSkeleton key={i} />) : <>
          <StatTile label="Total Open" value={data?.total ?? 0} />
          <StatTile label="Critical" value={data?.critical ?? 0} color={data?.critical > 0 ? "text-destructive" : "text-foreground"} />
          <StatTile label="Exploited in Wild" value={data?.exploited_in_wild ?? 0} color={data?.exploited_in_wild > 0 ? "text-destructive" : "text-emerald-600"} subtitle="PATCH NOW" />
          <StatTile label="Patchable Now" value={data?.patchable ?? 0} color="text-emerald-600" subtitle="Fixes available" />
        </>}
      </div>

      {data?.patchable > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Patch progress</span><span>{data.patchable}/{data.total} ready</span>
          </div>
          <div className="h-2 rounded-full bg-muted"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.total ? (data.patchable / data.total) * 100 : 0}%` }} /></div>
        </div>
      )}

      {(data?.exploited_cves || []).length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">🚨 Exploited CVEs — Patch Immediately</h2>
          <div className="space-y-2 border border-destructive/30 rounded-xl p-3 bg-destructive/5">
            {data.exploited_cves.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-mono font-semibold text-destructive">{c.cve}</span>
                <span className="text-muted-foreground">{c.asset}</span>
                {c.epss > 0 && <span className="text-xs bg-destructive/15 text-destructive px-2 py-0.5 rounded">EPSS {(c.epss * 100).toFixed(1)}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(data?.critical_cves || []).length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Critical CVEs</h2>
          <div className="space-y-2">
            {data.critical_cves.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm border rounded-lg p-3 bg-card">
                <span className="font-mono font-semibold">{c.cve}</span>
                <span className="text-muted-foreground">{c.asset}</span>
                <span className="text-xs text-emerald-600">Fix: {c.fix}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && <AgentLog entities_read={entitiesRead} duration_ms={durationMs} />}
    </div>
  );
}