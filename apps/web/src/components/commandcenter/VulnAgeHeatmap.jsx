import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, X, AlertTriangle, ArrowUpRight } from "lucide-react";
import { loadSlaTargets, slaHours, subscribeSlaHours } from "@/lib/slaTargets";

const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };
const BUCKETS = [
  { key: "0-7", label: "0–7d", min: 0, max: 7 },
  { key: "8-30", label: "8–30d", min: 8, max: 30 },
  { key: "31-60", label: "31–60d", min: 31, max: 60 },
  { key: "61-90", label: "61–90d", min: 61, max: 90 },
  { key: "90+", label: "90d+", min: 91, max: Infinity },
];

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ageDays(finding, now) {
  const stamp = finding.detected_at || finding.created_date || finding.sla_deadline;
  if (!stamp) return 0;
  return Math.max(0, Math.floor((now - new Date(stamp).getTime()) / 86400000));
}

function bucketFor(days) {
  return BUCKETS.find((bucket) => days >= bucket.min && days <= bucket.max) || BUCKETS[0];
}

export default function VulnAgeHeatmap({ findings }) {
  const [now] = useState(Date.now());
  const [selected, setSelected] = useState(null);
  const [, setVersion] = useState(0);

  useEffect(() => {
    loadSlaTargets();
    return subscribeSlaHours(() => setVersion((version) => version + 1));
  }, []);

  const enriched = useMemo(() => {
    const hours = slaHours();
    return (findings || []).map((finding) => {
      const severity = finding.severity || finding.normalized_severity || "info";
      const days = ageDays(finding, now);
      const allowed = Number(hours[severity]) || 0;
      const breached = Boolean(finding.sla_breached) || (allowed > 0 && days * 24 > allowed);
      return { ...finding, severity, days, ageBucket: bucketFor(days), breached };
    });
  }, [findings, now]);

  const matrix = useMemo(() => {
    const map = new Map();
    enriched.forEach((finding) => {
      const key = `${finding.severity}|${finding.ageBucket.key}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(finding);
    });
    return map;
  }, [enriched]);

  const max = useMemo(() => Math.max(1, ...[...matrix.values()].map((rows) => rows.length)), [matrix]);
  const breached = enriched.filter((finding) => finding.breached);
  const criticalOverdue = breached.filter((finding) => finding.severity === "critical");
  const oldest = enriched.reduce((acc, finding) => Math.max(acc, finding.days), 0);

  const cellFindings = selected ? matrix.get(`${selected.severity}|${selected.bucket}`) || [] : [];

  if (enriched.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-bold text-white mb-1">Vulnerability age heatmap</p>
        <p className="text-xs text-slate-500 py-6 text-center">No open findings to age.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-blue-400" />
          <p className="text-sm font-bold text-white">Vulnerability age heatmap</p>
          <span className="text-[10px] text-slate-500">open findings by age × severity — red outline means past SLA</span>
        </div>
        {selected && (
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200">
            <X size={11} /> Reset
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-2" style={{ borderBottom: "1px solid #1F2937" }}>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${criticalOverdue.length ? "bg-red-500/20 border-red-500/60 text-red-300 animate-pulse" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"}`}>
          <AlertTriangle size={10} /> {criticalOverdue.length} critical past SLA
        </span>
        <span className="text-[10px] text-slate-400">{breached.length} of {enriched.length} findings overdue</span>
        <span className="text-[10px] text-slate-500">oldest open {oldest}d</span>
        <Link to="/sla-radar" className="ml-auto flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300">
          SLA radar <ArrowUpRight size={10} />
        </Link>
      </div>

      <div className="p-3 overflow-x-auto">
        <div className="min-w-[400px]">
          <div className="grid" style={{ gridTemplateColumns: "78px repeat(5, minmax(0, 1fr))", gap: 4 }}>
            <div />
            {BUCKETS.map((bucket) => (
              <p key={bucket.key} className="text-[9px] font-bold uppercase text-center text-slate-500">{bucket.label}</p>
            ))}
            {SEVERITIES.map((severity) => (
              <React.Fragment key={severity}>
                <p className="text-[10px] font-bold uppercase truncate pr-1 self-center" style={{ color: SEV_COLOR[severity] }}>{severity}</p>
                {BUCKETS.map((bucket) => {
                  const cell = matrix.get(`${severity}|${bucket.key}`) || [];
                  const cellBreached = cell.filter((finding) => finding.breached).length;
                  const active = selected?.severity === severity && selected?.bucket === bucket.key;
                  const intensity = 0.18 + (cell.length / Math.max(1, max)) * 0.62;
                  return (
                    <button
                      key={`${severity}-${bucket.key}`}
                      onClick={() => setSelected(cell.length === 0 ? null : active ? null : { severity, bucket: bucket.key })}
                      disabled={cell.length === 0}
                      className="rounded-md h-9 flex items-center justify-center gap-1 text-[11px] font-mono font-bold transition disabled:cursor-default"
                      style={{
                        background: cell.length ? hexToRgba(SEV_COLOR[severity], intensity) : "rgba(30,41,59,0.35)",
                        color: cell.length ? "#f8fafc" : "#334155",
                        border: cellBreached ? `1px solid ${SEV_COLOR[severity]}` : active ? "1px solid #3b82f6" : "1px solid transparent",
                        boxShadow: cellBreached ? `0 0 8px ${hexToRgba(SEV_COLOR[severity], 0.55)}` : "none",
                      }}
                      title={`${severity} · ${bucket.label}: ${cell.length} finding(s)${cellBreached ? `, ${cellBreached} past SLA` : ""}`}
                    >
                      {cell.length || "·"}
                      {cellBreached > 0 && <AlertTriangle size={9} className="text-red-200" />}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {selected && cellFindings.length > 0 && (
        <div className="border-t border-slate-800 px-3 py-3">
          <p className="text-[11px] font-bold text-white mb-2">
            {selected.severity} · {BUCKETS.find((bucket) => bucket.key === selected.bucket)?.label} · {cellFindings.length} finding(s)
          </p>
          <div className="space-y-1.5">
            {[...cellFindings].sort((a, b) => b.days - a.days).slice(0, 8).map((finding) => (
              <div key={finding.id} className="rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: `3px solid ${SEV_COLOR[finding.severity]}` }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold text-slate-200">{finding.title}</p>
                  <span className={`text-[9px] font-bold whitespace-nowrap ${finding.breached ? "text-red-300" : "text-slate-500"}`}>{finding.days}d</span>
                </div>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                  {[finding.asset_name, finding.cve_id, finding.breached ? "past SLA" : null].filter(Boolean).join(" · ") || "unassigned asset"}
                </p>
              </div>
            ))}
          </div>
          {cellFindings.length > 8 && <p className="text-[9px] text-slate-500 mt-1.5">+{cellFindings.length - 8} more in this cell.</p>}
        </div>
      )}
    </div>
  );
}