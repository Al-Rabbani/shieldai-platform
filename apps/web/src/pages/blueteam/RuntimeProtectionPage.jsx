import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import AIResponseModal from "@/components/shared/AIResponseModal";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

/* Every number on this page comes from scripts/ops/collect_runtime_posture.py via /runtime/posture and
   /runtime/summary. This platform has no process-level runtime sensor: there is no eBPF loader, no syscall monitor and
   no policy enforcer, so none is claimed here. What it does have is the container runtime's own report. */
export default function RuntimeProtectionPage() {
  const [threats, setThreats] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.RuntimeThreat.list("-risk_score", 100).catch(() => []),
      base44.entities.RuntimeThreat.summary().catch(() => null),
    ])
      .then(([rows, sum]) => { setThreats(rows); setSummary(sum); })
      .finally(() => setLoading(false));
  }, []);

  async function runAnalysis() {
    setModalTitle("AI Runtime Analysis");
    setModalLoading(true); setModalData(null);
    const inspected = summary?.containers ?? 0;
    const violations = summary?.with_violations ?? 0;
    const result = await invokeAction("gdsAgentOS", {
      action: "command", command_type: "risk_assessment",
      input: `Runtime protection review from measured container posture: ${inspected} containers inspected, `
        + `${violations} with named posture violations, ${summary?.privileged ?? 0} privileged, `
        + `${summary?.host_network ?? 0} on the host network, ${summary?.host_pid ?? 0} sharing the host PID namespace. `
        + `This platform has no process-level runtime sensor, so no syscall, eBPF or file-integrity finding can be claimed. `
        + `Recommend hardening for the violations actually recorded.`,
      priority: "normal",
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  const notRecorded = "not recorded";
  const tiles = [
    { label: "Containers Inspected", value: summary?.containers ?? notRecorded, color: "text-white" },
    { label: "With Violations", value: summary?.with_violations ?? notRecorded, color: "text-amber-400" },
    { label: "Privileged", value: summary?.privileged ?? notRecorded, color: "text-red-400" },
  ];
  const collected = summary?.collected_at ? new Date(summary.collected_at).toLocaleString("en-GB") : null;

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🔬 RUNTIME PROTECTION — container posture</h1>
        <button onClick={runAnalysis} className="ml-auto px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">🤖 AI Runtime Analysis</button>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {tiles.map((t, i) => (
              <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            {summary
              ? `${summary.containers} container${summary.containers === 1 ? "" : "s"} inspected by the runtime collector`
                + `${collected ? ` at ${collected}` : ""}, ${summary.with_violations} carrying a named violation`
                + `${summary.collected_at ? "" : " (no collection has run yet)"}. `
              : "The runtime collector has not run yet, so nothing is claimed. "}
            This is the container runtime's own report: there is no process-level sensor on this platform, so no syscall,
            eBPF or file-integrity detection is claimed.
          </p>

          <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Containers With Posture Violations</p>
            {threats.length === 0 ? (
              <p className="text-sm text-slate-500">No container on this host has a recorded posture violation.</p>
            ) : (
              <div className="space-y-2">
                {threats.map(t => (
                  <div key={t.id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: "#0a0f1e" }}>
                    <div>
                      <p className="text-sm text-white font-medium">{t.service_name} — {t.threat_type?.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.mitre_technique || "no technique mapped"} · {t.status}</p>
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
