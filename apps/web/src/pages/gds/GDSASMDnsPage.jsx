import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search } from "lucide-react";
import { Card, Breadcrumb, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

export default function GDSASMDnsPage() {
  const [search, setSearch] = useState("");
  const { data: records = [] } = useQuery({ queryKey: ["asm-dns"], queryFn: () => base44.entities.ASMDNSRecord.list("-created_date", 500).catch(() => []) });
  const filtered = records.filter(r => !search || r.fqdn?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }, { label: "DNS Intelligence", path: "/asm/dns" }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Search className="w-6 h-6" style={{ color: CYAN }} /><div><h1 className="text-2xl font-black text-white">DNS Intelligence</h1><p className="text-[10px] mt-0.5" style={{ color: MUTED }}>DNS records and dangling detection</p></div></div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="px-3 py-2 rounded-xl text-sm outline-none w-64" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
      </div>
      <Card className="p-5">
        {filtered.length === 0 ? <div className="text-center py-12" style={{ color: MUTED }}>No DNS records</div> : (
          <table className="w-full text-xs">
            <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>{["FQDN", "Type", "Value", "TTL", "Dangling", "Wildcard", "Provider"].map(h => <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td className="py-3 px-3"><p className="text-sm font-semibold text-white">{r.fqdn}</p></td>
                  <td className="py-3 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>{r.record_type}</span></td>
                  <td className="py-3 px-3"><p className="text-[10px] font-mono truncate max-w-[200px]" style={{ color: TEXT }}>{r.value}</p></td>
                  <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{r.ttl}</p></td>
                  <td className="py-3 px-3">{r.is_dangling ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>⚠️ Dangling</span> : <span style={{ color: MUTED }}>—</span>}</td>
                  <td className="py-3 px-3">{r.is_wildcard ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${MEDIUM}15`, color: MEDIUM }}>Wildcard</span> : <span style={{ color: MUTED }}>—</span>}</td>
                  <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{r.cloud_provider || "—"}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}