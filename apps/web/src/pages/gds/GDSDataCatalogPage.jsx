import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, Zap, Shield, Tag, Activity } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

function TypeBadge({ type, colors }) {
  const color = colors[type] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {(type || "—").replace(/_/g, " ")}
    </span>
  );
}

const CATALOG_COLORS = { security: "#ef4444", business: "#3b82f6", compliance: "#10b981", operational: "#f59e0b", ml: "#a855f7", knowledge: "#14b8a6" };
const SOURCE_COLORS = { siem: "#ef4444", edr: "#f97316", cloudtrail: "#3b82f6", vpc_flow: "#14b8a6", dns: "#8b5cf6", proxy: "#ec4899", firewall: "#ef4444", endpoint: "#f97316", identity: "#10b981", cloud_api: "#3b82f6", container: "#14b8a6", kubernetes: "#06b6d4", application: "#a855f7", database: "#f59e0b", network: "#6b7280", threat_intel: "#dc2626", vulnerability: "#fb923c", compliance: "#10b981" };
const CLASSIFICATION_COLORS = { public: "#6b7280", internal: "#3b82f6", confidential: "#f59e0b", restricted: "#f97316", sovereign: "#ef4444" };

export default function GDSDataCatalogPage() {
  const [activeTab, setActiveTab] = useState("catalog");
  const { data: catalogs = [], isLoading: loadC } = useQuery({
    queryKey: ["data-catalogs"],
    queryFn: () => base44.entities.DataCatalog.list("", 50).catch(() => []),
  });
  const { data: sources = [], isLoading: loadS } = useQuery({
    queryKey: ["data-sources"],
    queryFn: () => base44.entities.DataSource.list("", 50).catch(() => []),
  });

  const totalSources = sources.length;
  const activeSources = sources.filter(s => s.is_active).length;
  const totalEPS = sources.reduce((sum, s) => sum + (s.events_per_sec || 0), 0);
  const classificationBreakdown = sources.reduce((acc, s) => {
    acc[s.data_classification || "public"] = (acc[s.data_classification || "public"] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(classificationBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Data Intelligence", path: "/data-intelligence" }, { label: "Data Catalog" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Enterprise Data Catalog</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Data sources, catalogs, and classification management</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5" glow>
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Sources</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{totalSources}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4" style={{ color: LOW }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Active</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{activeSources}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4" style={{ color: HIGH }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total EPS</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{totalEPS.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: MUTED }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Classification</span>
          </div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={20} outerRadius={30} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={CLASSIFICATION_COLORS[entry.name] || MUTED} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: BORDER }}>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "catalog" ? "text-white border-b-2" : ""}`}
          style={{ borderColor: activeTab === "catalog" ? CYAN : "transparent", color: activeTab === "catalog" ? CYAN : MUTED }}
        >
          Data Catalogs
        </button>
        <button
          onClick={() => setActiveTab("sources")}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "sources" ? "text-white border-b-2" : ""}`}
          style={{ borderColor: activeTab === "sources" ? CYAN : "transparent", color: activeTab === "sources" ? CYAN : MUTED }}
        >
          Data Sources
        </button>
      </div>

      {activeTab === "catalog" && (
        <Card className="overflow-hidden">
          {loadC ? <Skeleton lines={6} /> : catalogs.length === 0 ? (
            <EmptyState icon={Database} title="No catalogs" description="Create data catalogs to organize your data assets" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Datasets</th>
                    <th className="pb-3 font-semibold">Sources</th>
                    <th className="pb-3 font-semibold">Schemas</th>
                    <th className="pb-3 font-semibold">Tagged</th>
                    <th className="pb-3 font-semibold">Last Scan</th>
                    <th className="pb-3 font-semibold">Owner</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {catalogs.map((cat, i) => (
                    <tr key={cat.id || i} className="text-white">
                      <td className="py-3 font-semibold">{cat.name}</td>
                      <td className="py-3"><TypeBadge type={cat.catalog_type} colors={CATALOG_COLORS} /></td>
                      <td className="py-3 font-mono">{cat.dataset_count || 0}</td>
                      <td className="py-3 font-mono">{cat.source_count || 0}</td>
                      <td className="py-3 font-mono">{cat.schema_count || 0}</td>
                      <td className="py-3 font-mono">{cat.tagged_assets || 0}</td>
                      <td className="py-3" style={{ color: MUTED }}>{timeAgo(cat.last_scan_at)}</td>
                      <td className="py-3" style={{ color: MUTED }}>{cat.owner || "—"}</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.status === "active" ? "text-green-400 bg-green-400/15" : cat.status === "scanning" ? "text-blue-400 bg-blue-400/15" : "text-red-400 bg-red-400/15"}`}>
                          {cat.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "sources" && (
        <Card className="overflow-hidden">
          {loadS ? <Skeleton lines={6} /> : sources.length === 0 ? (
            <EmptyState icon={Zap} title="No data sources" description="Connect data sources to start ingesting data" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Protocol</th>
                    <th className="pb-3 font-semibold">EPS</th>
                    <th className="pb-3 font-semibold">Classification</th>
                    <th className="pb-3 font-semibold">Retention</th>
                    <th className="pb-3 font-semibold">Active</th>
                    <th className="pb-3 font-semibold">Last Event</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {sources.map((src, i) => (
                    <tr key={src.id || i} className="text-white">
                      <td className="py-3 font-semibold">{src.name}</td>
                      <td className="py-3"><TypeBadge type={src.source_type} colors={SOURCE_COLORS} /></td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{src.protocol}</span>
                      </td>
                      <td className="py-3 font-mono">{(src.events_per_sec || 0).toLocaleString()}</td>
                      <td className="py-3"><TypeBadge type={src.data_classification} colors={CLASSIFICATION_COLORS} /></td>
                      <td className="py-3 font-mono">{src.retention_days}d</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold ${src.is_active ? "text-green-400" : "text-slate-500"}`}>{src.is_active ? "✓" : "✗"}</span>
                      </td>
                      <td className="py-3" style={{ color: MUTED }}>{timeAgo(src.last_event_at)}</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${src.is_active ? "text-green-400 bg-green-400/15" : "text-slate-500 bg-slate-500/15"}`}>
                          {src.is_active ? "active" : "inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}