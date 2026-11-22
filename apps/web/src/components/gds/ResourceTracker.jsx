import React from "react";
import { CARD, BORDER, CYAN, DANGER, HIGH, LOW, MEDIUM, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

export default function ResourceTracker({ plans }) {
  const totalBudget = 10000;
  const usedBudget = plans.reduce((sum, p) => sum + (p.budget_used || 0), 0);
  const remainingBudget = totalBudget - usedBudget;
  const burnRate = usedBudget / totalBudget;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-white">Resource & Budget Tracking</h3>
        <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Monitor compute usage and budget burn rates</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Budget</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>${totalBudget.toLocaleString()}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Used</p>
          <p className="text-2xl font-black font-mono" style={{ color: burnRate > 0.8 ? DANGER : burnRate > 0.5 ? HIGH : LOW }}>${usedBudget.toLocaleString()}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Remaining</p>
          <p className="text-2xl font-black font-mono" style={{ color: remainingBudget > 2000 ? LOW : remainingBudget > 1000 ? MEDIUM : DANGER }}>${remainingBudget.toLocaleString()}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Burn Rate</p>
          <p className="text-2xl font-black font-mono" style={{ color: burnRate > 0.8 ? DANGER : burnRate > 0.5 ? HIGH : LOW }}>{(burnRate * 100).toFixed(1)}%</p>
        </Card>
      </div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold" style={{ color: MUTED }}>Budget Utilization</p>
          <p className="text-xs font-bold" style={{ color: burnRate > 0.8 ? DANGER : burnRate > 0.5 ? HIGH : LOW }}>{(burnRate * 100).toFixed(1)}%</p>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all"
            style={{
              width: `${burnRate * 100}%`,
              background: burnRate > 0.8 ? DANGER : burnRate > 0.5 ? HIGH : LOW,
              boxShadow: `0 0 10px ${burnRate > 0.8 ? DANGER : burnRate > 0.5 ? HIGH : LOW}66`
            }} />
        </div>
      </div>
      <div className="space-y-3">
        {plans.map((plan, idx) => {
          const planBudget = plan.budget_allocated || 0;
          const planUsed = plan.budget_used || 0;
          const planBurn = planBudget > 0 ? (planUsed / planBudget) * 100 : 0;
          return (
            <div key={idx} className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white">{plan.plan_name || `Plan ${idx + 1}`}</h4>
                <span className="text-[10px] px-2 py-1 rounded"
                  style={{
                    color: planBurn > 90 ? DANGER : planBurn > 70 ? HIGH : LOW,
                    background: `${planBurn > 90 ? DANGER : planBurn > 70 ? HIGH : LOW}15`,
                    border: `1px solid ${planBurn > 90 ? DANGER : planBurn > 70 ? HIGH : LOW}30`
                  }}>
                  {planBurn > 90 ? "Critical" : planBurn > 70 ? "High" : "Normal"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs mb-2">
                <div>
                  <p style={{ color: MUTED }}>Allocated</p>
                  <p className="font-bold" style={{ color: TEXT }}>${planBudget.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ color: MUTED }}>Used</p>
                  <p className="font-bold" style={{ color: planBurn > 90 ? DANGER : planBurn > 70 ? HIGH : TEXT }}>${planUsed.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ color: MUTED }}>Burn Rate</p>
                  <p className="font-bold" style={{ color: planBurn > 90 ? DANGER : planBurn > 70 ? HIGH : LOW }}>{planBurn.toFixed(1)}%</p>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${Math.min(planBurn, 100)}%`,
                    background: planBurn > 90 ? DANGER : planBurn > 70 ? HIGH : LOW
                  }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}