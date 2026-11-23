import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Bot, Shield, AlertTriangle, Globe } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff"; const GOLD = "#c9a84c";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const BOT_COLORS = ["#ef4444","#f97316","#eab308","#3b82f6","#8b5cf6","#10b981","#a78bfa"];
const ACTION_COLOR = { blocked: DANGER, monitored: "#eab308", allowed: "#64748b" };

export default function BotDetectionPage() {
  const [typeF, setTypeF] = useState("all");
  const [sevF, setSevF]  = useState("all");
  const [countryF, setCountryF] = useState("all");
  const [actionF, setActionF]   = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["bot-events"],
    queryFn: () => base44.entities.BotEvent.list("-detected_at", 500).catch(() => []),
    initialData: [],
  });

  const types    = [...new Set(events.map(e => e.bot_type).filter(Boolean))];
  const countries= [...new Set(events.map(e => e.country).filter(Boolean))];
  const actions  = [...new Set(events.map(e => e.action_taken).filter(Boolean))];

  const today = events.filter(e => e.detected_at && new Date(e.detected_at).toDateString() === new Date().toDateString());
  const blocked = events.filter(e => e.action_taken === "blocked").length;
  const topType = types.reduce((top, ty) => {
    const cnt = events.filter(e => e.bot_type === ty).length;
    return cnt > (top.cnt || 0) ? { ty, cnt } : top;
  }, {}).ty || "—";

  const filtered = events.filter(e => {
    if (typeF !== "all" && e.bot_type !== typeF) return false;
    if (sevF !== "all" && e.severity !== sevF) return false;
    if (countryF !== "all" && e.country !== countryF) return false;
    if (actionF !== "all" && e.action_taken !== actionF) return false;
    return true;
  });

  // Pie data
  const typeCount = {};
  events.forEach(e => { if (e.bot_type) typeCount[e.bot_type] = (typeCount[e.bot_type] || 0) + 1; });
  const pieData = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

  // Country bar
  const countryCount = {};
  events.forEach(e => { if (e.country) countryCount[e.country] = (countryCount[e.country] || 0) + 1; });
  const countryData = Object.entries(countryCount).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}));

  const rows = filtered.slice(0, 200).map(e => {
    const ac = ACTION_COLOR[e.action_taken] || "#64748b";
    return {
      _key: e.id,
      _cells: [
        <span className="text-[10px] text-white">{e.app_name || "—"}</span>,
        <span className="text-[9px] font-bold capitalize px-2 py-0.5 rounded"
          style={{ color: CYAN, background: "rgba(0,212,255,0.1)" }}>
          {(e.bot_type || "—").replace(/_/g," ")}
        </span>,
        <SevBadge sev={e.severity} />,
        <span className="text-[9px] font-mono text-slate-400">{e.source_ip || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-500">{e.ip_range || "—"}</span>,
        <span className="text-[9px]">{e.country || "—"}</span>,
        <span className="text-[10px] font-mono" style={{ color: (e.requests_per_min||0)>100?DANGER:"#64748b" }}>{e.requests_per_min ?? "—"}</span>,
        <span className="text-[10px] font-mono text-slate-300">{e.total_requests ?? "—"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-20 block">{e.endpoints_targeted || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
          style={{ color: ac, background: `${ac}18` }}>{e.action_taken || "—"}</span>,
        <span className="text-[9px] text-slate-500">
          {e.detected_at ? formatDistanceToNow(new Date(e.detected_at), { addSuffix: true }) : "—"}
        </span>,
        <span className="text-[9px] text-slate-500">
          {e.blocked_until ? formatDistanceToNow(new Date(e.blocked_until), { addSuffix: true }) : "—"}
        </span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Runtime", path: "/protect" }, { label: "Bot Detection" }]}
      title="Bot Detection" subtitle="AUTOMATED THREAT DETECTION · BOT FINGERPRINTING · DDoS MITIGATION">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Bots Detected Today" value={today.length} color={DANGER} icon={Bot} />
        <StatCard label="Bots Blocked" value={blocked} color={SUCCESS} icon={Shield} />
        <StatCard label="Top Bot Type" value={(topType||"—").replace(/_/g," ")} color={CYAN} icon={Bot} />
        <StatCard label="Requests Blocked" value={events.reduce((s,e)=>s+(e.total_requests||0),0)} color="#f97316" icon={AlertTriangle} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4">Bot Type Distribution</h3>
          {pieData.length === 0 ? <p className="text-xs text-slate-500 text-center py-8">No data</p> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={BOT_COLORS[i % BOT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: `1px solid ${BORDER}`, fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {pieData.slice(0,6).map((d,i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm" style={{ background: BOT_COLORS[i%BOT_COLORS.length] }} />
                    <span className="text-[9px] text-slate-400 capitalize">{d.name.replace(/_/g," ")}</span>
                    <span className="text-[9px] font-bold font-mono ml-auto text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4">Top Source Countries</h3>
          {countryData.length === 0 ? <p className="text-xs text-slate-500 text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={countryData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 8 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 8 }} width={40} />
                <Tooltip contentStyle={{ background: "#1e293b", border: `1px solid ${BORDER}`, fontSize: 10 }} />
                <Bar dataKey="value" fill={GOLD} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          ["bot type",typeF,setTypeF,["all",...types]],
          ["severity",sevF,setSevF,["all","critical","high","medium","low"]],
          ["country",countryF,setCountryF,["all",...countries.slice(0,10)]],
          ["action",actionF,setActionF,["all",...actions]],
        ].map(([key,val,set,opts]) => (
          <select key={key} value={val} onChange={e => set(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o.replace(/_/g," ")}</option>)}
          </select>
        ))}
      </div>

      <GDSTable
        columns={["App","Bot Type","Severity","Source IP","IP Range","Country","Req/Min","Total Reqs","Endpoints","Action","Detected","Blocked Until"]}
        rows={rows} isLoading={isLoading}
        emptyText="No bot events detected" />
    </GDSPageShell>
  );
}