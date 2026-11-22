import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, X } from "lucide-react";

const STEPS = [
  { key: "step_connect_integration", title: "Connect your first integration", desc: "Link GitHub, AWS, or another provider", cta: "Connect", to: "/integrations" },
  { key: "step_run_first_scan", title: "Run your first security scan", desc: "Scan a repository for vulnerabilities", cta: "Start Scan", to: "/code/repositories" },
  { key: "step_view_findings", title: "View your findings", desc: "Review SAST, SCA and secrets results", cta: "View Findings", to: "/code/sast" },
  { key: "step_invite_team", title: "Invite your team", desc: "Add team members to collaborate", cta: "Invite Members", to: "/settings/team" },
  { key: "step_configure_policy", title: "Configure a security policy", desc: "Set enforcement rules for your stack", cta: "Set Up Policy", to: "/policies" },
  { key: "step_setup_notifications", title: "Set up notifications", desc: "Get alerted on critical findings", cta: "Configure", to: "/notifications" },
];

export default function OnboardingWidget() {
  const qc = useQueryClient();

  const { data: progressList = [] } = useQuery({
    queryKey: ["onboarding"],
    queryFn: () => base44.entities.OnboardingProgress.list("-created_date", 1),
    initialData: [],
  });

  const progress = progressList[0];

  const dismiss = useMutation({
    mutationFn: () => base44.entities.OnboardingProgress.update(progress.id, { dismissed: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding"] }),
  });

  if (!progress || progress.dismissed || progress.completed) return null;
  if ((progress.completion_percent || 0) >= 100) return null;

  const pct = progress.completion_percent || 0;
  const nextStep = STEPS.find(s => !progress[s.key]);

  return (
    <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-violet-500/5 p-5 overflow-hidden"
      style={{ boxShadow: "0 0 0 1px rgba(59,130,246,0.15), 0 0 24px rgba(59,130,246,0.06)" }}>
      {/* Animated border */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.08), transparent)", animation: "shimmer 3s ease-in-out infinite", backgroundSize: "200% 100%" }} />

      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-foreground">🚀 Get ShieldAI up and running</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{pct}% complete — {STEPS.filter(s => progress[s.key]).length} of {STEPS.length} steps done</p>
        </div>
        <button onClick={() => dismiss.mutate()} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>

      {/* Steps grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
        {STEPS.map((step) => {
          const done = !!progress[step.key];
          return (
            <div key={step.key} className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all ${done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/30 border-border"}`}>
              {done
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{step.title}</p>
                {!done && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                    <Link to={step.to} className="text-[10px] text-primary hover:underline flex-shrink-0 ml-2">{step.cta} →</Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {nextStep && (
        <Link to={nextStep.to}>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            Continue Setup → {nextStep.title}
          </Button>
        </Link>
      )}
    </div>
  );
}