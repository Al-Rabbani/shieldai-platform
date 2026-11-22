import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { SkeletonCards } from "@/components/shared/SkeletonLoader";

const GOLD = "#C9A84C";

const MATURITY_LEVELS = {
  1: { name: "Initial", desc: "Ad-hoc, reactive security" },
  2: { name: "Developing", desc: "Basic controls in place" },
  3: { name: "Defined", desc: "Documented and consistent processes" },
  4: { name: "Managed", desc: "Measured and quantitative" },
  5: { name: "Optimising", desc: "Continuous improvement, predictive" },
};

const LEVEL_REQUIREMENTS = {
  4: [
    { id: 1, text: "Implement automated vulnerability scanning", done: true },
    { id: 2, text: "Define SLA policies for findings", done: true },
    { id: 3, text: "Achieve <5% false positive rate", done: false, current: "14%" },
    { id: 4, text: "Mean time to resolve <2h for critical", done: false, current: "3.4h" },
    { id: 5, text: "100% repos connected to CI/CD gate", done: false, current: "47%" },
  ],
};

function MaturityGauge({ level }) {
  const r = 80;
  const circ = 2 * Math.PI * r;
  const pct = level / 5;
  const dash = pct * circ;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      <svg width={200} height={200} viewBox="0 0 200 200">
        <circle cx={100} cy={100} r={r} fill="none" stroke="#1F2937" strokeWidth={12} />
        <circle cx={100} cy={100} r={r} fill="none" stroke={GOLD} strokeWidth={12}
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
        <text x={100} y={90} textAnchor="middle" fill="white" fontSize={48} fontWeight="900">Level {level}</text>
        <text x={100} y={115} textAnchor="middle" fill={GOLD} fontSize={12} fontWeight="bold">{MATURITY_LEVELS[level]?.name}</text>
      </svg>
    </div>
  );
}

export default function MaturityPage() {
  const { data: assessments, isLoading } = useQuery({
    queryKey: ["maturity-assessments"],
    queryFn: () => base44.entities.MaturityAssessment.list("-assessment_date").catch(() => []),
    initialData: [],
  });

  const latest = assessments[0] || {
    overall_level: 3,
    risk_score: 73,
    critical_open: 12,
    mttd_minutes: 4.2,
    mttr_hours: 7.8,
  };

  const level4Progress = LEVEL_REQUIREMENTS[4].filter(r => r.done).length;
  const level4Total = LEVEL_REQUIREMENTS[4].length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCards count={5} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      {/* Hero Header */}
      <div className="fu rounded-2xl p-8 relative overflow-hidden" style={{ animationDelay: "60ms", background: "linear-gradient(135deg, #1a0520 0%, #2a0845 50%, #1a0520 100%)", border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 0 60px rgba(139,92,246,0.1)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #8b5cf6 0%, transparent 50%)" }} />
        <div className="relative flex items-start justify-between flex-wrap gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: GOLD }}>Security Program</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2" style={{ textShadow: "0 0 30px rgba(139,92,246,0.4)" }}>
              Security Maturity Tracker
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Track your organisation's security evolution from ad-hoc to optimising
            </p>
          </div>
          <MaturityGauge level={latest.overall_level} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="fu grid grid-cols-2 md:grid-cols-4 gap-4" style={{ animationDelay: "100ms" }}>
        {[
          { label: "Risk Score", value: latest.risk_score, sub: "/ 100", color: "#6366F1" },
          { label: "Critical Open", value: latest.critical_open, sub: "findings", color: "#ef4444" },
          { label: "MTTD", value: latest.mttd_minutes, sub: "minutes", color: "#10B981" },
          { label: "MTTR", value: latest.mttr_hours, sub: "hours", color: "#F59E0B" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-5 border transition-all hover:scale-[1.02]" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{k.label}</div>
            <div className="text-3xl font-black mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[10px] text-slate-500">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Path to Level 4 */}
      <div className="fu rounded-xl border p-6" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "140ms" }}>
        <h3 className="text-sm font-bold text-white mb-2">Path to Level 4 (Managed)</h3>
        <p className="text-xs text-slate-400 mb-4">
          {level4Progress} of {level4Total} requirements met
        </p>
        
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-6">
          <div className="h-full rounded-full transition-all" style={{ width: `${(level4Progress / level4Total) * 100}%`, background: GOLD }} />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {LEVEL_REQUIREMENTS[4].map(req => (
            <div key={req.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: req.done ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
              {req.done ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className={`text-sm font-medium ${req.done ? "text-emerald-400" : "text-red-400"}`}>
                  {req.text}
                </div>
                {req.current && (
                  <div className="text-xs text-slate-500 mt-1">
                    Current: {req.current}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Progress Table */}
      <div className="fu rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "180ms" }}>
        <div className="p-5 border-b" style={{ borderColor: "#1F2937" }}>
          <h3 className="text-sm font-bold text-white">Monthly Progress Snapshot</h3>
          <p className="text-xs text-slate-400 mt-0.5">Track your improvement trajectory</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
                {["Month", "Risk Score", "Critical Open", "MTTD", "MTTR", "Maturity Level"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { month: "June 2026", risk: 73, critical: 12, mttd: 4.2, mttr: 7.8, level: 3 },
                { month: "May 2026", risk: 68, critical: 18, mttd: 5.1, mttr: 9.2, level: 3 },
                { month: "April 2026", risk: 62, critical: 24, mttd: 6.3, mttr: 11.4, level: 2 },
                { month: "March 2026", risk: 58, critical: 31, mttd: 7.8, mttr: 14.2, level: 2 },
                { month: "February 2026", risk: 51, critical: 39, mttd: 9.1, mttr: 18.6, level: 2 },
                { month: "January 2026", risk: 47, critical: 47, mttd: 12.4, mttr: 24.3, level: 2 },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-white/5" style={{ borderBottom: i < 5 ? "1px solid #1F2937" : "none" }}>
                  <td className="px-4 py-3 font-medium text-white">{row.month}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${row.risk >= 70 ? "text-emerald-400" : row.risk >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                      {row.risk}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{row.critical}</td>
                  <td className="px-4 py-3 text-slate-300">{row.mttd}m</td>
                  <td className="px-4 py-3 text-slate-300">{row.mttr}h</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: GOLD, color: "#0A0E1A" }}>
                      Level {row.level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="fu text-center py-8" style={{ animationDelay: "220ms" }}>
        <p className="text-[10px] text-slate-600">
          Maturity assessments run automatically every month based on your platform activity
        </p>
      </div>
    </div>
  );
}