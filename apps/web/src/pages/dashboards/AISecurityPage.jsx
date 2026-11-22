import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DashboardPage, StatTile, SectionCard, SeverityBadge, StatusBadge, LoadingSpinner, EmptyState, Tag } from "@/components/dashboards/DashboardShared";
import { Bot, Zap, Unlock, Eye } from "lucide-react";

export default function AISecurityPage() {
  const [models, setModels] = useState([]);
  const [attacks, setAttacks] = useState([]);
  const [jailbreaks, setJailbreaks] = useState([]);
  const [hallucinations, setHallucinations] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.AIModel.list().catch(() => []),
      base44.entities.PromptAttack.list("-detected_at", 20).catch(() => []),
      base44.entities.JailbreakAttempt.list("-detected_at", 20).catch(() => []),
      base44.entities.Hallucination.list("-detected_at", 20).catch(() => []),
      base44.entities.AIPolicy.list().catch(() => []),
    ]).then(([m, a, j, h, p]) => {
      setModels(m); setAttacks(a); setJailbreaks(j); setHallucinations(h); setPolicies(p); setLoading(false);
    });
  }, []);

  if (loading) return <DashboardPage title="AI Model Security" badge="SEP-009"><LoadingSpinner /></DashboardPage>;

  const criticalAttacks = attacks.filter(a => a.severity === "critical").length;

  return (
    <DashboardPage title="AI Model Security" badge="SEP-009" subtitle="Monitor AI models for prompt injection, jailbreaks, hallucinations, and policy violations">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Bot} label="AI Models" value={models.length} sublabel={`${models.filter(m => m.status === "active").length} active`} accent="#3b82f6" />
        <StatTile icon={Zap} label="Prompt Attacks" value={attacks.length} sublabel={`${criticalAttacks} critical`} accent="#ef4444" />
        <StatTile icon={Unlock} label="Jailbreak Attempts" value={jailbreaks.length} sublabel={`${jailbreaks.filter(j => j.succeeded).length} succeeded`} accent="#f97316" />
        <StatTile icon={Eye} label="Hallucinations" value={hallucinations.length} sublabel="Detected by monitors" accent="#f59e0b" />
      </div>

      <SectionCard title="AI Models">
        {models.length === 0 ? <EmptyState message="No AI models registered" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-2 px-3">Model</th><th className="text-left py-2 px-3">Provider</th><th className="text-left py-2 px-3">Risk Level</th><th className="text-left py-2 px-3">EU AI Act</th><th className="text-left py-2 px-3">Inj. Susc.</th><th className="text-left py-2 px-3">JB Susc.</th><th className="text-left py-2 px-3">Halluc %</th><th className="text-left py-2 px-3">Status</th>
              </tr></thead>
              <tbody>
                {models.map(m => (
                  <tr key={m.id} className="border-b border-slate-800 hover:bg-blue-500/5">
                    <td className="py-2 px-3 text-white font-medium">{m.name}</td>
                    <td className="py-2 px-3 text-slate-400">{m.provider_name}</td>
                    <td className="py-2 px-3"><SeverityBadge severity={m.risk_level} /></td>
                    <td className="py-2 px-3"><Tag>{(m.eu_ai_act_risk_class || "").replace(/_/g, " ")}</Tag></td>
                    <td className="py-2 px-3 text-slate-300">{m.prompt_injection_susceptibility}%</td>
                    <td className="py-2 px-3 text-slate-300">{m.jailbreak_susceptibility}%</td>
                    <td className="py-2 px-3 text-slate-300">{m.hallucination_rate_pct}%</td>
                    <td className="py-2 px-3"><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Recent Prompt Attacks">
          {attacks.length === 0 ? <EmptyState message="No prompt attacks detected" /> : (
            <div className="space-y-2">
              {attacks.map(a => (
                <div key={a.id} className="rounded-lg p-3 flex items-start gap-3" style={{ background: "#0a0f1e", border: `1px solid ${a.succeeded ? "#ef4444" : "#1F2937"}` }}>
                  <SeverityBadge severity={a.severity} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{a.attack_type}</p>
                    <p className="text-[11px] text-slate-400">{a.target_objective}</p>
                    <p className="text-[10px] text-slate-600">{a.detected_at ? new Date(a.detected_at).toLocaleString() : ""}</p>
                  </div>
                  {a.succeeded && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">SUCCEEDED</span>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Jailbreak Attempts">
          {jailbreaks.length === 0 ? <EmptyState message="No jailbreak attempts detected" /> : (
            <div className="space-y-2">
              {jailbreaks.map(j => (
                <div key={j.id} className="rounded-lg p-3 flex items-start gap-3" style={{ background: "#0a0f1e", border: `1px solid ${j.succeeded ? "#ef4444" : "#1F2937"}` }}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{j.technique}</p>
                    <p className="text-[11px] text-slate-400">Harm: {j.harm_category}</p>
                    <p className="text-[10px] text-slate-600">{j.detected_at ? new Date(j.detected_at).toLocaleString() : ""}</p>
                  </div>
                  {j.succeeded ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">BREACHED</span> : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">BLOCKED</span>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Hallucinations">
          {hallucinations.length === 0 ? <EmptyState message="No hallucinations recorded" /> : (
            <div className="space-y-2">
              {hallucinations.map(h => (
                <div key={h.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={h.severity} />
                    <p className="text-sm font-semibold text-white">{h.hallucination_type}</p>
                  </div>
                  <p className="text-[11px] text-slate-400">{h.business_impact}</p>
                  <p className="text-[10px] text-slate-600">Use case: {h.use_case}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="AI Policies">
          {policies.length === 0 ? <EmptyState message="No AI policies configured" /> : (
            <div className="space-y-2">
              {policies.map(p => (
                <div key={p.id} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <Tag>{p.policy_type.replace(/_/g, " ")}</Tag>
                  <div className="flex-1">
                    <p className="text-xs text-white">{p.rule}</p>
                    <p className="text-[10px] text-slate-500">Action: {p.action_on_violation}</p>
                  </div>
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