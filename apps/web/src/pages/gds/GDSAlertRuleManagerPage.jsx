import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Plus, Save, Mail, MessageSquare, Phone, Bell as BellIcon } from "lucide-react";
import { CARD, BORDER, CYAN, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSAlertRuleManagerPage() {
  const [formData, setFormData] = useState({
    rule_name: "",
    rule_type: "severity",
    entity_name: "Finding",
    condition_field: "severity",
    condition_operator: "equals",
    condition_value: "critical",
    severity: "critical",
    notification_channels: ["email"]
  });

  const { data: rules, isLoading, refetch } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: () => base44.entities.AlertRule.filter({ is_active: true }, '-created_date', 50).catch(() => []),
    refetchInterval: 60000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsNotificationEngine", { action: 'create_rule', ...data }),
    onSuccess: () => {
      refetch();
      setFormData({ rule_name: "", rule_type: "severity", entity_name: "Finding", condition_field: "severity", condition_operator: "equals", condition_value: "critical", severity: "critical", notification_channels: ["email"] });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createMutation.mutateAsync(formData);
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Alert Rule Manager" }]} />

      <div className="flex items-start gap-3 mb-6">
        <Bell className="w-6 h-6" style={{ color: CYAN }} />
        <div>
          <h1 className="text-2xl font-black text-white">Alert Rule Manager</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Create and manage automated alert rules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-bold text-white mb-4">Create New Rule</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-white block mb-2">Rule Name</label>
              <input
                required
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                placeholder="e.g., Critical Finding Alert"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-white block mb-2">Rule Type</label>
                <select
                  value={formData.rule_type}
                  onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  <option value="severity">Severity</option>
                  <option value="threshold">Threshold</option>
                  <option value="compliance">Compliance</option>
                  <option value="anomaly">Anomaly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-white block mb-2">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white block mb-2">Entity</label>
              <input
                value={formData.entity_name}
                onChange={(e) => setFormData({ ...formData, entity_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                placeholder="e.g., Finding, Vulnerability"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-white block mb-2">Field</label>
                <input
                  value={formData.condition_field}
                  onChange={(e) => setFormData({ ...formData, condition_field: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                  placeholder="severity"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white block mb-2">Operator</label>
                <select
                  value={formData.condition_operator}
                  onChange={(e) => setFormData({ ...formData, condition_operator: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="gt">Greater Than</option>
                  <option value="gte">GTE</option>
                  <option value="lt">Less Than</option>
                  <option value="lte">LTE</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-white block mb-2">Value</label>
                <input
                  value={formData.condition_value}
                  onChange={(e) => setFormData({ ...formData, condition_value: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                  placeholder="critical"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white block mb-2">Notification Channels</label>
              <div className="flex gap-2">
                {['email', 'slack', 'webhook'].map(channel => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => {
                      const channels = formData.notification_channels.includes(channel)
                        ? formData.notification_channels.filter(c => c !== channel)
                        : [...formData.notification_channels, channel];
                      setFormData({ ...formData, notification_channels: channels });
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      formData.notification_channels.includes(channel)
                        ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400'
                        : 'bg-white/5 border-border text-muted'
                    }`}
                    style={{ border: `1px solid ${formData.notification_channels.includes(channel) ? CYAN + "40" : BORDER}` }}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              style={{
                background: createMutation.isPending ? "rgba(255,255,255,0.1)" : `${CYAN}15`,
                border: `1px solid ${CYAN}40`,
                color: createMutation.isPending ? MUTED : CYAN
              }}
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: CYAN }} />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Alert Rule
                </>
              )}
            </button>
          </form>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold text-white mb-4">Active Rules</h3>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
              ))}
            </div>
          ) : rules?.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: MUTED }} />
              <p className="text-sm font-bold" style={{ color: MUTED }}>No active rules</p>
              <p className="text-[10px]" style={{ color: MUTED }}>Create your first alert rule</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules?.map(rule => (
                <div key={rule.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-white">{rule.rule_name}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      rule.severity === 'critical' ? 'bg-red-400/15 text-red-400' :
                      rule.severity === 'high' ? 'bg-orange-400/15 text-orange-400' :
                      'bg-yellow-400/15 text-yellow-400'
                    }`}>{rule.severity}</span>
                  </div>
                  <p className="text-[10px]" style={{ color: MUTED }}>
                    {rule.entity_name}.{rule.condition_field} {rule.condition_operator} {rule.condition_value}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {rule.notification_channels?.map(channel => (
                      <span key={channel} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>{channel}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}