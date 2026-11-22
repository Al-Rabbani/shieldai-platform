import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import DarkWebAlertCard from "@/components/darkweb/DarkWebAlertCard";
import CredentialLeaksTable from "@/components/darkweb/CredentialLeaksTable";
import BreachRecordsTable from "@/components/darkweb/BreachRecordsTable";
import AIResponseModal from "@/components/shared/AIResponseModal";

const TABS = [
  { key: "alerts", label: "Alerts Feed" },
  { key: "leaks", label: "Credential Leaks" },
  { key: "breaches", label: "Breach Records" },
];

export default function DarkWebIntelPage() {
  const [alerts, setAlerts] = useState([]);
  const [leaks, setLeaks] = useState([]);
  const [breaches, setBreaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("alerts");
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [lastAlert, setLastAlert] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, l, b] = await Promise.all([
      base44.entities.DarkWebAlert.list("-detected_at", 50).catch(() => []),
      base44.entities.CredentialLeak.list("-breach_date", 20).catch(() => []),
      base44.entities.BreachRecord.list("-detected_at", 10).catch(() => []),
    ]);
    setAlerts(a); setLeaks(l); setBreaches(b);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const critical = alerts.filter(a => a.severity === "critical").length;
  const credLeaks = alerts.filter(a => a.alert_type === "credential_leak").length;
  const ransomware = alerts.filter(a => a.alert_type === "ransomware_mention").length;

  async function investigate(alert) {
    setLastAlert(alert);
    setModalTitle(`AI Investigation — ${alert.title}`);
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const input = `Dark web investigation for: ${alert.title}. Type: ${alert.alert_type}. Target: ${alert.target_org}. Description: ${alert.description || ""}. Assess risk to GDS and MSSP customers. Recommend immediate actions.`;
    const result = await invokeAction("gdsAgentOS", { action: "command", command_type: "threat_hunt", input, live_data_override: liveDataOverride }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🕵️ Dark Web Intelligence Monitor</h1>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400">{alerts.length} Live Alerts</span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ● MONITORING
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Alerts", value: alerts.length, color: "text-white" },
          { label: "Critical", value: critical, color: "text-red-400" },
          { label: "Credential Leaks", value: credLeaks, color: "text-orange-400" },
          { label: "Ransomware Mentions", value: ransomware, color: "text-red-400" },
        ].map((t, i) => (
          <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-xl p-1 w-fit" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${tab === t.key ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-slate-800"}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          {tab === "alerts" && (
            alerts.length === 0 ? <p className="text-sm text-slate-500">No dark web alerts.</p> : (
              <div className="grid grid-cols-2 gap-4">
                {alerts.map(a => <DarkWebAlertCard key={a.id} alert={a} onInvestigate={investigate} />)}
              </div>
            )
          )}
          {tab === "leaks" && <CredentialLeaksTable leaks={leaks} />}
          {tab === "breaches" && <BreachRecordsTable records={breaches} />}
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onRegenerate={() => lastAlert && investigate(lastAlert)} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}