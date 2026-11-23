import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Package, CheckCircle, Copy, Eye, X, Shield, Search } from "lucide-react";

const GOLD = "#C9A84C";

const IMAGES = [
  {id:1,name:"shieldai/node:20-hardened",base:"node:20-alpine",criticals:0,highs:0,hubCriticals:47,hubHighs:83,size:"48MB",hubSize:"312MB",updated:2,pulls:8420,tags:["No root user","Read-only FS","Minimal packages","SBOM included","Cosign signed","SLSA Level 3"]},
  {id:2,name:"shieldai/node:18-hardened",base:"node:18-alpine",criticals:0,highs:0,hubCriticals:52,hubHighs:91,size:"44MB",hubSize:"298MB",updated:1,pulls:6210,tags:["No root user","Read-only FS","Minimal packages","SBOM included","Cosign signed","SLSA Level 3"]},
  {id:3,name:"shieldai/python:3.12-hardened",base:"python:3.12-slim",criticals:0,highs:1,hubCriticals:28,hubHighs:64,size:"62MB",hubSize:"244MB",updated:3,pulls:5891,tags:["No root user","Minimal packages","SBOM included","Cosign signed","SLSA Level 2"]},
  {id:4,name:"shieldai/python:3.11-hardened",base:"python:3.11-slim",criticals:0,highs:0,hubCriticals:31,hubHighs:69,size:"58MB",hubSize:"236MB",updated:2,pulls:4320,tags:["No root user","Minimal packages","SBOM included","Cosign signed","SLSA Level 3"]},
  {id:5,name:"shieldai/nginx:1.25-hardened",base:"nginx:1.25-alpine",criticals:0,highs:0,hubCriticals:18,hubHighs:44,size:"22MB",hubSize:"141MB",updated:4,pulls:12100,tags:["No root user","Read-only FS","Minimal packages","SBOM included","Cosign signed","SLSA Level 3"]},
  {id:6,name:"shieldai/ubuntu:22.04-hardened",base:"ubuntu:22.04",criticals:0,highs:2,hubCriticals:34,hubHighs:77,size:"88MB",hubSize:"412MB",updated:5,pulls:3210,tags:["No root user","Minimal packages","SBOM included","Cosign signed","SLSA Level 2"]},
  {id:7,name:"shieldai/java:21-hardened",base:"eclipse-temurin:21-jre-alpine",criticals:0,highs:0,hubCriticals:41,hubHighs:88,size:"112MB",hubSize:"481MB",updated:3,pulls:2890,tags:["No root user","Read-only FS","SBOM included","Cosign signed","SLSA Level 3"]},
  {id:8,name:"shieldai/go:1.22-hardened",base:"golang:1.22-alpine",criticals:0,highs:0,hubCriticals:22,hubHighs:51,size:"31MB",hubSize:"218MB",updated:2,pulls:1980,tags:["No root user","Read-only FS","Minimal packages","SBOM included","Cosign signed","SLSA Level 3"]},
  {id:9,name:"shieldai/php:8.3-hardened",base:"php:8.3-fpm-alpine",criticals:0,highs:1,hubCriticals:39,hubHighs:74,size:"74MB",hubSize:"321MB",updated:6,pulls:1450,tags:["No root user","Minimal packages","SBOM included","Cosign signed","SLSA Level 2"]},
  {id:10,name:"shieldai/ruby:3.3-hardened",base:"ruby:3.3-alpine",criticals:0,highs:0,hubCriticals:25,hubHighs:58,size:"66MB",hubSize:"289MB",updated:4,pulls:980,tags:["No root user","Minimal packages","SBOM included","Cosign signed","SLSA Level 3"]},
];

const TAG_COLORS = {
  "No root user":"#22c55e","Read-only FS":"#6366f1","Minimal packages":"#06b6d4",
  "SBOM included":"#8b5cf6","Cosign signed":GOLD,"SLSA Level 3":"#22c55e","SLSA Level 2":"#eab308"
};

function PullModal({ img, onClose }) {
  const [copied, setCopied] = useState(false);
  const cmd = `docker pull ${img.name}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.85)"}}>
      <div className="w-full max-w-lg rounded-2xl border overflow-hidden" style={{background:"#111827",borderColor:"#374151"}}>
        <div className="flex items-center justify-between p-4 border-b" style={{borderColor:"#1F2937"}}>
          <h3 className="font-bold text-white font-mono text-sm">{img.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-400 mb-2">Pull Command</p>
            <div className="flex items-center gap-2 p-3 rounded-lg font-mono text-sm" style={{background:"#0d1220"}}>
              <span className="text-emerald-400 flex-1">{cmd}</span>
              <button onClick={()=>{navigator.clipboard.writeText(cmd);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
                className="text-slate-400 hover:text-white"><Copy className="w-4 h-4"/></button>
            </div>
            {copied&&<p className="text-[10px] text-emerald-400 mt-1">Copied!</p>}
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-2">Dockerfile Example</p>
            <pre className="text-xs font-mono p-3 rounded-lg overflow-x-auto" style={{background:"#0d1220",color:"#a5f3fc"}}>
{`FROM ${img.name}
WORKDIR /app
COPY --chown=nonroot:nonroot . .
RUN npm ci --only=production
USER nonroot
EXPOSE 3000
CMD ["node", "server.js"]`}
            </pre>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["CVEs Eliminated",`${img.hubCriticals+img.hubHighs}`,GOLD],["Size Reduction",`${Math.round((1-parseInt(img.size)/parseInt(img.hubSize))*100)}%`,"#22c55e"],["Last Updated",`${img.updated}d ago`,"#6366f1"]].map(([l,v,c])=>(
              <div key={l} className="p-2 rounded-lg" style={{background:"#1F2937"}}>
                <div className="text-[10px] text-slate-500 mb-0.5">{l}</div>
                <div className="text-sm font-black" style={{color:c}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HardenedImagesPage() {
  const [pullModal, setPullModal] = useState(null);
  const [compare, setCompare] = useState("");
  const [search, setSearch] = useState("");

  const filtered = IMAGES.filter(i=>i.name.toLowerCase().includes(search.toLowerCase()));
  const cveEliminated = IMAGES.reduce((s,i)=>s+i.hubCriticals+i.hubHighs,0);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{background:"#0A0E1A"}}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu 0.4s ease both}`}</style>
      <div className="fu flex items-center gap-1 text-xs text-slate-500">
        <Link to="/" className="hover:text-white">Overview</Link><span>/</span><span style={{color:GOLD}}>Hardened Images</span>
      </div>

      <div className="fu rounded-2xl border p-7 flex items-center gap-8 flex-wrap" style={{background:"linear-gradient(135deg,#0d1220,#111827)",borderColor:"#1F2937",animationDelay:"40ms"}}>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white mb-1">Hardened Container Images</h1>
          <p className="text-slate-400 text-sm">CVE-free, production-hardened base images — eliminate vulnerabilities before they start</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[["Available Images",IMAGES.length,"#6366f1"],["CVEs Eliminated",cveEliminated,"#22c55e"],["Pulls This Month","36.4k","#f97316"],["Avg CVE Reduction","91%",GOLD]].map(([l,v,c])=>(
            <div key={l} className="rounded-xl p-3 text-center" style={{background:"#0d1220",border:`1px solid ${c}33`}}>
              <div className="text-[10px] text-slate-500 mb-1">{l}</div>
              <div className="text-xl font-black" style={{color:c}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + Compare */}
      <div className="fu flex gap-3 flex-wrap" style={{animationDelay:"80ms"}}>
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-xl border" style={{background:"#111827",borderColor:"#1F2937"}}>
          <Search className="w-4 h-4 text-slate-500"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search images..." className="bg-transparent text-sm text-slate-300 outline-none flex-1"/>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[260px] px-3 py-2 rounded-xl border" style={{background:"#111827",borderColor:"#1F2937"}}>
          <Package className="w-4 h-4 text-slate-500"/>
          <input value={compare} onChange={e=>setCompare(e.target.value)} placeholder="Compare: type docker image (e.g. node:20)..." className="bg-transparent text-sm text-slate-300 outline-none flex-1"/>
        </div>
        {compare&&(
          <div className="px-4 py-2 rounded-xl text-sm font-bold text-white border" style={{background:"#111827",borderColor:GOLD+"55"}}>
            <span style={{color:GOLD}}>node:20</span>: 47 critical, 83 high →
            <span className="text-emerald-400 ml-2">shieldai/node:20-hardened: 0 critical, 0 high</span>
            <button className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold text-black" style={{background:GOLD}}>Switch</button>
          </div>
        )}
      </div>

      {/* Image Grid */}
      <div className="fu grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={{animationDelay:"100ms"}}>
        {filtered.map((img,i)=>(
          <div key={img.id} className="fu rounded-xl border p-4 hover:scale-[1.01] transition-all"
            style={{background:"#111827",borderColor:"#1F2937",animationDelay:`${100+i*30}ms`}}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-mono font-bold text-white text-sm">{img.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Base: {img.base}</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500">{img.pulls.toLocaleString()} pulls</div>
                <div className="text-[10px] text-slate-600">Updated {img.updated}d ago</div>
              </div>
            </div>

            {/* CVE comparison */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2 rounded-lg text-center" style={{background:"#22c55e11",border:"1px solid #22c55e22"}}>
                <div className="text-[9px] text-emerald-400 mb-0.5">ShieldAI Hardened</div>
                <div className="text-sm font-black text-emerald-400">{img.criticals}C / {img.highs}H</div>
              </div>
              <div className="p-2 rounded-lg text-center" style={{background:"#ef444411",border:"1px solid #ef444422"}}>
                <div className="text-[9px] text-red-400 mb-0.5">Docker Hub Original</div>
                <div className="text-sm font-black text-red-400">{img.hubCriticals}C / {img.hubHighs}H</div>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-wrap mb-3">
              {img.size&&<span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{img.size}</span>}
              {img.tags.map(t=>(
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{background:(TAG_COLORS[t]||"#6B7280")+"22",color:TAG_COLORS[t]||"#6B7280"}}>{t}</span>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={()=>setPullModal(img)} className="flex-1 py-1.5 rounded-lg text-xs font-bold text-black" style={{background:GOLD}}>Pull Image</button>
              <button className="px-3 py-1.5 rounded-lg text-xs font-bold border text-slate-300 hover:text-white" style={{borderColor:"#374151",background:"transparent"}}>SBOM</button>
            </div>
          </div>
        ))}
      </div>

      {/* Standards */}
      <div className="fu rounded-xl border p-5" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"200ms"}}>
        <h3 className="text-sm font-bold text-white mb-3">Hardening Standards</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[["CIS Docker Benchmark","Fully compliant","#22c55e"],["NIST SP 800-190","Compliant","#22c55e"],["SLSA Supply Chain","Level 2 & 3","#6366f1"],["Sigstore/Cosign","All images signed","#22c55e"],["SBOM (CycloneDX)","Included with every image",GOLD]].map(([name,desc,c])=>(
            <div key={name} className="p-3 rounded-lg text-center" style={{background:"#0d1220",border:`1px solid ${c}22`}}>
              <CheckCircle className="w-5 h-5 mx-auto mb-1" style={{color:c}}/>
              <p className="text-xs font-bold text-white mb-0.5">{name}</p>
              <p className="text-[10px] text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {pullModal&&<PullModal img={pullModal} onClose={()=>setPullModal(null)}/>}
    </div>
  );
}