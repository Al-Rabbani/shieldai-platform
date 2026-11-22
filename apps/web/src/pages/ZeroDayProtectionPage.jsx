import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Eye, X, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const GOLD = "#C9A84C";
const SEV = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

const THREATS = [
  { id:1, pkg:"lodahs", version:"4.17.21", registry:"npm", type:"Typosquatting", icon:"🎭", method:"Name Similarity", cve:"No CVE Yet", repos:["api-gateway","auth-service"], action:"Blocked", severity:"critical", desc:"Mimics lodash. Contains obfuscated crypto-miner in postinstall.", endpoints:["evil-c2.ru:8443"], sim:{ real:"lodash", fake:"lodahs", diff:"transposed s/h" } },
  { id:2, pkg:"requests-http", version:"2.31.0", registry:"PyPI", type:"Dependency Confusion", icon:"💉", method:"Ownership Change", cve:"No CVE Yet", repos:["ml-inference"], action:"Blocked", severity:"critical", desc:"Internal package name published to public PyPI. Classic dependency confusion.", endpoints:["data-exfil.io/collect"], sim:null },
  { id:3, pkg:"colors-pro", version:"1.0.0", registry:"npm", type:"Install Hook Abuse", icon:"🪝", method:"Code Pattern", cve:"No CVE Yet", repos:[], action:"Blocked", severity:"high", desc:"postinstall exfiltrates env vars including AWS_SECRET_ACCESS_KEY.", endpoints:["log-collector.dev/ingest"], sim:null },
  { id:4, pkg:"event-stream-secure", version:"4.0.2", registry:"npm", type:"Maintainer Takeover", icon:"👤", method:"Ownership Change", cve:"No CVE Yet", repos:["notification-svc"], action:"Flagged", severity:"high", desc:"Original maintainer transferred ownership to unknown account 3 days ago.", endpoints:[], sim:null },
  { id:5, pkg:"faker-js", version:"6.6.7", registry:"npm", type:"Supply Chain Injection", icon:"🔗", method:"Behavioral Analysis", cve:"No CVE Yet", repos:["api-gateway"], action:"Flagged", severity:"high", desc:"Legitimate package with new version containing embedded reverse shell.", endpoints:["185.220.101.47:4444"], sim:null },
  { id:6, pkg:"requets", version:"2.28.2", registry:"PyPI", type:"Typosquatting", icon:"🎭", method:"Name Similarity", cve:"CVE Assigned", repos:[], action:"Blocked", severity:"medium", desc:"Typosquat of requests. CVE published after our pre-CVE detection.", endpoints:[], sim:{ real:"requests", fake:"requets", diff:"missing second 's'" } },
  { id:7, pkg:"ua-parser", version:"0.7.33", registry:"npm", type:"Malware Detected", icon:"🦠", method:"Behavioral Analysis", cve:"No CVE Yet", repos:["admin-portal"], action:"Blocked", severity:"critical", desc:"Downloads and executes remote binary on install.", endpoints:["update-cdn.net/ua.bin"], sim:null },
];

const DAILY = Array.from({length:14},(_,i)=>({ day:`Jun ${i+3}`, blocked: Math.floor(2+Math.random()*8) }));

function Modal({ t, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.85)"}}>
      <div className="w-full max-w-xl rounded-2xl border overflow-hidden" style={{background:"#111827",borderColor:"#374151"}}>
        <div className="flex items-center justify-between p-4 border-b" style={{borderColor:"#1F2937"}}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{t.icon}</span>
            <div><p className="font-mono font-bold text-white">{t.pkg}@{t.version}</p><p className="text-[10px] text-slate-400">{t.registry} · {t.type}</p></div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-4 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="p-3 rounded-lg text-sm text-slate-300" style={{background:"rgba(239,68,68,0.08)",border:"1px solid #ef444433"}}>{t.desc}</div>
          {t.sim && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg" style={{background:"#1F2937"}}><p className="text-[10px] text-emerald-400 mb-1">✅ Legitimate</p><p className="font-mono font-bold text-white">{t.sim.real}</p></div>
              <div className="p-2 rounded-lg border" style={{background:"#1F2937",borderColor:"#ef444433"}}><p className="text-[10px] text-red-400 mb-1">🎭 Fake</p><p className="font-mono font-bold text-red-400">{t.sim.fake}</p></div>
              <p className="col-span-2 text-[10px] text-slate-500">Diff: {t.sim.diff}</p>
            </div>
          )}
          {t.endpoints.length>0 && (
            <div><p className="text-xs font-bold text-slate-400 mb-1">Network calls on install</p>
              {t.endpoints.map(ep=><div key={ep} className="font-mono text-xs text-red-400 p-2 rounded mt-1" style={{background:"#1F2937"}}>{ep}</div>)}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:"#ef4444"}}>Report to Registry</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold border text-slate-300" style={{borderColor:"#374151",background:"transparent"}}>Whitelist</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ZeroDayProtectionPage() {
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState("all");
  const [rules, setRules] = useState({preCVE:true,typo:true,hooks:true,dep:true,maint:true});

  const list = filter==="all" ? THREATS : THREATS.filter(t=>t.severity===filter||t.action===filter);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{background:"#0A0E1A"}}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu 0.4s ease both}@keyframes ring{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:0.7;transform:scale(1.1)}}.r1{animation:ring 2s ease-in-out infinite}.r2{animation:ring 2s ease-in-out infinite;animation-delay:.4s}.r3{animation:ring 2s ease-in-out infinite;animation-delay:.8s}`}</style>
      <div className="fu flex items-center gap-1 text-xs text-slate-500">
        <Link to="/" className="hover:text-white">Overview</Link><span>/</span><span style={{color:GOLD}}>Zero-Day Protection</span>
      </div>

      {/* Hero */}
      <div className="fu rounded-2xl border p-7 flex items-center gap-8 flex-wrap" style={{background:"linear-gradient(135deg,#0d1220,#111827)",borderColor:"#1F2937",animationDelay:"40ms"}}>
        <div className="relative flex-shrink-0 w-20 h-20">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{background:"rgba(239,68,68,0.15)"}}><Shield className="w-10 h-10 text-red-400"/></div>
          <div className="r1 absolute inset-0 rounded-full border-2 border-red-500/20" style={{transform:"scale(1.4)"}}/>
          <div className="r2 absolute inset-0 rounded-full border border-red-500/15" style={{transform:"scale(1.8)"}}/>
          <div className="r3 absolute inset-0 rounded-full border border-red-500/10" style={{transform:"scale(2.3)"}}/>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white mb-1">Zero-Day Package Protection</h1>
          <p className="text-slate-400 text-sm">Block malicious packages before CVEs are published — stop attacks at the install moment</p>
          <div className="flex items-center gap-2 mt-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/><span className="text-xs text-emerald-400">Real-time monitoring · npm · PyPI · Maven · RubyGems · Go · NuGet</span></div>
        </div>
      </div>

      {/* Stats */}
      <div className="fu grid grid-cols-2 md:grid-cols-5 gap-4" style={{animationDelay:"80ms"}}>
        {[["Packages Monitored","2.1M+","#6366f1"],["Pre-CVE Blocked","847","#ef4444"],["Typosquatting","312","#f97316"],["Dep. Confusion","24","#eab308"],["Protection Score","99.2%","#22c55e"]].map(([l,v,c])=>(
          <div key={l} className="rounded-xl p-4 border hover:scale-[1.02] transition-all" style={{background:"#111827",borderColor:c+"33"}}>
            <div className="text-[10px] text-slate-500 mb-1">{l}</div>
            <div className="text-2xl font-black" style={{color:c}}>{v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-3">
          <div className="fu flex items-center justify-between flex-wrap gap-2" style={{animationDelay:"100ms"}}>
            <h2 className="text-sm font-bold text-white">Live Threat Feed</h2>
            <div className="flex gap-1 flex-wrap">
              {["all","Blocked","Flagged","critical","high","medium"].map(f=>(
                <button key={f} onClick={()=>setFilter(f)} className="px-2.5 py-1 rounded-lg text-xs font-bold border capitalize transition-all"
                  style={{borderColor:filter===f?GOLD:"#374151",color:filter===f?GOLD:"#6B7280",background:"transparent"}}>{f}</button>
              ))}
            </div>
          </div>
          {list.map((t,i)=>(
            <div key={t.id} className="fu rounded-xl border p-4 hover:bg-white/5 transition-all"
              style={{background:"#111827",borderLeft:`3px solid ${SEV[t.severity]}`,borderColor:"#1F2937",animationDelay:`${120+i*50}ms`}}>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span>{t.icon}</span>
                    <span className="font-mono font-bold text-white text-sm">{t.pkg}</span>
                    <span className="text-[10px] text-slate-500">@{t.version}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t.registry}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:SEV[t.severity]+"22",color:SEV[t.severity]}}>{t.severity}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">{t.desc}</p>
                  <div className="flex gap-3 text-[10px] text-slate-500 flex-wrap">
                    <span>{t.method}</span>
                    <span style={{color:t.cve==="No CVE Yet"?"#ef4444":"#22c55e"}}>{t.cve}</span>
                    {t.repos.length>0&&<span className="text-orange-400">⚠️ Installed: {t.repos.join(", ")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:t.action==="Blocked"?"#22c55e22":"#eab30822",color:t.action==="Blocked"?"#22c55e":"#eab308"}}>
                    {t.action==="Blocked"?"✅":"⚠️"} {t.action}
                  </span>
                  <button onClick={()=>setSel(t)} className="p-1.5 rounded-lg border hover:bg-white/10 text-slate-400 hover:text-white transition-colors" style={{borderColor:"#374151"}}>
                    <Eye className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="fu rounded-xl border p-4" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"140ms"}}>
            <h3 className="text-sm font-bold text-white mb-3">Protection Rules</h3>
            {[["preCVE","Block pre-CVE threats"],["typo","Block typosquatting"],["hooks","Block suspicious install hooks"],["dep","Block dependency confusion"],["maint","Alert on maintainer changes"]].map(([k,label])=>(
              <div key={k} className="flex items-center justify-between py-2 border-b last:border-0" style={{borderColor:"#1F2937"}}>
                <span className="text-xs text-slate-300">{label}</span>
                <button onClick={()=>setRules(r=>({...r,[k]:!r[k]}))}
                  className="w-10 h-5 rounded-full transition-all relative" style={{background:rules[k]?"#22c55e":"#374151"}}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{left:rules[k]?"1.25rem":"0.125rem"}}/>
                </button>
              </div>
            ))}
          </div>
          <div className="fu rounded-xl border p-4" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"180ms"}}>
            <h3 className="text-xs font-bold text-white mb-3">Blocks per Day (14d)</h3>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={DAILY}><XAxis dataKey="day" tick={{fill:"#6B7280",fontSize:8}} interval={3}/><YAxis tick={{fill:"#6B7280",fontSize:9}}/><Tooltip contentStyle={{background:"#1F2937",border:"none",borderRadius:6,fontSize:11,color:"#fff"}}/><Bar dataKey="blocked" fill="#ef4444" radius={[2,2,0,0]}/></BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border p-3 text-center" style={{background:"#0d1220",borderColor:"#1F2937"}}>
            <p className="text-[10px] text-slate-600">⚡ Powered by real-time behavioral analysis</p>
            <p className="text-[10px] text-slate-600">2.1M packages · 6 registries monitored</p>
          </div>
        </div>
      </div>
      {sel && <Modal t={sel} onClose={()=>setSel(null)}/>}
    </div>
  );
}