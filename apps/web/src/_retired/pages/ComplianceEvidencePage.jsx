import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, AlertTriangle, Clock, Download, RefreshCw, Upload, Link as LinkIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const GOLD = "#C9A84C";

const FRAMEWORKS = [
  {
    id:"soc2",name:"SOC 2 Type II",icon:"🏛️",progress:78,
    controls:[
      {id:"CC6.1",name:"Logical Access Controls",cat:"Access Control",req:"Evidence of access review process",status:"auto",source:"AccessReview entity",updated:"1d ago"},
      {id:"CC6.2",name:"New User Provisioning",cat:"Access Control",req:"User onboarding records with approvals",status:"manual",source:"Manual upload needed",updated:"3d ago"},
      {id:"CC7.1",name:"Vulnerability Management",cat:"Vulnerability",req:"Quarterly scan results with remediation",status:"auto",source:"TriagedFinding entity",updated:"2h ago"},
      {id:"CC7.2",name:"Incident Response",cat:"Incident",req:"Documented IR process and incident records",status:"auto",source:"RuntimeThreats entity",updated:"1d ago"},
      {id:"CC9.2",name:"Vendor Risk Management",cat:"Third Party",req:"Vendor security assessments",status:"missing",source:"Not collected",updated:"Never"},
      {id:"A1.2",name:"Availability Monitoring",cat:"Availability",req:"Uptime monitoring and alerting records",status:"auto",source:"ZenFirewall entity",updated:"6h ago"},
    ]
  },
  {
    id:"iso27001",name:"ISO 27001:2022",icon:"🌐",progress:65,
    controls:[
      {id:"A.5.2",name:"Information Security Roles",cat:"Organization",req:"RACI matrix for security roles",status:"manual",source:"Manual upload needed",updated:"5d ago"},
      {id:"A.8.8",name:"Management of Technical Vulnerabilities",cat:"Asset",req:"Vulnerability scan evidence + patch records",status:"auto",source:"TriagedFinding + VMScan",updated:"1d ago"},
      {id:"A.8.12",name:"Data Leakage Prevention",cat:"Asset",req:"DLP controls evidence",status:"auto",source:"DSPM entity",updated:"2d ago"},
      {id:"A.5.24",name:"Incident Management Process",cat:"Incident",req:"Incident classification and response records",status:"auto",source:"RuntimeThreats entity",updated:"12h ago"},
      {id:"A.5.31",name:"Legal Requirements",cat:"Compliance",req:"Legal register and compliance mapping",status:"missing",source:"Not collected",updated:"Never"},
    ]
  },
  {
    id:"pci",name:"PCI-DSS v4.0",icon:"💳",progress:71,
    controls:[
      {id:"6.3.3",name:"All Software Protected from Attacks",cat:"Software Security",req:"SAST/DAST scan results",status:"auto",source:"SASTFinding + DASTFinding",updated:"1d ago"},
      {id:"6.4.3",name:"All Payment Page Scripts Managed",cat:"Payments",req:"Inventory and integrity hashes of all scripts",status:"manual",source:"Manual upload needed",updated:"4d ago"},
      {id:"11.3.1",name:"Internal Vulnerability Scans",cat:"Testing",req:"Quarterly internal scan results",status:"auto",source:"TriagedFinding entity",updated:"2d ago"},
      {id:"11.4.1",name:"Penetration Testing Program",cat:"Testing",req:"Annual pen test results",status:"auto",source:"PentestJob entity",updated:"5d ago"},
      {id:"10.2.1",name:"Audit Log Implementation",cat:"Logging",req:"Audit log configuration and samples",status:"auto",source:"AuditLog entity",updated:"1h ago"},
    ]
  },
  {
    id:"nist",name:"NIST CSF 2.0",icon:"🇺🇸",progress:82,
    controls:[
      {id:"ID.AM",name:"Asset Management",cat:"Identify",req:"Complete asset inventory",status:"auto",source:"ASPMAsset entity",updated:"2d ago"},
      {id:"PR.AC",name:"Access Control",cat:"Protect",req:"Access control policy and audit logs",status:"auto",source:"AccessReview + AuditLog",updated:"1d ago"},
      {id:"DE.CM",name:"Security Continuous Monitoring",cat:"Detect",req:"Monitoring capabilities evidence",status:"auto",source:"ZenFirewall + RuntimeThreats",updated:"6h ago"},
      {id:"RS.RP",name:"Response Planning",cat:"Respond",req:"Incident response plan documentation",status:"manual",source:"Manual upload needed",updated:"10d ago"},
      {id:"RC.RP",name:"Recovery Planning",cat:"Recover",req:"Business continuity and recovery plans",status:"missing",source:"Not collected",updated:"Never"},
    ]
  },
  {
    id:"gdpr",name:"GDPR",icon:"🇪🇺",progress:74,
    controls:[
      {id:"Art.30",name:"Records of Processing Activities",cat:"Data Governance",req:"ROPA documentation",status:"auto",source:"DSPM entity",updated:"2d ago"},
      {id:"Art.32",name:"Security of Processing",cat:"Technical Measures",req:"Technical and org security measures",status:"auto",source:"Multiple scanner entities",updated:"1d ago"},
      {id:"Art.33",name:"Notification of Breach",cat:"Incident",req:"Breach notification procedure + records",status:"auto",source:"RuntimeThreats entity",updated:"3d ago"},
      {id:"Art.35",name:"Data Protection Impact Assessment",cat:"Risk",req:"DPIA documentation for high-risk processing",status:"manual",source:"Manual upload needed",updated:"7d ago"},
    ]
  },
];

const STATUS_COLORS = {auto:"#22c55e",manual:"#eab308",missing:"#ef4444",na:"#6B7280"};
const STATUS_LABELS = {auto:"✅ Auto-Collected",manual:"⚠️ Needs Review",missing:"❌ Missing",na:"➡️ N/A"};

const GRC_TOOLS = [
  {name:"Vanta",logo:"V",connected:false,color:"#6366f1"},
  {name:"Drata",logo:"D",connected:false,color:"#8b5cf6"},
  {name:"Secureframe",logo:"S",connected:false,color:"#06b6d4"},
  {name:"Tugboat Logic",logo:"T",connected:false,color:GOLD},
];

export default function ComplianceEvidencePage() {
  const [activeTab, setActiveTab] = useState("soc2");
  const [collecting, setCollecting] = useState(false);

  const fw = FRAMEWORKS.find(f=>f.id===activeTab);
  const auto = fw.controls.filter(c=>c.status==="auto").length;
  const manual = fw.controls.filter(c=>c.status==="manual").length;
  const missing = fw.controls.filter(c=>c.status==="missing").length;

  const donut = [
    {name:"Auto-Collected",value:auto,color:"#22c55e"},
    {name:"Needs Review",value:manual,color:"#eab308"},
    {name:"Missing",value:missing,color:"#ef4444"},
  ];

  const collectAll = () => { setCollecting(true); setTimeout(()=>setCollecting(false),2000); };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{background:"#0A0E1A"}}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu 0.4s ease both}`}</style>
      <div className="fu flex items-center gap-1 text-xs text-slate-500">
        <Link to="/" className="hover:text-white">Overview</Link><span>/</span><span style={{color:GOLD}}>Compliance Evidence</span>
      </div>

      <div className="fu rounded-2xl border p-7 flex items-center gap-8 flex-wrap" style={{background:"linear-gradient(135deg,#0d1220,#111827)",borderColor:"#1F2937",animationDelay:"40ms"}}>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white mb-1">Compliance Evidence Hub</h1>
          <p className="text-slate-400 text-sm">Automated evidence collection for SOC2, ISO27001, PCI-DSS, NIST & GDPR — audit-ready in minutes</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[["Evidence Items","247","#6366f1"],["Auto-Collected","189","#22c55e"],["Manual Needed","41","#eab308"],["Audit Readiness","76%",GOLD]].map(([l,v,c])=>(
            <div key={l} className="rounded-xl p-3 text-center" style={{background:"#0d1220",border:`1px solid ${c}33`}}>
              <div className="text-[10px] text-slate-500 mb-1">{l}</div>
              <div className="text-xl font-black" style={{color:c}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Framework Tabs */}
      <div className="fu flex gap-1 p-1 rounded-xl w-fit overflow-x-auto" style={{background:"#111827",animationDelay:"80ms"}}>
        {FRAMEWORKS.map(f=>(
          <button key={f.id} onClick={()=>setActiveTab(f.id)} className="px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
            style={{background:activeTab===f.id?GOLD:"transparent",color:activeTab===f.id?"#0A0E1A":"#9CA3AF"}}>
            {f.icon} {f.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Controls Table */}
        <div className="xl:col-span-3 rounded-xl border overflow-hidden" style={{background:"#111827",borderColor:"#1F2937"}}>
          <div className="flex items-center justify-between p-4 border-b" style={{borderColor:"#1F2937"}}>
            <div>
              <h3 className="text-sm font-bold text-white">{fw.name} Controls</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 w-48 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${fw.progress}%`,background:"#22c55e"}}/>
                </div>
                <span className="text-xs font-bold text-emerald-400">{fw.progress}% collected</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border text-slate-300" style={{borderColor:"#374151",background:"transparent"}}>
                <Upload className="w-3.5 h-3.5"/> Upload Evidence
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{background:GOLD}}>
                <Download className="w-3.5 h-3.5"/> Export ZIP
              </button>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead><tr style={{background:"#0d1220",borderBottom:"1px solid #1F2937"}}>
              {["Control","Category","Evidence Required","Status","Source","Updated",""].map(h=>(
                <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {fw.controls.map(c=>(
                <tr key={c.id} className="hover:bg-white/5" style={{borderBottom:"1px solid #1F2937"}}>
                  <td className="px-3 py-3">
                    <div className="font-mono font-bold text-[10px] text-slate-400">{c.id}</div>
                    <div className="text-xs text-white">{c.name}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-[10px]">{c.cat}</td>
                  <td className="px-3 py-3 text-slate-400 max-w-[160px]"><p className="truncate">{c.req}</p></td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-bold" style={{color:STATUS_COLORS[c.status]}}>{STATUS_LABELS[c.status]}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-[10px]">{c.source}</td>
                  <td className="px-3 py-3 text-slate-600 text-[10px]">{c.updated}</td>
                  <td className="px-3 py-3">
                    {c.status==="missing"&&<button className="px-2 py-0.5 rounded text-[10px] font-bold text-black" style={{background:"#ef4444"}}>Upload</button>}
                    {c.status==="manual"&&<button className="px-2 py-0.5 rounded text-[10px] font-bold border text-slate-300" style={{borderColor:"#374151",background:"transparent"}}>Review</button>}
                    {c.status==="auto"&&<button className="px-2 py-0.5 rounded text-[10px] font-bold border text-emerald-400" style={{borderColor:"#22c55e33",background:"transparent"}}>View</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Donut */}
          <div className="fu rounded-xl border p-4" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"120ms"}}>
            <h3 className="text-xs font-bold text-white mb-3">Evidence Status</h3>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart><Pie data={donut} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                {donut.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Pie><Tooltip contentStyle={{background:"#1F2937",border:"none",borderRadius:6,fontSize:11,color:"#fff"}}/></PieChart>
            </ResponsiveContainer>
            <div className="space-y-1">
              {donut.map(d=>(
                <div key={d.name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{background:d.color}}/><span className="text-slate-400">{d.name}</span></div>
                  <span className="font-bold" style={{color:d.color}}>{d.value}</span>
                </div>
              ))}
            </div>
            <button onClick={collectAll} disabled={collecting}
              className="w-full mt-3 py-2 rounded-lg text-xs font-bold text-black flex items-center justify-center gap-1.5"
              style={{background:collecting?"#374151":GOLD,color:collecting?"#6B7280":"#0A0E1A"}}>
              <RefreshCw className={`w-3.5 h-3.5 ${collecting?"animate-spin":""}`}/>
              {collecting?"Collecting...":"Collect All Evidence Now"}
            </button>
          </div>

          {/* GRC Sync */}
          <div className="fu rounded-xl border p-4" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"140ms"}}>
            <h3 className="text-xs font-bold text-white mb-3">Sync to GRC Tools</h3>
            <div className="space-y-2">
              {GRC_TOOLS.map(t=>(
                <div key={t.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded font-black text-[10px] flex items-center justify-center" style={{background:t.color,color:"#0A0E1A"}}>{t.logo}</div>
                    <span className="text-xs text-slate-300">{t.name}</span>
                  </div>
                  <button className="px-2.5 py-1 rounded text-[10px] font-bold border" style={{borderColor:t.color+"44",color:t.color,background:"transparent"}}>Connect</button>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="fu rounded-xl border p-4" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"160ms"}}>
            <h3 className="text-xs font-bold text-white mb-3">Audit Timeline</h3>
            <div className="space-y-2">
              {[["SOC 2 Type II","Aug 1 2026","76%",GOLD],["ISO 27001 Surveillance","Nov 15 2026","65%","#6366f1"],["PCI-DSS QSA","Jan 10 2027","71%","#f97316"]].map(([fw,date,pct,c])=>(
                <div key={fw} className="p-2 rounded-lg" style={{background:"#0d1220"}}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-white font-bold">{fw}</span>
                    <span className="text-slate-500">{date}</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{width:pct,background:c}}/>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{pct} evidence ready</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}