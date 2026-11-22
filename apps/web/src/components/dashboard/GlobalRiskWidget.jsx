import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const PILLARS = [
  { key: "code_security_score",  init: "C" },
  { key: "cloud_security_score", init: "Cl" },
  { key: "attack_surface_score", init: "A" },
  { key: "runtime_score",        init: "R" },
  { key: "supply_chain_score",   init: "S" },
  { key: "governance_score",     init: "G" },
  { key: "identity_score",       init: "I" },
  { key: "data_score",           init: "D" },
];

function getGrade(score) {
  if (score >= 90) return { grade: "A", color: "#22c55e" };
  if (score >= 80) return { grade: "B", color: "#14b8a6" };
  if (score >= 65) return { grade: "C", color: "#eab308" };
  if (score >= 50) return { grade: "D", color: "#f97316" };
  return { grade: "F", color: "#ef4444" };
}

function getGlow(score) {
  if (score == null) return "rgba(100,116,139,0.3)";
  if (score >= 80) return "rgba(34,197,94,0.25)";
  if (score >= 50) return "rgba(234,179,8,0.25)";
  return "rgba(239,68,68,0.35)";
}

export default function GlobalRiskWidget() {
  const [recalcLoading, setRecalcLoading] = useState(false);
  const qc = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["global-risk-widget"],
    queryFn: () => base44.entities.GlobalRiskScore.list("-calculated_at", 2).catch(() => []),
    initialData: [],
    refetchInterval: 5 * 60 * 1000, // every 5 minutes
    staleTime: 4 * 60 * 1000,
  });

  const current = history[0] || null;
  const previous = history[1] || null;
  const score = current?.overall_score ?? null;
  const prevScore = previous?.overall_score ?? null;
  const delta = score != null && prevScore != null ? score - prevScore : null;
  const { grade, color: scoreColor } = score != null ? getGrade(score) : { grade: "—", color: "#64748b" };
  const glow = getGlow(score);

  const handleRecalculate = async () => {
    setRecalcLoading(true);
    try {
      await base44.functions.invoke("shieldGlobalScore", { action: "calculate", save_to_db: true });
      qc.invalidateQueries({ queryKey: ["global-risk-widget"] });
      qc.invalidateQueries({ queryKey: ["global-risk-history"] });
      toast.success("Risk score recalculated");
    } catch { toast.error("Recalculation failed"); }
    finally { setRecalcLoading(false); }
  };

  const TrendIcon = delta == null ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const trendColor = delta == null ? "#64748b" : delta > 0 ? "#22c55e" : "#ef4444";

  const critCount = current?.critical_findings ?? 0;
  const highCount = current?.high_findings ?? 0;
  const totalOpen = current?.total_open_findings ?? 0;

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#0d1117,#111827)", border: `1px solid ${scoreColor}40`, boxShadow: `0 0 30px ${glow}` }}>
      {/* BG glow */}
      <div className="absolute inset-0 pointer-events-none opacity-5" style={{ background: `radial-gradient(ellipse at 20% 50%, ${scoreColor}, transparent 60%)` }} />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5">
        {/* Score circle */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {isLoading ? (
            <div className="w-20 h-20 rounded-full bg-slate-800 animate-pulse" />
          ) : score == null ? (
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ border: "2px dashed #374151" }}>
              <span className="text-[10px] text-slate-500 text-center px-1">Not yet calculated</span>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ border: `3px solid ${scoreColor}`, boxShadow: `0 0 20px ${scoreColor}40` }}>
              <span className="text-3xl font-black font-mono" style={{ color: scoreColor }}>{score}</span>
            </div>
          )}
          {/* Grade + trend */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-black w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ color: scoreColor, background: `${scoreColor}20`, border: `1px solid ${scoreColor}30`, fontSize: 20 }}>
                {grade}
              </span>
              {delta != null && (
                <div className="flex items-center gap-1 text-xs font-bold" style={{ color: trendColor }}>
                  <TrendIcon className="w-3.5 h-3.5" />
                  {delta > 0 ? "+" : ""}{delta}
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500">Overall Security Posture</p>
            {score == null && !isLoading && (
              <button onClick={handleRecalculate} disabled={recalcLoading}
                className="mt-1.5 text-[10px] font-bold text-blue-400 hover:underline flex items-center gap-1">
                {recalcLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Calculate Now →
              </button>
            )}
          </div>
        </div>

        {/* Pillar mini-bars */}
        {current && (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">Pillar Scores</p>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {PILLARS.map(p => {
                const s = current[p.key] ?? 50;
                const { color: c } = getGrade(s);
                return (
                  <div key={p.key} className="flex flex-col items-center gap-1">
                    <div className="w-full h-10 rounded-md flex items-end overflow-hidden" style={{ background: "#1e293b" }}>
                      <div className="w-full rounded-sm transition-all" style={{ height: `${s}%`, background: c, opacity: 0.85 }} />
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">{p.init}</span>
                    <span className="text-[9px] font-bold font-mono" style={{ color: c }}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats + actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {current && (
            <div className="text-[10px] text-slate-400 space-y-0.5">
              {critCount > 0 && <p><span className="text-red-400 font-bold">{critCount} critical</span> · {highCount > 0 ? <span className="text-orange-400 font-bold">{highCount} high</span> : null}</p>}
              {totalOpen > 0 && <p className="text-slate-500">{totalOpen} total open findings</p>}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Link to="/risk-score"
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
              style={{ background: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}30` }}>
              View Full Report →
            </Link>
            <button onClick={handleRecalculate} disabled={recalcLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50 flex items-center gap-1.5">
              {recalcLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Recalc
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}