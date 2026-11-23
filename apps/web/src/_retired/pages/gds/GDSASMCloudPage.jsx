import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cloud, Search } from "lucide-react";
import { Card, Breadcrumb, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const PROVIDER_COLORS = { aws: "#ff9900", azure: "#0078d4", gcp: "#4285f4", other: MUTED };

export default function GDSASMCloudPage() {
  const [search, setSearch] = useState("");
  const { data: assets = [] } = useQuery({ queryKey: ["asm-cloud"], queryFn: () => base44.entities.ASMCloudAsset.list("-created_date", 500).catch(() => []) });
  const filtered = assets.filter(a => !search || a.resource_name?.toLowerCase().includes(search.toLowerCase()));
  const byProvider = assets.reduce((acc, a) => { acc[a.provider] = (acc[a.provider] || 0) + 1; return acc; }, {});
  const providerData = Object.entries(byProvider).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }, { label: "Cloud Assets", path: "/asm/cloud" }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Cloud className="w-6 h-6" style={{ color: CYAN }} /><div><h1 className="text-2xl font-black text-white">Cloud Assets</h1><p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Cloud resource inventory across providers</p></div></div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="px-3 py-2 rounded-xl text-sm outline-none w-64" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <table className="w-full text-xs">
            <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>{["Resource", "Provider", "Region", "Type", "Public", "Encryption", "Risk"].map(h => <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td className="py-3 px-3"><p className="text-sm font-semibold text-white">{a.resource_name}</p></td>
                  <td className="py-3 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${PROVIDER_COLORS[a.provider]}15`, color: PROVIDER_COLORS[a.provider] }}>{a.provider?.toUpperCase()}</span></td>
                  <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{a.region}</p></td>
                  <td className="py-3 px-3"><p className="text-[10px]" style={{ color: TEXT }}>{a.resource_type}</p></td>
                  <td className="py-3 px-3">{a.is_public ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>PUBLIC</span> : <span style={{ color: MUTED }}>—</span>}</td>
                  <td className="py-3 px-3">{a.encryption_enabled ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>Encrypted</span> : <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>Unencrypted</span>}</td>
                  <td className="py-3 px-3"><p className="text-xs font-mono" style={{ color: a.risk_score >= 70 ? DANGER : a.risk_score >= 40 ? HIGH : MUTED }}>{a.risk_score || 0}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Provider Breakdown</h3>
          {providerData.length === 0 ? <div className="text-center py-12" style={{ color: MUTED }}>No assets</div> : (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={providerData} cx="50%" cy="50%" outerRadius={60} dataKey="value">{providerData.map((e, i) => <Cell key={i} fill={PROVIDER_COLORS[e.name] || MUTED} />)}</Pie></PieChart></ResponsiveContainer></div>
          )}
        </Card>
      </div>
    </div>
  );
}