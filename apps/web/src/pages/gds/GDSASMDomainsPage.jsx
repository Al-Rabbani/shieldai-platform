import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Globe, AlertTriangle } from "lucide-react";
import { Card, Breadcrumb, CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

export default function GDSASMDomainsPage() {
  const [search, setSearch] = useState("");
  const { data: domains = [], isLoading } = useQuery({ queryKey: ["asm-domains"], queryFn: () => base44.entities.ASMDomain.list("-created_date", 500).catch(() => []) });
  const filtered = domains.filter(d => !search || d.fqdn?.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <div className="p-8"><div className="w-8 h-8 border-4 border-t-cyan-400 border-white/10 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }, { label: "Domain Intelligence", path: "/asm/domains" }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Globe className="w-6 h-6" style={{ color: CYAN }} /><div><h1 className="text-2xl font-black text-white">Domain Intelligence</h1><p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Domain portfolio and risk analysis</p></div></div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search domains..." className="px-3 py-2 rounded-xl text-sm outline-none w-64" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
      </div>

      <Card className="p-5">
        {filtered.length === 0 ? <div className="text-center py-12" style={{ color: MUTED }}>No domains found</div> : (
          <table className="w-full text-xs">
            <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>{["FQDN", "Type", "Subdomains", "Risk", "Registrar", "Expiry", "Status"].map(h => <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td className="py-3 px-3"><p className="text-sm font-semibold text-white">{d.fqdn}</p></td>
                  <td className="py-3 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>{d.domain_type}</span></td>
                  <td className="py-3 px-3"><p className="text-xs font-mono" style={{ color: TEXT }}>{d.subdomains_count || 0}</p></td>
                  <td className="py-3 px-3"><p className="text-xs font-mono" style={{ color: d.risk_score >= 70 ? DANGER : d.risk_score >= 40 ? HIGH : MUTED }}>{d.risk_score || 0}</p></td>
                  <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{d.registrar || "—"}</p></td>
                  <td className="py-3 px-3"><p className="text-[10px]" style={{ color: d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 30*24*60*60*1000) ? DANGER : MUTED }}>{d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : "—"}</p></td>
                  <td className="py-3 px-3">{d.is_rogue ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>⚠️ ROGUE</span> : <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>Active</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}