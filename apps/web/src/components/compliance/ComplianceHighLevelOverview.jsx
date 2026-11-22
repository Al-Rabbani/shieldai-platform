import React from "react";

function scoreOf(frameworks, name) {
  const f = frameworks.find(fw => fw.name === name);
  return f ? (f.score || 0) : null;
}

function daysUntil(date) {
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}

function tierColor(score) {
  return score < 60 ? "#EF4444" : score < 80 ? "#F59E0B" : "#10B981";
}

export default function ComplianceHighLevelOverview({ frameworks }) {
  const soc2 = scoreOf(frameworks, "SOC2");
  const nist = scoreOf(frameworks, "NIST_CSF");

  const upcoming = [...frameworks]
    .filter(f => f.next_audit)
    .sort((a, b) => new Date(a.next_audit) - new Date(b.next_audit))
    .slice(0, 5);

  return (
    <div className="grid grid-cols-3 gap-4">
      {[{ label: "SOC 2", score: soc2 }, { label: "NIST CSF", score: nist }].map(f => (
        <div key={f.label} className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{f.label} Progress</p>
          {f.score == null ? (
            <p className="text-sm text-slate-600 mt-3">Not tracked yet.</p>
          ) : (
            <>
              <p className="text-3xl font-black mt-2" style={{ color: tierColor(f.score) }}>{f.score}%</p>
              <div className="h-2 rounded-full bg-slate-800 mt-2">
                <div className="h-full rounded-full" style={{ width: `${f.score}%`, background: tierColor(f.score) }} />
              </div>
            </>
          )}
        </div>
      ))}

      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Upcoming Audit Deadlines</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-600">No upcoming audits scheduled.</p>
        ) : (
          <div className="space-y-1.5">
            {upcoming.map(f => {
              const days = daysUntil(f.next_audit);
              return (
                <div key={f.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{f.name}</span>
                  <span className={`font-bold ${days <= 14 ? "text-red-400" : "text-slate-400"}`}>{days <= 0 ? "Overdue" : `${days}d`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}