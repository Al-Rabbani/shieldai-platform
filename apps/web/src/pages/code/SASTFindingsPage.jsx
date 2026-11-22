import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, Search, AlertTriangle } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import { SevBadge, StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const CARD = "#111827"; const BORDER = "#1a1f2e";
const PAGE_SIZE = 20;

export default function SASTFindingsPage() {
  const [sev, setSev] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["sast-findings"],
    queryFn: () => base44.entities.TriagedFinding.list("-created_date", 500).catch(() => []),
    initialData: [],
  });

  const filtered = findings.filter(f => {
    if (sev !== "all" && (f.normalized_severity || f.severity) !== sev) return false;
    if (status !== "all" && (f.status || f.finding_status) !== status) return false;
    if (search && !f.title?.toLowerCase().includes(search.toLowerCase()) &&
        !f.asset_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  filtered.forEach(f => { const s = f.normalized_severity || f.severity; if (counts[s] !== undefined) counts[s]++; });

  const SEV_OPTS = ["all", "critical", "high", "medium", "low"];
  const STATUS_OPTS = ["all", "open", "in_remediation", "fixed", "accepted_risk"];

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Code", path: "/code" }, { label: "SAST Findings" }]}
      title="SAST Findings" subtitle="STATIC APPLICATION SECURITY TESTING · CODE VULNERABILITIES"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search findings…"
              className="bg-transparent text-xs text-white placeholder-slate-600 outline-none w-36" />
          </div>
          {[["sev", sev, setSev, SEV_OPTS], ["status", status, setStatus, STATUS_OPTS]].map(([key, val, set, opts]) => (
            <select key={key} value={val} onChange={e => { set(e.target.value); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key === "sev" ? "Severity" : "Status"}` : o.replace(/_/g, " ")}</option>)}
            </select>
          ))}
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[["Critical", counts.critical, "#ef4444"], ["High", counts.high, "#f97316"], ["Medium", counts.medium, "#eab308"], ["Low", counts.low, "#3b82f6"]].map(([label, val, color]) => (
          <StatCard key={label} label={label} value={val} color={color} icon={AlertTriangle} />
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div style={{ background: "#080c14", borderBottom: `1px solid ${BORDER}` }}>
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] px-4 py-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            {["Title", "Severity", "Repo / Asset", "File:Line", "CWE", "CVSS", "Status"].map(h => <div key={h}>{h}</div>)}
          </div>
        </div>

        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-12 mx-4 my-2 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))
        ) : paginated.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-500">No findings match your filters</div>
        ) : (
          paginated.map((f, i) => {
            const sevKey = f.normalized_severity || f.severity;
            const isOpen = expanded === f.id;
            return (
              <div key={f.id || i} style={{ borderBottom: `1px solid ${BORDER}40`, background: i % 2 === 0 ? "#0f1623" : "#111827" }}>
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] px-4 py-2.5 cursor-pointer hover:brightness-110 transition-all items-center"
                  onClick={() => setExpanded(isOpen ? null : f.id)}>
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />}
                    <span className="text-[11px] text-white font-medium truncate">{f.title || "—"}</span>
                  </div>
                  <div><SevBadge sev={sevKey} /></div>
                  <div className="text-[9px] text-slate-400 truncate">{f.asset_name || "—"}</div>
                  <div className="text-[9px] font-mono text-slate-500 truncate">{f.file_path ? `${f.file_path}:${f.line_number || "?"}` : "—"}</div>
                  <div className="text-[9px] font-mono" style={{ color: "#3b82f6" }}>{f.cwe_id || "—"}</div>
                  <div className="text-[10px] font-mono text-slate-300">{f.cvss_score != null ? Number(f.cvss_score).toFixed(1) : "—"}</div>
                  <div><StatusBadge status={f.status || f.finding_status} /></div>
                </div>
                {isOpen && (
                  <div className="px-10 pb-4 space-y-3" style={{ borderTop: `1px solid ${BORDER}40` }}>
                    {f.description && (
                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Description</p>
                        <p className="text-xs text-slate-300">{f.description}</p>
                      </div>
                    )}
                    {f.remediation_steps && (
                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Remediation</p>
                        <p className="text-xs text-slate-300">{f.remediation_steps}</p>
                      </div>
                    )}
                    {f.code_snippet && (
                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Code Snippet</p>
                        <pre className="text-[10px] text-green-400 p-3 rounded-lg overflow-x-auto" style={{ background: "#080c14" }}>{f.code_snippet}</pre>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-[9px] text-slate-500">
                      {f.detected_at && <span>Detected: {formatDistanceToNow(new Date(f.detected_at), { addSuffix: true })}</span>}
                      {f.epss_score != null && <span>EPSS: {(f.epss_score * 100).toFixed(1)}%</span>}
                      {f.exploited_in_wild && <span className="font-bold" style={{ color: DANGER }}>🔥 Exploited in Wild</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
            style={{ border: `1px solid ${BORDER}` }}>← Prev</button>
          <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
            style={{ border: `1px solid ${BORDER}` }}>Next →</button>
        </div>
      )}
    </GDSPageShell>
  );
}