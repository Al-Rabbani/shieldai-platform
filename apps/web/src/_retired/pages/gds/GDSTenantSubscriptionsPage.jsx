import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DollarSign, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function GDSTenantSubscriptionsPage() {
  const { data: metrics } = useQuery({
    queryKey: ["tenant-metrics"],
    queryFn: () => base44.functions.invoke("gdsTenantEngine", { action: "metrics" }).then(r => r.data.result),
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["tenant-subscriptions"],
    queryFn: () => base44.entities.TenantSubscription.filter({}, '-created_date', 50).catch(() => []),
  });

  const { data: recoveries } = useQuery({
    queryKey: ["tenant-recoveries"],
    queryFn: () => base44.entities.TenantRecoveryRecord.filter({}, '-created_date', 50).catch(() => []),
  });

  const mrr = metrics?.subscriptions?.mrr_usd || 0;
  const byPlan = metrics?.subscriptions?.by_plan || {};

  const planData = Object.entries(byPlan).map(([plan, count]) => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    value: count,
    color: plan === 'enterprise' ? '#8b5cf6' : plan === 'professional' ? '#3b82f6' : plan === 'starter' ? '#10b981' : plan === 'mssp' ? '#f59e0b' : '#64748b'
  }));

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Subscriptions & Recovery" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <DollarSign className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Subscriptions, Usage & Recovery</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Tenant subscriptions, usage tracking, and recovery operations</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
          <DollarSign className="w-4 h-4" style={{ color: LOW }} />
          <span className="text-sm font-black font-mono" style={{ color: LOW }}>${mrr.toLocaleString()}/mo MRR</span>
        </div>
      </div>

      {/* MRR Chart */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Subscription Distribution by Plan</h3>
        {planData.length === 0 ? (
          <EmptyState icon={DollarSign} title="No subscription data" description="Subscriptions will appear here after tenant provisioning" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={planData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="name" stroke={MUTED} fontSize={10} />
              <YAxis stroke={MUTED} fontSize={10} />
              <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {planData.map((entry, i) => <rect key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Subscriptions */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Subscriptions</h3>
        {subscriptions?.length === 0 ? (
          <EmptyState icon={DollarSign} title="No subscriptions" description="Tenant subscriptions will appear here" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions?.map(sub => (
              <Card key={sub.subscription_id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-mono font-bold text-white">{sub.tenant_id}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${sub.plan === 'enterprise' ? 'bg-purple-400/15 text-purple-400' : sub.plan === 'professional' ? 'bg-blue-400/15 text-blue-400' : sub.plan === 'starter' ? 'bg-green-400/15 text-green-400' : 'bg-gray-400/15 text-gray-400'}`}>{sub.plan}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${sub.status === 'active' ? 'bg-green-400/15 text-green-400' : sub.status === 'cancelled' ? 'bg-red-400/15 text-red-400' : 'bg-yellow-400/15 text-yellow-400'}`}>{sub.status}</span>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs"><span style={{ color: MUTED }}>Price</span><span className="font-bold" style={{ color: LOW }}>${sub.price_monthly_usd}/mo</span></div>
                  <div className="flex items-center justify-between text-xs"><span style={{ color: MUTED }}>Users</span><span className="font-bold" style={{ color: sub.users_used > sub.max_users ? DANGER : TEXT }}>{sub.users_used}/{sub.max_users}</span></div>
                  <div className="flex items-center justify-between text-xs"><span style={{ color: MUTED }}>Agents</span><span className="font-bold" style={{ color: sub.agents_used > sub.max_agents ? DANGER : TEXT }}>{sub.agents_used}/{sub.max_agents}</span></div>
                  <div className="flex items-center justify-between text-xs"><span style={{ color: MUTED }}>Scans</span><span className="font-bold" style={{ color: sub.scans_used > sub.max_scans ? DANGER : TEXT }}>{sub.scans_used}/{sub.max_scans}</span></div>
                  <div className="flex items-center justify-between text-xs"><span style={{ color: MUTED }}>API Calls</span><span className="font-bold" style={{ color: sub.api_calls_used > sub.max_api_calls ? DANGER : TEXT }}>{sub.api_calls_used}/{sub.max_api_calls}</span></div>
                </div>
                {sub.cancel_at_period_end && (
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>
                    <AlertTriangle className="w-3.5 h-3.5" style={{ color: DANGER }} />
                    <span className="text-[10px] font-bold" style={{ color: DANGER }}>Cancels at period end</span>
                  </div>
                )}
                <p className="text-[9px] mt-2 font-mono" style={{ color: MUTED }}>{sub.stripe_subscription_id}</p>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Recovery Records */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Recovery Operations</h3>
        {recoveries?.length === 0 ? (
          <EmptyState icon={RefreshCw} title="No recoveries" description="Tenant recovery operations will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Recovery ID", "Tenant", "Trigger", "Strategy", "Steps", "Duration", "Success", "Validated By", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recoveries?.map(rec => (
                  <tr key={rec.recovery_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{rec.recovery_id}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: CYAN }}>{rec.tenant_id}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${rec.trigger_reason === 'isolation_breach' ? 'bg-red-400/15 text-red-400' : 'bg-orange-400/15 text-orange-400'}`}>{rec.trigger_reason}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rec.recovery_strategy}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rec.steps_completed}/{rec.total_steps}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{rec.duration_ms}ms</td>
                    <td className="py-2 px-3">{rec.success ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <AlertTriangle className="w-3.5 h-3.5" style={{ color: DANGER }} />}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rec.validated_by || "—"}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${rec.status === 'completed' ? 'bg-green-400/15 text-green-400' : rec.status === 'failed' ? 'bg-red-400/15 text-red-400' : 'bg-orange-400/15 text-orange-400'}`}>{rec.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}