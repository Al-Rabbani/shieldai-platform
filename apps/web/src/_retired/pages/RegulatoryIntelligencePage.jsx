import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Globe, CheckCircle, AlertTriangle, X, Clock, FileText, Bell } from "lucide-react";

const GOLD = "#C9A84C";

const REGS = [
  {
    id:"nis2", name:"NIS2", full:"EU Network & Information Security Directive 2", status:"Enforced", statusColor:"#22c55e", since:"Oct 2024",
    region:"🇪🇺 European Union", compliance:68, color:"#6366f1",
    obligations:["Incident reporting within 24 hours","Risk management measures","Supply chain security","Board accountability for cybersecurity"],
    gaps:4, deadline:"Oct 2025 — Annual review",
    controls:[
      {id:"NIS2-1",name:"Incident Reporting (24h)",cat:"Incident Response",status:"pass",evidence:"Auto: RuntimeThreats",updated:"2d ago"},
      {id:"NIS2-2",name:"Risk Management Framework",cat:"Risk Management",status:"partial",evidence:"Manual needed",updated:"5d ago"},
      {id:"NIS2-3",name:"Supply Chain Security",cat:"Supply Chain",status:"fail",evidence:"Missing",updated:"Never"},
      {id:"NIS2-4",name:"Board Accountability",cat:"Governance",status:"partial",evidence:"Manual needed",updated:"10d ago"},
      {id:"NIS2-5",name:"Vulnerability Handling",cat:"Vulnerability Mgmt",status:"pass",evidence:"Auto: TriagedFindings",updated:"1d ago"},
    ]
  },
  {
    id:"cra", name:"CRA", full:"EU Cyber Resilience Act", status:"In Force", statusColor:"#eab308", since:"2027 deadline",
    region:"🇪🇺 European Union", compliance:41, color:"#f97316",
    obligations:["Secure by design requirements","Mandatory vulnerability disclosure","SBOM mandatory for all products","5-year support obligation"],
    gaps:7, deadline:"Sep 2027 — Full compliance",
    controls:[
      {id:"CRA-1",name:"Secure by Design Documentation",cat:"Design",status:"partial",evidence:"Manual needed",updated:"7d ago"},
      {id:"CRA-2",name:"Vulnerability Disclosure Policy",cat:"Disclosure",status:"fail",evidence:"Missing",updated:"Never"},
      {id:"CRA-3",name:"SBOM Generation",cat:"Software Inventory",status:"pass",evidence:"Auto: SBOM entity",updated:"1d ago"},
      {id:"CRA-4",name:"Security Update Process",cat:"Patch Management",status:"partial",evidence:"Manual needed",updated:"3d ago"},
    ]
  },
  {
    id:"dora", name:"DORA", full:"Digital Operational Resilience Act", status:"Enforced", statusColor:"#22c55e", since:"Jan 2025",
    region:"🇪🇺 EU Financial Sector", compliance:55, color:"#06b6d4",
    obligations:["ICT risk management framework","Major incident reporting (4h initial)","Digital operational resilience testing","Third-party ICT provider oversight"],
    gaps:5, deadline:"Jan 2026 — Next review",
    controls:[
      {id:"DORA-1",name:"ICT Risk Management",cat:"Risk",status:"partial",evidence:"Manual needed",updated:"4d ago"},
      {id:"DORA-2",name:"Incident Classification",cat:"Incident",status:"pass",evidence:"Auto: RuntimeThreats",updated:"2d ago"},
      {id:"DORA-3",name:"Penetration Testing (TLPT)",cat:"Testing",status:"pass",evidence:"Auto: PentestJob",updated:"1d ago"},
      {id:"DORA-4",name:"Third-Party Risk Register",cat:"Supply Chain",status:"fail",evidence:"Missing",updated:"Never"},
    ]
  },
  {
    id:"hipaa", name:"HIPAA", full:"Health Insurance Portability and Accountability Act", status:"Active", statusColor:"#22c55e", since:"US Federal",
    region:"🇺🇸 United States", compliance:72, color:"#22c55e",
    obligations:["Privacy Rule — PHI handling","Security Rule — technical safeguards","Breach Notification Rule","Business Associate Agreements"],
    gaps:3, deadline:"Ongoing — Annual assessment",
    controls:[
      {id:"HIPAA-1",name:"PHI Access Controls",cat:"Access Control",status:"pass",evidence:"Auto: AccessReview",updated:"3d ago"},
      {id:"HIPAA-2",name:"Encryption at Rest",cat:"Data Protection",status:"pass",evidence:"Auto: CloudScans",updated:"1d ago"},
      {id:"HIPAA-3",name:"Audit Logging",cat:"Audit",status:"pass",evidence:"Auto: AuditLog",updated:"1d ago"},
      {id:"HIPAA-4",name:"Breach Notification Procedure",cat:"Incident",status:"partial",evidence:"Manual needed",updated:"8d ago"},
    ]
  },
  {
    id:"gdpr", name:"GDPR", full:"General Data Protection Regulation", status:"Active", statusColor:"#22c55e", since:"EU — May 2018",
    region:"🇪🇺 European Union", compliance:79, color:"#8b5cf6",
    obligations:["Lawful basis for processing","Data subject rights","72-hour breach notification","Data Protection Officer appointment"],
    gaps:2, deadline:"Ongoing — Annual review",
    controls:[
      {id:"GDPR-1",name:"Data Processing Records",cat:"Data Governance",status:"pass",evidence:"Auto: DSPMAssets",updated:"2d ago"},
      {id:"GDPR-2",name:"72h Breach Notification",cat:"Incident",status:"pass",evidence:"Auto: RuntimeThreats",updated:"1d ago"},
      {id:"GDPR-3",name:"Data Retention Policy",cat:"Data Governance",status:"partial",evidence:"Manual needed",updated:"12d ago"},
      {id:"GDPR-4",name:"Data Subject Request Process",cat:"Privacy",status:"pass",evidence:"Manual: documented",updated:"5d ago"},
    ]
  },
  {
    id:"pci", name:"PCI-DSS v4.0", full:"Payment Card Industry Data Security Standard v4.0", status:"Active", statusColor:"#22c55e", since:"March 2024",
    region:"🌍 Global", compliance:61, color:GOLD,
    obligations:["Network segmentation","Cardholder data protection","Vulnerability management","Access control measures"],
    gaps:6, deadline:"Mar 2025 — SAQ deadline",
    controls:[
      {id:"PCI-1",name:"Network Segmentation",cat:"Network",status:"partial",evidence:"Manual needed",updated:"6d ago"},
      {id:"PCI-2",name:"Cardholder Data Discovery",cat:"Data",status:"pass",evidence:"Auto: DSPM",updated:"2d ago"},
      {id:"PCI-3",name:"Vulnerability Scanning (quarterly)",cat:"Vuln Mgmt",status:"pass",evidence:"Auto: Scans",updated:"1d ago"},
      {id:"PCI-4",name:"Penetration Testing (annual)",cat:"Testing",status:"pass",evidence:"Auto: PentestJob",updated:"3d ago"},
    ]
  },
];

const UPDATES = [
  {reg:"NIS2",date:"Jun 10 2026",summary:"ENISA published updated guidance on incident classification thresholds",impact:"Review your incident severity matrix",action:"Update incident response runbook"},
  {reg:"CRA",date:"May 28 2026",summary:"European Commission clarified SBOM format requirements (CycloneDX 1.6+)",impact:"Ensure SBOM exports use CycloneDX 1.6",action:"Update SBOM generation pipeline"},
  {reg:"DORA",date:"May 15 2026",summary:"EBA published DORA Q&A — cloud providers now in scope for TLPT",impact:"Cloud pen tests now required annually",action:"Schedule cloud TLPT with ShieldAI"},
  {reg:"GDPR",date:"Apr 30 2026",summary:"€290M fine issued to major EU bank for inadequate data breach notification",impact:"Ensure 72h notification process is documented and tested",action:"Review breach notification procedure"},
];

const ST = {pass:"#22c55e",fail:"#ef4444",partial:"#eab308","n/a":"#6B7280"};

function ScoreRing({score,color,size=80}){
  const r=size/2-6,c=2*Math.PI*r;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1F2937" strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${(score/100)*c} ${c}`} strokeDashoffset={c*0.25} strokeLinecap="round"/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={size*0.22} fontWeight="900">{score}%</text>
    </svg>
  );
}

export default function RegulatoryIntelligencePage() {
  const [detail, setDetail] = useState(null);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{background:"#0A0E1A"}}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu 0.4s ease both}`}</style>
      <div className="fu flex items-center gap-1 text-xs text-slate-500">
        <Link to="/" className="hover:text-white">Overview</Link><span>/</span><span style={{color:GOLD}}>Regulatory Intelligence</span>
      </div>

      {/* Hero */}
      <div className="fu rounded-2xl border p-7 flex items-start gap-8 flex-wrap" style={{background:"linear-gradient(135deg,#0d1220,#111827)",borderColor:"#1F2937",animationDelay:"40ms"}}>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white mb-1">Regulatory Intelligence</h1>
          <p className="text-slate-400 text-sm mb-4">Stay ahead of global cybersecurity regulations — automated compliance mapping and evidence</p>
          {/* Simple SVG world map representation */}
          <div className="flex gap-3 flex-wrap">
            {[["🇪🇺","EU","NIS2 · CRA · DORA · GDPR","#6366f1"],["🇺🇸","US","HIPAA · NIST · FedRAMP","#22c55e"],["🌍","Global","PCI-DSS · ISO27001","#f97316"]].map(([flag,region,regs,c])=>(
              <div key={region} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{background:c+"15",border:`1px solid ${c}33`}}>
                <span>{flag}</span><div><p className="text-xs font-bold text-white">{region}</p><p className="text-[10px] text-slate-500">{regs}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          {[["Regulations Tracked","6","#6366f1"],["Obligations Mapped","47","#22c55e"],["Avg Compliance","63%",GOLD],["Days to Deadline","31","#ef4444"]].map(([l,v,c])=>(
            <div key={l} className="rounded-xl p-3 text-center" style={{background:"#0d1220",border:`1px solid ${c}33`}}>
              <div className="text-[10px] text-slate-500 mb-1">{l}</div>
              <div className="text-xl font-black" style={{color:c}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Regulation Cards */}
      <div className="fu grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" style={{animationDelay:"80ms"}}>
        {REGS.map((reg,i)=>(
          <div key={reg.id} className="fu rounded-xl border p-5 hover:scale-[1.01] transition-all"
            style={{background:"#111827",borderColor:reg.color+"33",animationDelay:`${80+i*40}ms`}}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-lg font-black text-white">{reg.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:reg.statusColor+"22",color:reg.statusColor}}>{reg.status}</span>
                </div>
                <p className="text-[10px] text-slate-500">{reg.region} · {reg.since}</p>
              </div>
              <ScoreRing score={reg.compliance} color={reg.color} size={64}/>
            </div>
            <p className="text-xs text-slate-400 mb-3">{reg.full}</p>
            <div className="space-y-1 mb-3">
              {reg.obligations.slice(0,3).map(o=>(
                <div key={o} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{background:reg.color}}/>
                  {o}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              {reg.gaps>0&&<span className="text-[10px] text-red-400">⚠️ {reg.gaps} critical gaps</span>}
              <button onClick={()=>setDetail(reg)}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{background:GOLD}}>
                View Assessment
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Regulatory Change Tracker */}
      <div className="fu rounded-xl border overflow-hidden" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"200ms"}}>
        <div className="p-4 border-b" style={{borderColor:"#1F2937"}}>
          <h3 className="text-sm font-bold text-white">Regulatory Change Tracker</h3>
          <p className="text-xs text-slate-500 mt-0.5">Latest guidance, enforcement actions, and deadline changes</p>
        </div>
        {UPDATES.map((u,i)=>(
          <div key={i} className="flex items-start gap-4 p-4 border-b hover:bg-white/5 transition-colors last:border-0" style={{borderColor:"#1F2937"}}>
            <div className="flex-shrink-0">
              <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{background:GOLD,color:"#0A0E1A"}}>{u.reg}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white mb-0.5">{u.summary}</p>
              <p className="text-[10px] text-orange-400 mb-0.5">Impact: {u.impact}</p>
              <p className="text-[10px] text-slate-500">Action: {u.action}</p>
            </div>
            <span className="text-[10px] text-slate-600 flex-shrink-0">{u.date}</span>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.85)"}}>
          <div className="w-full max-w-3xl rounded-2xl border overflow-hidden" style={{background:"#111827",borderColor:"#374151"}}>
            <div className="flex items-center justify-between p-5 border-b" style={{borderColor:"#1F2937"}}>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-black" style={{color:detail.color}}>{detail.name}</div>
                <span className="text-sm text-slate-400">{detail.full}</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{background:GOLD}}>
                  <FileText className="w-3.5 h-3.5"/> Export Report
                </button>
                <button onClick={()=>setDetail(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-xs">
                <thead><tr style={{background:"#0d1220",borderBottom:"1px solid #1F2937"}}>
                  {["Control ID","Name","Category","Status","Evidence","Updated"].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {detail.controls.map(c=>(
                    <tr key={c.id} className="hover:bg-white/5" style={{borderBottom:"1px solid #1F2937"}}>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{c.id}</td>
                      <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-slate-400">{c.cat}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[10px]" style={{color:ST[c.status]}}>
                          {c.status==="pass"?"✅ Pass":c.status==="fail"?"❌ Fail":"⚠️ Partial"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[10px]">{c.evidence}</td>
                      <td className="px-4 py-3 text-slate-500 text-[10px]">{c.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}