import React, { useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ShieldAlert, Code2, Package, Key, ExternalLink,
  ChevronDown, Search, X, Wrench, Download, VolumeX
} from "lucide-react";
import FindingDetailDrawer from "@/components/repos/FindingDetailDrawer";
import AutoFixModal from "@/components/repos/AutoFixModal";
import NoiseReductionBanner from "@/components/shared/NoiseReductionBanner";
import { ReachabilityBadge, getReachabilityStatus } from "@/components/shared/ReachabilityBadge";

const SEV_STYLE = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.1)",   border: "rgba(234,179,8,0.25)" },
  low:      { color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
};
const STATUS_COLORS = { open: "#ef4444", in_review: "#3b82f6", fixed: "#10b981", ignored: "#475569", false_positive: "#475569" };

const PAGE_SIZE = 20;

function SevBadge({ sev }) {
  const s = SEV_STYLE[sev] || SEV_STYLE.low;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono"
    style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>{sev}</span>;
}

const TYPE_ICON_MAP = { sast: Code2, sca: Package, secret: Key };
const TYPE_COLOR_MAP = { sast: "#58a6ff", sca: "#a78bfa", secret: "#f97316" };
function TypeIcon({ type }) {
  const Comp = TYPE_ICON_MAP[type] || ShieldAlert;
  return <Comp className="w-3.5 h-3.5" style={{ color: TYPE_COLOR_MAP[type] || "#58a6ff" }} />;
}

function StatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium capitalize font-mono"
        style={{ color: STATUS_COLORS[status] || "#475569", background: `${STATUS_COLORS[status] || "#475569"}18`, border: `1px solid ${STATUS_COLORS[status] || "#475569"}40` }}>
        {status?.replace("_"," ")} <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 rounded-lg overflow-hidden shadow-xl"
          style={{ background: "#161b22", border: "1px solid #30363d", minWidth: 110 }}>
          {["open","in_review","fixed","ignored"].map(o => (
            <button key={o} onClick={e => { e.stopPropagation(); onChange(o); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[11px] capitalize hover:bg-white/5 font-mono"
              style={{ color: STATUS_COLORS[o] }}>{o.replace("_"," ")}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function PillBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} className="px-3 py-1 rounded-full text-xs font-medium transition-all"
      style={{ background: active ? "#3b82f6" : "rgba(30,58,95,0.2)", color: active ? "#fff" : "#64748b", border: `1px solid ${active ? "#3b82f6" : "#30363d"}` }}>
      {label}
    </button>
  );
}

export default function CodeFindingsPage() {
  const qc = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const urlRepo = urlParams.get("repo");

  const [sevFilter, setSevFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [autofixFinding, setAutofixFinding] = useState(null);
  const [slaMode, setSlaMode] = useState(false);
  const [reachabilityFilter, setReachabilityFilter] = useState(["exploitable", "likely"]);

  const REACHABILITY_FILTERS = [
    { id: "exploitable", label: "Exploitable 🔴", color: "#ef4444" },
    { id: "likely", label: "Likely 🟠", color: "#f97316" },
    { id: "conditional", label: "Conditional 🟡", color: "#eab308" },
    { id: "theoretical", label: "Theoretical ⚫", color: "#6b7280" },
  ];

  const { data: repos = [] } = useQuery({ queryKey: ["repos"], queryFn: () => base44.entities.CodeRepository.list("-created_date", 100), initialData: [] });
  const { data: sastFindings = [] } = useQuery({ queryKey: ["real-sast-all"], queryFn: () => base44.entities.RealSASTFinding.list("-detected_at", 500), initialData: [] });
  const { data: scaFindings = [] } = useQuery({ queryKey: ["real-sca-all"], queryFn: () => base44.entities.RealSCAFinding.list("-created_date", 500), initialData: [] });
  const { data: secretFindings = [] } = useQuery({ queryKey: ["real-secrets-all"], queryFn: () => base44.entities.RealSecretFinding.list("-detected_at", 500), initialData: [] });

  const allFindings = useMemo(() => [
    ...sastFindings.map(f => ({ ...f, _type: "sast" })),
    ...scaFindings.map(f => ({ ...f, _type: "sca" })),
    ...secretFindings.map(f => ({ ...f, _type: "secret" })),
  ].sort((a, b) => {
    const o = { critical:0, high:1, medium:2, low:3 };
    return (o[a.severity]??4)-(o[b.severity]??4);
  }), [sastFindings, scaFindings, secretFindings]);

  const filtered = useMemo(() => allFindings.filter(f => {
    if (sevFilter !== "all" && f.severity !== sevFilter) return false;
    if (typeFilter !== "all" && f._type !== typeFilter) return false;
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (urlRepo && f.repo_id !== urlRepo) return false;
    if (search) {
      const q = search.toLowerCase();
      return f.title?.toLowerCase().includes(q) || f.file_path?.toLowerCase().includes(q) || f.cwe_id?.toLowerCase().includes(q) || f.package_name?.toLowerCase().includes(q);
    }
    const reachability = getReachabilityStatus(f.severity, f.cvss_score || 0, true, true);
    if (!reachabilityFilter.includes(reachability)) return false;
    return true;
  }), [allFindings, sevFilter, typeFilter, statusFilter, urlRepo, search, reachabilityFilter]);

  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const updateStatus = async (finding, newStatus) => {
    const em = { sast: "RealSASTFinding", sca: "RealSCAFinding", secret: "RealSecretFinding" };
    await base44.entities[em[finding._type]].update(finding.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["real-sast-all"] });
    qc.invalidateQueries({ queryKey: ["real-sca-all"] });
    qc.invalidateQueries({ queryKey: ["real-secrets-all"] });
  };

  const exportCSV = () => {
    const rows = [["Severity","Type","Title","File","Line","CWE/CVE","Status","Repo"]];
    filtered.forEach(f => rows.push([f.severity, f._type, f.title, f.file_path||"", f.line_number||"", f.cwe_id||f.cve_id||"", f.status, f.repo_name||""]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `code-findings-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5 min-h-screen" style={{ background: "#0d1117" }}>
      {autofixFinding && (
        <AutoFixModal finding={autofixFinding} repo={repos.find(r => r.id === autofixFinding.repo_id)}
          onClose={() => setAutofixFinding(null)}
          onSuccess={() => { setAutofixFinding(null); qc.invalidateQueries({ queryKey: ["real-sast-all"] }); }} />
      )}
      {selectedFinding && (
        <FindingDetailDrawer finding={selectedFinding} onClose={() => setSelectedFinding(null)}
          onStatusChange={s => { updateStatus(selectedFinding, s); setSelectedFinding({ ...selectedFinding, status: s }); }} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-400" />Code Findings</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{filtered.length} findings match filters</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">SLA Mode</span>
            <Switch checked={slaMode} onCheckedChange={setSlaMode} className="data-[state=checked]:bg-red-500" />
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
            style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Noise Reduction Banner */}
      <NoiseReductionBanner filteredCount={234} showingCount={filtered.length} pageType="findings" />

      {/* Filters */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] text-slate-600 font-mono uppercase">SEVERITY:</span>
          {["all","critical","high","medium","low"].map(s => (
            <PillBtn key={s} label={s === "all" ? "All" : s.charAt(0).toUpperCase()+s.slice(1)} active={sevFilter===s} onClick={() => { setSevFilter(s); setPage(1); }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] text-slate-600 font-mono uppercase">REACHABILITY:</span>
          {REACHABILITY_FILTERS.map(r => (
            <PillBtn
              key={r.id}
              label={r.label}
              active={reachabilityFilter.includes(r.id)}
              onClick={() => {
                if (reachabilityFilter.includes(r.id)) {
                  setReachabilityFilter(reachabilityFilter.filter(id => id !== r.id));
                } else {
                  setReachabilityFilter([...reachabilityFilter, r.id]);
                }
                setPage(1);
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] text-slate-600 font-mono uppercase">TYPE:</span>
          {[{v:"all",l:"All"},{v:"sast",l:"SAST"},{v:"sca",l:"SCA"},{v:"secret",l:"Secrets"}].map(({v,l}) => (
            <PillBtn key={v} label={l} active={typeFilter===v} onClick={() => { setTypeFilter(v); setPage(1); }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-slate-600 font-mono uppercase">STATUS:</span>
            {[{v:"all",l:"All"},{v:"open",l:"Open"},{v:"in_review",l:"In Review"},{v:"fixed",l:"Fixed"},{v:"ignored",l:"Ignored"}].map(({v,l}) => (
              <PillBtn key={v} label={l} active={statusFilter===v} onClick={() => { setStatusFilter(v); setPage(1); }} />
            ))}
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search title, file, CWE…"
              className="pl-8 pr-8 py-1.5 rounded-lg text-xs text-slate-300 outline-none w-52"
              style={{ background: "#0d1117", border: "1px solid #30363d" }} />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600"><X className="w-3 h-3" /></button>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
              {["Severity","Type","Finding","Reachability","File:Line","CWE/CVE","Status","Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((f, i) => (
              <tr key={f.id} onClick={() => setSelectedFinding(f)} className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                style={{ background: i%2===0 ? "#0d1117":"#161b22", borderBottom:"1px solid rgba(48,54,61,0.5)" }}>
                <td className="px-4 py-3"><SevBadge sev={f.severity} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <TypeIcon type={f._type} />
                    <span className="text-[10px] text-slate-500 uppercase font-mono">{f._type}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ReachabilityBadge
                    status={getReachabilityStatus(f.severity, f.cvss_score || 0, true, true)}
                  />
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-xs font-medium text-white truncate">{f.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">{f.repo_name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {f.autofix_available && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ color:"#10b981", background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.25)" }}>
                        <Wrench className="w-2 h-2" /> AutoFix
                      </span>
                    )}
                    {slaMode && f.detected_at && (() => {
                      const detected = new Date(f.detected_at);
                      const now = new Date();
                      const hoursDiff = (now - detected) / (1000 * 60 * 60);
                      const slaHours = f.severity === "critical" ? 24 : f.severity === "high" ? 168 : f.severity === "medium" ? 720 : 720;
                      const breached = hoursDiff > slaHours;
                      return breached ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                          ⏰ SLA Breached
                        </span>
                      ) : null;
                    })()}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">{f.file_path}</p>
                  {f.line_number && <p className="text-[10px] text-slate-600 font-mono">Line {f.line_number}</p>}
                </td>
                <td className="px-4 py-3">
                  {(f.cwe_id||f.cve_id) && (
                    <a href={f.cve_id ? `https://nvd.nist.gov/vuln/detail/${f.cve_id}` : `https://cwe.mitre.org/data/definitions/${f.cwe_id?.replace("CWE-","")}.html`}
                      target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                      className="flex items-center gap-1 text-[11px] font-mono text-blue-400 hover:underline">
                      {f.cve_id||f.cwe_id} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </td>
                <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                  <StatusDropdown status={f.status} onChange={s => updateStatus(f,s)} />
                </td>
                <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedFinding(f)}
                      className="px-2 py-1 rounded text-[10px] text-slate-400 hover:text-white transition-colors"
                      style={{ background:"rgba(30,58,95,0.3)", border:"1px solid #30363d" }}>Details</button>
                    {f.autofix_available && (
                      <button onClick={() => setAutofixFinding(f)}
                        className="px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-0.5"
                        style={{ background:"rgba(16,185,129,0.12)", color:"#10b981", border:"1px solid rgba(16,185,129,0.3)" }}>
                        <Wrench className="w-2.5 h-2.5" /> Fix
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center" style={{ background:"#0d1117" }}>
            <ShieldAlert className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No findings match your filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-mono">
            Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white disabled:opacity-30"
              style={{ background:"#161b22", border:"1px solid #30363d" }}>← Prev</button>
            <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white disabled:opacity-30"
              style={{ background:"#161b22", border:"1px solid #30363d" }}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}