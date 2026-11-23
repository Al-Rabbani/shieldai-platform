import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Play, RefreshCw, Zap } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG, SevBadge, Card, KpiCard } from "@/components/gds/GDSOSShared";

export default function GDSAutonomousIRPage() {
  const [status, setStatus] = useState(null);
  const [playbooks, setPlaybooks] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [loading, setLoading] = useState({ status: false, run: false, dryRun: false, playbooks: false });
  const [error, setError] = useState(null);

  const call = async (payload, key) => {
    setLoading(l => ({ ...l, [key]: true })); setError(null);
    try {
      const res = await base44.functions.invoke("gdsAutonomousIR", payload);
      return res.data;
    } catch (e) { setError(e.message); return null; }
    finally { setLoading(l => ({ ...l, [key]: false })); }
  };

  const loadStatus = async () => { const d = await call({ action: "incident_status" }, "status"); if (d) setStatus(d); };
  const loadPlaybooks = async () => { const d = await call({ action: "get_playbooks" }, "playbooks"); if (d) setPlaybooks(d?.playbooks || d || []); };
  const runPlaybooks = async (dry) => { const d = await call({ action: "run_playbooks", dry_run: dry }, dry ? "dryRun" : "run"); if (d) setRunResult(d); };

  const pb = Array.isArray(playbooks) ? playbooks : [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">⚡</span>
        <div>
          <h1 className="text-2xl font-black text-white">Autonomous IR</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>AI-powered automatic incident response — contains threats in seconds, not hours</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={loadStatus} disabled={loading.status}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {loading.status ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Incident Status
        </button>
        <button onClick={loadPlaybooks} disabled={loading.playbooks}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: MUTED }}>
          {loading.playbooks ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          View Playbooks
        </button>
        <button onClick={() => runPlaybooks(false)} disabled={loading.run}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40`, color: DANGER }}>
          {loading.run ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Playbooks
        </button>
        <button onClick={() => runPlaybooks(true)} disabled={loading.dryRun}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${MEDIUM}15`, border: `1px solid ${MEDIUM}40`, color: MEDIUM }}>
          {loading.dryRun ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Dry Run
        </button>
        {error && <p className="text-sm" style={{ color: DANGER }}>{error}</p>}
      </div>

      {/* Status */}
      {status && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Active Incidents" value={status.active_incidents ?? 0} color={status.active_incidents > 0 ? DANGER : LOW} icon={Zap} pulse={status.active_incidents > 0} />
          <KpiCard label="SLA Breached" value={status.sla_breached ?? 0} color={status.sla_breached > 0 ? DANGER : LOW} icon={Zap} />
          <KpiCard label="Blocked Packages" value={status.blocked_packages ?? 0} color={HIGH} icon={Zap} />
          <KpiCard label="Actions Taken (24h)" value={status.actions_24h ?? 0} color={CYAN} icon={Zap} />
        </div>
      )}

      {/* Playbooks */}
      {pb.length > 0 && (
        <div>
          <h3 className="font-bold text-white mb-3">Playbooks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pb.map((p, i) => (
              <Card key={i} glow className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-white">{p.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: LOW, background: `${LOW}15` }}>
                    ~{p.mean_time_to_contain}
                  </span>
                </div>
                <p className="text-[11px] mb-3" style={{ color: MUTED }}>Trigger: <span style={{ color: CYAN }}>{p.trigger}</span></p>
                <div className="space-y-1">
                  {(p.auto_actions || []).map((a, j) => (
                    <div key={j} className="flex items-center gap-2 text-[10px]">
                      <span style={{ color: LOW }}>✓</span>
                      <span style={{ color: MUTED }}>{a}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Run Result */}
      {runResult && (
        <Card className="p-5" style={{ border: `1px solid ${LOW}30` }}>
          <h3 className="font-bold text-white mb-3">
            {runResult.dry_run ? "🧪 Dry Run Results" : "⚡ Playbook Execution Results"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[["Incident ID", runResult.incident_id || "—", CYAN], ["Total Actions", runResult.total_actions ?? 0, HIGH], ["Secrets Rotated", runResult.summary?.secrets ?? 0, MEDIUM], ["PRs Created", runResult.summary?.prs ?? 0, LOW]].map(([l, v, c]) => (
              <div key={l} className="p-3 rounded-xl text-center" style={{ background: `${c}08`, border: `1px solid ${c}20` }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>{l}</p>
                <p className="text-lg font-black font-mono" style={{ color: c }}>{v}</p>
              </div>
            ))}
          </div>
          {runResult.summary?.details && (
            <p className="text-xs" style={{ color: MUTED }}>{runResult.summary.details}</p>
          )}
        </Card>
      )}
    </div>
  );
}