import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Layers, Search } from "lucide-react";
import { Card, Breadcrumb, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

export default function GDSASMSubdomainsPage() {
  const [search, setSearch] = useState("");
  const { data: subdomains = [] } = useQuery({ queryKey: ["asm-subdomains"], queryFn: () => base44.entities.ASMSubdomain.list("-created_date", 500).catch(() => []) });
  const filtered = subdomains.filter(s => !search || s.fqdn?.toLowerCase().includes(search.toLowerCase()));
  const newlyDiscovered = subdomains.filter(s => s.is_newly_discovered).length;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }, { label: "Subdomain Discovery", path: "/asm/subdomains" }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Layers className="w-6 h-6" style={{ color: CYAN }} /><div><h1 className="text-2xl font-black text-white">Subdomain Discovery</h1><p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Discovered subdomains and their status</p></div></div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold" style={{ color: CYAN }}>{newlyDiscovered} new (24h)</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="px-3 py-2 rounded-xl text-sm outline-none w-64" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
      </div>
      <Card className="p-5">
        {filtered.length === 0 ? <div className="text-center py-12" style={{ color: MUTED }}>No subdomains</div> : (
          <table className="w-full text-xs">
            <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>{["FQDN", "Root Domain", "IPs", "HTTP Status", "Shadow IT", "Orphaned", "Criticality"].map(h => <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td className="py-3 px-3"><p className="text-sm font-semibold text-white">{s.fqdn}</p></td>
                  <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{s.root_domain}</p></td>
                  <td className="py-3 px-3"><p className="text-[10px] font-mono" style={{ color: TEXT }}>{s.ip_addresses?.length || 0}</p></td>
                  <td className="py-3 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: s.http_status >= 400 ? `${DANGER}15` : `${LOW}15`, color: s.http_status >= 400 ? DANGER : LOW }}>{s.http_status || "—"}</span></td>
                  <td className="py-3 px-3">{s.is_shadow_it ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>Shadow IT</span> : <span style={{ color: MUTED }}>—</span>}</td>
                  <td className="py-3 px-3">{s.is_orphaned ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>Orphaned</span> : <span style={{ color: MUTED }}>—</span>}</td>
                  <td className="py-3 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: `${s.business_criticality === "critical" ? DANGER : s.business_criticality === "high" ? HIGH : MEDIUM}15`, color: s.business_criticality === "critical" ? DANGER : s.business_criticality === "high" ? HIGH : MEDIUM }}>{s.business_criticality}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}