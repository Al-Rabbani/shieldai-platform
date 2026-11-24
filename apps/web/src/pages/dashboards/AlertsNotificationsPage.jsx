import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DashboardPage, StatTile, SectionCard, SeverityBadge, StatusBadge, LoadingSpinner, EmptyState, Tag } from "@/components/dashboards/DashboardShared";
import { Bell, AlertTriangle, ArrowUp, Settings } from "lucide-react";

export default function AlertsNotificationsPage() {
  const [rules, setRules] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.AlertRule.list().catch(() => []),
      base44.entities.NotificationDispatch.list("-sent_at", 20).catch(() => []),
      base44.entities.EscalationPolicy.list().catch(() => []),
      base44.entities.NotificationPreference.list().catch(() => []),
    ]).then(([r, d, e, p]) => {
      setRules(r); setDispatches(d); setEscalations(e); setPrefs(p); setLoading(false);
    });
  }, []);

  if (loading) return <DashboardPage title="Alerts & Notifications" badge="EDP-019"><LoadingSpinner /></DashboardPage>;

  const activeRules = rules.filter(r => r.is_active).length;

  return (
    <DashboardPage title="Alerts & Notifications" badge="EDP-019" subtitle="Alert rules, notification dispatches, escalation policies, and user preferences">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Bell} label="Alert Rules" value={rules.length} sublabel={`${activeRules} active`} accent="#3b82f6" />
        <StatTile icon={AlertTriangle} label="Active Rules" value={activeRules} sublabel={`${rules.length - activeRules} disabled`} accent="#10b981" />
        <StatTile icon={ArrowUp} label="Notifications Dispatched" value={dispatches.length} sublabel={`${dispatches.filter(d => d.status === "delivered").length} delivered`} accent="#f59e0b" />
        <StatTile icon={Settings} label="Escalation Policies" value={escalations.length} sublabel={`${escalations.filter(e => e.is_active).length} active`} accent="#8b5cf6" />
      </div>

      <SectionCard title="Alert Rules">
        {rules.length === 0 ? <EmptyState message="No alert rules configured" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-2 px-3">Rule</th><th className="text-left py-2 px-3">Entity</th><th className="text-left py-2 px-3">Condition</th><th className="text-left py-2 px-3">Severity</th><th className="text-left py-2 px-3">Channels</th><th className="text-left py-2 px-3">Fires</th><th className="text-left py-2 px-3">Active</th>
              </tr></thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id} className="border-b border-slate-800 hover:bg-blue-500/5">
                    <td className="py-2 px-3 text-white font-medium">{r.rule_name}</td>
                    <td className="py-2 px-3 text-slate-400">{r.entity_name}</td>
                    <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{r.condition_field} {r.condition_operator} {r.condition_value}</td>
                    <td className="py-2 px-3"><SeverityBadge severity={r.severity} /></td>
                    <td className="py-2 px-3"><div className="flex flex-wrap gap-1">{(r.notification_channels || []).map((ch, i) => <Tag key={i}>{ch}</Tag>)}</div></td>
                    <td className="py-2 px-3 text-slate-400">{r.trigger_count}</td>
                    <td className="py-2 px-3"><span className={`w-2 h-2 rounded-full inline-block ${r.is_active ? "bg-emerald-500" : "bg-slate-600"}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Recent Notifications">
          {dispatches.length === 0 ? <EmptyState message="No notifications dispatched" /> : (
            <div className="space-y-2">
              {dispatches.map(d => (
                <div key={d.id} className="rounded-lg p-3 flex items-start gap-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <Tag>{d.channel}</Tag>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{d.subject || d.message?.slice(0, 60)}</p>
                    <p className="text-[10px] text-slate-500">To: {d.recipient} · {d.sent_at ? new Date(d.sent_at).toLocaleString() : ""}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Escalation Policies">
          {escalations.length === 0 ? <EmptyState message="No escalation policies" /> : (
            <div className="space-y-3">
              {escalations.map(e => (
                <div key={e.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-white flex-1">{e.policy_name}</p>
                    <span className={`w-2 h-2 rounded-full ${e.is_active ? "bg-emerald-500" : "bg-slate-600"}`} />
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2">Triggers after {e.escalation_threshold_minutes} min · {e.trigger_count} triggers</p>
                  <div className="flex items-center gap-1">
                    {(e.escalation_levels || []).map((lvl, i) => (
                      <React.Fragment key={i}>
                        <div className="flex-1 text-center px-2 py-1 rounded text-[9px] font-medium" style={{ background: "#1F2937", color: "#94a3b8" }}>
                          L{i + 1}: {lvl.target || lvl.channel || ""}
                        </div>
                        {i < (e.escalation_levels || []).length - 1 && <ArrowUp size={12} className="text-slate-600" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Notification Preferences">
        {prefs.length === 0 ? <EmptyState message={absentStoreReason("NotificationPreference")} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {prefs.map(p => (
              <div key={p.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <p className="text-[10px] text-slate-500 mb-2">User: {p.user_id}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {p.email_enabled && <Tag>Email</Tag>}
                  {p.slack_enabled && <Tag>Slack</Tag>}
                  {p.sms_enabled && <Tag>SMS</Tag>}
                  {p.push_enabled && <Tag>Push</Tag>}
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  <p>Digest: {p.digest_frequency}</p>
                  {(p.severity_filter || []).length > 0 && <p>Min severity: {p.severity_filter.join(", ")}</p>}
                  {p.quiet_hours_start && <p>Quiet hours: {p.quiet_hours_start} - {p.quiet_hours_end}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </DashboardPage>
  );
}