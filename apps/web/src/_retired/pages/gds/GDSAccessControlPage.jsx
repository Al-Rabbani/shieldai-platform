import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Activity, Lock, TrendingUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const DECISION_COLORS = {
  allow: LOW,
  deny: DANGER,
  approval_required: HIGH,
  escalate: "#f97316",
  read_only: "#3b82f6"
};

export default function GDSAccessControlPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["rbac-metrics"],
    queryFn: () => base44.functions.invoke("gdsRBACEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: decisions } = useQuery({
    queryKey: ["rbac-decisions"],
    queryFn: () => base44.entities.AccessDecision.filter({}, '-created_date', 15).catch(() => []),
    refetchInterval: 15000,
  });

  const m = metrics || {};
  const decisionsData = [
    { name: 'Allowed', value: m.decisions?.allow || 0, color: DECISION_COLORS.allow },
    { name: 'Denied', value: m.decisions?.deny || 0, color: DECISION_COLORS.deny },
    { name: 'Approval', value: m.decisions?.approval || 0, color: DECISION_COLORS.approval_required },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Enterprise RBAC & ABAC Platform" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Enterprise RBAC & ABAC Platform</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>16-stage pipeline · RBAC + ABAC + Zero Trust + Policy · SOD detection · Entitlement analytics</p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#a855f7", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>EDP-013 v1.0</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Evaluations</p>
          <p className="text-xl font-black font-mono" style={{ color: TEXT }}>{m.decisions?.total ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Allowed</p>
          <p className="text-xl font-black font-mono" style={{ color: LOW }}>{m.decisions?.allow ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Denied</p>
          <p className="text-xl font-black font-mono" style={{ color: DANGER }}>{m.decisions?.deny ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Approval Required</p>
          <p className="text-xl font-black font-mono" style={{ color: HIGH }}>{m.decisions?.approval ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Roles</p>
          <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{m.roles?.total ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Permissions</p>
          <p className="text-xl font-black font-mono" style={{ color: "#60a5fa" }}>{m.roles?.total ? m.roles.total * 5 : 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Privilege Conflicts</p>
          <p className="text-xl font-black font-mono" style={{ color: (m.conflicts?.critical || 0) > 0 ? DANGER : MUTED }}>{m.conflicts?.active ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Excessive Entitlements</p>
          <p className="text-xl font-black font-mono" style={{ color: (m.entitlements?.excessive || 0) > 0 ? HIGH : MUTED }}>{m.entitlements?.excessive ?? 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Decision Breakdown</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Access decision distribution</p>
          </div>
          {decisionsData.length === 0 ? (
            <EmptyState icon={Activity} title="No decisions yet" description="Access decisions will appear here" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={decisionsData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                  {decisionsData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Platform Summary</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>RBAC + ABAC platform overview</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${BORDER}` }}>
              <span className="text-xs font-bold" style={{ color: TEXT }}>System Roles</span>
              <span className="text-sm font-black" style={{ color: CYAN }}>{m.roles?.system ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${BORDER}` }}>
              <span className="text-xs font-bold" style={{ color: TEXT }}>Custom Roles</span>
              <span className="text-sm font-black" style={{ color: CYAN }}>{m.roles?.custom ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,59,59,0.05)", border: `1px solid ${BORDER}` }}>
              <span className="text-xs font-bold" style={{ color: TEXT }}>Critical Conflicts</span>
              <span className="text-sm font-black" style={{ color: DANGER }}>{m.conflicts?.critical ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,140,0,0.05)", border: `1px solid ${BORDER}` }}>
              <span className="text-xs font-bold" style={{ color: TEXT }}>Flagged Entitlements</span>
              <span className="text-sm font-black" style={{ color: HIGH }}>{m.entitlements?.flagged ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Recent Access Decisions</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Latest access control evaluations</p>
        </div>
        {isLoading ? <Skeleton lines={8} /> : decisions?.length === 0 ? (
          <EmptyState icon={Lock} title="No decisions yet" description="Access decisions will appear here after evaluation" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Actor", "Type", "Resource", "Action", "Decision", "RBAC", "ABAC", "ZT Score", "Risk", "Pipeline", "Eval Time", "Created"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisions?.map((dec, i) => {
                  const decisionColor = DECISION_COLORS[dec.decision] || MUTED;
                  return (
                    <tr key={dec.decision_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{dec.actor_id || '—'}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{dec.actor_type || 'user'}</span>
                      </td>
                      <td className="py-2 px-3 text-[10px] max-w-[120px] truncate" style={{ color: TEXT }}>{dec.resource_id || '—'}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: CYAN, background: `${CYAN}15` }}>{dec.action || 'read'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded capitalize font-bold"
                          style={{ color: decisionColor, background: `${decisionColor}15`, border: `1px solid ${decisionColor}30` }}>
                          {dec.decision?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${dec.rbac_result === 'pass' ? 'bg-green-400/15 text-green-400' : dec.rbac_result === 'fail' ? 'bg-red-400/15 text-red-400' : 'bg-yellow-400/15 text-yellow-400'}`}>
                          {dec.rbac_result || '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${dec.abac_result === 'pass' ? 'bg-green-400/15 text-green-400' : dec.abac_result === 'fail' ? 'bg-red-400/15 text-red-400' : 'bg-yellow-400/15 text-yellow-400'}`}>
                          {dec.abac_result || '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <div className="w-8 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${dec.zero_trust_score || 0}%`, background: dec.zero_trust_score >= 70 ? LOW : dec.zero_trust_score >= 40 ? HIGH : DANGER }} />
                          </div>
                          <span className="text-[9px] font-bold" style={{ color: TEXT }}>{dec.zero_trust_score || 0}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                          style={{ color: dec.risk_level === 'critical' ? DANGER : dec.risk_level === 'high' ? HIGH : 'text-yellow-400', background: "rgba(255,255,255,0.04)" }}>
                          {dec.risk_level || 'low'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{dec.pipeline_stages_complete ?? 0} / 16</td>
                      <td className="py-2 px-3 text-[10px] font-mono" style={{ color: MUTED }}>{dec.evaluation_ms ?? 0}ms</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(dec.created_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}