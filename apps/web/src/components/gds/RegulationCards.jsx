import React from "react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, CARD, SevBadge, Card } from "@/components/gds/GDSOSShared";

function usd(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function RegulationCards({ regulations = [] }) {
  if (!regulations.length) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {regulations.map((r, i) => {
        const isAtRisk = r.at_risk || r.compliance_score < 50;
        const scoreColor = (r.compliance_score ?? 0) >= 70 ? LOW : (r.compliance_score ?? 0) >= 40 ? MEDIUM : DANGER;
        return (
          <Card key={i} className="p-4" style={{ border: `1px solid ${isAtRisk ? DANGER + "50" : BORDER}` }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-white">{r.regulation || r.name || "Unknown"}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {r.region && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}25` }}>
                      {r.region}
                    </span>
                  )}
                  {r.impact && <SevBadge sev={r.impact} />}
                </div>
              </div>
              {isAtRisk && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: DANGER, background: `${DANGER}15` }}>AT RISK</span>
              )}
            </div>
            <div className="flex gap-4 text-[10px] mt-2">
              <div>
                <p style={{ color: MUTED }}>Score</p>
                <p className="font-black font-mono text-sm" style={{ color: scoreColor }}>
                  {r.compliance_score != null ? `${r.compliance_score}%` : "N/A"}
                </p>
              </div>
              <div>
                <p style={{ color: MUTED }}>Violations</p>
                <p className="font-black font-mono text-sm" style={{ color: r.open_violations > 0 ? DANGER : LOW }}>
                  {r.open_violations ?? 0}
                </p>
              </div>
              {r.fine_exposure && (
                <div>
                  <p style={{ color: MUTED }}>Fine Risk</p>
                  <p className="font-black font-mono text-sm" style={{ color: HIGH }}>{usd(r.fine_exposure)}</p>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function DeadlineTimeline({ deadlines = [] }) {
  if (!deadlines.length) return null;
  const sorted = [...deadlines].sort((a, b) => (a.days_remaining ?? 999) - (b.days_remaining ?? 999));
  return (
    <div className="space-y-2">
      {sorted.map((d, i) => {
        const days = d.days_remaining ?? 999;
        const color = days < 90 ? DANGER : days < 180 ? HIGH : LOW;
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
            <div className="w-12 text-center flex-shrink-0">
              <p className="text-lg font-black font-mono leading-none" style={{ color }}>{days}</p>
              <p className="text-[9px] uppercase" style={{ color: MUTED }}>days</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{d.regulation || d.name}</p>
              {d.deadline_type && <p className="text-[10px]" style={{ color: MUTED }}>{d.deadline_type}</p>}
            </div>
            {days < 90 && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded animate-pulse"
                style={{ color: DANGER, background: `${DANGER}15` }}>URGENT</span>
            )}
          </div>
        );
      })}
    </div>
  );
}