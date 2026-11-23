import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Search } from "lucide-react";
import { Card, Breadcrumb, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

export default function GDSASMCertificatesPage() {
  const [search, setSearch] = useState("");
  const { data: certs = [] } = useQuery({ queryKey: ["asm-certs"], queryFn: () => base44.entities.ASMCertificate.list("-created_date", 500).catch(() => []) });
  const filtered = certs.filter(c => !search || c.common_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }, { label: "Certificate Intelligence", path: "/asm/certificates" }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Shield className="w-6 h-6" style={{ color: CYAN }} /><div><h1 className="text-2xl font-black text-white">Certificate Intelligence</h1><p className="text-[10px] mt-0.5" style={{ color: MUTED }}>SSL/TLS certificate monitoring</p></div></div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="px-3 py-2 rounded-xl text-sm outline-none w-64" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
      </div>
      <Card className="p-5">
        {filtered.length === 0 ? <div className="text-center py-12" style={{ color: MUTED }}>No certificates</div> : (
          <table className="w-full text-xs">
            <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>{["Common Name", "Issuer", "Expires", "Days Left", "Type", "Self-Signed", "Rogue"].map(h => <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(c => {
                const daysLeft = c.days_until_expiry || Math.ceil((new Date(c.expiry_date) - new Date()) / (1000*60*60*24));
                return (
                  <tr key={c.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3"><p className="text-sm font-semibold text-white">{c.common_name}</p></td>
                    <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{c.issuer}</p></td>
                    <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{new Date(c.expiry_date).toLocaleDateString()}</p></td>
                    <td className="py-3 px-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded ${daysLeft < 30 ? 'bg-red-400/15 text-red-400' : daysLeft < 90 ? 'bg-orange-400/15 text-orange-400' : 'bg-green-400/15 text-green-400'}`}>{daysLeft}d</span></td>
                    <td className="py-3 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>{c.certificate_type}</span></td>
                    <td className="py-3 px-3">{c.is_self_signed ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>Self-Signed</span> : <span style={{ color: MUTED }}>—</span>}</td>
                    <td className="py-3 px-3">{c.is_rogue ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>Rogue</span> : <span style={{ color: MUTED }}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}