import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { ExecutiveBreadcrumb, BoardConfidentialBanner, ExecutiveBadge, EXECUTIVE_PAGE_BG, GOLD, CARD_BG, BORDER, MUTED } from "@/components/gds/ExecutiveShared";
import { Card } from "@/components/gds/GDSOSShared";

const GRADE_COLORS = { "A+": "#B8860B", "A": "#10B981", "B+": "#0EA5E9", "B": "#F59E0B", "C": "#F97316", "F": "#EF4444" };

export default function GDSCertificationCenterPage() {
  const { data: certs = [] } = useQuery({ queryKey: ["certifications"], queryFn: () => base44.entities.Certification.list("-certified_at", 100).catch(() => []) });
  
  const stats = { total: certs.length, gradeA: certs.filter(c => ["A+", "A"].includes(c.grade)).length, expiring: certs.filter(c => c.expires_at && new Date(c.expires_at) < new Date(Date.now() + 60*24*60*60*1000)).length, failed: certs.filter(c => c.status === "failed").length };

  return (
    <div style={EXECUTIVE_PAGE_BG}>
      <ExecutiveBreadcrumb items={[{ label: "Certification Center" }]} />
      <BoardConfidentialBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Certification Center</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>AI Certification Pipeline & Quality Assurance</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Certified</p><p className="text-3xl font-black" style={{ color: GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #10B98130` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Grade A+/A</p><p className="text-3xl font-black text-green-400">{stats.gradeA}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #F9731630` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Expiring Soon</p><p className="text-3xl font-black" style={{ color: "#F97316" }}>{stats.expiring}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #EF444430` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Failed</p><p className="text-3xl font-black text-red-400">{stats.failed}</p></Card>
      </div>

      <Card className="p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Item</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Publisher</th>
              <th className="pb-3">Cert Type</th>
              <th className="pb-3">Security</th>
              <th className="pb-3">Overall</th>
              <th className="pb-3">Grade</th>
              <th className="pb-3">Issues</th>
              <th className="pb-3">Expires</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {certs.map(cert => (
              <tr key={cert.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-semibold text-white">{cert.item_name}</td>
                <td className="py-3"><ExecutiveBadge color={GOLD}>{cert.item_type}</ExecutiveBadge></td>
                <td className="py-3" style={{ color: MUTED }}>{cert.publisher_name}</td>
                <td className="py-3"><ExecutiveBadge color={cert.certification_type === "elite" ? "#F59E0B" : cert.certification_type === "government" ? "#A855F7" : "#10B981"}>{cert.certification_type}</ExecutiveBadge></td>
                <td className="py-3"><div className="w-16 h-2 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${cert.security_score || 0}%`, background: (cert.security_score || 0) >= 80 ? "#10B981" : (cert.security_score || 0) >= 60 ? "#F59E0B" : "#EF4444" }} /></div></td>
                <td className="py-3"><div className="w-16 h-2 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${cert.overall_score || 0}%`, background: (cert.overall_score || 0) >= 80 ? "#10B981" : (cert.overall_score || 0) >= 60 ? "#F59E0B" : "#EF4444" }} /></div></td>
                <td className="py-3"><ExecutiveBadge color={GRADE_COLORS[cert.grade] || MUTED}>{cert.grade || "N/A"}</ExecutiveBadge></td>
                <td className="py-3">{cert.issues_found > 0 ? <span className="text-red-400">{cert.issues_found}</span> : <CheckCircle className="w-4 h-4 text-green-400" />}</td>
                <td className="py-3" style={{ color: cert.expires_at && new Date(cert.expires_at) < new Date(Date.now() + 60*24*60*60*1000) ? "#F97316" : MUTED }}>{cert.expires_at ? new Date(cert.expires_at).toLocaleDateString() : "—"}</td>
                <td className="py-3"><ExecutiveBadge color={cert.status === "passed" ? "#10B981" : cert.status === "failed" ? "#EF4444" : "#F59E0B"}>{cert.status}</ExecutiveBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}