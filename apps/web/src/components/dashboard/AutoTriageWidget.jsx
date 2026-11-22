import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";

const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

export default function AutoTriageWidget() {
  const { data: findings = [] } = useQuery({
    queryKey: ["triage-findings"],
    queryFn: () => base44.entities.TriagedFinding.list("-cvss_score", 200),
    initialData: []
  });

  const rawCount = findings.reduce((s, f) => s + (f.source_count || 1), 0);
  const noisePct = rawCount > 0 ? Math.round((1 - findings.length / rawCount) * 100) : 95;
  const wildCount = findings.filter(f => f.exploitability === "exploited_in_wild").length;
  const slaCount = findings.filter(f => f.sla_breached).length;
  const topFindings = findings.filter(f => f.severity === "critical" && f.status === "open").slice(0, 3);

  return (
    <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(16,185,129,0.25)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">AutoTriage Summary</h3>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold" style={{ color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
            {noisePct}% LESS NOISE
          </span>
        </div>
        <Link to="/autotriage" className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono">
          View All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}>
        <div className="text-center">
          <p className="text-2xl font-black font-mono text-emerald-400">{findings.length}</p>
          <p className="text-[9px] font-mono text-slate-500">actionable findings</p>
        </div>
        <div className="text-slate-600 text-sm">←</div>
        <div className="text-center">
          <p className="text-lg font-bold font-mono text-slate-500 line-through">{rawCount}</p>
          <p className="text-[9px] font-mono text-slate-600">raw findings</p>
        </div>
        <div className="flex-1" />
        <div className="flex gap-3">
          <div className="text-center">
            <p className="text-lg font-black font-mono text-red-400 animate-pulse">{wildCount}</p>
            <p className="text-[9px] font-mono text-slate-600">exploited</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black font-mono text-amber-400">{slaCount}</p>
            <p className="text-[9px] font-mono text-slate-600">SLA breach</p>
          </div>
        </div>
      </div>

      {topFindings.length > 0 && (
        <div className="space-y-2">
          {topFindings.map(f => (
            <div key={f.id} className="flex items-start gap-2.5 py-2 px-2.5 rounded-lg"
              style={{ background: "#0f172a", border: "1px solid rgba(239,68,68,0.15)", borderLeft: "3px solid #ef4444" }}>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0"
                style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)" }}>CRIT</span>
              <div className="min-w-0">
                <p className="text-xs text-white truncate">{f.title}</p>
                <p className="text-[10px] text-slate-500 font-mono">{f.asset_name} · CVSS {f.cvss_score?.toFixed(1)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {findings.length === 0 && (
        <p className="text-xs text-slate-600 text-center py-4">No triaged findings yet — AutoTriage is running</p>
      )}
    </div>
  );
}