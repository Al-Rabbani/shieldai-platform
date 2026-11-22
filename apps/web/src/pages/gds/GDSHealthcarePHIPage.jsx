import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, Shield, HardDrive, Lock, AlertTriangle, Eye } from "lucide-react";
import { Card, Breadcrumb, Skeleton, EmptyState, AnimatedArc } from "@/components/gds/GDSOSShared";
import { HCBreadcrumb, HCBanner, HCBadge, HCStat, HC_PAGE_BG, HC_CARD, HC_TEAL, HC_RED, HC_ORANGE, HC_GREEN, HC_PURPLE, BORDER, MUTED, TEXT } from "@/components/gds/HealthcareSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSHealthcarePHIPage() {
  const { data: patientRecords = [], isLoading } = useQuery({ queryKey: ["hc-phi-records"], queryFn: () => base44.entities.PatientRecord.list().catch(() => []) });
  const { data: researchDatasets = [] } = useQuery({ queryKey: ["hc-research"], queryFn: () => base44.entities.ResearchDataset.list().catch(() => []) });

  const stats = {
    totalPHI: patientRecords.length,
    sensitivePHI: patientRecords.filter(r => r.data_classification === "sensitive_phi").length,
    unencrypted: patientRecords.filter(r => r.encryption_status === "unencrypted").length,
    nationStateInterest: researchDatasets.filter(d => d.nation_state_interest).length,
  };

  return (
    <div style={HC_PAGE_BG}>
      <HCBreadcrumb items={[{ label: "Patient Data Protection" }]} />
      <HCBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">PATIENT DATA PROTECTION CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-004 · PHI Security & Privacy</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={HC_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total PHI Records</p>
          <p className="text-3xl font-black" style={{ color: HC_TEAL }}>{stats.totalPHI}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Sensitive PHI</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.sensitivePHI}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.unencrypted > 0 ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Unencrypted</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.unencrypted}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_PURPLE}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Nation-State Interest</p>
          <p className="text-3xl font-black" style={{ color: HC_PURPLE }}>{stats.nationStateInterest}</p>
        </Card>
      </div>

      <Card className="p-5 mb-6" style={HC_CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Database className="w-4 h-4" style={{ color: HC_TEAL }} />Patient Records</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{patientRecords.length} records</span>
        </div>

        {isLoading ? <Skeleton lines={10} /> : patientRecords.length === 0 ? (
          <EmptyState icon={Database} title="No Records" description="No patient records registered" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                  <th className="pb-3">Record Type</th>
                  <th className="pb-3">Classification</th>
                  <th className="pb-3">Encryption</th>
                  <th className="pb-3">Backup</th>
                  <th className="pb-3">Breach Risk</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {patientRecords.slice(0, 50).map(r => (
                  <tr key={r.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                    <td className="py-3 font-bold text-white">{r.record_type}</td>
                    <td className="py-3"><HCBadge color={r.data_classification === "sensitive_phi" ? HC_RED : HC_TEAL}>{r.data_classification}</HCBadge></td>
                    <td className="py-3"><HCBadge color={r.encryption_status === "fully_encrypted" ? HC_GREEN : r.encryption_status === "unencrypted" ? HC_RED : HC_ORANGE}>{r.encryption_status}</HCBadge></td>
                    <td className="py-3"><HCBadge color={r.backup_status === "current" ? HC_GREEN : r.backup_status === "corrupted" || r.backup_status === "missing" ? HC_RED : HC_ORANGE}>{r.backup_status}</HCBadge></td>
                    <td className="py-3"><AnimatedArc score={r.breach_risk_score || 0} size={50} /></td>
                    <td className="py-3"><HCBadge color={HC_GREEN}>{r.status}</HCBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5" style={HC_CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><HardDrive className="w-4 h-4" style={{ color: HC_PURPLE }} />Research Datasets</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{researchDatasets.length} datasets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Dataset Name</th>
                <th className="pb-3">Data Type</th>
                <th className="pb-3">Records</th>
                <th className="pb-3">Contains PHI</th>
                <th className="pb-3">Nation State Interest</th>
                <th className="pb-3">Breach Risk</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {researchDatasets.slice(0, 30).map(d => (
                <tr key={d.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-bold text-white">{d.dataset_name}</td>
                  <td className="py-3"><HCBadge color={d.data_type === "genomic_sequences" ? HC_PURPLE : HC_TEAL}>{d.data_type}</HCBadge></td>
                  <td className="py-3 text-white">{(d.record_count || 0).toLocaleString()}</td>
                  <td className="py-3">{d.contains_phi ? <Shield className="w-4 h-4" style={{ color: HC_RED }} /> : "—"}</td>
                  <td className="py-3">{d.nation_state_interest ? <span className="text-[10px] font-bold" style={{ color: HC_RED }}>👑 HIGH VALUE</span> : "—"}</td>
                  <td className="py-3"><AnimatedArc score={d.breach_risk_score || 0} size={50} /></td>
                  <td className="py-3"><HCBadge color={HC_GREEN}>{d.status}</HCBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}