import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const STATE_STYLE = {
  online: "text-emerald-400 bg-emerald-500/15",
  capable: "text-emerald-400 bg-emerald-500/15",
  idle: "text-blue-400 bg-blue-500/15",
  degraded: "text-amber-400 bg-amber-500/15",
  offline: "text-red-400 bg-red-500/15",
  archived: "text-slate-400 bg-slate-500/15",
  unknown: "text-slate-400 bg-slate-500/15",
};

function observedLabel(value) {
  if (!value) return "never observed";
  const stamp = Date.parse(value);
  if (!Number.isFinite(stamp)) return "unknown";
  return `${new Date(stamp).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

export default function FleetStatusPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await base44.functions.invoke("gdsFleetStatus", {}).catch(() => null);
    const data = response?.data;
    setStatus(data && data.success ? data : { success: false, message: data?.message || "unknown - backend status unavailable" });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const freshness = status?.freshness;
  const release = status?.release;

  return (
    <section className="rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">Verified backend fleet status</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Source: api.globaldigitalsecurity.io · {status?.source || "agent heartbeats + capability decisions"}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 disabled:opacity-50">
          {loading ? "Checking…" : "Re-check"}
        </button>
      </div>

      {loading && <p className="text-xs text-slate-500">Querying backend status…</p>}

      {!loading && !status?.success && (
        <p className="text-sm font-semibold text-amber-400">unknown - backend status unavailable</p>
      )}

      {!loading && status?.success && (
        <>
          <div className="grid gap-2 sm:grid-cols-3 text-[11px]">
            <div className="rounded-lg px-3 py-2" style={{ background: "#0a0f1e", border: "1px solid #1e3a5f" }}>
              <p className="text-slate-500">Release SHA (/health/version)</p>
              <p className="font-mono text-slate-200 break-all">{release?.sha || "unavailable"}</p>
              <p className="text-slate-500 mt-1">{release?.deployed_at ? `deployed ${release.deployed_at}` : "deploy time unavailable"}{release?.branch ? ` · ${release.branch}` : ""}</p>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: "#0a0f1e", border: "1px solid #1e3a5f" }}>
              <p className="text-slate-500">Freshness thresholds (from payload)</p>
              <p className="text-slate-200">
                fresh ≤ {freshness?.fresh_seconds != null ? `${freshness.fresh_seconds}s` : "not reported"} ·
                stale after {freshness?.stale_seconds != null ? `${freshness.stale_seconds}s` : "not reported"}
              </p>
              <p className="text-slate-500 mt-1">capable window: {freshness?.capable_window_hours != null ? `${freshness.capable_window_hours}h` : "not reported"}</p>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: "#0a0f1e", border: "1px solid #1e3a5f" }}>
              <p className="text-slate-500">Reported states</p>
              <p className="text-slate-200">
                {status.counts ? Object.entries(status.counts).map(([k, v]) => `${k}: ${v}`).join(" · ") : "not reported"}
              </p>
              <p className="text-slate-500 mt-1">checked {new Date(status.checked_at).toISOString().replace("T", " ").slice(0, 19)} UTC</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-1.5 pr-3 font-semibold">Canonical role</th>
                  <th className="py-1.5 pr-3 font-semibold">State</th>
                  <th className="py-1.5 pr-3 font-semibold">Last observed</th>
                  <th className="py-1.5 pr-3 font-semibold">Evidence source</th>
                  <th className="py-1.5 font-semibold">Reason / capability</th>
                </tr>
              </thead>
              <tbody>
                {status.roles.map(role => (
                  <tr key={role.agent_id} className="border-t border-slate-800">
                    <td className="py-1.5 pr-3 text-slate-200 font-medium">{role.agent_id}</td>
                    <td className="py-1.5 pr-3">
                      <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${STATE_STYLE[role.state] || STATE_STYLE.unknown}`}>{role.state}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-slate-400">{observedLabel(role.last_observed_at)}</td>
                    <td className="py-1.5 pr-3 text-slate-400">{role.evidence_source || "not reported"}</td>
                    <td className="py-1.5 text-slate-400">
                      {role.reason || "—"}
                      {role.capability_evidence ? <span className="block text-slate-500">{role.capability_evidence}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}