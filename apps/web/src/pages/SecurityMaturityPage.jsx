import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, TrendingUp, Star, Lock, CheckCircle, ArrowRight, FileText } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, BarChart, Bar, Cell } from "recharts";

const GOLD = "#C9A84C";

const LEVELS = ["Initial","Developing","Defined","Managed","Optimizing"];

const RADAR_DATA = [
  {pillar:"Code",current:72,industry:58,target:85},
  {pillar:"Cloud",current:65,industry:52,target:80},
  {pillar:"Attack",current:78,industry:61,target:85},
  {pillar:"Runtime",current:81,industry:55,target:90},
  {pillar:"Protect",current:88,industry:60,target:92},
  {pillar:"Governance",current:59,industry:48,target:75},
];

const TREND = [
  {month:"Jul 25",score:41},{month:"Aug 25",score:44},{month:"Sep 25",score:47},
  {month:"Oct 25",score:49},{month:"Nov 25",score:52},{month:"Dec 25",score:55},
  {month:"Jan 26",score:58},{month:"Feb 26",score:61},{month:"Mar 26",score:64},
  {month:"Apr 26",score:67},{month:"May 26",score:70},{month:"Jun 26",score:74},
];

const MILESTONES = [
  {month:"Aug 25",label:"First cloud scan"},
  {month:"Oct 25",label:"SAST enabled"},
  {month:"Jan 26",label:"Pentest completed"},
  {month:"Mar 26",label:"SOC2 started"},
];

const BADGES = [
  {icon:"🛡️",name:"First Line of Defense",desc:"First security scan completed",earned:"Aug 2025",locked:false},
  {icon:"🔍",name:"Eyes Wide Open",desc:"Connected first cloud account",earned:"Aug 2025",locked:false},
  {icon:"🤖",name:"Automate to Dominate",desc:"First workflow automation created",earned:"Jan 2026",locked:false},
  {icon:"💀",name:"Threat Hunter",desc:"First threat hunt completed",earned:"Mar 2026",locked:false},
  {icon:"✅",name:"Compliance Champion",desc:"First framework at 80%+",earned:"Apr 2026",locked:false},
  {icon:"🚀",name:"Zero-Day Defender",desc:"Pre-CVE protection enabled",earned:"Jun 2026",locked:false},
  {icon:"🏆",name:"Security Champion",desc:"Overall score > 80",earned:null,locked:true,hint:"Score 6 more points"},
  {icon:"📋",name:"Audit Ready",desc:"Evidence collected for all frameworks",earned:null,locked:true,hint:"Complete evidence collection"},
  {icon:"🔒",name:"Zero Critical Findings",desc:"All criticals resolved within SLA",earned:null,locked:true,hint:"Resolve 3 open criticals"},
  {icon:"👥",name:"Team Player",desc:"5+ team members active",earned:null,locked:true,hint:"Invite 3 more teammates"},
];

const RECS = [
  {action:"Enable automated SBOM generation for all repos",impact:"Code security",effort:"Low",points:"+4",path:"/code/sbom"},
  {action:"Connect remaining 2 cloud accounts to ShieldAI",impact:"Cloud security",effort:"Low",points:"+5",path:"/cloud"},
  {action:"Enable Pentest on Deploy for top 3 services",impact:"Attack coverage",effort:"Medium",points:"+6",path:"/attack/continuous"},
  {action:"Complete SOC2 evidence collection (8 controls missing)",impact:"Governance",effort:"Medium",points:"+7",path:"/compliance-evidence"},
  {action:"Run first threat hunt using playbook library",impact:"Detection",effort:"Low",points:"+3",path:"/threat-hunting"},
];

const BENCHMARK = [
  {name:"Your Score",score:74,color:GOLD},
  {name:"Industry Avg",score:58,color:"#6B7280"},
  {name:"Top Quartile",score:82,color:"#6366f1"},
  {name:"Best-in-Class",score:94,color:"#22c55e"},
];

export default function SecurityMaturityPage() {
  const score = 74;
  const level = LEVELS[3]; // Managed
  const prevScore = 70;
  const delta = score - prevScore;

  return (
    <div className="min-h-screen p-6 space-y-6" style={{background:"#0A0E1A"}}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu 0.4s ease both}`}</style>
      <div className="fu flex items-center gap-1 text-xs text-slate-500">
        <Link to="/" className="hover:text-white">Overview</Link><span>/</span><span style={{color:GOLD}}>Security Maturity</span>
      </div>

      {/* Hero */}
      <div className="fu rounded-2xl border p-7" style={{background:"linear-gradient(135deg,#0d1220,#111827)",borderColor:"#1F2937",animationDelay:"40ms"}}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">Security Program Maturity</h1>
            <p className="text-slate-400 text-sm">Track your security journey — measure progress, celebrate wins, plan next steps</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-3xl font-black" style={{color:GOLD}}>{score}</div>
              <div className="text-[10px] text-slate-500">/ 100</div>
            </div>
            <div>
              <div className="text-sm font-black text-white">{level}</div>
              <div className="text-[10px] text-emerald-400">+{delta} this month</div>
            </div>
          </div>
        </div>
        {/* Journey timeline */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {LEVELS.map((l,i)=>{
            const active = l===level;
            const done = LEVELS.indexOf(level)>i;
            return (
              <React.Fragment key={l}>
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                    style={{background:active?GOLD:done?"#22c55e22":"#1F2937",color:active?"#0A0E1A":done?"#22c55e":"#6B7280",border:`2px solid ${active?GOLD:done?"#22c55e":"#374151"}`}}>
                    {done&&!active?"✓":i+1}
                  </div>
                  <span className="text-[10px] mt-1 whitespace-nowrap" style={{color:active?GOLD:done?"#22c55e":"#6B7280"}}>{l}</span>
                </div>
                {i<LEVELS.length-1&&<div className="flex-1 h-0.5 min-w-[30px]" style={{background:LEVELS.indexOf(level)>i?"#22c55e":"#374151"}}/>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="fu rounded-xl border p-5" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"80ms"}}>
          <h3 className="text-sm font-bold text-white mb-3">Pillar Maturity Scores</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="#1F2937"/>
              <PolarAngleAxis dataKey="pillar" tick={{fill:"#9CA3AF",fontSize:11}}/>
              <Radar name="Industry Avg" dataKey="industry" stroke="#374151" fill="#374151" fillOpacity={0.1} strokeDasharray="4 2"/>
              <Radar name="Target" dataKey="target" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} strokeDasharray="4 2"/>
              <Radar name="Current" dataKey="current" stroke={GOLD} fill={GOLD} fillOpacity={0.15}/>
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded inline-block" style={{background:GOLD}}/> You</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded inline-block border-dashed border border-slate-600 bg-transparent"/><span className="text-slate-500">Industry Avg</span></span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded inline-block" style={{background:"#3b82f6"}}/><span className="text-slate-500">Target</span></span>
          </div>
        </div>

        {/* 12-month trend */}
        <div className="fu rounded-xl border p-5" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"100ms"}}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">12-Month Progress</h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{background:"#22c55e22",color:"#22c55e"}}>+{score-TREND[0].score} pts YoY</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={TREND}>
              <XAxis dataKey="month" tick={{fill:"#6B7280",fontSize:9}}/>
              <YAxis domain={[30,100]} tick={{fill:"#6B7280",fontSize:9}}/>
              <Tooltip contentStyle={{background:"#1F2937",border:"none",borderRadius:6,fontSize:11,color:"#fff"}}/>
              {MILESTONES.map(m=><ReferenceLine key={m.label} x={m.month} stroke="#374151" strokeDasharray="3 3" label={{value:m.label.split(" ")[0],fill:"#6B7280",fontSize:8}}/>)}
              <Line type="monotone" dataKey="score" stroke={GOLD} strokeWidth={2.5} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Achievements */}
      <div className="fu rounded-xl border p-5" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"140ms"}}>
        <h3 className="text-sm font-bold text-white mb-4">Achievement Badges</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {BADGES.map(b=>(
            <div key={b.name} className={`rounded-xl p-3 text-center border transition-all ${!b.locked?"hover:scale-[1.04]":""}`}
              style={{background:b.locked?"#0d1220":"#1F2937",borderColor:b.locked?"#1F2937":GOLD+"44",opacity:b.locked?0.5:1}}>
              <div className="text-2xl mb-1">{b.locked?"🔒":b.icon}</div>
              <div className="text-[10px] font-bold text-white mb-0.5">{b.name}</div>
              <div className="text-[9px] text-slate-500">{b.locked?b.hint:b.earned}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recommendations */}
        <div className="fu rounded-xl border p-5" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"180ms"}}>
          <h3 className="text-sm font-bold text-white mb-3">Top Improvement Actions</h3>
          <div className="space-y-2">
            {RECS.map((r,i)=>(
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors" style={{background:"#0d1220"}}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium">{r.action}</p>
                  <div className="flex gap-2 mt-1 text-[10px] text-slate-500">
                    <span>{r.impact}</span>
                    <span>Effort: {r.effort}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-black text-emerald-400">{r.points}</span>
                  <Link to={r.path} className="p-1 rounded hover:bg-white/10"><ArrowRight className="w-3.5 h-3.5 text-slate-400 hover:text-white"/></Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benchmark */}
        <div className="fu rounded-xl border p-5" style={{background:"#111827",borderColor:"#1F2937",animationDelay:"200ms"}}>
          <h3 className="text-sm font-bold text-white mb-3">Industry Benchmark</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={BENCHMARK} layout="vertical">
              <XAxis type="number" domain={[0,100]} tick={{fill:"#6B7280",fontSize:9}}/>
              <YAxis dataKey="name" type="category" width={90} tick={{fill:"#9CA3AF",fontSize:10}}/>
              <Tooltip contentStyle={{background:"#1F2937",border:"none",borderRadius:6,fontSize:11,color:"#fff"}}/>
              <Bar dataKey="score" radius={[0,4,4,0]}>
                {BENCHMARK.map((b,i)=><Cell key={i} fill={b.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-400 mt-2">You are <span className="font-bold" style={{color:GOLD}}>8 points</span> away from the top quartile. Keep going!</p>
          <button className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-black" style={{background:GOLD}}>
            <FileText className="w-4 h-4"/> Generate Board Report
          </button>
        </div>
      </div>
    </div>
  );
}