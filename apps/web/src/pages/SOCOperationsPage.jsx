import React, { useState, useEffect, useCallback } from "react";
import { base44, scanHealth } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import AIResponseModal from "@/components/shared/AIResponseModal";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400", info: "bg-slate-500/20 text-slate-400" };

export default function SOCOperationsPage() {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [findings, setFindings] = useState([]);
  const [scanJobs, setScanJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [scans, setScans] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [inc, tf, sj, notifs, sh] = await Promise.all([
      base44.entities.Incident.list("-opened_at", 50).catch(() => []),
      base44.entities.TriagedFinding.list("-detected_at", 500).catch(() => []),
      base44.entities.ScanJob.list("-created_date", 20).catch(() => []),
      base44.entities.Notification.list("-created_date", 10).catch(() => []),
      scanHealth().catch(() => null),
    ]);
    setIncidents(inc); setFindings(tf); setScanJobs(sj); setNotifications(notifs); setScans(sh);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openIncidents = incidents.filter(i => ["new", "investigating"].includes(i.status)).length;
  const criticalFindings = findings.filter(f => f.status === "open" && f.severity === "critical").length;
  /* Schedules that have passed their own next_run_at. There is no running/queued scan on this platform, so counting
   * 'running' would read zero whether or not scanning had stopped - the failure mode this tile is meant to catch. */
  const overdueScans = scanJobs.filter(s => s.state === "overdue").length;
  const unreadAlerts = notifications.filter(n => !n.is_read).length;

  async function respond(n) {
    setModalTitle(`AI SOC Response — ${n.title}`);
    setModalLoading(true); setModalData(null);
    const input = `SOC alert: ${n.title}. Type: ${n.type}. Severity: ${n.severity}. Message: ${n.message}. Recommend immediate response steps.`;
    const result = await invokeAction("gdsAgentOS", { action: "command", command_type: "soc_summary", input, priority: "high" }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <h1 className="text-xl font-bold text-white">📡 SOC Operations</h1>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Open Incidents", value: openIncidents, color: openIncidents > 0 ? "text-red-400" : "text-white" },
              { label: "Critical Findings", value: criticalFindings, color: criticalFindings > 0 ? "text-red-400" : "text-white" },
              { label: "Overdue Scans", value: overdueScans, color: overdueScans > 0 ? "text-amber-400" : "text-white" },
              { label: "Unread Alerts", value: unreadAlerts, color: unreadAlerts > 0 ? "text-amber-400" : "text-white" },
            ].map((t, i) => (
              <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
              </div>
            ))}
          </div>

          {/* Item 46. Scanner liveness. Before this the register had not moved since 19 Nov while the 6-hourly scan
              was in fact running three times a day, and the only trace was a log file on the host - so a dead scanner
              and an unchanged estate looked identical here. Every number below is measured; a scanner with no
              recorded run says never_run rather than showing a green tick. */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Scanner Liveness</p>
              {scans && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  scans.verdict === "alive" ? "bg-emerald-500/20 text-emerald-400"
                  : scans.verdict === "no_schedules" ? "bg-slate-500/20 text-slate-400"
                  : "bg-amber-500/20 text-amber-400"}`}>
                  {scans.verdict === "no_schedules" ? "no schedules" : scans.verdict}
                </span>
              )}
            </div>
            {!scans ? (
              <p className="text-sm text-slate-500 px-4 pb-4">Scanner state unavailable.</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="text-left px-4 py-1 font-medium">Scanner</th>
                      <th className="text-left px-4 py-1 font-medium">State</th>
                      <th className="text-right px-4 py-1 font-medium">Every</th>
                      <th className="text-right px-4 py-1 font-medium">Last run</th>
                      <th className="text-right px-4 py-1 font-medium">New</th>
                      <th className="text-right px-4 py-1 font-medium">Runs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans.scanners.map((s) => (
                      <tr key={s.name} className="border-t border-slate-800/60">
                        <td className="px-4 py-2 text-white font-medium">{s.name}</td>
                        <td className="px-4 py-2">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                            s.verdict === "alive" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {s.verdict === "alive" ? "alive" : s.verdict.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400 text-xs">
                          {s.interval_minutes ? `${Math.round(s.interval_minutes / 60)}h` : "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400 text-xs">
                          {s.last_run_at ? `${s.age_minutes} min ago` : "never"}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400 text-xs">
                          {s.last_run_findings === null || s.last_run_findings === undefined ? "—" : s.last_run_findings}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400 text-xs">{s.total_runs ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[11px] text-slate-500 px-4 py-2 border-t border-slate-800/60">
                  Register {scans.register.total ?? "—"} findings, {scans.register.open ?? "—"} open.
                  {" "}Newest finding detected{" "}
                  {scans.register.newest_finding ? new Date(scans.register.newest_finding).toLocaleString() : "—"}
                  {" "}— an unchanged register with a live scanner is a quiet estate, not a broken one.
                  {" "}Silent at {scans.thresholds.silent_at}.
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-4 pt-3 pb-2">Alert Queue</p>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500 px-4 pb-4">No recent alerts.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {notifications.map(n => (
                    <tr key={n.id} className="border-t border-slate-800/60 hover:bg-white/5">
                      <td className="px-4 py-2"><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[n.severity] || SEV_COLOR.info}`}>{n.severity}</span></td>
                      <td className="px-4 py-2 text-white font-medium">{n.title}</td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{n.type}</td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{n.created_date ? new Date(n.created_date).toLocaleString() : "—"}</td>
                      <td className="px-4 py-2 text-right"><button onClick={() => respond(n)} className="text-xs font-bold text-blue-400 hover:text-blue-300">🤖 Respond</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}