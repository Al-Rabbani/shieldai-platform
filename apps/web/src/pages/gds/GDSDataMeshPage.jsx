import React, { useState } from "react";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Skeleton, Breadcrumb, Card, PAGE_BG
} from "@/components/gds/GDSOSShared";

const FRESHNESS_COLOR = { fresh: LOW, recent: MEDIUM, stale: DANGER };

function DomainTile({ d }) {
  const color = FRESHNESS_COLOR[d.status] || MUTED;
  return (
    <Card className="p-4" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-black text-white">{d.name}</p>
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color, background: `${color}15` }}>{d.status}</span>
      </div>
      <p className="text-2xl font-black font-mono mb-1" style={{ color: CYAN }}>{d.entity_count.toLocaleString()}</p>
      <div className="flex items-center justify-between text-[10px]">
        <span style={{ color: MUTED }}>Owner: <span style={{ color: TEXT }}>{d.owner}</span></span>
        <span style={{ color: MUTED }}>SLA {d.freshness_sla_hours}h</span>
      </div>
    </Card>
  );
}

function SchemaAccordion({ domains }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-1">
      {domains?.map((d, i) => (
        <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <button onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-white hover:bg-white/[0.02] transition-all">
            <span>{d.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono" style={{ color: MUTED }}>SLA {d.sla_hours}h · {d.owner}</span>
              {open === i ? <ChevronDown className="w-3.5 h-3.5" style={{ color: CYAN }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: MUTED }} />}
            </div>
          </button>
          {open === i && (
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {d.entities?.map(e => <span key={e} className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>{e}</span>)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DataProductCard({ id, label }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetch = async () => {
    if (data) { setOpen(o => !o); return; }
    setLoading(true);
    try { const r = await base44.functions.invoke("gdsSecurityDataMesh", { action: "data_product", product: id }); setData(r.data); setOpen(true); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-all" onClick={fetch}>
        <div>
          <p className="text-sm font-bold text-white">{label}</p>
          {data && <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{data.frequency} · {data.owner}</p>}
        </div>
        {loading ? <span className="text-[10px] animate-pulse" style={{ color: CYAN }}>Loading…</span>
          : open ? <ChevronDown className="w-4 h-4" style={{ color: CYAN }} /> : <ChevronRight className="w-4 h-4" style={{ color: MUTED }} />}
      </div>
      {open && data && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-xs mt-3" style={{ color: MUTED }}>{data.description}</p>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Schema Preview</p>
            <div className="space-y-1">
              {data.schema_preview?.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <span className="font-mono" style={{ color: CYAN }}>{f.field}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ color: MEDIUM, background: `${MEDIUM}10` }}>{f.type}</span>
                  <span style={{ color: MUTED }}>{f.description}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Consumers</p>
            <div className="flex flex-wrap gap-1">{data.consumers?.map(c => <span key={c} className="text-[10px] px-2 py-0.5 rounded" style={{ color: LOW, background: `${LOW}10` }}>{c}</span>)}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function GDSDataMeshPage() {
  const [activeTab, setActiveTab] = useState("domains");

  const { data: unifiedData, isLoading: loadingUnified } = useQuery({
    queryKey: ["gds-data-mesh-unified"],
    queryFn: () => base44.functions.invoke("gdsSecurityDataMesh", { action: "unified_view" }).then(r => r.data),
  });

  const { data: schemaData, isLoading: loadingSchema } = useQuery({
    queryKey: ["gds-data-mesh-schema"],
    queryFn: () => base44.functions.invoke("gdsSecurityDataMesh", { action: "schema_map" }).then(r => r.data),
  });

  const domains = unifiedData?.domains || [];
  const stats = unifiedData?.cross_domain_stats || {};

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Security Data Mesh" }]} />
      <div>
        <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-white">Security Data Mesh</h1><LiveDataBadge /></div>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Unified cross-domain security data with schema mapping and data products</p>
      </div>

      {/* Cross-domain stats */}
      {!loadingUnified && (
        <div className="flex items-center gap-6 flex-wrap px-4 py-3 rounded-xl" style={{ background: `${CYAN}06`, border: `1px solid ${CYAN}20` }}>
          <span className="text-xs" style={{ color: MUTED }}>Domains: <strong style={{ color: CYAN }}>{stats.domains}</strong></span>
          <span className="text-xs" style={{ color: MUTED }}>Total Entities: <strong style={{ color: TEXT }}>{stats.total_entities?.toLocaleString()}</strong></span>
          <span className="text-xs" style={{ color: MUTED }}>Fresh: <strong style={{ color: LOW }}>{stats.fresh_domains}</strong></span>
          <span className="text-xs" style={{ color: MUTED }}>Stale: <strong style={{ color: stats.stale_domains > 0 ? DANGER : MUTED }}>{stats.stale_domains}</strong></span>
          <span className="text-xs ml-auto" style={{ color: MUTED }}>Snapshot: {stats.snapshot_time ? new Date(stats.snapshot_time).toLocaleTimeString() : "—"}</span>
        </div>
      )}

      <div className="flex border-b" style={{ borderColor: BORDER }}>
        {[["domains", "Unified View"], ["schema", "Schema Map"], ["products", "Data Products"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "domains" && (
        loadingUnified ? <Skeleton lines={4} /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {domains.map((d, i) => <DomainTile key={i} d={d} />)}
          </div>
        )
      )}

      {activeTab === "schema" && (
        loadingSchema ? <Skeleton lines={5} /> : (
          <div className="space-y-4">
            <SchemaAccordion domains={schemaData?.domains} />
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3">Cross-Domain Joins</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["From", "↔", "To", "Description"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schemaData?.cross_domain_joins?.map((j, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}15` }}>
                      <td className="py-2 px-3 font-mono" style={{ color: CYAN }}>{j.from}</td>
                      <td className="py-2 px-3 text-center" style={{ color: MUTED }}>↔</td>
                      <td className="py-2 px-3 font-mono" style={{ color: MEDIUM }}>{j.to}</td>
                      <td className="py-2 px-3 max-w-sm" style={{ color: MUTED }}>{j.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )
      )}

      {activeTab === "products" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataProductCard id="risk_intelligence" label="Risk Intelligence" />
          <DataProductCard id="developer_feed" label="Developer Security Feed" />
        </div>
      )}
    </div>
  );
}