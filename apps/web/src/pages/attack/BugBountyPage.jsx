import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, Trophy, DollarSign, Clock, Shield, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const REWARD_TIERS = [
  { severity: "critical", amount: 5000, color: "#ef4444" },
  { severity: "high", amount: 2500, color: "#f97316" },
  { severity: "medium", amount: 500, color: "#eab308" },
  { severity: "low", amount: 100, color: "#3b82f6" },
];

function SetupWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", scope: [], disclosure: "coordinated" });

  const steps = [
    { n: 1, title: "Program Details" },
    { n: 2, title: "Scope & Assets" },
    { n: 3, title: "Reward Tiers" },
    { n: 4, title: "Disclosure Policy" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl" style={{ background: "#0d1117", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 16 }}>
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: "#f59e0b" }} />
            Bug Bounty Program Setup
          </h2>
          <p className="text-xs text-slate-500 mt-1">Launch your security bug bounty program in minutes</p>
        </div>

        <div className="flex gap-2 px-6 py-4 border-b border-slate-800">
          {steps.map(s => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.n ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-600"}`}>{s.n}</div>
              <span className={`text-xs font-medium ${step >= s.n ? "text-white" : "text-slate-600"}`}>{s.title}</span>
              {s.n < steps.length && <Plus className="w-3 h-3 text-slate-700" />}
            </div>
          ))}
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-2">Program Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. ShieldAI Public Bug Bounty" className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none" style={{ background: "#161b22", border: "1px solid #30363d" }} />
              </div>
              <p className="text-xs text-slate-500">This will be the public name of your bug bounty program.</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Select in-scope assets</p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {[
                  { id: "web", name: "Web Applications", desc: "All production web apps" },
                  { id: "api", name: "API Endpoints", desc: "REST & GraphQL APIs" },
                  { id: "mobile", name: "Mobile Apps", desc: "iOS and Android apps" },
                  { id: "infra", name: "Infrastructure", desc: "Cloud services, APIs" },
                ].map(asset => (
                  <button key={asset.id} onClick={() => setForm(f => ({ ...f, scope: f.scope.includes(asset.id) ? f.scope.filter(id => id !== asset.id) : [...f.scope, asset.id] }))}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${form.scope.includes(asset.id) ? "border-amber-500/50 bg-amber-500/10" : "border-slate-800 hover:border-slate-700"}`}>
                    <p className="text-sm font-medium text-white">{asset.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{asset.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Reward tiers (customizable)</p>
              <div className="space-y-2">
                {REWARD_TIERS.map(tier => (
                  <div key={tier.severity} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#161b22", border: `1px solid ${tier.color}30` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: tier.color }} />
                      <span className="text-sm text-white capitalize">{tier.severity}</span>
                    </div>
                    <span className="text-sm font-mono font-bold" style={{ color: tier.color }}>${tier.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Disclosure Policy</p>
              {[
                { v: "coordinated", label: "Coordinated Disclosure", desc: "Work with researchers before public disclosure" },
                { v: "full", label: "Full Disclosure", desc: "Findings made public immediately after validation" },
                { v: "none", label: "No Disclosure", desc: "Findings kept private indefinitely" },
              ].map(opt => (
                <button key={opt.v} onClick={() => setForm(f => ({ ...f, disclosure: opt.v }))}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${form.disclosure === opt.v ? "border-amber-500/50 bg-amber-500/10" : "border-slate-800 hover:border-slate-700"}`}>
                  <p className="text-sm font-medium text-white">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-800">
          <Button onClick={onClose} variant="outline" className="flex-1" style={{ background: "#161b22", border: "#30363d", color: "#94a3b8" }}>Cancel</Button>
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)} className="flex-1" style={{ background: "#f59e0b", color: "#000" }}>Continue</Button>
          ) : (
            <Button onClick={() => { onCreated(); }} className="flex-1" style={{ background: "#f59e0b", color: "#000" }}>Launch Program</Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BugBountyPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [programActive, setProgramActive] = useState(false);

  return (
    <div className="min-h-screen -m-6 p-6 space-y-6" style={{ background: "#0d1117" }}>
      {showWizard && <SetupWizard onClose={() => setShowWizard(false)} onCreated={() => { setShowWizard(false); setProgramActive(true); }} />}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl p-8" style={{ background: "linear-gradient(135deg, #0d0a05, #1a1205)", border: "1px solid rgba(245,158,11,0.2)" }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #f59e0b 0%, transparent 50%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] px-2.5 py-1 rounded font-bold font-mono tracking-widest" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}>◈ BUG BOUNTY</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Bug Bounty Program Management</h1>
          <p className="text-slate-400 max-w-2xl text-sm leading-relaxed mb-5">
            Run your own security bug bounty program — manage researcher submissions, validate findings, and reward reporters.
          </p>
          {!programActive ? (
            <Button onClick={() => setShowWizard(true)} className="flex items-center gap-2" style={{ background: "#f59e0b", color: "#000" }}>
              <Plus className="w-4 h-4" /> Create Bug Bounty Program
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Program Active</span>
            </div>
          )}
        </div>
      </div>

      {!programActive ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: "#161b22", border: "1px solid rgba(245,158,11,0.1)" }}>
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: "#f59e0b" }} />
          <h3 className="text-white font-semibold mb-2">No bug bounty program yet</h3>
          <p className="text-slate-500 text-sm mb-6">Launch your program to start receiving submissions from security researchers</p>
          <Button onClick={() => setShowWizard(true)} className="flex items-center gap-2 mx-auto" style={{ background: "#f59e0b", color: "#000" }}>
            <Plus className="w-4 h-4" /> Create Program
          </Button>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Submissions", value: 0, color: "#f59e0b", icon: Target },
              { label: "Valid Findings", value: 0, color: "#10b981", icon: Shield },
              { label: "Total Rewarded", value: "$0", color: "#3b82f6", icon: DollarSign },
              { label: "Avg Response Time", value: "—", color: "#64748b", icon: Clock },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "#161b22", border: "1px solid #30363d" }}>
                <div className="flex items-center justify-center gap-1 mb-2">
                  <s.icon className="w-3 h-3" style={{ color: s.color }} />
                  <p className="text-[9px] font-mono font-semibold tracking-widest text-slate-500">{s.label}</p>
                </div>
                <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Submissions table */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
            <div className="px-5 py-4" style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
              <h3 className="text-sm font-bold text-white">Submissions</h3>
              <p className="text-xs text-slate-500 mt-0.5">Your bug bounty program is live — submissions will appear here</p>
            </div>
            <div className="px-4 py-12 text-center text-slate-500 text-sm">
              No submissions yet. Researchers can submit findings to your program.
            </div>
          </div>

          {/* Reward tiers */}
          <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <h3 className="text-sm font-bold text-white mb-4">Reward Tiers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {REWARD_TIERS.map(tier => (
                <div key={tier.severity} className="p-4 rounded-lg text-center" style={{ background: `${tier.color}08`, border: `1px solid ${tier.color}20` }}>
                  <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: tier.color }} />
                  <p className="text-xs text-slate-400 capitalize mb-1">{tier.severity}</p>
                  <p className="text-lg font-black font-mono" style={{ color: tier.color }}>${tier.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button className="flex items-center gap-2" style={{ background: "#f59e0b", color: "#000" }}>
              <ExternalLink className="w-4 h-4" /> View Public Program Page
            </Button>
            <Button variant="outline" className="flex items-center gap-2" style={{ background: "#161b22", border: "#30363d", color: "#94a3b8" }}>
              <Trophy className="w-4 h-4" /> Manage Program
            </Button>
          </div>
        </>
      )}
    </div>
  );
}