import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle } from "lucide-react";
import { Card, Breadcrumb, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

export default function GDSASMCriticalPage() {
  const { data: criticality = [] } = useQuery({ queryKey: ["asm-criticality"], queryFn: () => base44.entities.ASMAssetCriticality.list("-gds_risk_score", 200).catch(() => []) });
  const sorted = [...criticality].sort((a, b) => (b.gds_risk_score || 0) - (a.gds_risk_score || 0));

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }, { label: "Critical Assets", path: "/asm/critical" }]} />
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6" style={{ color: DANGER }} />
        <div><h1 className="text-2xl font-black text-white">Critical Assets</h1><p className="text-[10px] mt-0.5" style={{ color: MUTED }}>High-value assets sorted by risk score</p></div>
      </div>
      <Card className="p-5">
        {sorted.length === 0 ? <div className="text-center py-12" style={{ color: MUTED }}>No critical assets</div> : (
          <table className="w-full text-xs">
            <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>{["Asset", "Criticality", "Internet Exposure", "Attack Surface", "GDS Risk"].map(h => <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>)}</tr></thead>
            <tbody>
              {sorted.map(c => (
                <tr key={c.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td className="py-3 px-3"><p className="text-sm font-semibold text-white">{c.asset_name}</p></td>
                  <td className="py-3 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${c.business_criticality === 'critical' ? 'bg-red-400/15 text-red-400' : c.business_criticality === 'high' ? 'bg-orange-400/15 text-orange-400' : 'bg-yellow-400/15 text-yellow-400'}`}>{c.business_criticality}</span></td>
                  <td className="py-3 px-3"><p className="text-xs font-mono" style={{ color: c.internet_exposure_score >= 70 ? DANGER : MUTED }}>{c.internet_exposure_score || 0}</p></td>
                  <td className="py-3 px-3"><p className="text-xs font-mono" style={{ color: c.attack_surface_score >= 70 ? DANGER : MUTED }}>{c.attack_surface_score || 0}</p></td>
                  <td className="py-3 px-3"><p className="text-xs font-mono font-bold" style={{ color: c.gds_risk_score >= 70 ? DANGER : c.gds_risk_score >= 40 ? HIGH : MUTED }}>{c.gds_risk_score || 0}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}