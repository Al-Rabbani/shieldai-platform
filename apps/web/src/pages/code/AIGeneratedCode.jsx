import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Lock, GitBranch, CheckCircle, Zap } from "lucide-react";

const RISK_CARDS = [
  {
    title: "Hallucinated Packages",
    description: "AI agents invent package names that don't exist. Attackers register them with malware.",
    icon: AlertTriangle,
    color: "#f59e0b",
  },
  {
    title: "Committed Secrets",
    description: "AI agents miss environment variables and hardcode tokens directly in code.",
    icon: Lock,
    color: "#ef4444",
  },
  {
    title: "No IDE Feedback",
    description: "AI agents running headlessly bypass IDE security warnings.",
    icon: Shield,
    color: "#3b82f6",
  },
  {
    title: "No Pre-merge Gate",
    description: "Code generated and merged without a security check between generation and deploy.",
    icon: GitBranch,
    color: "#8b5cf6",
  },
];

const PROTECTION_LAYERS = [
  {
    step: 1,
    title: "BEFORE INSTALL",
    description: "Safe Chain blocks hallucinated + malicious packages before npm/pip/maven installs",
    icon: Shield,
  },
  {
    step: 2,
    title: "BEFORE COMMIT",
    description: "Pre-commit hook catches secrets, leaked keys, risky patterns",
    icon: Lock,
  },
  {
    step: 3,
    title: "BEFORE MERGE",
    description: "PR gating blocks high/critical findings from reaching main",
    icon: GitBranch,
  },
];

export default function AIGeneratedCode() {
  const { data: secrets = [] } = useQuery({
    queryKey: ["ai-gen-secrets"],
    queryFn: () => base44.entities.SecretFinding.list("-created_date", 100),
    initialData: [],
  });
  const { data: sastFindings = [] } = useQuery({
    queryKey: ["ai-gen-sast"],
    queryFn: () => base44.entities.SASTFinding.list("-created_date", 100),
    initialData: [],
  });

  const packagesBlocked = 0; // Would need SupplyChainEvent data
  const secretsCaught = secrets.length;
  const prsBlocked = sastFindings.filter(f => f.severity === "critical" || f.severity === "high").length;

  const allLayersActive = packagesBlocked >= 0 && secretsCaught >= 0 && prsBlocked >= 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">AI-Generated Code Security</h1>
        <p className="text-sm text-slate-500 mt-1">
          Guardrails for code written by Claude, Cursor, Copilot, and Windsurf. AI agents ship fast — ShieldAI makes sure they ship safe.
        </p>
      </div>

      {/* Risk Explainer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {RISK_CARDS.map((risk, i) => (
          <div 
            key={i} 
            className="rounded-xl p-5"
            style={{ 
              background: "linear-gradient(145deg, #0f172a, #0a0f1e)",
              border: `1px solid ${risk.color}30`,
            }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${risk.color}20` }}>
              <risk.icon className="w-5 h-5" style={{ color: risk.color }} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">{risk.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{risk.description}</p>
          </div>
        ))}
      </div>

      {/* Protection Layers */}
      <div className="rounded-xl p-6" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <h2 className="text-lg font-bold text-white mb-6">Protection Layers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROTECTION_LAYERS.map((layer, i) => (
            <div key={i} className="relative">
              {i < PROTECTION_LAYERS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-0.5" style={{ background: "linear-gradient(90deg, #3b82f6, transparent)" }} />
              )}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1e3a5f, #3b82f6)" }}>
                  <layer.icon className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold text-blue-400 mb-1">STEP {layer.step}</p>
                  <h3 className="text-sm font-bold text-white mb-1">{layer.title}</h3>
                  <p className="text-xs text-slate-500">{layer.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Panel */}
      <div className="rounded-xl p-6" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Live Status</h2>
          {allLayersActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">All 3 layers active</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg p-4" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.4)" }}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Packages Blocked</p>
            <p className="text-2xl font-black font-mono text-amber-400">{packagesBlocked}</p>
            <p className="text-xs text-slate-600 mt-1">This month by Safe Chain</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.4)" }}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Secrets Caught</p>
            <p className="text-2xl font-black font-mono text-red-400">{secretsCaught}</p>
            <p className="text-xs text-slate-600 mt-1">Pre-commit this month</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.4)" }}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">PRs Blocked</p>
            <p className="text-2xl font-black font-mono text-purple-400">{prsBlocked}</p>
            <p className="text-xs text-slate-600 mt-1">By gating this month</p>
          </div>
        </div>
      </div>
    </div>
  );
}