import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DashboardPage, SectionCard, SeverityBadge, LoadingSpinner, EmptyState, Tag } from "@/components/dashboards/DashboardShared";

/* Every number here comes from the platform's own AI layer: /ai/models (what the deployed reasoning code configures),
   /ai/invocations (one row per reasoning mission), /ai/attacks (written by the guard when it refuses or flags text) and
   /ai/policies (the guard's rules, read from the guard itself). Hallucination is not measured on this platform and no
   detector exists, so it is stated as absent rather than shown as 0%. */
function Tile({ label, value, color, note }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className={`text-2xl font-bold ${color || "text-white"}`}>{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{label}</p>
      {note ? <p className="text-[10px] text-slate-600 mt-1">{note}</p> : null}
    </div>
  );
}

export default function AISecurityPage() {
  const [models, setModels] = useState([]);
  const [attacks, setAttacks] = useState([]);
  const [jailbreaks, setJailbreaks] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.AIModel.list().catch(() => []),
      base44.entities.PromptAttack.list("-detected_at", 50).catch(() => []),
      base44.entities.JailbreakAttempt.list("-detected_at", 50).catch(() => []),
      base44.entities.AIPolicy.list().catch(() => []),
      base44.entities.AIModel.summary().catch(() => null),
    ])
      .then(([m, a, j, p, s]) => { setModels(m); setAttacks(a); setJailbreaks(j); setPolicies(p); setSummary(s); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardPage title="AI Security"><LoadingSpinner /></DashboardPage>;

  const inv = summary?.invocations ?? {};
  const atk = summary?.attacks ?? {};
  const mdl = summary?.models ?? {};

  return (
    <DashboardPage title="AI Security" subtitle="Models this platform runs, invocations it recorded, and text its guard refused">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Models Configured" value={mdl.configured ?? models.length}
              note={`${mdl.approved ?? 0} formally approved`} color="text-white" />
        <Tile label="Invocations Recorded" value={inv.invocations ?? 0}
              note={`${inv.last_30_days ?? 0} in the last 30 days`} color="text-blue-400" />
        <Tile label="Attacks Refused" value={atk.blocked ?? 0}
              note={`${atk.detected ?? 0} detected in total`} color="text-red-400" />
        <Tile label="Rules Enforced" value={policies.length} note="on both free-text AI routes" color="text-emerald-400" />
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        {summary?.guard?.scope || "Guard scope unavailable."}
        {" "}Invocations are counted from missions the reasoning loop created, not from every mission on the platform.
        {inv.failed ? ` ${inv.failed} of them failed.` : ""}
      </p>

      <SectionCard title="Models">
        {models.length === 0 ? <EmptyState message="No model is configured in the deployed reasoning code" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3">Model</th><th className="text-left py-2 px-3">Provider</th>
                <th className="text-left py-2 px-3">Risk class</th><th className="text-left py-2 px-3">Approved</th>
                <th className="text-left py-2 px-3">Configured in</th><th className="text-left py-2 px-3">Active</th>
              </tr></thead>
              <tbody>
                {models.map(m => (
                  <tr key={m.id} className="border-b border-slate-800 hover:bg-blue-500/5">
                    <td className="py-2 px-3 text-white font-medium">{m.name}</td>
                    <td className="py-2 px-3 text-slate-400">{m.provider}</td>
                    <td className="py-2 px-3"><Tag>{(m.risk_class || "unclassified").replace(/_/g, " ")}</Tag></td>
                    <td className="py-2 px-3 text-slate-300">{m.approved ? `yes (${m.approved_by || "unnamed"})` : "not approved"}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">{m.configured_in}</td>
                    <td className="py-2 px-3">
                      <span className={`w-2 h-2 inline-block rounded-full ${m.is_active ? "bg-emerald-500" : "bg-slate-600"}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Recent Prompt Attacks">
          {attacks.length === 0 ? <EmptyState message="No prompt attack has been recorded for this tenant" /> : (
            <div className="space-y-2">
              {attacks.map(a => (
                <div key={a.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: `1px solid ${a.blocked ? "#ef4444" : "#1F2937"}` }}>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <p className="text-sm font-semibold text-white">{String(a.attack_type || "").replace(/_/g, " ")}</p>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${a.blocked ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                      {a.blocked ? "REFUSED" : "ALLOWED + RECORDED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Rules: {(a.matched_rules || []).join(", ") || "none named"}</p>
                  <p className="text-[10px] text-slate-600 font-mono break-all">{a.payload_preview}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{a.target_route} · {a.detected_at ? new Date(a.detected_at).toLocaleString("en-GB") : ""}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Jailbreak Attempts">
          {jailbreaks.length === 0 ? <EmptyState message="No jailbreak attempt has been recorded for this tenant" /> : (
            <div className="space-y-2">
              {jailbreaks.map(j => (
                <div key={j.id} className="rounded-lg p-3 flex items-start gap-3" style={{ background: "#0a0f1e", border: `1px solid ${j.blocked ? "#ef4444" : "#1F2937"}` }}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{String(j.attack_type || "").replace(/_/g, " ")}</p>
                    <p className="text-[11px] text-slate-400">Rules: {(j.matched_rules || []).join(", ") || "none named"}</p>
                    <p className="text-[10px] text-slate-600">{j.detected_at ? new Date(j.detected_at).toLocaleString("en-GB") : ""}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${j.blocked ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                    {j.blocked ? "BLOCKED" : "NOT BLOCKED"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Hallucinations">
          <p className="text-xs text-slate-400 leading-relaxed">
            Not measured here. This platform has no hallucination detector and no output verification step, so no rate
            and no incident can be claimed. The table that would hold them does not exist, which is why this panel
            states the absence instead of drawing a 0%.
          </p>
        </SectionCard>

        <SectionCard title="AI Policies">
          {policies.length === 0 ? <EmptyState message="The guard reported no rules" /> : (
            <div className="space-y-2">
              {policies.map(p => (
                <div key={p.id} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <Tag>{String(p.policy_type || "").replace(/_/g, " ")}</Tag>
                  <div className="flex-1">
                    <p className="text-xs text-white">{p.rule}</p>
                    <p className="text-[10px] text-slate-500">On match: {p.action_on_violation}</p>
                  </div>
                  <SeverityBadge severity={p.severity} />
                  <span className={`w-2 h-2 rounded-full ${p.is_active ? "bg-emerald-500" : "bg-slate-600"}`} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </DashboardPage>
  );
}
