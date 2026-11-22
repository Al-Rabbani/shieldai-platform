import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2, Download, History, ShieldQuestion } from "lucide-react";
import { format } from "date-fns";
import { exportAssetForensicPdf } from "@/lib/assetForensicPdf";

const SEV_STYLE = {
  critical: "text-red-300 border-red-500/40 bg-red-500/10",
  high: "text-orange-300 border-orange-500/40 bg-orange-500/10",
  medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  low: "text-blue-300 border-blue-500/40 bg-blue-500/10",
};

export default function AssetForensicHistory({ asset }) {
  const [drifts, setDrifts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!asset?.name) return;
    let active = true;
    setLoading(true);
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [driftRows, logRows] = await Promise.all([
        base44.entities.ConfigurationDrift.filter(
          { asset: asset.name, detected_at: { $gte: since } },
          "-detected_at",
          100
        ).catch(() => []),
        base44.entities.AuditLog.filter(
          { timestamp: { $gte: since }, action_type: "config_change" },
          "-timestamp",
          100
        ).catch(() => []),
      ]);
      if (!active) return;
      setDrifts(driftRows || []);
      setLogs((logRows || []).filter((log) => !log.resource_id || log.resource_id === asset.name));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [asset?.name]);

  const events = useMemo(() => {
    const driftEvents = drifts.map((drift) => ({
      id: `drift-${drift.id}`,
      at: drift.detected_at,
      kind: "drift",
      severity: drift.severity,
      title: String(drift.drift_type || "configuration drift").replace(/_/g, " "),
      expected: drift.expected_value,
      actual: drift.actual_value,
      status: drift.status,
      corrected_at: drift.corrected_at,
    }));
    const logEvents = logs.map((log) => ({
      id: `log-${log.id}`,
      at: log.timestamp,
      kind: "change",
      severity: null,
      title: log.action || "configuration change",
      actor: log.actor_email || log.actor_type,
    }));
    return [...driftEvents, ...logEvents]
      .filter((event) => event.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [drifts, logs]);

  const unreverted = drifts.filter((drift) => drift.status !== "corrected" && drift.status !== "accepted").length;

  if (loading) {
    return <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-10" />;
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <History size={12} className="text-blue-400" />
        <span className="font-bold uppercase tracking-wider">Last 30 days</span>
        <span>· {drifts.length} drift event{drifts.length === 1 ? "" : "s"}</span>
        <span>· {logs.length} logged change{logs.length === 1 ? "" : "s"}</span>
        {unreverted > 0 && <span className="text-amber-300 font-bold">· {unreverted} unreverted</span>}
        <button
          onClick={() => exportAssetForensicPdf({ asset, events, drifts, logs, unreverted })}
          disabled={events.length === 0}
          title="Download a PDF of every drift event and configuration change in this 30-day window"
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/40 hover:bg-blue-500/25 transition disabled:opacity-40"
        >
          <Download size={11} /> Forensic PDF
        </button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <ShieldQuestion size={18} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">No configuration change or drift event recorded for this asset in the last 30 days.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-border bg-card p-2.5"
              style={{ borderLeft: `3px solid ${event.kind === "drift" ? (event.severity === "critical" ? "#ef4444" : event.severity === "high" ? "#f97316" : "#eab308") : "#3b82f6"}` }}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-foreground capitalize">{event.title}</span>
                {event.severity && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize ${SEV_STYLE[event.severity] || SEV_STYLE.low}`}>{event.severity}</span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">{format(new Date(event.at), "MMM d, HH:mm")}</span>
              </div>

              {event.kind === "drift" && (
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[10px] font-mono text-emerald-300/90 truncate">expected: {event.expected || "—"}</p>
                  <p className="text-[10px] font-mono text-red-300/90 truncate">actual: {event.actual || "—"}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-1">
                {event.kind === "drift" ? (
                  <span className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${event.status === "corrected" ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" : "text-amber-300 border-amber-500/40 bg-amber-500/10"}`}>
                    {event.status === "corrected" ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />}
                    {String(event.status || "detected").replace(/_/g, " ")}
                  </span>
                ) : (
                  <span className="text-[9px] text-muted-foreground">by {event.actor || "system"}</span>
                )}
                {event.corrected_at && (
                  <span className="text-[9px] text-muted-foreground">reverted {format(new Date(event.corrected_at), "MMM d, HH:mm")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}