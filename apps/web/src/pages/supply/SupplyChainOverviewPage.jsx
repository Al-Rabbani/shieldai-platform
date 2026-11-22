import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Package, Play, AlertTriangle, Shield, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const REGISTRY_COLOR = { npm: "#cb3837", pip: "#3776ab", maven: "#c71a36", go: "#00add8", nuget: "#004880", cargo: "#f74c00" };
const EVENT_COLOR = { malware: DANGER, typosquatting: "#f97316", compromised_maintainer: DANGER, dependency_confusion: "#f97316", license_violation: "#eab308" };

const ECOSYSTEMS = ["npm", "pip", "go", "maven", "cargo", "nuget"];

export default function SupplyChainOverviewPage() {
  const [evtF, setEvtF]  = useState("all");
  const [sevF, setSevF]  = useState("all");
  const [regF, setRegF]  = useState("all");
  const [statF, setStatF] = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["supply-chain-events"],
    queryFn: () => base44.entities.SupplyChainEvent.list("-detected_at", 500).catch(() => []),
    initialData: [],
  });

  const evtTypes = [...new Set(events.map(e => e.event_type).filter(Boolean))];
  const regs     = [...new Set(events.map(e => e.registry).filter(Boolean))];

  const filtered = events.filter(e => {
    if (evtF  !== "all" && e.event_type !== evtF) return false;
    if (sevF  !== "all" && e.severity   !== sevF) return false;
    if (regF  !== "all" && e.registry   !== regF) return false;
    if (statF !== "all" && e.status     !== statF) return false;
    return true;
  });

  const ecoData = ECOSYSTEMS.map(eco => ({
    name: eco,
    scanned: events.filter(e => e.registry === eco).length,
    blocked: events.filter(e => e.registry === eco && e.action_taken === "blocked").length,
  }));

  const rows = filtered.slice(0, 300).map(e => {
    const ec = EVENT_COLOR[e.event_type] || "#64748b";
    const rc = REGISTRY_COLOR[e.registry] || "#64748b";
    return {
      _key: e.id,
      _cells: [
        <span className="text-[11px] font-semibold text-white">{e.package_name || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{e.version || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: rc, background: `${rc}18` }}>{e.registry || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: ec, background: `${ec}18` }}>{(e.event_type || "—").replace(/_/g, " ")}</span>,
        <SevBadge sev={e.severity} />,
        <StatusBadge status={e.status} />,
        <span className="text-[9px] text-slate-400">{e.developer || "—"}</span>,
        <span className="text-[9px] text-slate-400">{e.machine || "—"}</span>,
        <code className="text-[8px] text-green-400 truncate max-w-28 block">{e.install_command || "—"}</code>,
        <span className="text-[9px] text-slate-400">{e.malware_family || "—"}</span>,
        <span className="text-[9px] font-mono" style={{ color: e.cve_id ? DANGER : "#64748b" }}>{e.cve_id || "—"}</span>,
        <span className="text-[9px] font-bold capitalize" style={{ color: e.action_taken === "blocked" ? DANGER : "#eab308" }}>{e.action_taken || "—"}</span>,
        <span className="text-[9px] text-slate-500">{e.detected_at ? formatDistanceToNow(new Date(e.detected_at), { addSuffix: true }) : "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Supply Chain" }]}
      title="Supply Chain Security" subtitle="PACKAGE INTELLIGENCE · DEPENDENCY MONITORING · SAFECHAIN"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {[
            ["event", evtF, setEvtF, ["all", ...evtTypes]],
            ["severity", sevF, setSevF, ["all","critical","high","medium","low"]],
            ["registry", regF, setRegF, ["all", ...regs]],
            ["status", statF, setStatF, ["all","open","blocked","resolved"]],
          ].map(([key, val, set, opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o.replace(/_/g," ")}</option>)}
            </select>
          ))}
          <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold" style={{ background: GOLD, color: "#0a0e17" }}>
            <Play className="w-3.5 h-3.5" /> Run SafeChain Scan
          </button>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={events.length} color={CYAN} icon={Package} />
        <StatCard label="Critical Events" value={events.filter(e => e.severity === "critical").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Malware Detected" value={events.filter(e => e.event_type === "malware").length} color={DANGER} icon={XCircle} />
        <StatCard label="Packages Blocked" value={events.filter(e => e.action_taken === "blocked").length} color={SUCCESS} icon={Shield} />
      </div>

      {/* Ecosystem chart */}
      <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <h3 className="text-sm font-bold text-white mb-4">SafeChain Monitor — Packages by Ecosystem</h3>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={ecoData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 9 }} />
            <Tooltip contentStyle={{ background: "#1e293b", border: `1px solid ${BORDER}`, fontSize: 10 }} />
            <Bar dataKey="scanned" name="Scanned" fill={CYAN} radius={[2,2,0,0]} />
            <Bar dataKey="blocked" name="Blocked" fill={DANGER} radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <GDSTable
        columns={["Package","Version","Registry","Event Type","Severity","Status","Developer","Machine","Install Cmd","Malware Family","CVE","Action","Detected"]}
        rows={rows} isLoading={isLoading}
        emptyText="No supply chain events detected" />
    </GDSPageShell>
  );
}