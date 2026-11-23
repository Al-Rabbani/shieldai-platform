import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, Shield, AlertTriangle, Activity, ChevronRight, Search } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, BG,
  Card, Breadcrumb, Skeleton, EmptyState, timeAgo, PAGE_BG, SevBadge
} from "@/components/gds/GDSOSShared";
import { formatDistanceToNow } from "date-fns";

const TWIN_TYPE_COLORS = {
  enterprise: CYAN, cloud: "#3b82f6", identity: "#a855f7", ot_ics: DANGER,
  network: HIGH, application: "#10b981", data: "#f59e0b", api: "#ec4899",
  container: "#06b6d4", kubernetes: "#8b5cf6", serverless: "#14b8a6",
  hybrid: "#6366f1", multi_cloud: "#0ea5e9", supply_chain: "#84cc16"
};

function SyncGauge({ pct }) {
  const color = pct >= 90 ? LOW : pct >= 70 ? HIGH : DANGER;
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-12 rounded-full" style={{ background: `conic-gradient(${color} ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: CARD }}>
          <span className="text-[10px] font-bold" style={{ color }}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

export default function GDSCyberRangeTwinsPage() {
  const [selectedTwin, setSelectedTwin] = useState(null);
  const [search, setSearch] = useState("");

  const { data: twins = [], isLoading: loadTwins } = useQuery({
    queryKey: ["cyber-range-twins"],
    queryFn: () => base44.entities.DigitalTwin.list("-last_synced", 100).catch(() => []),
  });

  const { data: assets = [], isLoading: loadAssets } = useQuery({
    queryKey: ["cyber-range-assets"],
    queryFn: () => base44.entities.TwinAsset.list("", 500).catch(() => []),
  });

  const { data: versions = [], isLoading: loadVersions } = useQuery({
    queryKey: ["cyber-range-versions"],
    queryFn: () => base44.entities.TwinVersion.list("-created_at", 200).catch(() => []),
  });

  const filteredTwins = twins.filter(t => t.twin_name?.toLowerCase().includes(search.toLowerCase()));
  const syncedCount = twins.filter(t => t.sync_accuracy_pct >= 90).length;
  const highRiskCount = twins.filter(t => t.risk_score >= 70).length;

  if (selectedTwin) {
    const twinAssets = assets.filter(a => a.digital_twin_id === selectedTwin.id);
    const twinVersions = versions.filter(v => v.digital_twin_id === selectedTwin.id);
    return (
      <div className="space-y-6" style={PAGE_BG}>
        <Breadcrumb items={[{ label: "Cyber Range", path: "/cyber-range" }, { label: "Digital Twins", path: "/cyber-range/twins" }, { label: selectedTwin.twin_name }]} />
        <button onClick={() => setSelectedTwin(null)} className="text-xs font-bold" style={{ color: CYAN }}>← Back to Twins</button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">{selectedTwin.twin_name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <SevBadge sev={selectedTwin.twin_type} />
              <SevBadge sev={selectedTwin.source_environment} />
              <span className="text-[10px]" style={{ color: MUTED }}>Last synced {timeAgo(selectedTwin.last_synced)}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-4">Asset Inventory ({twinAssets.length})</h3>
            {twinAssets.length === 0 ? <EmptyState icon={Database} title="No assets" description="No assets found" /> : (
              <div className="space-y-2">
                {twinAssets.slice(0, 10).map(asset => (
                  <div key={asset.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                    <div>
                      <p className="text-xs font-bold text-white">{asset.asset_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${TWIN_TYPE_COLORS[asset.asset_type] || MUTED}20`, color: TWIN_TYPE_COLORS[asset.asset_type] || MUTED }}>{asset.asset_type}</span>
                        <span className="text-[9px]" style={{ color: MUTED }}>{asset.vulnerabilities_count} vulns</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: asset.risk_score >= 70 ? DANGER : asset.risk_score >= 40 ? HIGH : LOW }}>{asset.risk_score}</p>
                      <p className="text-[9px]" style={{ color: MUTED }}>{asset.business_criticality}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-4">Version History ({twinVersions.length})</h3>
            {twinVersions.length === 0 ? <EmptyState icon={Activity} title="No versions" description="No version history" /> : (
              <div className="space-y-2">
                {twinVersions.slice(0, 8).map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                    <div>
                      <p className="text-xs font-bold text-white">{v.version_tag}</p>
                      <p className="text-[9px]" style={{ color: MUTED }}>{v.snapshot_reason} • {timeAgo(v.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: v.risk_score_snapshot >= 70 ? DANGER : LOW }}>{v.risk_score_snapshot}</p>
                      <p className="text-[9px]" style={{ color: MUTED }}>{v.total_assets} assets</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "Cyber Range", path: "/cyber-range" }, { label: "Digital Twins" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Enterprise Digital Twin</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Complete twin inventory with asset tracking and version history</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Twins</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{twins.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Synced (&gt;90%)</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{syncedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>High Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{highRiskCount}</p>
        </Card>
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Digital Twins</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search twins..." className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          </div>
        </div>
        {loadTwins ? <Skeleton lines={6} /> : filteredTwins.length === 0 ? (
          <EmptyState icon={Database} title="No twins found" description={search ? "Try a different search" : "Digital twins will appear here"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Source</th>
                  <th className="pb-3 font-semibold">Assets</th>
                  <th className="pb-3 font-semibold">Synced</th>
                  <th className="pb-3 font-semibold">Risk</th>
                  <th className="pb-3 font-semibold">Attack Paths</th>
                  <th className="pb-3 font-semibold">Last Synced</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredTwins.map(twin => (
                  <tr key={twin.id} className="border-t cursor-pointer hover:bg-white/[0.02]" style={{ borderColor: `${BORDER}40` }} onClick={() => setSelectedTwin(twin)}>
                    <td className="py-3 font-bold text-white">{twin.twin_name}</td>
                    <td className="py-3"><span className="text-[9px] px-2 py-0.5 rounded" style={{ background: `${TWIN_TYPE_COLORS[twin.twin_type] || MUTED}20`, color: TWIN_TYPE_COLORS[twin.twin_type] || MUTED }}>{twin.twin_type}</span></td>
                    <td className="py-3"><span className="text-[9px] px-2 py-0.5 rounded" style={{ background: `${twin.source_environment === "production" ? DANGER : twin.source_environment === "staging" ? HIGH : MUTED}20`, color: twin.source_environment === "production" ? DANGER : twin.source_environment === "staging" ? HIGH : MUTED }}>{twin.source_environment}</span></td>
                    <td className="py-3 text-white">{twin.total_assets || 0}</td>
                    <td className="py-3"><SyncGauge pct={twin.sync_accuracy_pct || 0} /></td>
                    <td className="py-3"><span className={`text-sm font-bold ${twin.risk_score >= 70 ? "text-red-400" : twin.risk_score >= 40 ? "text-orange-400" : "text-green-400"}`}>{twin.risk_score || 0}</span></td>
                    <td className="py-3 text-white">{twin.attack_paths_modeled || 0}</td>
                    <td className="py-3" style={{ color: MUTED }}>{timeAgo(twin.last_synced)}</td>
                    <td className="py-3"><span className={`text-[9px] px-2 py-0.5 rounded ${twin.is_active ? "bg-green-400/20 text-green-400" : "bg-slate-400/20 text-slate-400"}`}>{twin.is_active ? "Active" : "Inactive"}</span></td>
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