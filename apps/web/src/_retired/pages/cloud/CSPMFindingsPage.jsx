import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, Search, AlertTriangle, Download } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import { SevBadge, StatusBadge, StatCard, ProviderBadge } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const CARD = "#111827"; const BORDER = "#1a1f2e";
const PAGE_SIZE = 20;

export default function CSPMFindingsPage() {
  const [sev, setSev] = useState("all");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["cspm-findings"],
    queryFn: () => base44.entities.CloudFinding.list("-detected_at", 1000).catch(() => []),
    initialData: [],
  });

  const filtered = findings.filter(f => {
    if (sev !== "all" && f.severity !== sev) return false;
    if (provider !== "all" && f.provider !== provider) return false;
    if (status !== "all" && f.status !== status) return false;
    if (search && !f.title?.toLowerCase().includes(search.toLowerCase()) && !f.resource_id?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const providers = [...new Set(findings.map(f => f.provider).filter(Boolean))];

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  filtered.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });

  const handleExport = () => {
    const csv = ["Title,Severity,Provider,Service,Resource,Region,Status"].concat(
      filtered.map(f => `"${f.title || ""}",${f.severity || ""},${f.provider || ""},${f.service || ""},${f.resource_id || ""},${f.region || ""},${f.status || ""}`)
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "cspm-findings.csv"; a.click();
  };

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Cloud", path: "/cloud" }, { label: "CSPM Findings" }]}
      title="CSPM Findings" subtitle="CLOUD SECURITY POSTURE MANAGEMENT · MISCONFIGURATIONS"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search…"
              className="bg-transparent text-xs text-white placeholder-slate-600 outline-none w-28" />
          </div>
          {[
            ["sev", sev, setSev, ["all","critical","high","medium","low"]],
            ["provider", provider, setProvider, ["all", ...providers]],
            ["status", status, setStatus, ["all","open","in_remediation","resolved","accepted_risk"]],
          ].map(([key, val, set, opts]) => (
            <select key={key} value={val} onChange={e => { set(e.target.value); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key === "sev" ? "Severity" : key.charAt(0).toUpperCase() + key.slice(1)}` : o}</option>)}
            </select>
          ))}
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-all"
            style={{ border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[["Critical", counts.critical, "#ef4444"], ["High", counts.high, "#f97316"], ["Medium", counts.medium, "#eab308"], ["Low", counts.low, "#3b82f6"]].map(([l, v, c]) => (
          <StatCard key={l} label={l} value={v} color={c} icon={AlertTriangle} />
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div style={{ background: "#080c14", borderBottom: `1px solid ${BORDER}` }}>
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] px-4 py-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            {["Title", "Severity", "Provider", "Service", "Resource", "Region", "CIS Control", "Status"].map(h => <div key={h}>{h}</div>)}
          </div>
        </div>
        {isLoading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-12 mx-4 my-2 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)
        ) : paginated.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-500">No findings match your filters</div>
        ) : (
          paginated.map((f, i) => {
            const isOpen = expanded === f.id;
            return (
              <div key={f.id || i} style={{ borderBottom: `1px solid ${BORDER}40`, background: i % 2 === 0 ? "#0f1623" : "#111827" }}>
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] px-4 py-2.5 cursor-pointer hover:brightness-110 transition-all items-center"
                  onClick={() => setExpanded(isOpen ? null : f.id)}>
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />}
                    <span className="text-[11px] text-white font-medium truncate">{f.title || "—"}</span>
                  </div>
                  <div><SevBadge sev={f.severity} /></div>
                  <div><ProviderBadge provider={f.provider} /></div>
                  <div className="text-[9px] text-slate-400">{f.service || "—"}</div>
                  <div className="text-[9px] font-mono text-slate-500 truncate max-w-24">{f.resource_id || "—"}</div>
                  <div className="text-[9px] text-slate-400">{f.region || "—"}</div>
                  <div className="text-[9px] font-mono text-slate-500">{f.cis_control || "—"}</div>
                  <div><StatusBadge status={f.status} /></div>
                </div>
                {isOpen && (
                  <div className="px-10 pb-4 space-y-3" style={{ borderTop: `1px solid ${BORDER}40` }}>
                    {f.description && <div><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Description</p><p className="text-xs text-slate-300">{f.description}</p></div>}
                    {f.remediation && <div><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Remediation</p><p className="text-xs text-slate-300">{f.remediation}</p></div>}
                    {f.resource_arn && <div><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Resource ARN</p><code className="text-[10px] text-green-400">{f.resource_arn}</code></div>}
                    {f.detected_at && <p className="text-[9px] text-slate-600">Detected: {formatDistanceToNow(new Date(f.detected_at), { addSuffix: true })}</p>}
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