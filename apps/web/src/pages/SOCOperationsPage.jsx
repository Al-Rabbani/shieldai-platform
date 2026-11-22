import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
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

  const load = useCallback(async () => {
    setLoading(true);
    const [inc, tf, sj, notifs] = await Promise.all([
      base44.entities.Incident.list("-opened_at", 50).catch(() => []),
      base44.entities.TriagedFinding.list("-detected_at", 500).catch(() => []),
      base44.entities.ScanJob.list("-created_date", 20).catch(() => []),
      base44.entities.Notification.list("-created_date", 10).catch(() => []),
    ]);
    setIncidents(inc); setFindings(tf); setScanJobs(sj); setNotifications(notifs);
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