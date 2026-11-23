import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Scale, Clock, AlertTriangle, FileText } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const REGULATION_COLORS = {
  GDPR: "#3b82f6", NIS2: "#10b981", DORA: DANGER, HIPAA: "#a855f7",
  PCI_DSS: "#f97316", SOX: "#eab308", CCPA: CYAN, other: MUTED
};

const STATUS_COLORS = { draft: MUTED, legal_review: HIGH, pending_submission: "#f97316", submitted: LOW, acknowledged: CYAN };

function RegulatoryCountdown({ deadline, regulation }) {
  if (!deadline) return <span className="text-[10px]" style={{ color: MUTED }}>No deadline</span>;
  const now = new Date();
  const dl = new Date(deadline);
  const hoursLeft = (dl - now) / (1000 * 60 * 60);
  const isBreached = hoursLeft < 0;
  const threshold = regulation === "GDPR" ? 48 : regulation === "NIS2" ? 12 : regulation === "DORA" ? 2 : 24;
  const isCritical = hoursLeft < threshold;
  const color = isBreached ? DANGER : isCritical ? HIGH : MEDIUM;
  const text = isBreached ? `BREACHED` : hoursLeft < 1 ? `${Math.round(hoursLeft * 60)}m` : `${Math.round(hoursLeft)}h`;
  return <span className={`text-[10px] font-bold ${isBreached || isCritical ? 'animate-pulse' : ''}`} style={{ color }}>{text}</span>;
}

export default function GDSDFIRRegulatoryPage() {
  const [selectedNotification, setSelectedNotification] = useState(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["dfir-regulatory-notifications"],
    queryFn: () => base44.entities.RegulatoryNotification.list("-deadline", 100).catch(() => []),
  });

  const stats = {
    required: notifications.filter(n => n.status !== "submitted" && n.status !== "acknowledged").length,
    submitted: notifications.filter(n => n.status === "submitted" || n.status === "acknowledged").length,
    gdprDue: notifications.filter(n => n.regulation === "GDPR" && n.deadline && new Date(n.deadline) < new Date(Date.now() + 48 * 60 * 60 * 1000)).length,
    nis2Due: notifications.filter(n => n.regulation === "NIS2" && n.deadline && new Date(n.deadline) < new Date(Date.now() + 12 * 60 * 60 * 1000)).length,
    doraDue: notifications.filter(n => n.regulation === "DORA" && n.deadline && new Date(n.deadline) < new Date(Date.now() + 2 * 60 * 60 * 1000)).length
  };

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Incident Response", path: "/dfir" }, { label: "Regulatory Notifications" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Scale className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Regulatory Notification Center</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Compliance deadline tracking</p>
          </div>
        </div>
      </div>

      {/* Deadline Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Required</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.required}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Submitted</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.submitted}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>GDPR (&lt;48h)</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.gdprDue}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>NIS2 (&lt;12h)</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.nis2Due}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>DORA (&lt;2h)</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.doraDue}</p>
        </Card>
      </div>

      {/* Notifications Table */}
      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : notifications.length === 0 ? (
          <EmptyState icon={Scale} title="No regulatory notifications" description="Regulatory notifications will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Regulation", "Authority", "Deadline", "Data Subjects", "PII Types", "Cross-Border", "Penalty Risk", "Legal Review", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notifications.map((notif) => {
                  const regColor = REGULATION_COLORS[notif.regulation] || REGULATION_COLORS.other;
                  const statusColor = STATUS_COLORS[notif.status] || STATUS_COLORS.draft;
                  return (
                    <tr key={notif.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5 cursor-pointer" onClick={() => setSelectedNotification(notif)}>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${regColor}15`, color: regColor }}>{notif.regulation || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-white max-w-xs truncate">{notif.authority_name || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <RegulatoryCountdown deadline={notif.deadline} regulation={notif.regulation} />
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{notif.data_subjects_affected?.toLocaleString() || 0}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {(notif.pii_types || []).slice(0, 3).map((pii, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.1)", color: TEXT }}>{pii}</span>
                          ))}
                          {(notif.pii_types || []).length > 3 && <span className="text-[9px]" style={{ color: MUTED }}>+{notif.pii_types.length - 3}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {notif.cross_border ? <AlertTriangle className="w-4 h-4" style={{ color: HIGH }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-mono" style={{ color: notif.penalty_risk_eur > 1000000 ? DANGER : TEXT }}>€{(notif.penalty_risk_eur || 0).toLocaleString()}</p>
                      </td>
                      <td className="py-3 px-4">
                        {notif.legal_review_required ? <Scale className="w-4 h-4" style={{ color: MEDIUM }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: statusColor, background: `${statusColor}15` }}>{notif.status || "draft"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>View →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#0a1628" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedNotification.regulation} Notification</h3>
                <p className="text-[10px]" style={{ color: MUTED }}>{selectedNotification.authority_name}</p>
              </div>
              <button onClick={() => setSelectedNotification(null)} className="text-slate-400 hover:text-white"><span className="text-2xl">×</span></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Deadline</p>
                <RegulatoryCountdown deadline={selectedNotification.deadline} regulation={selectedNotification.regulation} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Data Subjects</p>
                <p className="text-sm font-bold" style={{ color: TEXT }}>{selectedNotification.data_subjects_affected?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Penalty Risk</p>
                <p className="text-sm font-bold" style={{ color: DANGER }}>€{(selectedNotification.penalty_risk_eur || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Status</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: STATUS_COLORS[selectedNotification.status], background: `${STATUS_COLORS[selectedNotification.status]}15` }}>{selectedNotification.status}</span>
              </div>
            </div>
            {selectedNotification.notification_content && (
              <div className="mb-4">
                <p className="text-xs font-bold mb-2" style={{ color: CYAN }}>Notification Content</p>
                <textarea readOnly value={selectedNotification.notification_content} rows={6} className="w-full p-3 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setSelectedNotification(null)} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Close</button>
              {selectedNotification.status !== "submitted" && (
                <button className="flex-1 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>Submit Notification</button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}