import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { observeAgent } from "@/lib/agentObservation";
import { formatDistanceToNow } from "date-fns";
import { KeyRound, Plus, Shield, Bot } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const PERM_COLOR = { read: "#3b82f6", read_write: "#eab308", admin: DANGER };

export default function AccessControlPage() {
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState("apikeys");

  const { data: apiKeys = [], isLoading: loadK } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => base44.entities.ApiKey.list("-created_date", 200).catch(() => []),
    initialData: [],
  });

  const { data: agents = [], isLoading: loadA } = useQuery({
    queryKey: ["agent-permissions"],
    queryFn: () => base44.entities.Agent.list("-created_date", 100).catch(() => []),
    initialData: [],
  });

  const keyRows = apiKeys.map(k => {
    const pc = PERM_COLOR[k.permissions] || "#64748b";
    return {
      _key: k.id,
      _cells: [
        <span className="text-[11px] font-semibold text-white">{k.name || "—"}</span>,
        <code className="text-[9px] font-mono" style={{ color: GOLD }}>{k.key_prefix ? `${k.key_prefix}${"*".repeat(16)}` : "—"}</code>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: pc, background: `${pc}18` }}>{k.permissions || "—"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-28 block">{k.scopes || "—"}</span>,
        <span className="text-[9px] text-slate-500">{k.last_used_at ? formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true }) : "Never"}</span>,
        <span className="text-[9px]" style={{ color: k.expires_at && new Date(k.expires_at) < new Date() ? DANGER : "#64748b" }}>
          {k.expires_at ? k.expires_at.slice(0, 10) : "No expiry"}
        </span>,
        <span className="text-[9px] font-bold" style={{ color: k.is_active !== false ? SUCCESS : "#64748b" }}>{k.is_active !== false ? "● Active" : "○ Inactive"}</span>,
        <span className="text-[9px] text-slate-500">{k.description || "—"}</span>,
      ],
    };
  });

  const agentRows = agents.map(row => {
    const a = observeAgent(row);
    return ({
    _key: a.id,
    _cells: [
      <span className="text-[11px] font-semibold text-white">{a.name || "—"}</span>,
      <span className="text-[9px] text-slate-400">{a.permission_scope || a.scope || "—"}</span>,
      <span className="text-[9px] text-slate-300 truncate max-w-24 block">{a.allowed_actions || a.capabilities || "—"}</span>,
      <span className="text-[9px] text-slate-500">{a.denied_actions || "—"}</span>,
      <span className="text-[9px]" style={{ color: a.requires_human_approval === true ? "#eab308" : "#64748b" }}>{a.requires_human_approval === true ? "⚠ Required" : a.requires_human_approval === false ? "Not required" : "Unspecified"}</span>,
      <span className="text-[9px] font-mono text-slate-400">{a.rate_limit_per_hour || "—"}/hr</span>,
      <span className="text-[9px] font-bold" style={{ color: "#64748b" }}>{a.status === "online" ? "Recent heartbeat only" : a.status === "stale" ? "Stale heartbeat" : "No valid heartbeat"}</span>,
    ],
  });
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Governance", path: "/governance" }, { label: "Access Control" }]}
      title="Access Control" subtitle="API KEYS · AGENT PERMISSIONS · AUTHORIZATION POLICIES"
      actions={
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold" style={{ background: GOLD, color: "#0a0e17" }}>
          <Plus className="w-3.5 h-3.5" /> Create API Key
        </button>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active API Keys" value={apiKeys.filter(k=>k.is_active!==false).length} color={CYAN} icon={KeyRound} />
        <StatCard label="Admin Keys" value={apiKeys.filter(k=>k.permissions==="admin").length} color={DANGER} icon={Shield} />
        <StatCard label="Agent Policies" value={agents.length} color="#a78bfa" icon={Bot} />
        <StatCard label="Expired Keys" value={apiKeys.filter(k=>k.expires_at&&new Date(k.expires_at)<new Date()).length} color={DANGER} icon={KeyRound} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[["apikeys","API Keys"],["agents","Agent Permissions"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: tab===id ? GOLD : "rgba(255,255,255,0.03)", color: tab===id ? "#0a0e17" : "#64748b", border: `1px solid ${tab===id?GOLD:BORDER}` }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "apikeys" ? (
        <GDSTable
          columns={["Name","Key","Permissions","Scopes","Last Used","Expires","Active","Description"]}
          rows={keyRows} isLoading={loadK}
          emptyText="No API keys found" />
      ) : (
        <GDSTable
          columns={["Agent Name","Permission Scope","Allowed Actions","Denied Actions","Human Approval","Rate Limit","Status"]}
          rows={agentRows} isLoading={loadA}
          emptyText="No agent permission policies found" />
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: "#111827", border: `1px solid ${BORDER}` }}>
            <h3 className="text-base font-bold text-white mb-4">Create API Key</h3>
            <div className="space-y-3">
              {[["Key Name","name","My API Key"],["Description","desc","Used for CI/CD integration"]].map(([label,key,ph]) => (
                <div key={key}>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{label}</label>
                  <input placeholder={ph} className="w-full px-3 py-2 rounded-lg text-xs text-white bg-transparent outline-none" style={{ border: `1px solid ${BORDER}` }} />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Permissions</label>
                <select className="w-full px-3 py-2 rounded-lg text-xs text-slate-300" style={{ background: "#080c14", border: `1px solid ${BORDER}` }}>
                  <option>read</option><option>read_write</option><option>admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white" style={{ border: `1px solid ${BORDER}` }}>Cancel</button>
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg text-xs font-bold" style={{ background: GOLD, color: "#0a0e17" }}>Create Key</button>
            </div>
          </div>
        </div>
      )}
    </GDSPageShell>
  );
}