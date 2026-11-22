import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Eye, Play, AlertTriangle, Users, Building2 } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const WARN = "#eab308"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";
const SEV_COLOR = { critical: DANGER, high: "#f97316", medium: WARN, low: "#3b82f6" };

export default function ShadowAIPage() {
  const [riskF, setRiskF] = useState("all");
  const [catF,  setCatF]  = useState("all");

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["shadow-ai-apps"],
    queryFn: () => base44.entities.AIInsight.list("-created_date", 200).catch(() => []),
    initialData: [],
  });

  const categories = [...new Set(apps.map(a => a.category).filter(Boolean))];
  const filtered = apps.filter(a => {
    if (riskF !== "all" && a.risk_level !== riskF) return false;
    if (catF  !== "all" && a.category   !== catF)  return false;
    return true;
  });

  const riskDist = ["critical","high","medium","low"].map(s => ({ name: s, value: apps.filter(a=>a.risk_level===s).length, color: SEV_COLOR[s] })).filter(d=>d.value>0);
  const deptMap = {};
  apps.forEach(a => { (a.departments||"").split(",").forEach(d => { d=d.trim(); if(d) deptMap[d]=(deptMap[d]||0)+1; }); });
  const deptData = Object.entries(deptMap).map(([d,c])=>({dept:d,count:c})).sort((a,b)=>b.count-a.count).slice(0,8);

  const rows = filtered.map(a => {
    const rc = SEV_COLOR[a.risk_level] || "#64748b";
    return {
      _key: a.id,
      _cells: [
        <span className="text-[11px] font-semibold text-white">{a.app_name || a.title || "—"}</span>,
        <span className="text-[9px] capitalize text-slate-400">{a.category || "—"}</span>,
        <span className="text-[9px] text-slate-400">{a.provider || "—"}</span>,
        <span className="text-[9px] capitalize text-slate-500">{a.discovery_method || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: rc, background: `${rc}18` }}>{a.risk_level || "—"}</span>,
        <span className="text-[9px] capitalize text-slate-400">{a.status || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{a.users_count ?? 0}</span>,
        <span className="text-[9px] text-slate-500 truncate max-w-20 block">{a.departments || "—"}</span>,
        <span className="text-[9px] text-slate-400">{a.data_shared || "—"}</span>,
        <span className="text-[9px] font-bold" style={{ color: a.pii_risk ? DANGER : SUCCESS }}>{a.pii_risk ? "⚠ Yes" : "No"}</span>,
        <span className="text-[9px] font-bold" style={{ color: a.ip_risk ? WARN : "#64748b" }}>{a.ip_risk ? "⚠ Yes" : "No"}</span>,
        <span className="text-[9px] font-bold" style={{ color: a.api_key_exposed ? DANGER : "#64748b" }}>{a.api_key_exposed ? "⚠ Exposed" : "No"}</span>,
        <span className="text-[9px] text-slate-500">{a.first_detected || a.created_date ? formatDistanceToNow(new Date(a.first_detected || a.created_date), { addSuffix: true }) : "—"}</span>,
        <span className="text-[9px] text-slate-500 truncate max-w-20 block">{a.remediation || "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "AI Security", path: "/ai-security" }, { label: "Shadow AI" }]}
      title="Shadow AI Detection" subtitle="UNSANCTIONED AI TOOLS · DATA EXPOSURE RISK · POLICY ENFORCEMENT"
      actions={
        <div className="flex items-center gap-2">
          {[["risk", riskF, setRiskF, ["all","critical","high","medium","low"]], ["category", catF, setCatF, ["all",...categories]]].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o}</option>)}
            </select>
          ))}
          <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold" style={{ background: GOLD, color: "#0a0e17" }}>
            <Play className="w-3.5 h-3.5" /> Run Discovery
          </button>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Shadow AI Apps" value={apps.length} color={WARN} icon={Eye} />
        <StatCard label="Users at Risk" value={apps.reduce((s,a)=>s+(a.users_count||0),0)} color={DANGER} icon={Users} />
        <StatCard label="Departments" value={Object.keys(deptMap).length} color={CYAN} icon={Building2} />
        <StatCard label="Critical Risk" value={apps.filter(a=>a.risk_level==="critical").length} color={DANGER} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-3">Risk Distribution</h3>
          {riskDist.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={riskDist} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} strokeWidth={0}>
                    {riskDist.map((d,i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: `1px solid ${BORDER}`, fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {riskDist.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                    <span className="text-[10px] capitalize text-slate-400 w-16">{d.name}</span>
                    <span className="text-[10px] font-bold font-mono" style={{ color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-xs text-slate-500 py-8 text-center">No data</p>}
        </div>
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-3">Departments Affected</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={deptData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 8 }} />
                <YAxis type="category" dataKey="dept" tick={{ fill: "#94a3b8", fontSize: 8 }} width={60} />
                <Tooltip contentStyle={{ background: "#1e293b", border: `1px solid ${BORDER}`, fontSize: 10 }} />
                <Bar dataKey="count" fill={WARN} radius={[0,2,2,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-slate-500 py-8 text-center">No department data</p>}
        </div>
      </div>

      <GDSTable
        columns={["App Name","Category","Provider","Discovery","Risk","Status","Users","Depts","Data Shared","PII Risk","IP Risk","API Key","First Detected","Remediation"]}
        rows={rows} isLoading={isLoading}
        emptyText="No shadow AI apps detected" />
    </GDSPageShell>
  );
}