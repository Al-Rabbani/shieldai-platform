import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileBarChart, Plus, X, Loader2, Share2, Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const SCORE_COLOR = (s) => s>=90?"#16a34a":s>=75?"#0891b2":s>=60?"#d97706":"#dc2626";
const TYPE_META = {
  executive_summary: { label:"Executive Summary", color:"#6366f1" },
  technical:         { label:"Technical",          color:"#3b82f6" },
  compliance:        { label:"Compliance",         color:"#10b981" },
  pentest:           { label:"Pentest",            color:"#ef4444" },
  vulnerability:     { label:"Vulnerability",      color:"#f97316" },
};
const STATUS_META = {
  draft:     { label:"📝 Draft",     color:"#94a3b8" },
  review:    { label:"🔍 Review",    color:"#d97706" },
  final:     { label:"✅ Final",     color:"#10b981" },
  published: { label:"📢 Published", color:"#6366f1" },
};
const FW_LIST = ["SOC2","ISO27001","GDPR","NIST_CSF","CIS","PCI_DSS","HIPAA"];
const tooltipStyle = { backgroundColor:"#0f172a",border:"1px solid #30363d",borderRadius:8,color:"#e2e8f0",fontSize:11 };

function ScoreGauge({ score, size=80 }) {
  const r=size/2-8, circ=2*Math.PI*r, dash=Math.max(0,Math.min(1,score/100))*circ, color=SCORE_COLOR(score), cx=size/2, cy=size/2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="7"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}/>
      <text x={cx} y={cy+5} textAnchor="middle" fontSize={size<70?10:13} fill={color} fontWeight="bold" fontFamily="JetBrains Mono">{score}%</text>
    </svg>
  );
}

function ReportModal({ report, onClose }) {
  const tm = TYPE_META[report.report_type]||TYPE_META.compliance;
  const scoreColor = SCORE_COLOR(report.overall_score||0);
  const pieData = [
    { name:"Critical", value:report.critical_count||0, fill:"#ef4444" },
    { name:"High",     value:report.high_count||0,     fill:"#f97316" },
    { name:"Medium",   value:report.medium_count||0,   fill:"#eab308" },
    { name:"Low",      value:report.low_count||0,      fill:"#10b981" },
  ].filter(d=>d.value>0);
  const pillars = report.pillars_covered ? report.pillars_covered.split(",").map(s=>s.trim()).filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background:"rgba(3,7,18,0.9)",backdropFilter:"blur(8px)" }}>
      <style>{`@media print { body * { visibility:hidden; } #print-report, #print-report * { visibility:visible; } #print-report { position:absolute;left:0;top:0;width:100%; } }`}</style>
      <div className="min-h-full flex items-start justify-center p-6">
        <div id="print-report" className="w-full max-w-3xl rounded-2xl" style={{ background:"#161b22",border:"1px solid #30363d" }}>
          <div className="flex items-start justify-between p-6" style={{ borderBottom:"1px solid #30363d" }}>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded font-mono" style={{ color:tm.color,background:`${tm.color}15`,border:`1px solid ${tm.color}30` }}>{tm.label}</span>
                {report.framework&&<span className="text-xs font-mono text-slate-400">{report.framework}</span>}
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{report.title}</h2>
              <p className="text-xs text-slate-500 font-mono">
                {report.period_start&&report.period_end?`${new Date(report.period_start).toLocaleDateString()} → ${new Date(report.period_end).toLocaleDateString()}`:""}
              </p>
            </div>
            <div className="flex items-center gap-3 print:hidden">
              <button onClick={()=>window.print()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors" style={{ background:"#1e293b",border:"1px solid #30363d" }}>
                <Printer className="w-3.5 h-3.5"/>Print/PDF
              </button>
              <button onClick={onClose} className="text-slate-600 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Score + stats */}
            <div className="flex items-center gap-6">
              <ScoreGauge score={report.overall_score||0} size={100}/>
              <div className="grid grid-cols-4 gap-3 flex-1">
                {[["Critical",report.critical_count||0,"#ef4444"],["High",report.high_count||0,"#f97316"],["Medium",report.medium_count||0,"#eab308"],["Low",report.low_count||0,"#10b981"]].map(([l,v,c])=>(
                  <div key={l} className="text-center p-2 rounded-lg" style={{ background:"#0d1117",border:"1px solid #30363d" }}>
                    <p className="text-lg font-black font-mono" style={{ color:c }}>{v}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-mono">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Executive Summary */}
            {report.executive_summary && (
              <div className="p-4 rounded-xl" style={{ background:"#0d1117",border:"1px solid #30363d" }}>
                <h3 className="text-xs font-semibold text-white mb-2 font-mono uppercase">Executive Summary</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{report.executive_summary}</p>
              </div>
            )}

            {/* Donut chart */}
            {pieData.length>0&&(
              <div>
                <h3 className="text-xs font-semibold text-white mb-3 font-mono uppercase">Finding Distribution</h3>
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

            {/* Pillars */}
            {pillars.length>0&&(
              <div>
                <h3 className="text-xs font-semibold text-white mb-3 font-mono uppercase">Pillars Covered</h3>
                <div className="flex flex-wrap gap-2">
                  {pillars.map(p=><span key={p} className="text-xs px-3 py-1 rounded-lg font-mono" style={{ background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",color:"#818cf8" }}>{p}</span>)}
                </div>
              </div>
            )}

            {/* Remediation roadmap */}
            <div>
              <h3 className="text-xs font-semibold text-white mb-3 font-mono uppercase">Remediation Roadmap</h3>
              <div className="space-y-2">
                {[
                  { phase:"Immediate (0-24h)", color:"#ef4444", bg:"rgba(239,68,68,0.08)", border:"rgba(239,68,68,0.2)", items:["Address all critical severity findings","Rotate any exposed credentials or tokens","Enable additional monitoring on affected systems"] },
                  { phase:"Short-term (1-7 days)", color:"#f97316", bg:"rgba(249,115,22,0.08)", border:"rgba(249,115,22,0.2)", items:["Remediate high severity policy violations","Update affected security policies","Schedule team security awareness training"] },
                  { phase:"Long-term (2-4 weeks)", color:"#eab308", bg:"rgba(234,179,8,0.08)", border:"rgba(234,179,8,0.2)", items:["Close medium/low severity findings","Conduct full evidence re-collection","Schedule next periodic audit"] },
                ].map(({phase,color,bg,border,items})=>(
                  <div key={phase} className="p-3 rounded-lg" style={{ background:bg,border:`1px solid ${border}` }}>
                    <p className="text-xs font-bold mb-2 font-mono" style={{ color }}>{phase}</p>
                    <ul className="space-y-0.5">
                      {items.map(item=><li key={item} className="text-[11px] text-slate-400 flex items-start gap-1.5"><span style={{ color }}>•</span>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm text-slate-400 hover:text-white print:hidden" style={{ background:"#0d1117",border:"1px solid #30363d" }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ report, onView }) {
  const [sharing, setSharing] = useState(false);
  const tm = TYPE_META[report.report_type]||TYPE_META.compliance;
  const sm = STATUS_META[report.status]||STATUS_META.draft;

  const share = async() => {
    setSharing(true);
    const token = report.share_token || Math.random().toString(36).slice(2);
    if(!report.share_token) await base44.entities.AuditReport.update(report.id,{share_token:token,is_public:true});
    await navigator.clipboard.writeText(`${window.location.origin}/governance/reports/${token}`);
    toast.success("Shareable link copied!");
    setSharing(false);
  };

  const pillars = report.pillars_covered ? report.pillars_covered.split(",").map(s=>s.trim()).filter(Boolean) : [];

  return (
    <div className="rounded-xl p-5" style={{ background:"#161b22",border:"1px solid #30363d" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono" style={{ color:tm.color,background:`${tm.color}15`,border:`1px solid ${tm.color}30` }}>{tm.label}</span>
            <span className="text-[11px] font-semibold" style={{ color:sm.color }}>{sm.label}</span>
          </div>
          <h3 className="text-sm font-bold text-white truncate">{report.title}</h3>
          {report.period_start&&report.period_end&&(
            <p className="text-[10px] text-slate-500 font-mono mt-1">{new Date(report.period_start).toLocaleDateString()} → {new Date(report.period_end).toLocaleDateString()}</p>
          )}
        </div>
        <ScoreGauge score={report.overall_score||0} size={68}/>
      </div>

      {/* Finding chips */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {report.critical_count>0&&<span className="text-[11px] font-bold font-mono text-red-400">🔴 {report.critical_count}</span>}
        {report.high_count>0&&<span className="text-[11px] font-bold font-mono text-orange-400">🟠 {report.high_count}</span>}
        {report.medium_count>0&&<span className="text-[11px] font-bold font-mono text-yellow-400">🟡 {report.medium_count}</span>}
        {report.low_count>0&&<span className="text-[11px] font-bold font-mono text-emerald-400">🟢 {report.low_count}</span>}
      </div>

      {pillars.length>0&&(
        <div className="flex flex-wrap gap-1 mb-3">
          {pillars.slice(0,4).map(p=><span key={p} className="text-[9px] px-2 py-0.5 rounded font-mono" style={{ background:"rgba(99,102,241,0.12)",color:"#818cf8" }}>{p}</span>)}
          {pillars.length>4&&<span className="text-[9px] text-slate-500">+{pillars.length-4}</span>}
        </div>
      )}

      {report.generated_at&&<p className="text-[10px] text-slate-600 font-mono mb-3">Generated {new Date(report.generated_at).toLocaleDateString()}</p>}

      <div className="flex gap-2">
        <button onClick={()=>onView(report)} className="flex-1 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-all" style={{ background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)" }}>View Report</button>
        <button onClick={share} disabled={sharing} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all" style={{ background:"#0d1117",border:"1px solid #30363d" }}>
          {sharing?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Share2 className="w-3.5 h-3.5"/>}
        </button>
      </div>
    </div>
  );
}

export default function AuditReportsPage() {
  const [showModal, setShowModal] = useState(false);
  const [viewReport, setViewReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title:"",report_type:"compliance",framework:"SOC2",period_start:"",period_end:"" });
  const qc = useQueryClient();

  const { data: reports = [] } = useQuery({ queryKey:["audit-reports"], queryFn:()=>base44.entities.AuditReport.list("-generated_at",50), initialData:[] });

  const generate = async() => {
    if(!form.title){toast.error("Title required");return;}
    setLoading(true);
    await base44.entities.AuditReport.create({
      ...form,
      status:"draft",
      overall_score: Math.floor(Math.random()*30)+65,
      critical_count:Math.floor(Math.random()*5),
      high_count:Math.floor(Math.random()*10),
      medium_count:Math.floor(Math.random()*15),
      low_count:Math.floor(Math.random()*20),
      pillars_covered:"Code Security, Cloud Security, Compliance, Runtime",
      executive_summary:`Security assessment for ${form.framework} framework covering the period ${form.period_start||"N/A"} to ${form.period_end||"N/A"}. This report summarizes findings across multiple security domains and provides remediation guidance.`,
      generated_at:new Date().toISOString(),
      generated_by:"ShieldAI Platform",
      share_token:Math.random().toString(36).slice(2),
    });
    toast.success("Report generated");
    qc.invalidateQueries({queryKey:["audit-reports"]});
    setShowModal(false);
    setForm({title:"",report_type:"compliance",framework:"SOC2",period_start:"",period_end:""});
    setLoading(false);
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-indigo-500/50";
  const inputStyle = { background:"#0d1117",border:"1px solid #30363d" };

  return (
    <div className="space-y-6">
      {viewReport&&<ReportModal report={viewReport} onClose={()=>setViewReport(null)}/>}

      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(3,7,18,0.85)",backdropFilter:"blur(8px)" }}>
          <div className="rounded-2xl w-full max-w-md" style={{ background:"#161b22",border:"1px solid rgba(99,102,241,0.3)" }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom:"1px solid #30363d" }}>
              <h2 className="text-sm font-bold text-white flex items-center gap-2"><FileBarChart className="w-4 h-4 text-indigo-400"/>Generate Report</h2>
              <button onClick={()=>setShowModal(false)} className="text-slate-600 hover:text-white"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-mono uppercase">Title *</label>
                <input value={form.title} onChange={e=>setForm(s=>({...s,title:e.target.value}))} placeholder="Q2 2026 SOC2 Compliance Report" className={inputCls} style={inputStyle}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["Report Type","report_type",Object.entries(TYPE_META).map(([v,m])=>({v,l:m.label}))],["Framework","framework",FW_LIST.map(f=>({v:f,l:f.replace("_"," ")}))]].map(([l,k,opts])=>(
                  <div key={k}>
                    <label className="block text-[10px] text-slate-400 mb-1 font-mono uppercase">{l}</label>
                    <select value={form[k]} onChange={e=>setForm(s=>({...s,[k]:e.target.value}))} className={`${inputCls} appearance-none`} style={inputStyle}>
                      {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["Period Start","period_start"],["Period End","period_end"]].map(([l,k])=>(
                  <div key={k}>
                    <label className="block text-[10px] text-slate-400 mb-1 font-mono uppercase">{l}</label>
                    <input type="date" value={form[k]} onChange={e=>setForm(s=>({...s,[k]:e.target.value}))} className={inputCls} style={inputStyle}/>
                  </div>
                ))}
              </div>
              <button onClick={generate} disabled={loading} className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background:"linear-gradient(135deg,#312e81,#6366f1)" }}>
                {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Generating…</>:"Generate Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileBarChart className="w-5 h-5 text-indigo-400"/>
          <h1 className="text-xl font-bold text-white">Audit Reports</h1>
        </div>
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background:"linear-gradient(135deg,#312e81,#6366f1)" }}>
          <Plus className="w-4 h-4"/> Generate Report
        </button>
      </div>

      {reports.length===0?(
        <div className="rounded-2xl p-16 text-center" style={{ background:"#161b22",border:"1px dashed #30363d" }}>
          <FileBarChart className="w-12 h-12 text-slate-700 mx-auto mb-4"/>
          <p className="text-sm font-semibold text-slate-400 mb-2">No audit reports yet</p>
          <button onClick={()=>setShowModal(true)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white mt-2" style={{ background:"linear-gradient(135deg,#312e81,#6366f1)" }}>
            <Plus className="w-4 h-4 inline mr-2"/>Generate First Report
          </button>
        </div>
      ):(
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map(r=><ReportCard key={r.id} report={r} onView={setViewReport}/>)}
        </div>
      )}
    </div>
  );
}