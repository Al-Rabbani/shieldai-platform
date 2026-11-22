import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Database, TrendingUp, AlertTriangle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Card, Breadcrumb, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

export default function GDSCyberRangeSyncPage() {
  const { data: syncs = [], isLoading: loadSyncs } = useQuery({
    queryKey: ["cyber-range-syncs"],
    queryFn: () => base44.entities.TwinSynchronization.list("-synced_at", 50).catch(() => []),
  });
  const { data: versions = [], isLoading: loadVersions } = useQuery({
    queryKey: ["cyber-range-versions"],
    queryFn: () => base44.entities.TwinVersion.list("-created_at", 50).catch(() => []),
  });

  const syncTypeColors = {
    full_sync: CYAN, incremental: LOW, config_change: HIGH, threat_update: "#f97316", on_demand: MEDIUM,
  };
  const avgAccuracy = syncs.length > 0
    ? Math.round(syncs.reduce((sum, s) => sum + (s.sync_accuracy_pct || 0), 0) / syncs.length)
    : 0;
  const driftsDetected = syncs.reduce((sum, s) => sum + (s.drift_detected || 0), 0);

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "Cyber Range", path: "/cyber-range" }, { label: "Sync & Versions" }]} />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Total Syncs</p>
          <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{syncs.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Avg Accuracy</p>
          <p className="text-3xl font-black font-mono" style={{ color: avgAccuracy > 90 ? LOW : avgAccuracy > 70 ? HIGH : DANGER }}>{avgAccuracy}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Versions Saved</p>
          <p className="text-3xl font-black font-mono" style={{ color: "#a855f7" }}>{versions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Drifts Detected</p>
          <p className="text-3xl font-black font-mono" style={{ color: driftsDetected > 0 ? DANGER : LOW }}>{driftsDetected}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sync History */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" style={{ color: CYAN }} />
              <h3 className="text-sm font-bold text-white">Synchronization History</h3>
            </div>
          </div>
          {loadSyncs ? <Skeleton lines={6} /> : syncs.length === 0 ? (
            <EmptyState icon={RefreshCw} title="No syncs" description="Synchronization records will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[9px] uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <tr>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Type</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Discovered</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Added</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Removed</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Drift</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Accuracy</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Duration</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm" style={{ borderColor: `${BORDER}40` }}>
                  {syncs.map(s => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: syncTypeColors[s.sync_type] || MUTED, background: `${syncTypeColors[s.sync_type] || MUTED}15` }}>
                          {s.sync_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white">{s.assets_discovered || 0}</td>
                      <td className="px-4 py-3 text-green-400">+{s.assets_added || 0}</td>
                      <td className="px-4 py-3 text-red-400">-{s.assets_removed || 0}</td>
                      <td className="px-4 py-3">{s.drift_detected > 0 ? <span className="text-amber-400 font-bold">{s.drift_detected}</span> : <span className="text-green-400">None</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                            <div className={`h-full rounded-full ${s.sync_accuracy_pct > 90 ? "bg-green-400" : s.sync_accuracy_pct > 70 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${s.sync_accuracy_pct || 0}%` }} />
                          </div>
                          <span className="text-xs font-bold text-white">{s.sync_accuracy_pct || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white">{s.duration_seconds || 0}s</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded ${
                          s.status === "completed" ? "bg-green-400/20 text-green-400" :
                          s.status === "partial" ? "bg-amber-400/20 text-amber-400" :
                          "bg-red-400/20 text-red-400"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Version History */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" style={{ color: "#a855f7" }} />
              <h3 className="text-sm font-bold text-white">Version History</h3>
            </div>
          </div>
          {loadVersions ? <Skeleton lines={6} /> : versions.length === 0 ? (
            <EmptyState icon={Database} title="No versions" description="Twin versions will appear here" />
          ) : (
            <div className="p-4 space-y-2">
              {versions.slice(0, 8).map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white">{v.version_tag}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{v.snapshot_reason}</span>
                    </div>
                    <p className="text-[9px]" style={{ color: MUTED }}>{timeAgo(v.created_at)} • {v.total_assets} assets • {v.attack_paths_snapshot} attack paths</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${v.risk_score_snapshot >= 70 ? "text-red-400" : v.risk_score_snapshot >= 40 ? "text-amber-400" : "text-green-400"}`}>{v.risk_score_snapshot}</p>
                    {v.restore_available && (
                      <button className="text-[9px] mt-1 px-2 py-0.5 rounded" style={{ background: `${CYAN}20`, color: CYAN }}>
                        Restore
                      </button>
                    )}
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