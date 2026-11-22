import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Network, RefreshCw, Pause, Play } from "lucide-react";

const STATE_STYLE = {
  online: { dot: "#10b981", text: "text-emerald-400" },
  degraded: { dot: "#f59e0b", text: "text-amber-400" },
  stale: { dot: "#94a3b8", text: "text-slate-300" },
  offline: { dot: "#ef4444", text: "text-red-400" },
  unknown: { dot: "#64748b", text: "text-slate-400" },
};

// Ring projection around the runtime hub. Position is derived from index only —
// no coordinates are stored on Agent records, so nothing here implies a location.
function project(index, total, angle) {
  const ring = index % 2;
  const ringIndex = Math.floor(index / 2);
  const ringTotal = Math.ceil(total / 2);
  const radius = ring === 0 ? 42 : 26;
  const base = (ringIndex / Math.max(1, ringTotal)) * Math.PI * 2;
  const a = base + angle * (ring === 0 ? 1 : -1.45);
  const depth = (Math.sin(a) + 1) / 2;
  return {
    x: 50 + radius * Math.cos(a),
    y: 50 + radius * Math.sin(a) * 0.6 + (ring === 1 ? 3 : 0),
    scale: 0.7 + depth * 0.55,
    opacity: 0.45 + depth * 0.55,
    z: Math.round(depth * 100),
  };
}

function observed(value) {
  if (!value) return "Never observed";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export default function FleetTopologyMap() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("gdsFleetStatus", {});
      const payload = res?.data;
      if (!payload?.success) {
        setStatus(null);
        setError(payload?.error || "Backend fleet status unavailable.");
      } else {
        setStatus(payload);
      }
    } catch {
      setStatus(null);
      setError("Backend fleet status unavailable.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!spinning) return;
    const timer = setInterval(() => setAngle((a) => a + 0.016), 60);
    return () => clearInterval(timer);
  }, [spinning]);

  const roles = status?.roles || [];
  const counts = status?.counts || {};
  const selected = roles.find((r) => r.agent_id === selectedId) || null;

  return (
    <section className="rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2">
          <Network size={16} className="text-blue-400" />
          <h2 className="text-sm font-bold text-white">Fleet Topology</h2>
          <span className="text-[10px] text-slate-500">
            {roles.length} registered roles · {counts.unknown ?? 0} unknown · {counts.offline ?? 0} offline
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSpinning((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-700 text-slate-300 hover:bg-white/5"
          >
            {spinning ? <Pause size={12} /> : <Play size={12} />} {spinning ? "Pause orbit" : "Resume orbit"}
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-blue-500/30 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div className="px-4 pt-3">
        <p className="text-[10px] text-slate-500">
          Nodes are placed by fleet index on two orbit rings, not by geography — Agent records store no location or IP
          coordinates. Node colour is the verified state reported by the runtime bridge.
        </p>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="h-[320px] flex items-center justify-center">
            <div className="w-7 h-7 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="h-[180px] flex flex-col items-center justify-center text-center gap-1">
            <p className="text-sm font-semibold text-amber-400">unknown — backend status unavailable</p>
            <p className="text-[11px] text-slate-500 max-w-md">{error}</p>
          </div>
        ) : (
          <>
            <div className="relative w-full rounded-lg overflow-hidden" style={{ height: 340, background: "radial-gradient(circle at 50% 50%, #0f1c33 0%, #0a0f1e 70%)", border: "1px solid #172033" }}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ background: "#1e293b", border: "1px solid #334155" }}>
                  <Network size={16} className="text-blue-400" />
                </div>
                <p className="text-[9px] text-slate-400 mt-1">GDS runtime</p>
                <p className="text-[8px] font-mono text-slate-600">{status?.release?.sha?.slice(0, 8) || "sha unknown"}</p>
              </div>

              {roles.map((role, index) => {
                const point = project(index, roles.length, angle);
                const style = STATE_STYLE[role.state] || STATE_STYLE.unknown;
                const isSelected = role.agent_id === selectedId;
                return (
                  <button
                    key={role.agent_id}
                    onClick={() => setSelectedId(isSelected ? null : role.agent_id)}
                    title={`${role.agent_id} · ${role.state}`}
                    aria-label={`${role.agent_id}, ${role.state}`}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                      transform: `translate(-50%, -50%) scale(${point.scale})`,
                      opacity: point.opacity,
                      zIndex: point.z,
                    }}
                  >
                    <span
                      className="rounded-full"
                      style={{
                        width: isSelected ? 16 : 11,
                        height: isSelected ? 16 : 11,
                        background: style.dot,
                        boxShadow: `0 0 10px ${style.dot}66`,
                        outline: isSelected ? "2px solid #3b82f6" : "none",
                        outlineOffset: 2,
                      }}
                    />
                    <span className="mt-1 text-[8px] text-slate-400 whitespace-nowrap max-w-[74px] truncate">
                      {role.agent_id}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-slate-500">
              {Object.entries(STATE_STYLE).map(([state, style]) => (
                <span key={state} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: style.dot }} /> {state}
                </span>
              ))}
              <span>Click a node for its verified evidence.</span>
            </div>

            {selected && (
              <div className="mt-3 rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-white break-all">{selected.agent_id}</p>
                  <span className={`text-[10px] font-bold uppercase ${(STATE_STYLE[selected.state] || STATE_STYLE.unknown).text}`}>
                    {selected.state}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{selected.reason}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2 text-[11px] text-slate-400">
                  <p>Last observed: <span className="text-slate-300">{observed(selected.last_observed_at)}</span></p>
                  <p>Capable (24h receipt): <span className="text-slate-300">{selected.capable ? "yes" : "no"}</span></p>
                  <p>Capability: <span className="text-slate-300">{selected.capability_evidence}</span></p>
                  <p>Evidence: <span className="text-slate-300">{selected.evidence_source}</span></p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                All registered agents and status ({roles.length})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left py-1.5 px-2 font-medium">Agent ID</th>
                      <th className="text-left py-1.5 px-2 font-medium">Verified state</th>
                      <th className="text-left py-1.5 px-2 font-medium">Capable</th>
                      <th className="text-left py-1.5 px-2 font-medium">Last observed</th>
                      <th className="text-left py-1.5 px-2 font-medium">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...roles].sort((a, b) => a.agent_id.localeCompare(b.agent_id)).map((role) => {
                      const style = STATE_STYLE[role.state] || STATE_STYLE.unknown;
                      return (
                        <tr key={role.agent_id} className="border-b border-slate-800/60">
                          <td className="py-1.5 px-2 font-mono text-slate-300 break-all">{role.agent_id}</td>
                          <td className={`py-1.5 px-2 font-semibold ${style.text}`}>● {role.state}</td>
                          <td className="py-1.5 px-2 text-slate-400">{role.capable ? "yes" : "no"}</td>
                          <td className="py-1.5 px-2 text-slate-400">{observed(role.last_observed_at)}</td>
                          <td className="py-1.5 px-2 text-slate-500 max-w-[280px]">{role.capability_evidence}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}