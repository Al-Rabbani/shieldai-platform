import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Eye, AlertTriangle, Shield, Database } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const ALERT_TYPE_COLORS = {
  ransomware_mention: DANGER, credential_exposure: HIGH, data_sale: "#f59e0b",
  infrastructure_sale: "#8b5cf6", breach_notification: "#ef4444"
};

export default function GDSThreatIntelDarkWebPage() {
  const { data: alerts = [], isLoading: loadA } = useQuery({
    queryKey: ["darkweb-alerts"], queryFn: () => base44.entities.DarkWebAlert.list("-detected_at", 100).catch(() => []),
  });

  const { data: leaks = [], isLoading: loadL } = useQuery({
    queryKey: ["credential-leaks"], queryFn: () => base44.entities.CredentialLeak.list("-detected_at", 50).catch(() => []),
  });

  const activeAlerts = alerts.filter(a => a.status === "active").length;
  const ransomwareMentions = alerts.filter(a => a.alert_type === "ransomware_mention").length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "Dark Web Intelligence" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Eye className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Dark Web Intelligence</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Dark web monitoring, credential leaks, and breach detection</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Alerts</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{activeAlerts}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Ransomware Mentions</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{ransomwareMentions}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Credential Leaks</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{leaks.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Breach Records</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{alerts.length}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
          <h3 className="text-sm font-bold text-white">Dark Web Alerts</h3>
        </div>
        {loadA ? <Skeleton lines={6} /> : alerts.length === 0 ? (
          <EmptyState icon={Eye} title="No dark web alerts" description="Dark web monitoring data will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Title", "Alert Type", "Severity", "Target", "Ransomware Group", "Source", "Affected Emails", "Affected Passwords", "Status", "Detected"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 50).map((alert) => {
                  const typeColor = ALERT_TYPE_COLORS[alert.alert_type] || MUTED;
                  return (
                    <tr key={alert.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-3"><p className="text-xs font-bold text-white">{alert.title}</p></td>
                      <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${typeColor}15`, color: typeColor }}>{alert.alert_type?.replace("_", " ")}</span></td>
                      <td className="py-3 px-3"><SevBadge sev={alert.severity} /></td>
                      <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{alert.target || "—"}</td>
                      <td className="py-3 px-3">{alert.ransomware_group ? <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>{alert.ransomware_group}</span> : <span style={{ color: MUTED }}>—</span>}</td>
                      <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{alert.source || "—"}</td>
                      <td className="py-3 px-3 text-xs font-bold" style={{ color: (alert.affected_emails_count || 0) > 0 ? DANGER : MUTED }}>{alert.affected_emails_count || 0}</td>
                      <td className="py-3 px-3 text-xs font-bold" style={{ color: (alert.affected_passwords_count || 0) > 0 ? DANGER : MUTED }}>{alert.affected_passwords_count || 0}</td>
                      <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${alert.status === "active" ? "bg-green-400/15 text-green-400" : alert.status === "investigating" ? "bg-yellow-400/15 text-yellow-400" : "bg-gray-400/15 text-gray-400"}`}>{alert.status}</span></td>
                      <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(alert.detected_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Credential Leaks</h3>
        </div>
        {loadL ? <Skeleton lines={4} /> : leaks.length === 0 ? (
          <EmptyState icon={Database} title="No credential leaks" description="Credential leak data will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Target Email", "Breach Name", "Leaked Passwords", "Severity", "Detected"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaks.slice(0, 30).map((leak) => (
                  <tr key={leak.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{leak.target_email || "—"}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{leak.breach_name || "—"}</td>
                    <td className="py-3 px-3 text-xs font-bold" style={{ color: leak.leaked_passwords_count > 1 ? DANGER : MUTED }}>{leak.leaked_passwords_count || 0}</td>
                    <td className="py-3 px-3"><SevBadge sev={leak.severity} /></td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(leak.detected_at)}</td>
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