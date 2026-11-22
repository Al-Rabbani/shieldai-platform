import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import EBPFRuleList from "@/components/blueteam/EBPFRuleList";
import AIResponseModal from "@/components/shared/AIResponseModal";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

export default function RuntimeProtectionPage() {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    base44.entities.RuntimeThreat.list("-last_seen", 20).then(setThreats).catch(() => setThreats([])).finally(() => setLoading(false));
  }, []);

  async function runAnalysis() {
    setModalTitle("AI Runtime Analysis");
    setModalLoading(true); setModalData(null);
    const result = await invokeAction("gdsAgentOS", {
      action: "command", command_type: "risk_assessment",
      input: `Runtime protection review: 8 eBPF rules active, 3/5 policies enforced, 7 MITRE techniques mapped. ${threats.length} runtime threat(s) detected. Recommend hardening actions for the runtime security engine.`,
      priority: "normal",
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🔬 RUNTIME PROTECTION — eBPF Security Engine</h1>
        <button onClick={runAnalysis} className="ml-auto px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">🤖 AI Runtime Analysis</button>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "eBPF Rules Active", value: 8, color: "text-emerald-400" },
              { label: "Policies Enforced", value: "3/5", color: "text-blue-400" },
              { label: "MITRE Techniques Mapped", value: 7, color: "text-purple-400" },
            ].map((t, i) => (
              <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
              </div>
            ))}
          </div>

          <EBPFRuleList />

          <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Active Runtime Threats</p>
            {threats.length === 0 ? (
              <p className="text-sm text-slate-500">No active runtime threats detected — all monitored services nominal.</p>
            ) : (
              <div className="space-y-2">
                {threats.map(t => (
                  <div key={t.id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: "#0a0f1e" }}>
                    <div>
                      <p className="text-sm text-white font-medium">{t.service_name} — {t.threat_type?.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.mitre_technique || "—"} · {t.status}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ color: SEV_COLOR[t.severity], background: `${SEV_COLOR[t.severity]}22` }}>{t.severity}</span>
                  </div>
                ))}
              </div>
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