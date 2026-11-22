import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { buildImpactModel } from "@/lib/patchImpact";
import { Target, TrendingDown, ChevronDown, ChevronRight, Wrench, ExternalLink } from "lucide-react";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };
const TARGET_KPI = "Overall Risk Score";

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function RiskReductionTargetWidget() {
  const [scores, setScores] = useState([]);
  const [targetScore, setTargetScore] = useState(null);
  const [openFindings, setOpenFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    (async () => {
      const [scoreRows, kpiRows, openRows] = await Promise.all([
        base44.entities.GlobalRiskScore.list("-calculated_at", 200).catch(() => []),
        base44.entities.KPI.list("-created_date", 100).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 500).catch(() => []),
      ]);
      setScores(scoreRows || []);
      const kpi = (kpiRows || []).find((k) => (k.name || "").toLowerCase() === TARGET_KPI.toLowerCase());
      const value = Number(kpi?.target_value);
      setTargetScore(Number.isFinite(value) ? value : null);
      setOpenFindings(openRows || []);
      setLoading(false);
    })();
  }, []);

  // Live: a new risk snapshot arrives and the widget recalculates without a reload.
  useEffect(() => base44.entities.GlobalRiskScore.subscribe((event) => {
    if (event.type === "delete") return;
    setScores((prev) => [event.data, ...prev.filter((row) => row.id !== event.data.id)]
      .sort((a, b) => new Date(b.calculated_at || 0) - new Date(a.calculated_at || 0)));
  }), []);

  const view = useMemo(() => {
    const start = monthStart().getTime();
    const monthRows = scores
      .filter((row) => row.calculated_at && new Date(row.calculated_at).getTime() >= start)
      .sort((a, b) => new Date(a.calculated_at) - new Date(b.calculated_at));
    const baseline = monthRows[0]?.overall_score ?? null;
    const current = scores[0]?.overall_score ?? monthRows[monthRows.length - 1]?.overall_score ?? null;
    const reduction = baseline != null && current != null ? Math.max(0, baseline - current) : null;
    const targetReduction = baseline != null && targetScore != null ? Math.max(0, baseline - targetScore) : null;
    const progress = targetReduction ? Math.min(100, Math.round(((reduction || 0) / targetReduction) * 100)) : null;
    const gap = targetReduction != null ? Math.max(0, targetReduction - (reduction || 0)) : null;

    const model = buildImpactModel(openFindings, current);
    const assets = new Map();
    model.rows.forEach(({ finding, delta }) => {
      const key = finding.asset_name || "Unassigned asset";
      const row = assets.get(key) || { asset: key, points: 0, findings: [] };
      row.points += delta;
      row.findings.push(finding);
      assets.set(key, row);
    });

    return {
      baseline,
      current,
      reduction,
      targetReduction,
      progress,
      gap,
      hasSnapshots: monthRows.length > 0,
      assets: [...assets.values()].sort((a, b) => b.points - a.points).slice(0, 8),
    };
  }, [scores, targetScore, openFindings]);

  if (loading) {
    return <div className="rounded-xl h-32 animate-pulse" style={{ background: "#111827", border: "1px solid #1F2937" }} />;
  }

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Target size={15} className="text-emerald-400" />
        <p className="text-sm font-bold text-white">Risk reduction against target</p>
        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
        </span>
        <Link to="/executive-dashboard" className="ml-auto text-[10px] font-medium text-slate-400 hover:text-emerald-300">
          Target settings
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg p-2.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <div className="flex items-center gap-1.5 mb-1"><TrendingDown size={11} className="text-blue-400" /><p className="text-[9px] uppercase text-slate-500">Reduced this month</p></div>
          <p className="text-lg font-bold text-white font-mono">{view.hasSnapshots && view.reduction != null ? view.reduction.toFixed(1) : "—"}</p>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <p className="text-[9px] uppercase text-slate-500 mb-1">Target reduction</p>
          <p className="text-lg font-bold text-emerald-400 font-mono">{view.targetReduction != null ? view.targetReduction.toFixed(1) : "—"}</p>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <p className="text-[9px] uppercase text-slate-500 mb-1">Still to close</p>
          <p className="text-lg font-bold font-mono" style={{ color: view.gap ? "#f59e0b" : "#10b981" }}>{view.gap != null ? view.gap.toFixed(1) : "—"}</p>
        </div>
      </div>

      <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: "#0a0f1e" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${view.progress ?? 0}%`, background: "linear-gradient(90deg,#3b82f6,#10b981)" }} />
      </div>
      <p className="text-[10px] text-slate-500 mb-3">
        {view.progress != null
          ? `${view.progress}% of the ${view.targetReduction.toFixed(1)}-point target · score ${view.baseline?.toFixed(1)} → ${Number.isFinite(view.current) ? view.current.toFixed(1) : "—"}`
          : "Set an Overall Risk Score target on the executive dashboard to measure progress."}
      </p>

      <p className="text-[10px] uppercase text-slate-500 mb-1.5">Reduction available by asset</p>
      {view.assets.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-2">No open findings to work through.</p>
      ) : (
        <div className="space-y-1">
          {view.assets.map((row) => {
            const open = expanded === row.asset;
            return (
              <div key={row.asset} className="rounded-lg overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <button onClick={() => setExpanded(open ? null : row.asset)} className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white/5 transition">
                  {open ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
                  <span className="text-[11px] text-slate-200 flex-1 min-w-0 truncate">{row.asset}</span>
                  <span className="text-[10px] text-slate-500">{row.findings.length} open</span>
                  <span className="text-[11px] font-mono text-emerald-400">+{row.points.toFixed(1)} pts</span>
                </button>

                {open && (
                  <div className="px-2.5 pb-2 space-y-1.5 border-t" style={{ borderColor: "#1F2937" }}>
                    {row.findings.map((finding) => {
                      const severity = finding.severity || finding.normalized_severity || "info";
                      return (
                        <div key={finding.id} className="pt-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-bold uppercase w-12" style={{ color: SEV_COLOR[severity] || SEV_COLOR.info }}>{severity}</span>
                            <span className="text-[11px] text-slate-200 flex-1 min-w-0">{finding.title}</span>
                            <span className="text-[10px] font-mono text-slate-500">{finding.cvss_score ?? "—"}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 pl-[3.4rem] flex items-start gap-1">
                            <Wrench size={9} className="text-purple-400 mt-0.5 flex-shrink-0" />
                            <span className="min-w-0">{finding.remediation || finding.next_action_item || "Remediation plan not recorded yet."}</span>
                          </p>
                          <Link to="/triage" className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-0.5 pl-[3.4rem]">
                            Open in triage <ExternalLink size={9} />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[9px] text-slate-600 mt-2">Per-asset points are a planning estimate: the recorded score gap is shared across open findings by severity and CVSS.</p>
    </div>
  );
}