import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const WINDOWS = [
  { key: 30, label: "30 days" },
  { key: 90, label: "90 days" },
  { key: 0, label: "All" },
];

function dayLabel(value) {
  const d = new Date(value);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function RiskTargetTrendChart({ records = [], target, onSaveTarget, savingTarget }) {
  const [days, setDays] = useState(30);
  const [draft, setDraft] = useState(target ?? "");
  const [justSaved, setJustSaved] = useState(false);

  const scored = useMemo(
    () =>
      records
        .filter((r) => Number.isFinite(Number(r.overall_score)) && r.calculated_at)
        .map((r) => ({
          at: r.calculated_at,
          score: Number(r.overall_score),
          grade: r.grade,
          open: r.total_open_findings,
          critical: r.critical_findings,
        }))
        .sort((a, b) => new Date(a.at) - new Date(b.at)),
    [records]
  );

  const inWindow = useMemo(() => {
    if (days === 0) return scored;
    const cutoff = Date.now() - days * 86400000;
    return scored.filter((p) => new Date(p.at).getTime() >= cutoff);
  }, [scored, days]);

  const chartData = inWindow.map((p) => ({ label: dayLabel(p.at), score: p.score, at: p.at }));
  const latest = scored[scored.length - 1];
  const targetValue = Number.isFinite(Number(target)) ? Number(target) : null;
  const belowTarget = latest && targetValue != null ? latest.score < targetValue : null;

  async function save() {
    const value = Number(draft);
    if (!Number.isFinite(value) || value < 0 || value > 100) return;
    await onSaveTarget(value);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {WINDOWS.map((w) => (
          <button
            key={w.key}
            onClick={() => setDays(w.key)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
              days === w.key
                ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            {w.label}
          </button>
        ))}
        <span className="text-[11px] text-slate-500">
          {inWindow.length} snapshot{inWindow.length === 1 ? "" : "s"} in window
          {latest ? ` · latest ${latest.score} (${new Date(latest.at).toLocaleDateString()})` : ""}
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-slate-400">No risk score snapshots recorded in this window.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {latest
              ? `The most recent recorded score is ${latest.score} from ${new Date(latest.at).toLocaleDateString()}. Switch to "All" to see it.`
              : "Scores appear here once a snapshot is stored by the risk calculation."}
          </p>
        </div>
      ) : (
        <div style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} stroke="#1F2937" />
              <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} stroke="#1F2937" />
              <Tooltip
                contentStyle={{ background: "#0a0f1e", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(value, name) => [value, name === "target" ? "Target" : "Overall score"]}
              />
              {targetValue != null && (
                <ReferenceLine y={targetValue} stroke="#f59e0b" strokeDasharray="5 4" label={{ value: `target ${targetValue}`, fill: "#f59e0b", fontSize: 10, position: "insideTopRight" }} />
              )}
              <Line type="monotone" dataKey="score" name="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1" style={{ borderTop: "1px solid #1F2937" }}>
        <span className="text-[11px] text-slate-500 pt-2">Target score</span>
        <input
          type="number"
          min={0}
          max={100}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. 92"
          className="mt-2 w-24 px-2 py-1 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none"
        />
        <button
          onClick={save}
          disabled={savingTarget || draft === ""}
          className="mt-2 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition disabled:opacity-40"
        >
          {savingTarget ? "Saving…" : justSaved ? "Saved" : "Save target"}
        </button>
        <span className="mt-2 text-[11px] text-slate-500">
          {targetValue == null
            ? "No target stored yet — save one to draw the comparison line."
            : !latest
              ? "No score snapshot recorded to compare with the target yet."
              : belowTarget
                ? `${(targetValue - latest.score).toFixed(1)} pts below the stored target.`
                : `At or above the stored target.`}
        </span>
      </div>
      <p className="text-[10px] text-slate-600">
        Only the current target is stored (one value); no historical target snapshots exist, so the line is constant across the window.
      </p>
    </div>
  );
}