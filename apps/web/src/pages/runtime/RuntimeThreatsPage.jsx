import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Shield, Activity, AlertTriangle, Globe } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff"; const GOLD = "#c9a84c";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const ACTION_COLOR = { blocked: DANGER, monitored: "#eab308", allowed: "#64748b", rate_limited: "#f97316" };

export default function RuntimeThreatsPage() {
  const [sevF, setSevF]  = useState("all");
  const [typeF, setTypeF] = useState("all");
  const [actionF, setActionF] = useState("all");
  const [countryF, setCountryF] = useState("all");

  const { data: threats = [], isLoading } = useQuery({
    queryKey: ["runtime-threats"],
    queryFn: () => base44.entities.RuntimeThreat.list("-detected_at", 500).catch(() => []),
    refetchInterval: 15000,
    initialData: [],
  });

  const types = [...new Set(threats.map(t => t.threat_type).filter(Boolean))];
  const countries = [...new Set(threats.map(t => t.country).filter(Boolean))].slice(0, 20);
  const actions = [...new Set(threats.map(t => t.action_taken).filter(Boolean))];

  const filtered = threats.filter(t => {
    if (sevF !== "all" && t.severity !== sevF) return false;
    if (typeF !== "all" && t.threat_type !== typeF) return false;
    if (actionF !== "all" && t.action_taken !== actionF) return false;
    if (countryF !== "all" && t.country !== countryF) return false;
    return true;
  });

  // Attacks per hour (last 24h)
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const h = new Date(); h.setHours(h.getHours() - (23 - i), 0, 0, 0);
    const label = `${h.getHours()}:00`;
    const count = threats.filter(t => {
      if (!t.detected_at) return false;
      const d = new Date(t.detected_at);
      return d.getHours() === h.getHours() && d.getDate() === h.getDate();
    }).length;
    return { label, count };
  });

  const today = threats.filter(t => t.detected_at && new Date(t.detected_at).toDateString() === new Date().toDateString());
  const blockedToday = today.filter(t => t.action_taken === "blocked").length;
  const topType = types.reduce((top, ty) => {
    const cnt = threats.filter(t => t.threat_type === ty).length;
    return cnt > (top.cnt || 0) ? { ty, cnt } : top;
  }, {}).ty || "—";
  const topCountry = countries.reduce((top, co) => {
    const cnt = threats.filter(t => t.country === co).length;
    return cnt > (top.cnt || 0) ? { co, cnt } : top;
  }, {}).co || "—";

  const rows = filtered.slice(0, 200).map(t => {
    const ac = ACTION_COLOR[t.action_taken] || "#64748b";
    return {
      _key: t.id,
      _cells: [
        <span className="text-[9px] font-bold capitalize"
          style={{ color: CYAN }}>{(t.threat_type || "—").replace(/_/g," ")}</span>,
        <SevBadge sev={t.severity} />,
        <span className="text-[10px] text-white">{t.app_name || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{t.source_ip || "—"}</span>,
        <span className="text-[9px]">{t.country ? `${t.country_flag || "🌐"} ${t.country}` : "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400 truncate max-w-24 block">{t.endpoint || "—"}</span>,
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ color: "#00d4ff", background: "rgba(0,212,255,0.1)" }}>{t.http_method || "—"}</span>,
        <code className="text-[8px] text-green-400 truncate max-w-20 block">{t.payload_snippet || "—"}</code>,
        <span className="text-[8px] font-bold px-2 py-0.5 rounded capitalize"
          style={{ color: ac, background: `${ac}18` }}>{t.action_taken || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-500">{t.response_time_ms ? `${t.response_time_ms}ms` : "—"}</span>,
        <span className="text-[9px] text-slate-500">
          {t.detected_at ? formatDistanceToNow(new Date(t.detected_at), { addSuffix: true }) : "—"}
        </span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Runtime", path: "/protect" }, { label: "Threats" }]}
      title="Runtime Threats"
      subtitle={
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: SUCCESS }} />
          LIVE ATTACK FEED · AUTO-REFRESH EVERY 15s
        </span>
      }
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {[
            ["severity", sevF, setSevF, ["all","critical","high","medium","low"]],
            ["type", typeF, setTypeF, ["all",...types.slice(0,8)]],
            ["action", actionF, setActionF, ["all",...actions]],
            ["country", countryF, setCountryF, ["all",...countries.slice(0,8)]],
          ].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o.replace(/_/g," ")}</option>)}
            </select>
          ))}
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attacks Today" value={today.length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Blocked Today" value={blockedToday} color={SUCCESS} icon={Shield} />
        <StatCard label="Top Attack Type" value={topType} color="#f97316" icon={Activity} />
        <StatCard label="Top Source Country" value={topCountry} color={CYAN} icon={Globe} />
      </div>

      {/* Hourly chart */}
      <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <p className="text-xs font-bold text-white mb-3">Attacks Per Hour — Last 24h</p>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 7 }} interval={3} />
            <YAxis tick={{ fill: "#475569", fontSize: 7 }} />
            <Tooltip contentStyle={{ background: "#1e293b", border: `1px solid ${BORDER}`, fontSize: 10 }} />
            <Bar dataKey="count" fill={DANGER} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <GDSTable
        columns={["Threat Type","Severity","App","Source IP","Country","Endpoint","Method","Payload","Action","Resp Time","Detected"]}
        rows={rows} isLoading={isLoading}
        emptyText="No runtime threats detected" />
    </GDSPageShell>
  );
}