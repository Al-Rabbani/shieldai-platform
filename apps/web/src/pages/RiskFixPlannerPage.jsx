import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { buildImpactModel, projectImpact } from "@/lib/patchImpact";
import { Target, CheckSquare, Square, RotateCcw, TrendingUp, Sparkles } from "lucide-react";

const SEVERITY_STYLE = {
  critical: "bg-red-500/15 text-red-300 border-red-500/40",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  low: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  info: "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

export default function RiskFixPlannerPage() {
  const [findings, setFindings] = useState([]);
  const [score, setScore] = useState(null);
  const [scoreAt, setScoreAt] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sort, setSort] = useState("impact");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [risk, open] = await Promise.all([
        base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: "open" }, "-cvss_score", 500).catch(() => []),
      ]);
      setScore(risk[0]?.overall_score ?? null);
      setScoreAt(risk[0]?.calculated_at ?? null);
      setFindings(open || []);
      setLoading(false);
    })();
  }, []);

  const model = useMemo(() => buildImpactModel(findings, score), [findings, score]);
  const projection = useMemo(() => projectImpact(model, selectedIds), [model, selectedIds]);

  const rows = useMemo(() => {
    const list = model.rows.filter((r) => {
      const sev = r.finding.severity || r.finding.normalized_severity || "low";
      return severityFilter === "all" || sev === severityFilter;
    });
    return [...list].sort((a, b) => {
      if (sort === "cvss") return (Number(b.finding.cvss_score) || 0) - (Number(a.finding.cvss_score) || 0);
      if (sort === "severity") return b.weight - a.weight;
      return b.delta - a.delta;
    });
  }, [model, sort, severityFilter]);

  const severities = [...new Set(findings.map((f) => f.severity || f.normalized_severity || "low"))];

  function toggle(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectTopTen() {
    const best = [...model.rows].sort((a, b) => b.delta - a.delta).slice(0, 10).map((r) => r.finding.id);
    setSelectedIds(best);
  }

  const topTenGain = model.rows.length
    ? [...model.rows].sort((a, b) => b.delta - a.delta).slice(0, 10).reduce((sum, r) => sum + r.delta, 0)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3">
        <Target size={24} className="text-blue-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Risk Fix Planner</h1>
          <p className="text-xs text-slate-500">Toggle fixes to model the overall risk score before any work is committed</p>
        </div>
      </div>

      {model.currentScore == null ? (
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #f59e0b40" }}>
          <p className="text-sm font-semibold text-amber-300">No recorded risk score</p>
          <p className="text-xs text-slate-400 mt-1">
            The planner projects from the latest stored score snapshot. Once a GlobalRiskScore record exists, the projection and per-fix point estimates appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl p-4 sticky top-2 z-20" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-[10px] uppercase text-slate-500">Recorded score</p>
              <p className="text-2xl font-bold text-white font-mono">{model.currentScore.toFixed(1)} <span className="text-xs text-slate-500">/100 · {model.currentGrade}</span></p>
            </div>
            <div className="text-slate-600">→</div>
            <div>
              <p className="text-[10px] uppercase text-slate-500">Projected score</p>
              <p className="text-2xl font-bold font-mono text-emerald-400">
                {projection.projected == null ? "—" : projection.projected.toFixed(1)} <span className="text-xs text-slate-500">· {projection.projectedGrade}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-500">Fixes selected</p>
              <p className="text-lg font-bold text-white">{projection.removedCount} <span className="text-xs text-slate-500">of {findings.length}</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-500">Score gain</p>
              <p className="text-lg font-bold text-emerald-400 flex items-center gap-1"><TrendingUp size={14} /> +{projection.gain.toFixed(1)} pts</p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button onClick={selectTopTen} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition">
                <Sparkles size={12} /> Top 10 by impact
              </button>
              <button onClick={() => setSelectedIds([])} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-700/40 text-slate-300 border border-slate-700 hover:bg-slate-700/60 transition">
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Snapshot recorded {scoreAt ? new Date(scoreAt).toLocaleString() : "—"} · the {model.gap.toFixed(1)}-point gap to 100 is shared across the {findings.length} open findings in proportion to severity and CVSS. This is a planning estimate from stored numbers, not a recalculated platform score.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="px-2 py-1.5 rounded-lg text-[11px] bg-[#111827] border border-slate-700 text-white focus:border-blue-500 outline-none">
          <option value="all">All severities ({findings.length})</option>
          {severities.map((s) => <option key={s} value={s}>{s} ({findings.filter((f) => (f.severity || f.normalized_severity || "low") === s).length})</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-2 py-1.5 rounded-lg text-[11px] bg-[#111827] border border-slate-700 text-white focus:border-blue-500 outline-none">
          <option value="impact">Sort: highest score impact</option>
          <option value="cvss">Sort: highest CVSS</option>
          <option value="severity">Sort: severity weight</option>
        </select>
        {score != null && topTenGain > 0 && (
          <span className="text-[11px] text-slate-500">The 10 highest-impact fixes alone are worth +{topTenGain.toFixed(1)} points.</span>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        {rows.length === 0 ? (
          <p className="text-center py-10 text-xs text-slate-500">No open findings match this filter.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {rows.map(({ finding, delta }) => {
              const sev = finding.severity || finding.normalized_severity || "low";
              const isSelected = selectedIds.includes(finding.id);
              return (
                <button
                  key={finding.id}
                  onClick={() => toggle(finding.id)}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition"
                >
                  {isSelected ? <CheckSquare size={15} className="text-emerald-400 flex-shrink-0" /> : <Square size={15} className="text-slate-600 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{finding.title}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                      <span>{finding.asset_name || "no asset"}</span>
                      {finding.cve_id && <span className="font-mono">{finding.cve_id}</span>}
                      {finding.cvss_score != null && <span>CVSS {finding.cvss_score}</span>}
                      {finding.owner_team && <span>· {finding.owner_team}</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_STYLE[sev] || SEVERITY_STYLE.low}`}>{sev}</span>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 w-16 text-right">+{delta.toFixed(1)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}