import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, X, ExternalLink, AlertTriangle, Filter, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const EVENT_STYLE = {
  malware_detected: { color: "#dc2626", bg: "rgba(220,38,38,0.12)", label: "MALWARE" },
  typosquat_detected: { color: "#ea580c", bg: "rgba(234,88,12,0.12)", label: "TYPOSQUAT" },
  dependency_confusion: { color: "#7c3aed", bg: "rgba(124,58,237,0.12)", label: "DEP CONFUSION" },
  secret_leaked: { color: "#be185d", bg: "rgba(190,24,93,0.12)", label: "SECRET LEAKED" },
  suspicious_install: { color: "#d97706", bg: "rgba(217,119,6,0.12)", label: "SUSPICIOUS" },
  cve_published: { color: "#0891b2", bg: "rgba(8,145,178,0.12)", label: "CVE" },
  license_violation: { color: "#374151", bg: "rgba(55,65,81,0.12)", label: "LICENSE" },
};
const REGISTRY_COLORS = { npm: "#cb3837", pypi: "#3776ab", rubygems: "#cc342d", maven: "#c71a36", nuget: "#004880", cargo: "#dea584", go: "#00add8" };
const STATUS_STYLE = {
  blocked: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", label: "BLOCKED" },
  quarantined: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", label: "QUARANTINED" },
  alerted: { color: "#eab308", bg: "rgba(234,179,8,0.12)", label: "ALERTED" },
  allowed: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "ALLOWED" },
  investigating: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "INVESTIGATING" },
};
const SEV_STYLE = {
  critical: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.35)" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.25)" },
  low: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
};

const REGISTRIES = ["npm", "pypi", "rubygems", "maven", "nuget", "cargo", "go"];

function EventDrawer({ event: ev, onClose }) {
  const sev = SEV_STYLE[ev.severity] || SEV_STYLE.low;
  const evStyle = EVENT_STYLE[ev.event_type] || EVENT_STYLE.suspicious_install;
  const regColor = REGISTRY_COLORS[ev.registry] || "#64748b";
  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="ml-auto w-full max-w-xl h-full overflow-y-auto p-6 space-y-5 animate-slide-in-right"
        style={{ background: "#0d1117", borderLeft: "1px solid rgba(244,63,94,0.2)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: evStyle.color, background: evStyle.bg }}>{evStyle.label}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase" style={{ color: sev.color, background: sev.bg }}>{ev.severity}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: STATUS_STYLE[ev.status]?.color, background: STATUS_STYLE[ev.status]?.bg }}>{STATUS_STYLE[ev.status]?.label}</span>
            </div>
            <h3 className="text-lg font-black text-white font-mono">{ev.package_name}@{ev.version}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            ["Registry", ev.registry], ["Developer", ev.developer || "—"],
            ["Machine", ev.machine || "—"], ["Detected", ev.detected_at ? new Date(ev.detected_at).toLocaleString() : "—"],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">{k}</p>
              <p className="text-xs text-white capitalize">{v}</p>
            </div>
          ))}
        </div>

        {ev.install_command && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-mono mb-2">Install Command</p>
            <pre className="p-3 rounded-xl text-xs font-mono text-emerald-400" style={{ background: "#030712", border: "1px solid #30363d" }}>
              $ {ev.install_command}
            </pre>
          </div>
        )}

        {ev.malware_family && (
          <div className="p-4 rounded-xl" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.3)" }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" style={{ color: "#f43f5e" }} />
              <p className="text-xs font-bold" style={{ color: "#f43f5e" }}>Malware Family Detected</p>
            </div>
            <p className="text-sm text-white font-mono">{ev.malware_family}</p>
          </div>
        )}

        {ev.cve_id && (
          <div className="p-4 rounded-xl" style={{ background: "rgba(8,145,178,0.08)", border: "1px solid rgba(8,145,178,0.3)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-cyan-400">CVE Reference</p>
              <a href={`https://nvd.nist.gov/vuln/detail/${ev.cve_id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline">
                {ev.cve_id} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {ev.description && (
          <div className="p-4 rounded-xl" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <p className="text-[10px] text-slate-500 uppercase font-mono mb-2">Description</p>
            <p className="text-sm text-slate-300 leading-relaxed">{ev.description}</p>
          </div>
        )}

        {ev.action_taken && (
          <div className="p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-xs font-bold text-emerald-400">Action Taken</p>
            </div>
            <p className="text-sm text-slate-300">{ev.action_taken}</p>
          </div>
        )}

        <button onClick={() => { toast.success("Full dependency scan queued"); onClose(); }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "#f43f5e" }}>
          Scan All Dependencies
        </button>
      </div>
    </div>
  );
}

export default function SupplyChainPage() {
  const [selected, setSelected] = useState(null);
  const [regFilter, setRegFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["sc-events"],
    queryFn: () => base44.entities.SupplyChainEvent.list("-detected_at", 200),
  });

  const filtered = events.filter(e => {
    if (regFilter !== "all" && e.registry !== regFilter) return false;
    if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const blocked = events.filter(e => e.status === "blocked").length;
  const quarantined = events.filter(e => e.status === "quarantined").length;
  const malwareFamilies = new Set(events.filter(e => e.malware_family).map(e => e.malware_family)).size;
  const recentFeed = events.slice(0, 5);

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      {selected && <EventDrawer event={selected} onClose={() => setSelected(null)} />}

      <div>
        <div className="flex items-center gap-3 mb-1">
          <Package className="w-5 h-5" style={{ color: "#f43f5e" }} />
          <h1 className="text-xl font-black text-white font-mono">SUPPLY CHAIN PROTECTION</h1>
        </div>
        <p className="text-[11px] text-slate-500 font-mono">Block malicious packages before they install · npm · pypi · maven · nuget · cargo · go</p>
      </div>

      {/* How it works */}
      <div className="p-4 rounded-xl flex flex-wrap gap-6 items-center" style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)" }}>
        {[
          { n: "①", label: "Developer runs npm install" },
          { n: "→", label: "" },
          { n: "②", label: "ShieldAI checks package against threat intel" },
          { n: "→", label: "" },
          { n: "③", label: "Malicious packages blocked before install" },
        ].map(({ n, label }, i) => (
          label ? (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: "#f43f5e" }}>{n}</span>
              <span className="text-xs text-slate-300">{label}</span>
            </div>
          ) : <span key={i} className="text-slate-600 text-sm">{n}</span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Events Detected", val: events.length, color: "#e2e8f0" },
          { label: "Blocked", val: blocked, color: "#f43f5e" },
          { label: "Quarantined", val: quarantined, color: "#8b5cf6" },
          { label: "Malware Families", val: malwareFamilies, color: "#be185d" },
          { label: "Registries Monitored", val: REGISTRIES.length, color: "#10b981" },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: "1px solid #30363d" }}>
            <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">{label}</p>
            <p className="text-xl font-black font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter className="w-4 h-4 text-slate-600" />
        {[
          { val: regFilter, set: setRegFilter, opts: ["all", ...REGISTRIES], label: "Registry" },
          { val: typeFilter, set: setTypeFilter, opts: ["all", ...Object.keys(EVENT_STYLE)], label: "Event Type" },
          { val: statusFilter, set: setStatusFilter, opts: ["all", "blocked", "quarantined", "alerted", "allowed", "investigating"], label: "Status" },
        ].map(({ val, set, opts, label }) => (
          <select key={label} value={val} onChange={e => { set(e.target.value); setPage(0); }}
            className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "#161b22", border: "1px solid #30363d", color: "#94a3b8" }}>
            <option value="all">All {label}s</option>
            {opts.filter(o => o !== "all").map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#0d1117", borderBottom: "1px solid #30363d" }}>
              {["Sev", "Event Type", "Package", "Version", "Registry", "Developer", "Machine", "Status", "Detected"].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: "#0d1117" }}>
            {isLoading ? Array(4).fill(0).map((_, i) => (
              <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: "#1e293b" }} /></td></tr>
            )) : paginated.map((ev, i) => {
              const sev = SEV_STYLE[ev.severity] || SEV_STYLE.low;
              const evStyle = EVENT_STYLE[ev.event_type] || EVENT_STYLE.suspicious_install;
              const statusStyle = STATUS_STYLE[ev.status] || STATUS_STYLE.alerted;
              const regColor = REGISTRY_COLORS[ev.registry] || "#64748b";
              return (
                <tr key={ev.id} onClick={() => setSelected(ev)}
                  className="cursor-pointer transition-all hover:bg-rose-500/5"
                  style={{ borderBottom: "1px solid rgba(48,54,61,0.5)", borderLeft: `3px solid ${sev.color}` }}>
                  <td className="px-3 py-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ color: sev.color, background: sev.bg }}>{ev.severity}</span></td>
                  <td className="px-3 py-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: evStyle.color, background: evStyle.bg }}>{evStyle.label}</span></td>
                  <td className="px-3 py-3"><span className="text-xs font-mono text-white">{ev.package_name}</span></td>
                  <td className="px-3 py-3"><span className="text-[11px] font-mono text-slate-400">{ev.version}</span></td>
                  <td className="px-3 py-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase" style={{ color: regColor, background: `${regColor}15` }}>{ev.registry}</span></td>
                  <td className="px-3 py-3"><span className="text-[11px] text-slate-400 truncate max-w-[100px] block">{ev.developer || "—"}</span></td>
                  <td className="px-3 py-3"><span className="text-[11px] font-mono text-slate-500 truncate max-w-[100px] block">{ev.machine || "—"}</span></td>
                  <td className="px-3 py-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: statusStyle.color, background: statusStyle.bg }}>{statusStyle.label}</span></td>
                  <td className="px-3 py-3 whitespace-nowrap"><span className="text-[10px] text-slate-600">{ev.detected_at ? formatDistanceToNow(new Date(ev.detected_at), { addSuffix: true }) : "—"}</span></td>
                </tr>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-600">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No supply chain events yet</p>
                <p className="text-xs mt-1">Install the ShieldAI CLI agent to start monitoring package installations</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 disabled:opacity-40"
            style={{ background: "#161b22", border: "1px solid #30363d" }}>Prev</button>
          <span className="text-xs text-slate-500 font-mono">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 disabled:opacity-40"
            style={{ background: "#161b22", border: "1px solid #30363d" }}>Next</button>
        </div>
      )}
    </div>
  );
}