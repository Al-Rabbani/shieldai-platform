import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Shield } from "lucide-react";
import { Card, Breadcrumb, BORDER, CYAN, DANGER, HIGH, MEDIUM, MUTED, TEXT } from "@/components/gds/GDSOSShared";

export default function GDSASShadowITPage() {
  const { data: shadowIT = [] } = useQuery({ queryKey: ["asm-shadow-it"], queryFn: () => base44.entities.ASMAsset.filter({ is_shadow_it: true }, "-created_date", 500).catch(() => []) });
  const highRisk = shadowIT.filter(a => (a.gds_risk_score || 0) >= 70).length;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }, { label: "Shadow IT", path: "/asm/shadow-it" }]} />
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6" style={{ color: DANGER }} />
        <div><h1 className="text-2xl font-black text-white">Shadow IT</h1><p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Unauthorized and unmanaged assets</p></div>
      </div>
      {shadowIT.length > 0 && <Card className="p-4 border-l-4" style={{ background: `${DANGER}08`, borderLeftColor: DANGER }}><div className="flex items-center gap-3"><AlertTriangle className="w-5 h-5" style={{ color: DANGER }} /><div><p className="text-sm font-bold" style={{ color: DANGER }}>{shadowIT.length} shadow IT assets detected</p><p className="text-[10px]" style={{ color: MUTED }}>Immediate review recommended</p></div></div></Card>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Shadow IT</p><p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{shadowIT.length}</p></Card>
        <Card className="p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High Risk</p><p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{highRisk}</p></Card>
        <Card className="p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Last Discovered</p><p className="text-lg font-black font-mono" style={{ color: CYAN }}>{shadowIT[0]?.first_discovered ? new Date(shadowIT[0].first_discovered).toLocaleDateString() : "—"}</p></Card>
      </div>
      <Card className="p-5">
        {shadowIT.length === 0 ? <div className="text-center py-12" style={{ color: MUTED }}>No shadow IT detected</div> : (
          <table className="w-full text-xs">
            <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>{["Asset", "Type", "Discovery Source", "First Discovered", "Risk Score"].map(h => <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>)}</tr></thead>
            <tbody>
              {shadowIT.map(a => (
                <tr key={a.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td className="py-3 px-3"><p className="text-sm font-semibold text-white">{a.asset_name}</p></td>
                  <td className="py-3 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>{a.asset_type}</span></td>
                  <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{a.discovery_source || "—"}</p></td>
                  <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{a.first_discovered ? new Date(a.first_discovered).toLocaleDateString() : "—"}</p></td>
                  <td className="py-3 px-3"><p className="text-xs font-mono" style={{ color: a.gds_risk_score >= 70 ? DANGER : a.gds_risk_score >= 40 ? HIGH : MUTED }}>{a.gds_risk_score || 0}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}