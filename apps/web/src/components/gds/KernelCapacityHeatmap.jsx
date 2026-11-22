import React, { useMemo } from "react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, Card } from "@/components/gds/GDSOSShared";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]; // every 2 hrs

function getIntensityColor(count, max) {
  if (max === 0 || count === 0) return "rgba(255,255,255,0.03)";
  const ratio = count / max;
  if (ratio >= 0.85) return `${DANGER}cc`;
  if (ratio >= 0.6)  return `${HIGH}99`;
  if (ratio >= 0.35) return `${MEDIUM}88`;
  if (ratio >= 0.1)  return `${CYAN}55`;
  return `${CYAN}22`;
}

function getLabelColor(count, max) {
  if (max === 0 || count === 0) return "transparent";
  const ratio = count / max;
  if (ratio >= 0.35) return "#ffffff";
  return MUTED;
}

export default function KernelCapacityHeatmap({ sessions = [] }) {
  // Build a 7×12 grid: day-of-week × hour-bucket (every 2hrs)
  const { grid, maxCount, peakDay, peakHour } = useMemo(() => {
    // grid[day][hourIdx] = count
    const grid = Array.from({ length: 7 }, () => Array(12).fill(0));
    sessions.forEach(s => {
      const d = new Date(s.created_date || s.started_at || 0);
      if (isNaN(d.getTime())) return;
      const day = d.getDay();           // 0=Sun
      const hourIdx = Math.floor(d.getHours() / 2); // 0-11
      grid[day][hourIdx]++;
    });
    let maxCount = 0, peakDay = 0, peakHour = 0;
    grid.forEach((row, d) => row.forEach((c, h) => {
      if (c > maxCount) { maxCount = c; peakDay = d; peakHour = h; }
    }));
    return { grid, maxCount, peakDay, peakHour };
  }, [sessions]);

  const peakLabel = maxCount > 0
    ? `${DAYS[peakDay]} ${HOURS[peakHour]}:00–${HOURS[peakHour] + 2}:00`
    : "No data";

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Agent Capacity Heatmap</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
            Sessions per 2-hour window across the week — spot peak load periods
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          {maxCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold" style={{ color: MUTED }}>Peak:</span>
              <span className="font-black font-mono" style={{ color: DANGER }}>{peakLabel}</span>
              <span className="font-black font-mono" style={{ color: DANGER }}>({maxCount})</span>
            </span>
          )}
          {/* Legend */}
          <div className="flex items-center gap-1">
            <span style={{ color: MUTED }}>Low</span>
            {[`${CYAN}22`, `${CYAN}55`, `${MEDIUM}88`, `${HIGH}99`, `${DANGER}cc`].map((c, i) => (
              <span key={i} className="w-4 h-3 rounded-sm inline-block" style={{ background: c }} />
            ))}
            <span style={{ color: MUTED }}>High</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 520 }}>
          {/* Hour labels */}
          <div className="flex mb-1 ml-10">
            {HOURS.map(h => (
              <div key={h} className="flex-1 text-center text-[9px] font-mono" style={{ color: MUTED }}>
                {String(h).padStart(2, "0")}h
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAYS.map((day, d) => (
            <div key={day} className="flex items-center mb-1">
              <span className="w-10 text-[10px] font-bold flex-shrink-0 text-right pr-2" style={{ color: MUTED }}>{day}</span>
              {grid[d].map((count, h) => {
                const bg = getIntensityColor(count, maxCount);
                const textColor = getLabelColor(count, maxCount);
                const isPeak = d === peakDay && h === peakHour && maxCount > 0;
                return (
                  <div key={h} className="flex-1 mx-px"
                    title={`${day} ${HOURS[h]}:00–${HOURS[h] + 2}:00 · ${count} session${count !== 1 ? "s" : ""}`}>
                    <div
                      className="rounded flex items-center justify-center transition-all duration-500"
                      style={{
                        background: bg,
                        height: 28,
                        border: isPeak ? `1px solid ${DANGER}` : `1px solid rgba(255,255,255,0.03)`,
                        boxShadow: isPeak ? `0 0 8px ${DANGER}55` : "none",
                      }}>
                      {count > 0 && (
                        <span className="text-[9px] font-black font-mono" style={{ color: textColor }}>
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Day totals bar */}
          <div className="flex items-center mt-2">
            <span className="w-10 text-[9px] flex-shrink-0 text-right pr-2" style={{ color: MUTED }}>Total</span>
            {HOURS.map((_, h) => {
              const colTotal = DAYS.reduce((sum, _, d) => sum + grid[d][h], 0);
              const maxCol = Math.max(...HOURS.map((_, hi) => DAYS.reduce((s, _, di) => s + grid[di][hi], 0)), 1);
              return (
                <div key={h} className="flex-1 mx-px flex flex-col items-center gap-0.5">
                  <div className="w-full rounded" style={{
                    height: Math.max(2, (colTotal / maxCol) * 18),
                    background: colTotal > 0 ? `${CYAN}60` : "rgba(255,255,255,0.03)",
                    transition: "height 0.5s ease"
                  }} />
                  <span className="text-[8px] font-mono" style={{ color: colTotal > 0 ? MUTED : "transparent" }}>{colTotal}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sessions.length === 0 && (
        <p className="text-[11px] text-center py-4" style={{ color: MUTED }}>
          No session history yet — heatmap will populate as sessions run
        </p>
      )}
    </Card>
  );
}