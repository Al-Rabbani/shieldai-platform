import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, BellRing, CheckCircle2, LayoutDashboard, List, RefreshCw, ShieldAlert } from "lucide-react";
import DriftDashboard from "@/components/drift/DriftDashboard";

const SEV = {
  critical: "text-red-300 border-red-500/40 bg-red-500/10",
  high: "text-orange-300 border-orange-500/40 bg-orange-500/10",
  medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  low: "text-blue-300 border-blue-500/40 bg-blue-500/10",
};

const FILTERS = [
  { key: "open", label: "Open drift" },
  { key: "corrected", label: "Corrected" },
  { key: "all", label: "All" },
];

export default function ConfigurationDriftPage() {
  const focusId = useMemo(() => new URLSearchParams(window.location.search).get("drift"), []);
  const [drifts, setDrifts] = useState([]);
  const [baseline, setBaseline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(focusId ? "all" : "open");
  const [view, setView] = useState("records");
  const [busyId, setBusyId] = useState(null);

  // Arriving from a drift alert: bring that record into view.
  useEffect(() => {
    if (loading || !focusId) return;
    document.getElementById(`drift-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, drifts, focusId]);

  async function load() {
    setLoading(true);
    const [rows, baselines] = await Promise.all([
      base44.entities.ConfigurationDrift.list("-detected_at", 300).catch(() => []),
      base44.entities.ConfigurationBaseline.list("-captured_at", 1).catch(() => []),
    ]);
    setBaseline(baselines[0] || null);
    setDrifts(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    if (filter === "corrected") return drifts.filter((row) => row.status === "corrected");
    if (filter === "open") return drifts.filter((row) => row.status !== "corrected" && row.status !== "accepted");
    return drifts;
  }, [drifts, filter]);

  const open = drifts.filter((row) => row.status !== "corrected" && row.status !== "accepted");

  async function markCorrected(drift) {
    setBusyId(drift.id);
    const corrected_at = new Date().toISOString();
    try {
      await base44.entities.ConfigurationDrift.update(drift.id, { status: "corrected", corrected_at });
      // Recorded so the asset's 30-day forensic history shows who reverted what.
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.AuditLog.create({
        timestamp: corrected_at,
        actor_type: "user",
        actor_email: me?.email || null,
        actor_id: me?.id || null,
        action: `Drift reverted — ${String(drift.drift_type || "configuration").replace(/_/g, " ")}`,
        action_type: "config_change",
        resource_type: "cloud_account",
        resource_id: drift.asset,
        resource_name: drift.asset,
        severity: drift.severity || "medium",
        outcome: "success",
        details: `Expected ${drift.expected_value || "—"} · was ${drift.actual_value || "—"}`,
      }).catch(() => null);
      setDrifts((prev) => prev.map((row) => (row.id === drift.id ? { ...row, status: "corrected", corrected_at } : row)));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4" style={{ background: "#0a0f1e", minHeight: "100vh" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className="text-amber-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">CFG-005 | CONFIG DRIFT</span>
            <h1 className="text-xl font-bold text-white mt-1">Configuration drift</h1>
            <p className="text-xs text-slate-500">Live asset configuration against the approved baseline — expected versus actual, so an unauthorized change can be reverted.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/settings/drift-alerts" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition">
            <BellRing size={13} /> Alert settings
          </Link>
          <div className="inline-flex rounded-lg p-0.5" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            {[
              { key: "records", label: "Records", icon: List },
              { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition ${view === key ? "bg-amber-500/25 text-amber-200" : "text-slate-400 hover:text-slate-200"}`}
              >
                <Icon size={11} /> {label}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition disabled:opacity-40">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-lg font-bold font-mono text-white">{open.length}</p>
          <p className="text-[10px] text-slate-500">Unreverted drift{open.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-lg font-bold font-mono text-red-400">{open.filter((row) => row.severity === "critical" || row.severity === "high").length}</p>
          <p className="text-[10px] text-slate-500">Critical / high</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-lg font-bold font-mono text-emerald-400">{drifts.filter((row) => row.status === "corrected").length}</p>
          <p className="text-[10px] text-slate-500">Reverted</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            onClick={() => setFilter(option.key)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${filter === option.key ? "bg-amber-500/20 text-amber-200 border-amber-500/40" : "bg-slate-800 text-slate-400 border-slate-700"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {view === "dashboard" ? (
        loading ? (
          <div className="w-6 h-6 border-2 border-t-amber-500 border-white/10 rounded-full animate-spin mx-auto my-10" />
        ) : (
          <DriftDashboard drifts={drifts} />
        )
      ) : (
      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #1F2937" }}>
          <ShieldAlert size={13} className="text-amber-400" />
          <p className="text-xs font-bold text-white">{visible.length} drift record{visible.length === 1 ? "" : "s"}</p>
          <p className="ml-auto text-[10px] text-slate-500">Alerted hourly</p>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
        {drifts.length} drift row{drifts.length === 1 ? "" : "s"} measured on this host against{" "}
        {baseline
          ? `an approved baseline captured ${new Date(baseline.captured_at).toLocaleString("en-GB")} holding ${baseline.settings_count} settings`
          : "a baseline that has not been approved yet"}.
        {" "}A row appears only when a measured value differs from that baseline; no drift is claimed while no baseline is approved.
      </p>

      {loading ? (
          <div className="w-6 h-6 border-2 border-t-amber-500 border-white/10 rounded-full animate-spin mx-auto my-10" />
        ) : visible.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-xs text-slate-500">No drift in this view.</p>
            <p className="text-[10px] text-slate-600 mt-1">Online checks write a record here whenever a live asset deviates from its approved baseline; each one also raises a notification.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {visible.map((drift) => (
              <div
                key={drift.id}
                id={`drift-${drift.id}`}
                className={`px-3 py-2.5 ${drift.id === focusId ? "bg-amber-500/5 ring-1 ring-inset ring-amber-500/40" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-white truncate">{drift.asset}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${SEV[drift.severity] || SEV.low}`}>{drift.severity || "low"}</span>
                  <span className="text-[10px] text-slate-500 uppercase">{String(drift.drift_type || "").replace(/_/g, " ")}</span>
                  <span className="ml-auto text-[10px] text-slate-500">
                    {drift.detected_at ? new Date(drift.detected_at).toLocaleString("en-GB") : ""}
                  </span>
                </div>

                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch gap-1.5">
                  <div className="rounded-lg px-2 py-1.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                    <p className="text-[9px] uppercase text-emerald-400">Expected</p>
                    <p className="text-[11px] font-mono text-slate-200 break-all">{drift.expected_value || "—"}</p>
                  </div>
                  <ArrowRight size={12} className="text-slate-600 self-center justify-self-center hidden sm:block" />
                  <div className="rounded-lg px-2 py-1.5" style={{ background: "#1a1114", border: "1px solid #3f1d1d" }}>
                    <p className="text-[9px] uppercase text-red-400">Actual</p>
                    <p className="text-[11px] font-mono text-slate-200 break-all">{drift.actual_value || "—"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${drift.status === "corrected" ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" : "text-amber-300 border-amber-500/40 bg-amber-500/10"}`}>
                    {String(drift.status || "detected").replace(/_/g, " ")}
                  </span>
                  {drift.auto_correctable && <span className="text-[9px] text-slate-500">auto-correctable</span>}
                  {drift.corrected_at && <span className="text-[10px] text-slate-600">reverted {new Date(drift.corrected_at).toLocaleString("en-GB")}</span>}
                  {drift.status !== "corrected" && (
                    <button
                      onClick={() => markCorrected(drift)}
                      disabled={busyId === drift.id}
                      className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition disabled:opacity-40"
                    >
                      <CheckCircle2 size={10} /> {busyId === drift.id ? "Saving…" : "Mark reverted"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}