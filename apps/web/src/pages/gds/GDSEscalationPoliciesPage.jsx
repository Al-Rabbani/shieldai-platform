import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSEscalationPoliciesPage() {
  const { data: policies, isLoading } = useQuery({
    queryKey: ["escalation-policies"],
    queryFn: () => base44.entities.EscalationPolicy.filter({ is_active: true }, '-created_date', 50).catch(() => []),
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Escalation Policies" }]} />

      <div className="flex items-start gap-3 mb-6">
        <TrendingUp className="w-6 h-6" style={{ color: CYAN }} />
        <div>
          <h1 className="text-2xl font-black text-white">Escalation Policies</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Manage automated escalation workflows</p>
        </div>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Active Policies</h3>
        {isLoading ? (
          <Skeleton lines={6} />
        ) : policies?.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No escalation policies" description="Create policies to automate incident escalation" />
        ) : (
          <div className="space-y-3">
            {policies?.map(policy => (
              <div key={policy.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-white">{policy.policy_name}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{policy.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" style={{ color: policy.trigger_severity === 'critical' ? DANGER : HIGH }} />
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      policy.trigger_severity === 'critical' ? 'bg-red-400/15 text-red-400' : 'bg-orange-400/15 text-orange-400'
                    }`}>{policy.trigger_severity}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px]">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" style={{ color: MUTED }} />
                    <span style={{ color: MUTED }}>Threshold: {policy.escalation_threshold_minutes} min</span>
                  </div>
                  <span style={{ color: MUTED }}>•</span>
                  <span style={{ color: CYAN }}>{policy.trigger_count} escalations</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}