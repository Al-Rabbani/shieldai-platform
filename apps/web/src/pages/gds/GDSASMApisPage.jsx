import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, Search } from "lucide-react";
import { Card, Breadcrumb, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

export default function GDSASMApisPage() {
  const [search, setSearch] = useState("");
  const { data: apis = [] } = useQuery({ queryKey: ["asm-apis"], queryFn: () => base44.entities.ASMAPIEndpoint.list("-created_date", 500).catch(() => []) });
  const filtered = apis.filter(a => !search || a.url?.toLowerCase().includes(search.toLowerCase()));
  const byBase = filtered.reduce((acc, a) => { const base = a.base_url || "unknown"; acc[base] = acc[base] || []; acc[base].push(a); return acc; }, {});

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }, { label: "API Inventory", path: "/asm/apis" }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Zap className="w-6 h-6" style={{ color: CYAN }} /><div><h1 className="text-2xl font-black text-white">API Inventory</h1><p className="text-[10px] mt-0.5" style={{ color: MUTED }}>API endpoints and their security status</p></div></div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search APIs..." className="px-3 py-2 rounded-xl text-sm outline-none w-64" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
      </div>
      <Card className="p-5">
        {Object.keys(byBase).length === 0 ? <div className="text-center py-12" style={{ color: MUTED }}>No APIs discovered</div> : (
          <div className="space-y-4">
            {Object.entries(byBase).map(([base, endpoints]) => (
              <div key={base}>
                <h4 className="text-xs font-bold text-white mb-2" style={{ color: CYAN }}>{base}</h4>
                <div className="space-y-1">
                  {endpoints.map(api => (
                    <div key={api.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{api.method}</span>
                        <p className="text-xs text-white">{api.path}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${MUTED}15`, color: MUTED }}>{api.api_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {api.requires_auth ? <span className="text-[9px]" style={{ color: LOW }}>🔒</span> : <span className="text-[9px]" style={{ color: DANGER }}>🔓</span>}
                        {api.is_public ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>PUBLIC</span> : null}
                        {api.is_shadow ? <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>SHADOW</span> : null}
                        <p className="text-xs font-mono" style={{ color: api.risk_score >= 70 ? DANGER : api.risk_score >= 40 ? HIGH : MUTED }}>{api.risk_score || 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}