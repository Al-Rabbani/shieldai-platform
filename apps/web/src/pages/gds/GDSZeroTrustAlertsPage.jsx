import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Check, Clock, Download, Filter, CheckCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";
import { toast } from "sonner";

const SEVERITY_COLORS = {
  critical: DANGER,
  high: HIGH,
  medium: MEDIUM,
  low: LOW
};

export default function GDSZeroTrustAlertsPage() {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const qc = useQueryClient();

  const { data: alertsData, isLoading, refetch } = useQuery({
    queryKey: ["zt-alerts", severityFilter, showAcknowledged],
    queryFn: () => base44.entities.ZeroTrustAlert.filter(
      {
        ...(severityFilter !== "all" && { severity: severityFilter }),
        ...(showAcknowledged === false && { acknowledged_at: null })
      },
      '-created_date'
    ).catch(() => []),
    refetchInterval: 15000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alert_id) => base44.entities.ZeroTrustAlert.update(alert_id, { acknowledged_at: new Date().toISOString(), status: 'acknowledged' }),
    onSuccess: () => {
      toast.success("Alert acknowledged");
      refetch();
    }
  });
  
  const alerts = alertsData || [];
  
  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    unacknowledged: alerts.filter(a => !a.acknowledged_at).length
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Zero Trust Alerts" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Bell className="w-6 h-6" style={{ color: DANGER }} />
          <h1 className="text-2xl font-black text-white">Zero Trust Alert Center</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>REAL-TIME</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
            <Clock className="w-4 h-4" />
            Refresh
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Alerts</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.critical}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.high}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Medium</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{stats.medium}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Unacknowledged</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.unacknowledged > 0 ? DANGER : LOW }}>{stats.unacknowledged}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" style={{ color: MUTED }} />
            <span className="text-xs font-bold" style={{ color: MUTED }}>Severity:</span>
            {["all", "critical", "high", "medium", "low"].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${severityFilter === sev ? 'ring-2' : ''}`}
                style={{ 
                  background: severityFilter === sev ? `${SEVERITY_COLORS[sev] || MUTED}20` : "rgba(255,255,255,0.04)",
                  color: severityFilter === sev ? SEVERITY_COLORS[sev] || MUTED : MUTED,
                  borderColor: SEVERITY_COLORS[sev] || MUTED
                }}>
                {sev.charAt(0).toUpperCase() + sev.slice(1)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-bold" style={{ color: MUTED }}>
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={e => setShowAcknowledged(e.target.checked)}
              className="rounded"
              style={{ accentColor: CYAN }}
            />
            Show Acknowledged
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Alert Feed</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time policy violation alerts</p>
        </div>
        {isLoading ? <Skeleton lines={8} /> : alerts.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No alerts" description="No policy violations detected" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Severity", "Type", "Actor", "Resource", "Policy", "Trust Score", "Status", "Created", "Actions"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, i) => {
                  const sevColor = SEVERITY_COLORS[alert.severity] || MUTED;
                  return (
                    <tr key={alert.alert_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                          style={{ color: sevColor, background: `${sevColor}15`, border: `1px solid ${sevColor}30` }}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{alert.alert_type?.replace(/_/g, ' ')}</td>
                      <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{alert.actor_id || '—'}</td>
                      <td className="py-2 px-3 text-[10px] max-w-[150px] truncate" style={{ color: TEXT }}>{alert.resource || '—'}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{alert.policy_applied || '—'}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${alert.trust_score || 0}%`, background: alert.trust_score >= 70 ? LOW : alert.trust_score >= 40 ? HIGH : DANGER }} />
                          </div>
                          <span className="text-[9px] font-bold" style={{ color: TEXT }}>{alert.trust_score || 0}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {alert.acknowledged_at ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1" style={{ color: LOW, background: `${LOW}15` }}>
                            <Check className="w-3 h-3" />
                            Acknowledged
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: HIGH, background: `${HIGH}15` }}>Pending</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(alert.created_date)}</td>
                      <td className="py-2 px-3">
                        {!alert.acknowledged_at && (
                          <button
                            onClick={() => acknowledgeMutation.mutate(alert.id)}
                            className="text-[10px] px-2 py-1 rounded transition-all hover:opacity-80"
                            style={{ color: LOW, background: `${LOW}15`, border: `1px solid ${LOW}30` }}>
                            Acknowledge
                          </button>
                        )}
                      </td>
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