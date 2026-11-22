import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Search } from "lucide-react";
import { Card, Breadcrumb, CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, SevBadge } from "@/components/gds/GDSOSShared";
import { Select } from "@/components/ui/select";

const CLASS_COLORS = { external: "#00d4ff", cloud: "#3b82f6", shadow_it: DANGER, orphaned: MUTED };
const CRIT_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

export default function GDSASMAssetsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [critFilter, setCritFilter] = useState("all");

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["asm-assets-all"],
    queryFn: () => base44.entities.ASMAsset.list("-created_date", 1000).catch(() => []),
  });

  const filtered = assets.filter(a => {
    const matchSearch = !search || a.asset_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.asset_type === typeFilter;
    const matchClass = classFilter === "all" || a.asset_class === classFilter;
    const matchCrit = critFilter === "all" || a.business_criticality === critFilter;
    return matchSearch && matchType && matchClass && matchCrit;
  });

  if (isLoading) return <div className="p-8"><div className="w-8 h-8 border-4 border-t-cyan-400 border-white/10 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }, { label: "Asset Inventory", path: "/asm/assets" }]} />

      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6" style={{ color: CYAN }} />
        <div>
          <h1 className="text-2xl font-black text-white">Asset Inventory</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Complete inventory of discovered assets</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="all">All Types</option>
          <option value="domain">Domains</option>
          <option value="subdomain">Subdomains</option>
          <option value="ip_address">IPs</option>
          <option value="api_endpoint">APIs</option>
          <option value="cloud_resource">Cloud</option>
        </select>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="all">All Classes</option>
          <option value="external">External</option>
          <option value="cloud">Cloud</option>
          <option value="shadow_it">Shadow IT</option>
          <option value="orphaned">Orphaned</option>
        </select>
        <select value={critFilter} onChange={e => setCritFilter(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="all">All Criticality</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <Card className="p-5">
        {filtered.length === 0 ? (
          <div className="text-center py-12" style={{ color: MUTED }}>No assets match filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Name", "Type", "Class", "Internet Facing", "Criticality", "Risk Score", "Last Seen"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(asset => (
                  <tr key={asset.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3"><p className="text-sm font-semibold text-white">{asset.asset_name}</p></td>
                    <td className="py-3 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>{asset.asset_type}</span></td>
                    <td className="py-3 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: `${CLASS_COLORS[asset.asset_class] || MUTED}15`, color: CLASS_COLORS[asset.asset_class] || MUTED }}>{asset.asset_class}</span></td>
                    <td className="py-3 px-3">{asset.is_internet_facing ? <Shield className="w-4 h-4" style={{ color: HIGH }} /> : <span style={{ color: MUTED }}>—</span>}</td>
                    <td className="py-3 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: `${CRIT_COLORS[asset.business_criticality] || MUTED}15`, color: CRIT_COLORS[asset.business_criticality] || MUTED }}>{asset.business_criticality}</span></td>
                    <td className="py-3 px-3"><p className="text-xs font-mono" style={{ color: asset.gds_risk_score >= 70 ? DANGER : asset.gds_risk_score >= 40 ? HIGH : MUTED }}>{asset.gds_risk_score || 0}</p></td>
                    <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{asset.last_seen ? new Date(asset.last_seen).toLocaleDateString() : "—"}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}