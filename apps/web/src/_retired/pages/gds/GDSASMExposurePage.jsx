import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle } from "lucide-react";
import { Card, Breadcrumb, CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, SevBadge } from "@/components/gds/GDSOSShared";

const SEV_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function GDSASMExposurePage() {
  const { data: exposures = [], isLoading } = useQuery({
    queryKey: ["asm-exposures-all"],
    queryFn: () => base44.entities.ASMExposureRecord.list("-discovered_date", 500).catch(() => []),
  });

  const critical = exposures.filter(e => e.severity === "critical" && !e.is_resolved).length;
  const newToday = exposures.filter(e => e.is_new).length;
  const changed = exposures.filter(e => e.has_changed).length;
  const resolved = exposures.filter(e => e.is_resolved).length;

  const byType = exposures.reduce((acc, e) => { acc[e.exposure_type] = (acc[e.exposure_type] || 0) + 1; return acc; }, {});
  const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }));

  if (isLoading) return <div className="p-8"><div className="w-8 h-8 border-4 border-t-cyan-400 border-white/10 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }, { label: "Internet Exposure", path: "/asm/exposure" }]} />
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6" style={{ color: DANGER }} />
        <div><h1 className="text-2xl font-black text-white">Internet Exposure</h1><p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Active exposures and vulnerabilities</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical</p><p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{critical}</p></Card>
        <Card className="p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>New Today</p><p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{newToday}</p></Card>
        <Card className="p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Changed</p><p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{changed}</p></Card>
        <Card className="p-4 text-center" style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Resolved</p><p className="text-2xl font-black font-mono" style={{ color: LOW }}>{resolved}</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Exposure Type Breakdown</h3>
          {typeData.length === 0 ? <div className="text-center py-12" style={{ color: MUTED }}>No exposures</div> : (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={typeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={{ stroke: MUTED }}>{typeData.map((e, i) => <Cell key={i} fill={[DANGER, HIGH, MEDIUM, LOW, CYAN][i % 5]} />)}</Pie></PieChart></ResponsiveContainer></div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">All Exposures</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {exposures.slice(0, 20).map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: `${SEV_COLORS[exp.severity]}05`, border: `1px solid ${SEV_COLORS[exp.severity]}20` }}>
                <div className="flex items-center gap-3"><SevBadge sev={exp.severity} /><div><p className="text-xs font-semibold text-white">{exp.exposure_type}</p><p className="text-[10px]" style={{ color: MUTED }}>{exp.asset_name}</p></div></div>
                <p className="text-[10px]" style={{ color: MUTED }}>{new Date(exp.discovered_date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}