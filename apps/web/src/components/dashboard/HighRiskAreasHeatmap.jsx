import React, { useMemo, useState } from "react";
import { CalendarRange, Flame } from "lucide-react";

const MONTHS = 6;
const TOP_AREAS = 8;

function monthBuckets(now) {
  const buckets = [];
  for (let index = MONTHS - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString("en-GB", { month: "short" }),
    });
  }
  return buckets;
}

function weightOf(severity) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

export default function HighRiskAreasHeatmap({ findings = [] }) {
  const [now] = useState(() => new Date());
  const [selected, setSelected] = useState(null);

  const months = useMemo(() => monthBuckets(now), [now]);

  const rows = useMemo(() => {
    const map = new Map();
    (findings || []).forEach((finding) => {
      const stamp = finding.detected_at || finding.created_date;
      if (!stamp) return;
      const detected = new Date(stamp);
      if (Number.isNaN(detected.getTime())) return;
      const key = `${detected.getFullYear()}-${String(detected.getMonth() + 1).padStart(2, "0")}`;
      if (!months.some((month) => month.key === key)) return;

      const name = finding.asset_name || "Unmapped asset";
      const severity = String(finding.severity || finding.normalized_severity || "info").toLowerCase();
      if (!map.has(name)) {
        map.set(name, { name, cells: {}, total: 0, critical: 0, weighted: 0, firstSeen: detected });
      }
      const row = map.get(name);
      const cell = row.cells[key] || { total: 0, critical: 0 };
      cell.total += 1;
      if (severity === "critical") cell.critical += 1;
      row.cells[key] = cell;
      row.total += 1;
      row.weighted += weightOf(severity);
      if (severity === "critical") row.critical += 1;
      if (detected < row.firstSeen) row.firstSeen = detected;
    });
    return [...map.values()].sort((a, b) => b.weighted - a.weighted).slice(0, TOP_AREAS);
  }, [findings, months]);

  const maxCell = useMemo(
    () => Math.max(1, ...rows.flatMap((row) => months.map((month) => row.cells[month.key]?.total || 0))),
    [rows, months]
  );

  const peak = rows[0] || null;

  return (
    <div className="rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-start gap-2">
          <Flame size={15} className="text-red-400 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">High-risk areas over time</p>
            <p className="text-[10px] text-slate-500">
              New findings per asset per month · darker = more findings · rows ranked by weighted severity
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-slate-400">
          <CalendarRange size={11} /> last {MONTHS} months
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-500 px-4 py-8 text-center">
          No findings were detected in the last {MONTHS} months, so there is nothing to plot yet.
        </p>
      ) : (
        <div className="px-3 py-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[9px] font-bold uppercase tracking-wider text-slate-500 pb-1.5">Area</th>
                {months.map((month) => (
                  <th key={month.key} className="text-center text-[9px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 w-10">
                    {month.label}
                  </th>
                ))}
                <th className="text-right text-[9px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 w-12">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelected = selected === row.name;
                return (
                  <tr
                    key={row.name}
                    onClick={() => setSelected(isSelected ? null : row.name)}
                    className="cursor-pointer"
                    style={{ background: isSelected ? "rgba(59,130,246,0.10)" : "transparent" }}
                  >
                    <td className="py-1 pr-2 max-w-[150px]">
                      <p className={`text-[11px] truncate ${isSelected ? "text-white font-bold" : "text-slate-300"}`}>{row.name}</p>
                      <p className="text-[9px] text-slate-600">{row.total} finding{row.total === 1 ? "" : "s"} · {row.critical} critical</p>
                    </td>
                    {months.map((month) => {
                      const cell = row.cells[month.key];
                      const count = cell?.total || 0;
                      const intensity = count === 0 ? 0 : 0.14 + (count / maxCell) * 0.66;
                      return (
                        <td key={month.key} className="p-0.5">
                          <div
                            title={`${row.name} · ${month.label}: ${count} new finding${count === 1 ? "" : "s"}${cell?.critical ? `, ${cell.critical} critical` : ""}`}
                            className="h-7 rounded flex items-center justify-center text-[10px] font-mono"
                            style={{
                              background: count === 0 ? "rgba(30,41,59,0.35)" : `rgba(239,68,68,${intensity})`,
                              border: cell?.critical ? "1px solid rgba(239,68,68,0.75)" : "1px solid rgba(148,163,184,0.08)",
                              color: count === 0 ? "#475569" : "#fecaca",
                            }}
                          >
                            {count || ""}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-right pl-1">
                      <span className="text-[11px] font-bold font-mono text-red-300">{row.weighted}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (() => {
        const row = rows.find((item) => item.name === selected);
        if (!row) return null;
        const busiest = months.reduce((best, month) => ((row.cells[month.key]?.total || 0) > (row.cells[best.key]?.total || 0) ? month : best), months[0]);
        return (
          <div className="mx-3 mb-3 rounded-lg px-3 py-2 text-[10px] text-slate-300" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
            <span className="font-bold text-white">{row.name}</span> · {row.total} findings ({row.critical} critical) over {MONTHS} months ·
            peak month <span className="text-red-300 font-semibold">{busiest.label}</span> with {row.cells[busiest.key]?.total || 0} new ·
            first detected {row.firstSeen.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        );
      })()}

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-600">Fewer</span>
          {[0.14, 0.32, 0.5, 0.68, 0.8].map((alpha) => (
            <span key={alpha} className="w-3 h-3 rounded-sm" style={{ background: `rgba(239,68,68,${alpha})` }} />
          ))}
          <span className="text-[9px] text-slate-600">More</span>
        </div>
        <span className="text-[9px] text-slate-600">
          {peak ? `Hottest area: ${peak.name}` : "No data"} · tap a row for its detail
        </span>
      </div>
    </div>
  );
}