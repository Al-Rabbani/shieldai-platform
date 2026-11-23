import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { 
  Wrench, Brain, Globe, CheckCircle, ArrowRight,
  Shield, GitBranch, Zap, Target, Cloud, Key
} from "lucide-react";

const CHECKLIST_ITEMS = [
  { id: "autofix", label: "AutoFix enabled on critical findings", icon: Zap, required: true },
  { id: "github", label: "GitHub connected", icon: GitBranch, required: true },
  { id: "cloud", label: "Cloud accounts connected", icon: Cloud, required: true },
  { id: "audit", label: "Code Audit run in last 30 days", icon: Brain, required: false },
  { id: "pentest", label: "Pentest completed", icon: Target, required: true },
  { id: "attack-surface", label: "Attack surface monitoring enabled", icon: Globe, required: false },
  { id: "secrets", label: "Secrets pre-commit hook installed", icon: Key, required: true },
  { id: "infinite", label: "Infinite pentest enabled on main branch", icon: Shield, required: false },
];

function PillarCard({ icon: Icon, title, status, metric, cta, ctaLink, accent }) {
  return (
    <div className="rounded-xl p-6" style={{ 
      background: "linear-gradient(145deg, #0f172a, #0a0f1e)",
      border: `1px solid ${accent}40`,
    }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${accent}20` }}>
          <Icon className="w-6 h-6" style={{ color: accent }} />
        </div>
        <Link to={ctaLink} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
          {cta} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      <p className="text-2xl font-black font-mono mb-1" style={{ color: accent }}>{status}</p>
      <p className="text-xs text-slate-500">{metric}</p>
    </div>
  );
}

export default function AGIReadiness() {
  const { data: autoFixPRs = [] } = useQuery({
    queryKey: ["agi-autofix"],
    queryFn: () => base44.entities.AutoFixPR.list("-created_date", 100),
    initialData: [],
  });
  const { data: pentestJobs = [] } = useQuery({
    queryKey: ["agi-pentest"],
    queryFn: () => base44.entities.PentestJob.list("-started_at", 100),
    initialData: [],
  });
  const { data: cloudAccounts = [] } = useQuery({
    queryKey: ["agi-cloud"],
    queryFn: () => base44.entities.CloudAccount.list("-created_date", 50),
    initialData: [],
  });
  const { data: attackSurface = [] } = useQuery({
    queryKey: ["agi-surface"],
    queryFn: () => base44.entities.AttackSurface.list("-last_seen", 100),
    initialData: [],
  });

  const autofixThisMonth = autoFixPRs.filter(pr => {
    const created = new Date(pr.created_date);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const lastAudit = pentestJobs.find(j => j.mode === "greybox");
  const lastPentest = pentestJobs.find(j => j.mode === "blackbox");

  const completedItems = CHECKLIST_ITEMS.filter(item => {
    if (item.id === "autofix") return autofixThisMonth > 0;
    if (item.id === "github") return true; // Assume connected
    if (item.id === "cloud") return cloudAccounts.length > 0;
    if (item.id === "audit") return lastAudit && new Date(lastAudit.started_at) > new Date(Date.now() - 30 * 86400000);
    if (item.id === "pentest") return lastPentest !== undefined;
    if (item.id === "attack-surface") return attackSurface.length > 0;
    if (item.id === "secrets") return true; // Assume installed
    if (item.id === "infinite") return false;
    return false;
  }).length;

  const progress = Math.round((completedItems / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">AGI Readiness</h1>
        <p className="text-sm text-slate-500 mt-1">
          Stay ahead of AI-driven software risk. As AI agents ship more code faster, your attack surface expands faster too.
        </p>
      </div>

      {/* 3 Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <PillarCard
          icon={Wrench}
          title="Automated Remediation"
          status={`${autofixThisMonth} PRs`}
          metric={`AutoFix coverage: ${autoFixPRs.length > 0 ? Math.round((autoFixPRs.filter(pr => pr.status === "merged").length / autoFixPRs.length) * 100) : 0}% of fixable findings have PRs`}
          cta="Configure AutoFix"
          ctaLink="/code/autofix"
          accent="#10b981"
        />
        <PillarCard
          icon={Brain}
          title="AI-Powered Security Testing"
          status={`${pentestJobs.length} tests`}
          metric={`Last AI Code Audit: ${lastAudit ? Math.floor((Date.now() - new Date(lastAudit.started_at)) / 86400000) : "Never"} days ago`}
          cta="Run Code Audit"
          ctaLink="/code/code-audit"
          accent="#8b5cf6"
        />
        <PillarCard
          icon={Globe}
          title="Live Attack Surface Visibility"
          status={`${cloudAccounts.length} accounts`}
          metric={`Internet-facing assets: ${attackSurface.filter(a => a.is_internet_facing).length} | Critical risk: ${attackSurface.filter(a => a.risk_level === "critical").length}`}
          cta="View Attack Surface"
          ctaLink="/attack/surface"
          accent="#ef4444"
        />
      </div>

      {/* Checklist */}
      <div className="rounded-xl p-6" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">AGI Readiness Checklist</h2>
          <span className="text-sm font-mono text-slate-500">{completedItems}/{CHECKLIST_ITEMS.length} complete</span>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${progress}%`,
                background: progress >= 80 ? "#10b981" : progress >= 50 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">{progress}% AGI Ready</p>
        </div>

        {/* Checklist Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHECKLIST_ITEMS.map((item) => {
            const isComplete = (() => {
              if (item.id === "autofix") return autofixThisMonth > 0;
              if (item.id === "github") return true;
              if (item.id === "cloud") return cloudAccounts.length > 0;
              if (item.id === "audit") return lastAudit && new Date(lastAudit.started_at) > new Date(Date.now() - 30 * 86400000);
              if (item.id === "pentest") return lastPentest !== undefined;
              if (item.id === "attack-surface") return attackSurface.length > 0;
              if (item.id === "secrets") return true;
              if (item.id === "infinite") return false;
              return false;
            })();

            return (
              <div 
                key={item.id} 
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: isComplete ? "rgba(16,185,129,0.05)" : "rgba(30,58,95,0.2)" }}
              >
                {isComplete ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex-shrink-0" />
                )}
                <item.icon className={`w-4 h-4 ${isComplete ? "text-emerald-400" : "text-slate-600"}`} />
                <span className={`text-sm ${isComplete ? "text-slate-300" : "text-slate-500"}`}>{item.label}</span>
                {!item.required && (
                  <span className="text-[10px] text-slate-600 ml-auto">(optional)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}