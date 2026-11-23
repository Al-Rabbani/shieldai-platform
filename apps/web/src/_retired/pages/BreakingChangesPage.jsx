import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, AlertTriangle, ArrowRight, Zap, Package, ChevronDown, ChevronUp } from "lucide-react";

const GOLD = "#C9A84C";

const DEPS = [
  { pkg:"lodash", current:"4.17.20", secure:"4.17.21", breaking:"none", age:410, eol:false, effort:"Low", cve:"CVE-2021-23337", severity:"high",
    changes:[], autofix:true, changelog:"4.17.21 — Security fix: patch command injection in lodash.template()" },
  { pkg:"express", current:"4.18.2", secure:"5.0.0", breaking:"major", age:180, eol:false, effort:"High", cve:"CVE-2024-29041", severity:"medium",
    changes:["express.bodyParser() removed — use body-parser package","Callback-style middleware deprecated, use Promise-based","Router path matching changed for optional params","app.param() behavior modified for route ordering"],
    autofix:false, changelog:"5.0.0 — Full async/await support, removed deprecated APIs, improved routing" },
  { pkg:"axios", current:"1.4.0", secure:"1.7.7", breaking:"none", age:290, eol:false, effort:"Low", cve:"CVE-2024-39338", severity:"medium",
    changes:[], autofix:true, changelog:"1.7.7 — Security fix: SSRF vulnerability in proxy handling" },
  { pkg:"moment", current:"2.29.1", secure:"2.30.1", breaking:"minor", age:580, eol:false, effort:"Medium", cve:"CVE-2022-24785", severity:"high",
    changes:["moment.format() locale fallback behavior changed","Deprecated UTC offset methods removed","String format tokens slightly modified for strict mode"],
    autofix:false, changelog:"2.30.1 — Security patches + deprecation removals. Note: moment is in maintenance mode, consider migrating to date-fns" },
  { pkg:"jsonwebtoken", current:"8.5.1", secure:"9.0.2", breaking:"minor", age:720, eol:false, effort:"Medium", cve:"CVE-2022-23529", severity:"critical",
    changes:["Sync verify() now throws on invalid token (previously returned null)","Algorithm 'none' now strictly disabled","callback API parameter order changed for error handling"],
    autofix:false, changelog:"9.0.2 — Critical security fixes for algorithm confusion attacks" },
  { pkg:"minimist", current:"1.2.5", secure:"1.2.8", breaking:"none", age:820, eol:false, effort:"Low", cve:"CVE-2021-44906", severity:"critical",
    changes:[], autofix:true, changelog:"1.2.8 — Prototype pollution security fixes" },
  { pkg:"node-fetch", current:"2.6.7", secure:"3.3.2", breaking:"major", age:390, eol:false, effort:"High", cve:"CVE-2022-0235", severity:"high",
    changes:["ESM-only in v3 — CommonJS require() no longer works","Response.buffer() removed, use Response.arrayBuffer()","AbortController integration changed","fetch() no longer follows non-GET redirects with body"],
    autofix:false, changelog:"3.x — Full ESM migration, aligns with Fetch spec" },
  { pkg:"qs", current:"6.9.7", secure:"6.13.0", breaking:"none", age:200, eol:false, effort:"Low", cve:"CVE-2022-24999", severity:"high",
    changes:[], autofix:true, changelog:"6.13.0 — Prototype pollution and DoS security fixes" },
  { pkg:"marked", current:"4.0.18", secure:"9.1.6", breaking:"major", age:340, eol:true, effort:"High", cve:"CVE-2022-21681", severity:"high",
    changes:["Async rendering is now default","marked.parse() returns Promise not string","Extension API completely redesigned","Many deprecated renderer methods removed"],
    autofix:false, changelog:"9.x — Full rewrite for security, marked v4 is EOL" },
];

const BC_COLORS = { none:"#22c55e", minor:"#eab308", major:"#ef4444" };
const BC_LABELS = { none:"✅ No Breaking Changes", minor:"⚠️ Minor Breaking Changes", major:"🔴 Major Breaking Changes" };
const SEV_COLORS = { critical:"#ef4444", high:"#f97316", medium:"#eab308", low:"#3b82f6" };

function DepRow({ d }) {
  const [open, setOpen] = useState(false);
  return (
    <React.Fragment>
      <tr className="hover:bg-white/5 cursor-pointer" style={{borderBottom:open?"none":"1px solid #1F2937"}} onClick={()=>setOpen(!open)}>
        <td className="px-4 py-3"><span className="font-mono font-bold text-white">{d.pkg}</span>{d.eol&&<span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">EOL</span>}</td>
        <td className="px-4 py-3 font-mono text-xs text-slate-400">{d.current}</td>
        <td className="px-4 py-3 font-mono text-xs text-emerald-400">{d.secure}</td>
        <td className="px-4 py-3">
          <span className="text-xs font-bold" style={{color:BC_COLORS[d.breaking]}}>{BC_LABELS[d.breaking]}</span>
        </td>
        <td className="px-4 py-3"><span className="text-[10px] font-bold" style={{color:SEV_COLORS[d.severity]}}>{d.severity}</span></td>
        <td className="px-4 py-3 text-slate-400 text-xs">{d.age}d</td>
        <td className="px-4 py-3"><span className="text-xs font-bold" style={{color:d.effort==="Low"?"#22c55e":d.effort==="Medium"?"#eab308":"#ef4444"}}>{d.effort}</span></td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {d.autofix&&<button className="px-2 py-0.5 rounded text-[10px] font-bold text-black" style={{background:GOLD}} onClick={e=>e.stopPropagation()}>Auto-Fix</button>}
            {open?<ChevronUp className="w-4 h-4 text-slate-500"/>:<ChevronDown className="w-4 h-4 text-slate-500"/>}
          </div>
        </td>
      </tr>
      {open&&(
        <tr style={{borderBottom:"1px solid #1F2937"}}>
          <td colSpan={8} className="px-4 pb-4">
            <div className="p-4 rounded-xl space-y-3 mt-1" style={{background:"#0d1220"}}>
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Changelog</p>
                <p className="text-xs text-slate-300">{d.changelog}</p>
              </div>
              {d.changes.length>0&&(
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Breaking Changes ({d.changes.length})</p>
                  <div className="space-y-1">
                    {d.changes.map((c,i)=>(
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <AlertTriangle className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0"/>
                        <span className="text-slate-300">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {d.autofix?<button className="px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{background:"#22c55e"}}>Auto-Fix (Safe)</button>
                :<button className="px-3 py-1.5 rounded-lg text-xs font-bold border text-slate-300" style={{borderColor:"#374151",background:"transparent"}}>View Migration Guide</button>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

export default function BreakingChangesPage() {
  const [filter, setFilter] = useState("all");
  const safeCount = DEPS.filter(d=>d.breaking==="none").length;
  const list = filter==="all"?DEPS:DEPS.filter(d=>d.breaking===filter||(filter==="safe"&&d.autofix));

  return (
    <div className="min-h-screen p-6 space-y-6" style={{background:"#0A0E1A"}}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu 0.4s ease both}`}</style>
      <div className="fu flex items-center gap-1 text-xs text-slate-500">
        <Link to="/" className="hover:text-white">Overview</Link><span>/</span>
        <Link to="/code" className="hover:text-white">Code Security</Link><span>/</span>
        <span style={{color:GOLD}}>Breaking Changes</span>
      </div>

      <div className="fu flex items-center justify-between flex-wrap gap-4" style={{animationDelay:"40ms"}}>
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Breaking Changes Analysis</h1>
          <p className="text-slate-400 text-sm">Know exactly what breaks before you upgrade — eliminate developer friction from security fixes</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black" style={{background:GOLD}}>
          <Zap className="w-4 h-4"/> Auto-fix {safeCount} Safe Upgrades
        </button>
      </div>

      {/* Stats */}
      <div className="fu grid grid-cols-2 md:grid-cols-4 gap-4" style={{animationDelay:"80ms"}}>
        {[["Total Dependencies",DEPS.length,"#6366f1"],["Safe to Auto-Fix",safeCount,"#22c55e"],["Minor Breaking Changes",DEPS.filter(d=>d.breaking==="minor").length,"#eab308"],["Major Breaking Changes",DEPS.filter(d=>d.breaking==="major").length,"#ef4444"]].map(([l,v,c])=>(
          <div key={l} className="rounded-xl p-4 border hover:scale-[1.02] transition-all" style={{background:"#111827",borderColor:c+"33"}}>
            <div className="text-[10px] text-slate-500 mb-1">{l}</div>
            <div className="text-2xl font-black" style={{color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="fu flex gap-2 flex-wrap" style={{animationDelay:"100ms"}}>
        {["all","none","minor","major"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-bold border capitalize transition-all"
            style={{borderColor:filter===f?BC_COLORS[f]||GOLD:"#374151",color:filter===f?BC_COLORS[f]||GOLD:"#6B7280",background:"transparent"}}>
            {f==="all"?"All":f==="none"?"No Breaking Changes":f==="minor"?"Minor Changes":"Major Changes"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="fu rounded-xl border overflow-hidden" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"120ms"}}>
        <table className="w-full text-xs">
          <thead><tr style={{background:"#0d1220",borderBottom:"1px solid #1F2937"}}>
            {["Package","Current","Secure Version","Breaking Changes?","CVE Severity","Age","Upgrade Effort",""].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {list.map(d=><DepRow key={d.pkg} d={d}/>)}
          </tbody>
        </table>
      </div>

      {/* Upgrade Plan */}
      <div className="fu rounded-xl border p-5" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"160ms"}}>
        <h3 className="text-sm font-bold text-white mb-3">Recommended Upgrade Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[["🟢 Phase 1 — Now (auto-fix)","0 effort",DEPS.filter(d=>d.autofix).map(d=>d.pkg),"#22c55e"],["🟡 Phase 2 — Sprint (minor changes)","Low-Med effort",DEPS.filter(d=>d.breaking==="minor").map(d=>d.pkg),"#eab308"],["🔴 Phase 3 — Planned (major refactor)","High effort",DEPS.filter(d=>d.breaking==="major").map(d=>d.pkg),"#ef4444"]].map(([phase,effort,pkgs,c])=>(
            <div key={phase} className="p-4 rounded-xl border" style={{background:"#0d1220",borderColor:c+"33"}}>
              <div className="text-xs font-bold text-white mb-1">{phase}</div>
              <div className="text-[10px] text-slate-500 mb-2">{effort}</div>
              <div className="flex flex-wrap gap-1">
                {pkgs.map(p=><span key={p} className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-800 text-slate-300">{p}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}