import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, HardDrive, Layers, Shield, PieChart, TrendingUp, AlertCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Breadcrumb, Card, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

function TypeBadge({ type }) {
  const map = {
    hot: { color: "#ef4444", label: "HOT" }, warm: { color: "#f59e0b", label: "WARM" },
    cold: { color: "#3b82f6", label: "COLD" }, vector: { color: "#a855f7", label: "VECTOR" }, ml_feature: { color: "#10b981", label: "ML FEATURE" }
  };
  const m = map[type] || { color: MUTED, label: type };
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: m.color, background: `${m.color}15` }}>{m.label}</span>;
}

function StorageBadge({ backend }) {
  const map = {
    s3: "#ff9900", gcs: "#4285f4", azure_blob: "#0078d4", snowflake: "#29b5e8",
    databricks: "#ff3621", elasticsearch: "#005571", pinecone: "#000000", weaviate: "#00d4ff"
  };
  const color = map[backend] || MUTED;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color, background: `${color}15` }}>{backend?.toUpperCase()}</span>;
}

function AccessBadge({ type }) {
  const map = { rbac: "blue", abac: "purple", lakehouse: "green", open: "grey" };
  const color = map[type] || "grey";
  return <span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: `${color}-400`, background: `rgba(${color === "blue" ? "59,130,246" : color === "purple" ? "168,85,247" : color === "green" ? "16,185,129" : "107,114,128"},0.15)` }}>{type}</span>;
}

function DatasetTypeBadge({ type }) {
  const map = {
    raw: { color: "#64748b", label: "RAW" }, curated: { color: "#3b82f6", label: "CURATED" },
    aggregated: { color: "#8b5cf6", label: "AGGREGATED" }, ml_training: { color: "#10b981", label: "ML TRAINING" },
    analytics: { color: "#f59e0b", label: "ANALYTICS" }, archive: { color: "#6b7280", label: "ARCHIVE" }
  };
  const m = map[type] || { color: MUTED, label: type };
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: m.color, background: `${m.color}15` }}>{m.label}</span>;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function GDSDataLakesPage() {
  const { data: lakes = [], isLoading: loadL } = useQuery({
    queryKey: ["data-lakes"],
    queryFn: () => base44.entities.DataLake.list("", 10).catch(() => []),
  });
  const { data: datasets = [], isLoading: loadD } = useQuery({
    queryKey: ["data-datasets"],
    queryFn: () => base44.entities.Dataset.list("", 100).catch(() => []),
  });

  const totalStorage = lakes.reduce((sum, l) => sum + (l.total_gb || 0), 0);
  const usedStorage = lakes.reduce((sum, l) => sum + (l.used_gb || 0), 0);
  const usedPct = totalStorage > 0 ? Math.round((usedStorage / totalStorage) * 100) : 0;
  const hotTierSize = lakes.filter(l => l.lake_type === "hot").reduce((sum, l) => sum + (l.used_gb || 0), 0);
  const vectorEntries = lakes.filter(l => l.lake_type === "vector").reduce((sum, l) => sum + (l.vector_count || 0), 0);

  const classificationData = [
    { name: "Hot", value: lakes.filter(l => l.lake_type === "hot").length, color: "#ef4444" },
    { name: "Warm", value: lakes.filter(l => l.lake_type === "warm").length, color: "#f59e0b" },
    { name: "Cold", value: lakes.filter(l => l.lake_type === "cold").length, color: "#3b82f6" },
    { name: "Vector", value: lakes.filter(l => l.lake_type === "vector").length, color: "#a855f7" },
    { name: "ML", value: lakes.filter(l => l.lake_type === "ml_feature").length, color: "#10b981" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Data Intelligence" }, { label: "Data Lakes" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Security Data Lakehouse</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Multi-tier data lake management with vector and ML feature stores</p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Storage</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{totalStorage.toLocaleString()} GB</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Used</span>
          </div>
          <p className={`text-2xl font-black font-mono ${usedPct > 80 ? "text-red-400" : usedPct > 60 ? "text-amber-400" : "text-green-400"}`}>{usedPct}%</p>
          <div className="mt-2 h-1.5 rounded-full" style={{ background: `${BORDER}` }}>
            <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: usedPct > 80 ? DANGER : usedPct > 60 ? HIGH : LOW }} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Hot Tier</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{hotTierSize.toLocaleString()} GB</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Vector Entries</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{vectorEntries.toLocaleString()}</p>
        </Card>
      </div>

      {/* Lake Cards */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Data Lakes</h3>
        {loadL ? <Skeleton lines={3} /> : lakes.length === 0 ? (
          <EmptyState icon={Database} title="No data lakes" description="Create data lakes to store and organize your data" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lakes.map((lake, i) => (
              <Card key={lake.id || i} className="p-4" glow>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-white">{lake.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <TypeBadge type={lake.lake_type} />
                      <StorageBadge backend={lake.storage_backend} />
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lake.status === "active" ? "text-green-400 bg-green-400/15" : "text-red-400 bg-red-400/15"}`}>
                    {lake.status}
                  </span>
                </div>
                <div className="space-y-2 text-[10px]" style={{ color: MUTED }}>
                  <div className="flex items-center justify-between">
                    <span>Storage</span>
                    <span className="font-mono" style={{ color: TEXT }}>{lake.used_gb?.toLocaleString()} / {lake.total_gb?.toLocaleString()} GB</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: `${BORDER}` }}>
                    <div className="h-full rounded-full" style={{ width: `${(lake.used_gb / lake.total_gb) * 100 || 0}%`, background: CYAN }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Datasets</span>
                    <span className="font-mono" style={{ color: TEXT }}>{lake.dataset_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Retention</span>
                    <span className="font-mono" style={{ color: TEXT }}>{lake.retention_policy || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Encryption</span>
                    {lake.encryption_enabled ? <Shield className="w-3 h-3" style={{ color: LOW }} /> : <AlertCircle className="w-3 h-3" style={{ color: DANGER }} />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Access</span>
                    <AccessBadge type={lake.access_control} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dataset Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Datasets</h3>
        </div>
        {loadD ? <Skeleton lines={6} /> : datasets.length === 0 ? (
          <EmptyState icon={Layers} title="No datasets" description="Create datasets to organize your data" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Records</th>
                  <th className="pb-3 font-semibold">Size</th>
                  <th className="pb-3 font-semibold">Quality</th>
                  <th className="pb-3 font-semibold">Completeness</th>
                  <th className="pb-3 font-semibold">Freshness</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {datasets.map((ds, i) => (
                  <tr key={ds.id || i} className="text-white">
                    <td className="py-3 font-semibold">{ds.name}</td>
                    <td className="py-3"><DatasetTypeBadge type={ds.dataset_type} /></td>
                    <td className="py-3 font-mono">{(ds.record_count || 0).toLocaleString()}</td>
                    <td className="py-3 font-mono">{formatBytes(ds.size_bytes)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full" style={{ background: `${BORDER}` }}>
                          <div className="h-full rounded-full" style={{ width: `${ds.quality_score || 0}%`, background: (ds.quality_score || 0) >= 90 ? LOW : (ds.quality_score || 0) >= 70 ? MEDIUM : DANGER }} />
                        </div>
                        <span className="text-[10px] font-mono">{ds.quality_score || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-[10px] font-mono">{ds.completeness_pct || 0}%</span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-mono font-bold ${(ds.freshness_minutes || 0) < 60 ? "text-green-400" : "text-red-400"}`}>
                        {(ds.freshness_minutes || 0)}m
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ds.status === "active" ? "text-green-400 bg-green-400/15" : ds.status === "archived" ? "text-slate-400 bg-slate-400/15" : "text-red-400 bg-red-400/15"}`}>
                        {ds.status}
                      </span>
                    </td>
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