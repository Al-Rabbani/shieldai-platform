import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Zap, Shield, Database } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const WARN = "#eab308"; const CARD = "#111827"; const BORDER = "#1a1f2e";

export default function PromptSecurityPage() {
  const [tab,   setTab]   = useState("injections");
  const [sevF,  setSevF]  = useState("all");
  const [statF, setStatF] = useState("all");

  const { data: events = [], isLoading: loadE } = useQuery({
    queryKey: ["prompt-events"],
    queryFn: () => base44.entities.LLMUsageEvent.list("-created_date", 500).catch(() => []),
    initialData: [],
  });

  const injections = events.filter(e => e.event_type === "injection" || e.event_type === "prompt_injection");
  const leaks      = events.filter(e => e.event_type === "data_leak" || e.event_type === "data_leakage");
  const polviol    = events.filter(e => e.event_type === "policy_violation");

  const filterFn = items => items.filter(e => {
    if (sevF  !== "all" && e.severity !== sevF)  return false;
    if (statF !== "all" && e.status   !== statF) return false;
    return true;
  });

  const injRows = filterFn(injections).map(e => ({
    _key: e.id,
    _cells: [
      <span className="text-[9px] capitalize text-slate-400">{(e.event_type||"—").replace(/_/g," ")}</span>,
      <SevBadge sev={e.severity} />,
      <StatusBadge status={e.status} />,
      <span className="text-[9px] font-mono text-slate-400">{e.user_id?.slice(0,8) || "—"}</span>,
      <span className="text-[9px] font-mono text-slate-500">{e.session_id?.slice(0,8) || "—"}</span>,
      <span className="text-[9px] text-slate-400">{e.model || "—"}</span>,
      <span className="text-[9px] text-slate-400">{e.provider || "—"}</span>,
      <code className="text-[8px] text-green-400 truncate max-w-28 block">{e.prompt_snippet || e.prompt?.slice(0,40) || "—"}</code>,
      <span className="text-[9px] text-slate-500">{e.detected_pattern || "—"}</span>,
      <span className="text-[9px] text-slate-400">{e.detection_method || "—"}</span>,
      <span className="text-[9px] font-bold" style={{ color: e.blocked ? DANGER : "#64748b" }}>{e.blocked ? "⚠ Blocked" : "Allowed"}</span>,
      <span className="text-[9px] capitalize text-slate-400">{e.action_taken || "—"}</span>,
      <span className="text-[9px]" style={{ color: e.false_positive ? WARN : "#64748b" }}>{e.false_positive ? "Yes" : "No"}</span>,
      <span className="text-[9px] text-slate-500">{e.created_date ? formatDistanceToNow(new Date(e.created_date), { addSuffix: true }) : "—"}</span>,
    ],
  }));

  const leakRows = filterFn(leaks).map(e => ({
    _key: e.id,
    _cells: [
      <span className="text-[9px] capitalize text-slate-400">{(e.leak_type||"data_leak").replace(/_/g," ")}</span>,
      <SevBadge sev={e.severity} />,
      <StatusBadge status={e.status} />,
      <span className="text-[9px] font-mono text-slate-400">{e.user_id?.slice(0,8) || "—"}</span>,
      <span className="text-[9px] font-mono text-slate-500">{e.session_id?.slice(0,8) || "—"}</span>,
      <span className="text-[9px] text-slate-400">{e.model || "—"}</span>,
      <span className="text-[9px] text-slate-400">{e.provider || "—"}</span>,
      <span className="text-[9px] capitalize text-slate-400">{e.data_category || "—"}</span>,
      <code className="text-[8px] text-red-400">{"[REDACTED]"}</code>,
      <span className="text-[9px] font-mono" style={{ color: (e.records_exposed||0)>0 ? DANGER : "#64748b" }}>{e.records_exposed ?? 0}</span>,
      <span className="text-[9px] font-bold" style={{ color: e.blocked ? DANGER : "#64748b" }}>{e.blocked ? "⚠ Blocked" : "Allowed"}</span>,
      <span className="text-[9px] text-slate-400">{e.policy_violated || "—"}</span>,
      <span className="text-[9px] text-slate-500">{e.created_date ? formatDistanceToNow(new Date(e.created_date), { addSuffix: true }) : "—"}</span>,
    ],
  }));

  const polRows = filterFn(polviol).map(e => ({
    _key: e.id,
    _cells: [
      <span className="text-[9px] font-semibold text-white">{e.policy_name || "—"}</span>,
      <span className="text-[9px] capitalize text-slate-400">{(e.violation_type||"—").replace(/_/g," ")}</span>,
      <SevBadge sev={e.severity} />,
      <StatusBadge status={e.status} />,
      <span className="text-[9px] font-mono text-slate-400">{e.user_id?.slice(0,8) || "—"}</span>,
      <span className="text-[9px] text-slate-400">{e.model || "—"}</span>,
      <span className="text-[9px] text-slate-400">{e.provider || "—"}</span>,
      <span className="text-[9px] text-slate-400 truncate max-w-24 block">{e.description || "—"}</span>,
      <span className="text-[9px] text-slate-400">{e.policy_reference || "—"}</span>,
      <span className="text-[9px] text-slate-500">{e.created_date ? formatDistanceToNow(new Date(e.created_date), { addSuffix: true }) : "—"}</span>,
    ],
  }));

  const TABS = [
    { id: "injections", label: "Prompt Injections", icon: Zap, count: injections.length },
    { id: "leaks",      label: "Data Leaks",        icon: Database, count: leaks.length },
    { id: "policy",     label: "Policy Violations", icon: Shield, count: polviol.length },
  ];

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "AI Security", path: "/ai-security" }, { label: "Prompt Security" }]}
      title="Prompt Security" subtitle="INJECTION DETECTION · DATA LEAK PREVENTION · POLICY ENFORCEMENT"
      actions={
        <div className="flex items-center gap-2">
          {[["severity", sevF, setSevF, ["all","critical","high","medium","low"]], ["status", statF, setStatF, ["all","open","resolved","blocked"]]].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o}</option>)}
            </select>
          ))}
        </div>
      }>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Prompt Injections" value={injections.length} color={DANGER} icon={Zap} />
        <StatCard label="Data Leaks" value={leaks.length} color={WARN} icon={Database} />
        <StatCard label="Policy Violations" value={polviol.length} color="#a78bfa" icon={Shield} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: tab===t.id ? GOLD : "rgba(255,255,255,0.03)", color: tab===t.id ? "#0a0e17" : "#64748b", border: `1px solid ${tab===t.id?GOLD:BORDER}` }}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              <span className="px-1.5 rounded text-[8px] font-black"
                style={{ background: tab===t.id ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.05)", color: tab===t.id?"#0a0e17":"#94a3b8" }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {tab === "injections" && (
        <GDSTable
          columns={["Event Type","Severity","Status","User","Session","Model","Provider","Prompt","Pattern","Method","Blocked","Action","False Pos","Detected"]}
          rows={injRows} isLoading={loadE} emptyText="No prompt injection events detected" />
      )}
      {tab === "leaks" && (
        <GDSTable
          columns={["Leak Type","Severity","Status","User","Session","Model","Provider","Data Category","Data","Records","Blocked","Policy","Detected"]}
          rows={leakRows} isLoading={loadE} emptyText="No data leak events detected" />
      )}
      {tab === "policy" && (
        <GDSTable
          columns={["Policy","Violation Type","Severity","Status","User","Model","Provider","Description","Reference","Detected"]}
          rows={polRows} isLoading={loadE} emptyText="No policy violations detected" />
      )}
    </GDSPageShell>
  );
}