import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, CheckCircle, AlertTriangle, Lock, RotateCcw, Play, Clock3 } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const AUTONOMY_COLORS = { 0: MUTED, 1: "#3b82f6", 2: "#f59e0b", 3: "#10b981", 4: "#00ff88", 5: DANGER };

export default function GDSAutoDefensePlansPage() {
  const [filterAutonomy, setFilterAutonomy] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["auto-defense-plans", filterAutonomy, filterStatus, filterRisk],
    queryFn: () => base44.entities.RemediationPlan.list("-created_date", 200).then(r => r.filter(p => {
      if (filterAutonomy && p.autonomy_level?.toString() !== filterAutonomy) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterRisk && p.risk_level !== filterRisk) return false;
      return true;
    })).catch(() => []),
  });

  const stats = {
    total: plans.length,
    executing: plans.filter(p => p.status === "executing").length,
    pendingApproval: plans.filter(p => p.status === "pending_approval").length,
    completed: plans.filter(p => p.status === "completed").length
  };

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Auto Defense", path: "/auto-defense" }, { label: "Remediation Plans" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Remediation Plans</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Autonomous remediation plan management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Plans</p>
          <p className="text-2xl font-black" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Executing</p>
          <p className="text-2xl font-black" style={{ color: HIGH }}>{stats.executing}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Pending Approval</p>
          <p className="text-2xl font-black" style={{ color: DANGER }}>{stats.pendingApproval}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Completed</p>
          <p className="text-2xl font-black" style={{ color: LOW }}>{stats.completed}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterAutonomy} onChange={(e) => setFilterAutonomy(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Autonomy Levels</option>
            {[0,1,2,3,4,5].map(l => <option key={l} value={l}>Level {l}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="executing">Executing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="rolled_back">Rolled Back</option>
          </select>
          <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : plans.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm" style={{ color: MUTED }}>No remediation plans</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Title", "Source", "Type", "Autonomy", "Risk", "Steps", "Duration", "Rollback", "Approval", "Success Rate", "Status"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5 cursor-pointer" onClick={() => setSelectedPlan(plan)}>
                    <td className="py-3 px-4">
                      <p className="text-xs font-semibold text-white max-w-xs truncate">{plan.title}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{plan.source_type?.replace(/_/g, " ")}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>{plan.remediation_type?.replace(/_/g, " ")}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${AUTONOMY_COLORS[plan.autonomy_level || 0]}30`, color: AUTONOMY_COLORS[plan.autonomy_level || 0] }}>Level {plan.autonomy_level}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${plan.risk_level === 'critical' ? 'bg-red-400/20 text-red-400' : plan.risk_level === 'high' ? 'bg-orange-400/20 text-orange-400' : 'bg-blue-400/20 text-blue-400'}`}>{plan.risk_level}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs" style={{ color: TEXT }}>{plan.steps?.length || 0}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs" style={{ color: TEXT }}>{plan.estimated_duration_minutes || 0}m</p>
                    </td>
                    <td className="py-3 px-4">
                      {plan.rollback_available ? <CheckCircle className="w-4 h-4" style={{ color: LOW }} /> : <Lock className="w-4 h-4" style={{ color: MUTED }} />}
                    </td>
                    <td className="py-3 px-4">
                      {plan.requires_approval ? <Lock className="w-4 h-4" style={{ color: MEDIUM }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}
                    </td>
                    <td className="py-3 px-4">
                      <p className={`text-xs font-bold ${plan.success_rate_percent >= 90 ? 'text-green-400' : plan.success_rate_percent >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{plan.success_rate_percent || 0}%</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${plan.status === 'executing' ? 'bg-blue-400/20 text-blue-400' : plan.status === 'completed' ? 'bg-green-400/20 text-green-400' : plan.status === 'failed' ? 'bg-red-400/20 text-red-400' : 'bg-gray-400/20 text-gray-400'}`}>{plan.status?.replace(/_/g, " ")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#0a1628" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedPlan.title}</h3>
                <p className="text-[10px]" style={{ color: MUTED }}>{selectedPlan.source_type?.replace(/_/g, " ")} • {selectedPlan.remediation_type?.replace(/_/g, " ")}</p>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="text-slate-400 hover:text-white"><span className="text-2xl">×</span></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Autonomy Level</p>
                <span className="text-sm font-bold px-2 py-0.5 rounded" style={{ background: `${AUTONOMY_COLORS[selectedPlan.autonomy_level || 0]}30`, color: AUTONOMY_COLORS[selectedPlan.autonomy_level || 0] }}>Level {selectedPlan.autonomy_level}</span>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Risk Level</p>
                <span className={`text-sm font-bold px-2 py-0.5 rounded ${selectedPlan.risk_level === 'critical' ? 'bg-red-400/20 text-red-400' : 'bg-blue-400/20 text-blue-400'}`}>{selectedPlan.risk_level}</span>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Duration</p>
                <p className="text-sm font-bold" style={{ color: TEXT }}>{selectedPlan.estimated_duration_minutes || 0}m</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Success Rate</p>
                <p className="text-sm font-bold" style={{ color: LOW }}>{selectedPlan.success_rate_percent || 0}%</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs font-bold mb-2" style={{ color: CYAN }}>Remediation Steps</p>
              <div className="space-y-2">
                {(selectedPlan.steps || []).map((step, i) => (
                  <div key={i} className="p-3 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                    <p className="font-semibold text-white mb-1">Step {step.step_number}: {step.title}</p>
                    {step.command && <p className="text-[10px] font-mono" style={{ color: MUTED }}>{step.command}</p>}
                    <p className="text-[10px] mt-1" style={{ color: MUTED }}>Est. {step.estimated_seconds || 0}s</p>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setSelectedPlan(null)} className="w-full px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Close</button>
          </Card>
        </div>
      )}
    </div>
  );
}