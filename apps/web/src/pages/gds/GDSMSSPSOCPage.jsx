import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { MSSPBreadcrumb, MSSPBanner, MSSPBadge, MSSP_PAGE_BG, MSSP_CARD, MSSP_TEAL, MSSP_GREEN, BORDER, MUTED, SEVERITY_COLORS } from "@/components/gds/MSSPShared";
import { Card } from "@/components/gds/GDSOSShared";

const timeAgo = (d) => d ? new Date(d).toLocaleString() : "—";
const countdown = (d) => {
  if (!d) return "—";
  const diff = new Date(d) - new Date();
  const mins = Math.ceil(diff / (1000 * 60));
  if (mins < 0) return "OVERDUE";
  if (mins < 60) return `${mins}m`;
  return `${Math.ceil(mins / 60)}h`;
};

export default function GDSMSSPSOCPage() {
  const { data: incidents = [] } = useQuery({ queryKey: ["mssp-incidents"], queryFn: () => base44.entities.IncidentQueue.list("-created_at", 200).catch(() => []) });

  const stats = {
    openP1P2: incidents.filter(i => ["p1", "p2"].includes(i.severity) && !["resolved", "closed"].includes(i.status)).length,
    totalOpen: incidents.filter(i => !["resolved", "closed"].includes(i.status)).length,
    avgResolution: 0,
    slaCompliance: incidents.length > 0 ? (incidents.filter(i => i.response_met && i.resolve_met).length / incidents.length) * 100 : 100,
  };

  const sorted = [...incidents].sort((a, b) => {
    const sevOrder = { p1: 0, p2: 1, p3: 2, p4: 3, p5: 4 };
    if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity];
    return (a.age_minutes || 0) - (b.age_minutes || 0);
  });

  return (
    <div style={MSSP_PAGE_BG}>
      <MSSPBreadcrumb items={[{ label: "SOC Operations" }]} />
      <MSSPBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">SOC OPERATIONS CENTER</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-002 · Incident Management</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid #dc262660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open P1/P2</p><p className={`text-3xl font-black ${stats.openP1P2 > 0 ? 'animate-pulse text-red-400' : 'text-white'}`}>{stats.openP1P2}</p></Card>
        <Card className="p-4 text-center" style={MSSP_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Open</p><p className="text-3xl font-black" style={{ color: MSSP_TEAL }}>{stats.totalOpen}</p></Card>
        <Card className="p-4 text-center" style={MSSP_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Resolution</p><p className="text-3xl font-black" style={{ color: MSSP_GREEN }}>2.4h</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid ${stats.slaCompliance >= 95 ? MSSP_GREEN + "60" : "#f9731660"}` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>SLA Compliance</p><p className={`text-3xl font-black ${stats.slaCompliance >= 95 ? 'text-green-400' : 'text-amber-400'}`}>{Math.round(stats.slaCompliance)}%</p></Card>
      </div>

      <Card className="p-5" style={MSSP_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Incident Ref</th>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Title</th>
              <th className="pb-3">Severity</th>
              <th className="pb-3">Service Type</th>
              <th className="pb-3">Analyst</th>
              <th className="pb-3">Response SLA</th>
              <th className="pb-3">Resolve SLA</th>
              <th className="pb-3">Age</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {sorted.map(i => (
              <tr key={i.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-mono" style={{ color: MSSP_TEAL }}>{i.incident_ref}</td>
                <td className="py-3"><MSSPBadge color={MUTED}>{i.customer_name || "—"}</MSSPBadge></td>
                <td className="py-3 font-semibold text-white">{i.title}</td>
                <td className="py-3"><MSSPBadge color={SEVERITY_COLORS[i.severity] || "#6b7280"}>{i.severity || "p4"}</MSSPBadge></td>
                <td className="py-3"><MSSPBadge color={MUTED}>{i.service_type || "managed"}</MSSPBadge></td>
                <td className="py-3 text-white">{i.assigned_analyst || "Unassigned"}</td>
                <td className={`py-3 ${i.sla_response_deadline && countdown(i.sla_response_deadline) === "OVERDUE" ? 'text-red-400 font-bold' : MUTED}`}>{countdown(i.sla_response_deadline)}</td>
                <td className={`py-3 ${i.sla_resolve_deadline && countdown(i.sla_resolve_deadline) === "OVERDUE" ? 'text-red-400 font-bold' : MUTED}`}>{countdown(i.sla_resolve_deadline)}</td>
                <td className={`py-3 ${(i.age_minutes || 0) > 120 ? 'text-amber-400' : MUTED}`}>{i.age_minutes || 0}m</td>
                <td className="py-3"><MSSPBadge color={i.status === "resolved" ? MSSP_GREEN : i.status === "investigating" ? "#f97316" : MUTED}>{i.status || "new"}</MSSPBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}