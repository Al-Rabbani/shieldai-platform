import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, GitBranch, Shield, Zap, ChevronRight, Play, Eye, Loader2, CheckCircle2, Clock, XCircle, FileText, Target, Layers, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_CONFIG = {
  queued: { color: "#64748b", bg: "rgba(100,116,139,0.15)", label: "QUEUED", pulse: false },
  analyzing: { color: "#7c3aed", bg: "rgba(124,58,246,0.15)", label: "ANALYZING", pulse: true },
  reasoning: { color: "#8b5cf6", bg: "rgba(139,92,246,0.15)", label: "REASONING", pulse: true },
  completed: { color: "#10b981", bg: "rgba(16,185,129,0.15)", label: "COMPLETED", pulse: false },
  failed: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", label: "FAILED", pulse: false },
};

const FOCUS_AREAS = [
  { id: "auth", label: "Auth & Access Control", icon: Lock },
  { id: "business", label: "Business Logic", icon: Target },
  { id: "data", label: "Data Handling", icon: Layers },
  { id: "api", label: "API Security", icon: Zap },
  { id: "crypto", label: "Crypto & Secrets", icon: Shield },
  { id: "injection", label: "Injection Flaws", icon: FileText },
];

function AuditWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ repo_ids: [], scope: "full", focus_areas: [], credit_estimate: 0 });
  const qc = useQueryClient();

  const { data: repos = [] } = useQuery({ queryKey: ["code-repos"], queryFn: () => base44.entities.CodeRepository.list() });

  const createAudit = useMutation({
    mutationFn: async () => {
      const job = await base44.entities.PentestJob.create({
        title: `AI Code Audit — ${repos.find(r => r.id === form.repo_ids[0])?.name || "Multiple"}`,
        target_app_name: repos.find(r => r.id === form.repo_ids[0])?.name,
        mode: "code_audit",
        scope: form.scope,
        status: "queued",
        compliance_targets: form.focus_areas.join(","),
        triggered_by: "manual",
      });
      return job;
    },
    onSuccess: () => {
      toast.success("AI Code Audit started");
      onCreated();
    },
  });

  const steps = [
    { n: 1, title: "Select Repositories" },
    { n: 2, title: "Define Scope" },
    { n: 3, title: "Focus Areas" },
    { n: 4, title: "Review & Start" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl" style={{ background: "#0d1117", border: "1px solid rgba(124,58,246,0.3)", borderRadius: 16 }}>
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5" style={{ color: "#7c3aed" }} />
            AI Code Audit — Multi-Agent Source Reasoning
          </h2>
          <p className="text-xs text-slate-500 mt-1">Pentest-grade reasoning across files to find logic flaws SAST cannot see</p>
        </div>

        {/* Progress steps */}
        <div className="flex gap-2 px-6 py-4 border-b border-slate-800">
          {steps.map(s => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.n ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-600"}`}>{s.n}</div>
              <span className={`text-xs font-medium ${step >= s.n ? "text-white" : "text-slate-600"}`}>{s.title}</span>
              {s.n < steps.length && <ChevronRight className="w-3 h-3 text-slate-700" />}
            </div>
          ))}
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Select repositories to audit (multi-select supported)</p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {repos.map(r => (
                  <button key={r.id} onClick={() => setForm(f => ({ ...f, repo_ids: f.repo_ids.includes(r.id) ? f.repo_ids.filter(id => id !== r.id) : [...f.repo_ids, r.id] }))}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${form.repo_ids.includes(r.id) ? "border-violet-500/50 bg-violet-500/10" : "border-slate-800 hover:border-slate-700"}`}>
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-4 h-4 text-slate-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.language} · Risk: {r.risk_score || 0}/100</p>
                      </div>
                    </div>
                    {form.repo_ids.includes(r.id) && <CheckCircle2 className="w-4 h-4 text-violet-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Choose audit scope</p>
              {[
                { v: "full", label: "Full Repository", desc: "Analyze all files — most comprehensive" },
                { v: "changed", label: "Changed Files Only", desc: "Only files modified in last 30 days" },
                { v: "custom", label: "Specific Directories", desc: "Select directories to focus on" },
              ].map(opt => (
                <button key={opt.v} onClick={() => setForm(f => ({ ...f, scope: opt.v }))}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${form.scope === opt.v ? "border-violet-500/50 bg-violet-500/10" : "border-slate-800 hover:border-slate-700"}`}>
                  <p className="text-sm font-medium text-white">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Select focus areas (multi-select)</p>
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_AREAS.map(area => (
                  <button key={area.id} onClick={() => setForm(f => ({ ...f, focus_areas: f.focus_areas.includes(area.id) ? f.focus_areas.filter(id => id !== area.id) : [...f.focus_areas, area.id] }))}
                    className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${form.focus_areas.includes(area.id) ? "border-violet-500/50 bg-violet-500/10" : "border-slate-800 hover:border-slate-700"}`}>
                    <area.icon className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-white">{area.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ background: "rgba(124,58,246,0.05)", border: "1px solid rgba(124,58,246,0.2)" }}>
                <p className="text-xs text-slate-400 mb-2">Audit Summary</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Repositories:</span><span className="text-white">{form.repo_ids.length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Scope:</span><span className="text-white capitalize">{form.scope}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Focus Areas:</span><span className="text-white">{form.focus_areas.length || "All"}</span></div>
                  <div className="flex justify-between pt-2 border-t border-slate-800"><span className="text-slate-500">Credit Estimate:</span><span className="text-violet-400 font-mono">~{(form.repo_ids.length * 40) || 120} credits</span></div>
                </div>
              </div>
              <p className="text-xs text-slate-500">AI agents will analyze your codebase for logic flaws, IDOR, privilege escalation, and multi-step exploit chains.</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-800">
          <Button onClick={onClose} variant="outline" className="flex-1" style={{ background: "#161b22", border: "#30363d", color: "#94a3b8" }}>Cancel</Button>
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)} className="flex-1" style={{ background: "#7c3aed", color: "#fff" }}>Continue</Button>
          ) : (
            <Button onClick={() => createAudit.mutate()} disabled={createAudit.isPending || form.repo_ids.length === 0} className="flex-1" style={{ background: "#7c3aed", color: "#fff" }}>
              {createAudit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Audit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CodeAuditPage() {
  const [showWizard, setShowWizard] = useState(false);
  const qc = useQueryClient();

  const { data: audits = [] } = useQuery({ queryKey: ["code-audits"], queryFn: () => base44.entities.PentestJob.filter({ mode: "code_audit" }, "-created_date", 50) });

  return (
    <div className="min-h-screen -m-6 p-6 space-y-6" style={{ background: "#0d1117" }}>
      {showWizard && <AuditWizard onClose={() => setShowWizard(false)} onCreated={() => { setShowWizard(false); qc.invalidateQueries({ queryKey: ["code-audits"] }); }} />}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl p-8" style={{ background: "linear-gradient(135deg, #0d0514, #130a1a)", border: "1px solid rgba(124,58,246,0.2)" }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #7c3aed 0%, transparent 50%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] px-2.5 py-1 rounded font-bold font-mono tracking-widest" style={{ background: "rgba(124,58,246,0.15)", border: "1px solid rgba(124,58,246,0.3)", color: "#a78bfa" }}>◈ AI CODE AUDIT</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-3">AI Code Audit — Pentest-Grade Source Reasoning</h1>
          <p className="text-slate-400 max-w-2xl text-sm leading-relaxed mb-5">
            Multiple AI agents read your entire codebase together, chain context across files and services, and find architectural flaws, logic bugs, and privilege escalation chains that SAST pattern-matching will never catch.
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {["✓ No live URL needed — just connect a repo", "✓ Cross-file reasoning across services", "✓ Finds what SAST misses: logic flaws, IDOR, privilege escalation"].map(p => (
              <span key={p} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "rgba(124,58,246,0.08)", border: "1px solid rgba(124,58,246,0.2)", color: "#a78bfa" }}>{p}</span>
            ))}
          </div>
          <Button onClick={() => setShowWizard(true)} className="flex items-center gap-2" style={{ background: "#7c3aed", color: "#fff" }}>
            <Play className="w-4 h-4" /> Start New Audit
          </Button>
        </div>
      </div>

      {/* SAST vs AI Audit comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-bold text-slate-400 mb-3">SAST (Pattern Matching)</h3>
          <ul className="space-y-2 text-xs text-slate-500">
            <li className="flex items-center gap-2"><XCircle className="w-3 h-3 text-red-400" /> Single file/function analysis</li>
            <li className="flex items-center gap-2"><XCircle className="w-3 h-3 text-red-400" /> Only catches known patterns</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Fast, runs on every commit</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Free (continuous)</li>
          </ul>
        </div>
        <div className="rounded-xl p-5" style={{ background: "rgba(124,58,246,0.05)", border: "1px solid rgba(124,58,246,0.2)" }}>
          <h3 className="text-sm font-bold text-violet-400 mb-3">AI Code Audit (Semantic Reasoning)</h3>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-violet-400" /> Cross-file, cross-service reasoning</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-violet-400" /> Catches novel logic flaws</li>
            <li className="flex items-center gap-2"><XCircle className="w-3 h-3 text-amber-400" /> Deep analysis, on demand</li>
            <li className="flex items-center gap-2"><XCircle className="w-3 h-3 text-amber-400" /> Credits per audit</li>
          </ul>
        </div>
      </div>

      {/* Audits table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <div className="px-5 py-4" style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
          <h3 className="text-sm font-bold text-white">AI Audit Jobs</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#0d1117", borderBottom: "1px solid #30363d" }}>
              {["Status", "Repository", "Scope", "Files", "Agents", "Findings", "Coverage", "Credits", "Duration", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: "#0d1117" }}>
            {audits.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-500 text-sm">No AI audits yet — start your first audit above</td></tr>
            ) : (
              audits.map(audit => {
                const st = STATUS_CONFIG[audit.status] || STATUS_CONFIG.queued;
                return (
                  <tr key={audit.id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded font-bold uppercase" style={{ color: st.color, background: st.bg }}>
                        {st.pulse && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: st.color }} />}
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-white">{audit.target_app_name || audit.title}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 capitalize">{audit.scope || "full"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{audit.vectors_tested || "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{audit.agent_count || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <span className="text-[10px] font-mono" style={{ color: "#ef4444" }}>🔴 {audit.critical_count || 0}</span>
                        <span className="text-[10px] font-mono" style={{ color: "#f97316" }}>🟠 {audit.high_count || 0}</span>
                        <span className="text-[10px] font-mono" style={{ color: "#eab308" }}>🟡 {audit.medium_count || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${audit.coverage_percent || 0}%`, background: "#7c3aed" }} />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{audit.coverage_percent || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{audit.cost_credits || "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{audit.duration_minutes ? `${audit.duration_minutes}m` : "—"}</td>
                    <td className="px-4 py-3">
                      <a href={`/attack/pentest/${audit.id}`} className="text-[11px] px-2 py-1 rounded font-medium" style={{ background: "rgba(124,58,246,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,246,0.2)" }}>View Report</a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}