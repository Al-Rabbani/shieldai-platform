import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useParams } from "react-router-dom";
import { Shield, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const SCORE_COLOR = (s) => s>=90?"#16a34a":s>=75?"#0891b2":s>=60?"#d97706":"#dc2626";
const tooltipStyle = { backgroundColor:"#0f172a",border:"1px solid #30363d",borderRadius:8,color:"#e2e8f0",fontSize:11 };

function ScoreGauge({ score, size=120 }) {
  const r=size/2-10, circ=2*Math.PI*r, dash=Math.max(0,Math.min(1,score/100))*circ, color=SCORE_COLOR(score), cx=size/2, cy=size/2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="10"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}/>
      <text x={cx} y={cy-5} textAnchor="middle" fontSize="22" fill={color} fontWeight="bold" fontFamily="JetBrains Mono">{score}%</text>
      <text x={cx} y={cy+14} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="JetBrains Mono">SCORE</text>
    </svg>
  );
}

export default function PublicReportPage() {
  const { share_token } = useParams();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["public-report", share_token],
    queryFn: () => base44.entities.AuditReport.filter({ share_token }),
    initialData: [],
  });

  const report = reports[0];

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:"#030712" }}>
      <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"/>
    </div>
  );

  if (!report) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background:"#030712" }}>
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4"/>
      <p className="text-white text-lg font-semibold">Report not found</p>
      <p className="text-slate-500 text-sm mt-1">This link may have expired or the report is no longer public.</p>
    </div>
  );

  const pieData = [
    { name:"Critical", value:report.critical_count||0, fill:"#ef4444" },
    { name:"High",     value:report.high_count||0,     fill:"#f97316" },
    { name:"Medium",   value:report.medium_count||0,   fill:"#eab308" },
    { name:"Low",      value:report.low_count||0,      fill:"#10b981" },
  ].filter(d=>d.value>0);

  const pillars = report.pillars_covered ? report.pillars_covered.split(",").map(s=>s.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen" style={{ background:"#030712" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor:"rgba(30,58,95,0.5)" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:"linear-gradient(135deg,#1e3a5f,#1e293b)",border:"1px solid rgba(99,102,241,0.3)" }}>
              <Shield className="w-4 h-4 text-indigo-400"/>
            </div>
            <div>
              <div className="flex items-baseline gap-0.5"><span className="font-black text-sm text-white">Shield</span><span className="font-black text-sm text-indigo-400">AI</span></div>
              <p className="text-[9px] text-slate-600 tracking-widest uppercase font-mono">Security Report</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Security Assessment Report</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Title block */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-white mb-2">{report.title}</h1>
          {report.period_start&&report.period_end&&(
            <p className="text-slate-500 font-mono text-sm">{new Date(report.period_start).toLocaleDateString()} — {new Date(report.period_end).toLocaleDateString()}</p>
          )}
          {report.generated_at&&<p className="text-slate-600 text-xs font-mono mt-1">Generated {new Date(report.generated_at).toLocaleDateString()}</p>}
        </div>

        {/* Score */}
        <div className="flex justify-center">
          <ScoreGauge score={report.overall_score||0} size={160}/>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[["Critical",report.critical_count||0,"#ef4444"],["High",report.high_count||0,"#f97316"],["Medium",report.medium_count||0,"#eab308"],["Low",report.low_count||0,"#10b981"]].map(([l,v,c])=>(
            <div key={l} className="rounded-xl p-4 text-center" style={{ background:"#161b22",border:"1px solid #30363d" }}>
              <p className="text-2xl font-black font-mono" style={{ color:c }}>{v}</p>
              <p className="text-[10px] text-slate-500 font-mono uppercase">{l}</p>
            </div>
          ))}
        </div>

        {/* Executive Summary */}
        {report.executive_summary&&(
          <div className="rounded-xl p-5" style={{ background:"#161b22",border:"1px solid #30363d" }}>
            <h2 className="text-sm font-bold text-white mb-3 font-mono uppercase">Executive Summary</h2>
            <p className="text-sm text-slate-300 leading-relaxed">{report.executive_summary}</p>
          </div>
        )}

        {/* Chart */}
        {pieData.length>0&&(
          <div className="rounded-xl p-5" style={{ background:"#161b22",border:"1px solid #30363d" }}>
            <h2 className="text-sm font-bold text-white mb-4 font-mono uppercase">Finding Severity Breakdown</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry,i)=><Cell key={i} fill={entry.fill}/>)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle}/>
                <Legend wrapperStyle={{ fontSize:11,color:"#64748b" }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Key Recommendations */}
        <div className="rounded-xl p-5" style={{ background:"#161b22",border:"1px solid #30363d" }}>
          <h2 className="text-sm font-bold text-white mb-4 font-mono uppercase">Key Recommendations</h2>
          <div className="space-y-2">
            {["Address all critical severity vulnerabilities immediately","Implement multi-factor authentication across all systems","Review and update access control policies","Enable automated security scanning in CI/CD pipelines","Schedule quarterly penetration testing"].map((rec,i)=>(
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background:"#0d1117",border:"1px solid #30363d" }}>
                <span className="text-indigo-400 font-bold text-sm font-mono flex-shrink-0">{i+1}.</span>
                <p className="text-sm text-slate-300">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl p-8 text-center" style={{ background:"linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.05))",border:"1px solid rgba(99,102,241,0.3)" }}>
          <p className="text-lg font-bold text-white mb-2">Want a Full Security Assessment?</p>
          <p className="text-sm text-slate-400 mb-4">ShieldAI provides autonomous AI-powered security testing across code, cloud, APIs, and runtime.</p>
          <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background:"linear-gradient(135deg,#312e81,#6366f1)" }}>
            Request Full Assessment →
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pt-4" style={{ borderTop:"1px solid rgba(30,58,95,0.3)" }}>
          <p className="text-xs text-slate-600 font-mono">Generated by <span className="text-indigo-400 font-bold">ShieldAI</span> Security Platform · {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}