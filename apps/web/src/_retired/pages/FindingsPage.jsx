import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  ShieldAlert, Package, Key, Code2, AlertTriangle,
  ExternalLink, ChevronDown, Search, X, Wrench, Server
} from "lucide-react";
import FindingDetailDrawer from "@/components/repos/FindingDetailDrawer";
import AutoFixModal from "@/components/repos/AutoFixModal";

const SEV_STYLE = {
  critical: { color: "#ff4d4f", bg: "rgba(255,77,79,0.12)", border: "rgba(255,77,79,0.35)" },
  high: { color: "#fa8c16", bg: "rgba(250,140,22,0.12)", border: "rgba(250,140,22,0.3)" },
  medium: { color: "#fadb14", bg: "rgba(250,219,20,0.1)", border: "rgba(250,219,20,0.25)" },
  low: { color: "#52c41a", bg: "rgba(82,196,26,0.1)", border: "rgba(82,196,26,0.25)" },
};

function SevBadge({ sev }) {
  const s = SEV_STYLE[sev] || SEV_STYLE.low;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {sev}
    </span>
  );
}

function TypeIcon({ type }) {
  const icons = { sast: Code2, sca: Package, secret: Key };
  const Icon = icons[type] || ShieldAlert;
  const colors = { sast: "#58a6ff", sca: "#a78bfa", secret: "#fb923c" };
  return <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors[type] || "#58a6ff" }} />;
}

function StatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const opts = ["open", "in_review", "fixed", "ignored"];
  const colors = { open: "#ff4d4f", in_review: "#58a6ff", fixed: "#52c41a", ignored: "#64748b" };
  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium capitalize"
        style={{ color: colors[status] || "#64748b", background: `${colors[status] || "#64748b"}18`, border: `1px solid ${colors[status] || "#64748b"}40` }}>
        {status?.replace("_", " ")} <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 rounded-lg overflow-hidden shadow-xl"
          style={{ background: "#161b22", border: "1px solid #30363d", minWidth: 100 }}>
          {opts.map(o => (
            <button key={o}
              onClick={e => { e.stopPropagation(); onChange(o); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[11px] capitalize hover:bg-white/5 transition-colors"
              style={{ color: colors[o] }}>
              {o.replace("_", " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FindingsPage() {
  const qc = useQueryClient();
  const [sevFilter, setSevFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [repoFilter, setRepoFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [autofixFinding, setAutofixFinding] = useState(null);
  const [quickFilter, setQuickFilter] = useState(null); // "autofix" | "prs" | "critical" | "sla"

  // Parse URL params
  const urlParams = new URLSearchParams(window.location.search);
  const urlRepo = urlParams.get("repo");
  const urlAutofix = urlParams.get("filter") === "autofix";

  const { data: repos = [] } = useQuery({
    queryKey: ["repos"],
    queryFn: () => base44.entities.CodeRepository.list("-created_date", 100),
    initialData: [],
  });
  const { data: sastFindings = [] } = useQuery({
    queryKey: ["real-sast-all"],
    queryFn: () => base44.entities.RealSASTFinding.list("-detected_at", 500),
    initialData: [],
  });
  const { data: scaFindings = [] } = useQuery({
    queryKey: ["real-sca-all"],
    queryFn: () => base44.entities.RealSCAFinding.list("-created_date", 500),
    initialData: [],
  });
  const { data: secretFindings = [] } = useQuery({
    queryKey: ["real-secrets-all"],
    queryFn: () => base44.entities.RealSecretFinding.list("-detected_at", 500),
    initialData: [],
  });

  const allFindings = useMemo(() => {
    const sast = sastFindings.map(f => ({ ...f, _type: "sast" }));
    const sca = scaFindings.map(f => ({ ...f, _type: "sca" }));
    const sec = secretFindings.map(f => ({ ...f, _type: "secret" }));
    return [...sast, ...sca, ...sec].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });
  }, [sastFindings, scaFindings, secretFindings]);

  const filtered = useMemo(() => {
    const activeRepo = urlRepo || repoFilter;
    return allFindings.filter(f => {
      if (sevFilter !== "all" && f.severity !== sevFilter) return false;
      if (typeFilter !== "all" && f._type !== typeFilter) return false;
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (activeRepo !== "all" && f.repo_id !== activeRepo) return false;
      if ((urlAutofix || quickFilter === "autofix") && !f.autofix_available) return false;
      if (quickFilter === "prs" && !f.autofix_pr_url) return false;
      if (quickFilter === "critical" && f.severity !== "critical") return false;
      if (quickFilter === "sla" && !f.sla_breached) return false;
      if (search && !(f.title?.toLowerCase().includes(search.toLowerCase()) ||
        f.file_path?.toLowerCase().includes(search.toLowerCase()) ||
        f.cwe_id?.toLowerCase().includes(search.toLowerCase()) ||
        f.cve_id?.toLowerCase().includes(search.toLowerCase()) ||
        f.package_name?.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [allFindings, sevFilter, typeFilter, statusFilter, repoFilter, urlRepo, search, quickFilter]);

  // Summary bar counts
  const totalOpen = allFindings.filter(f => f.status === "open").length;
  const criticalCount = allFindings.filter(f => f.severity === "critical").length;
  const autofixCount = allFindings.filter(f => f.autofix_available).length;
  const prCount = allFindings.filter(f => f.autofix_pr_url).length;
  const slaBreachedCount = allFindings.filter(f => f.sla_breached).length;

  const updateStatus = async (finding, newStatus) => {
    const entityMap = { sast: "RealSASTFinding", sca: "RealSCAFinding", secret: "RealSecretFinding" };
    await base44.entities[entityMap[finding._type]].update(finding.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["real-sast-all"] });
    qc.invalidateQueries({ queryKey: ["real-sca-all"] });
    qc.invalidateQueries({ queryKey: ["real-secrets-all"] });
  };

  const PillBtn = ({ label, active, onClick }) => (
    <button onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
      style={{
        background: active ? "#58a6ff" : "rgba(30,58,95,0.2)",
        color: active ? "#0d1117" : "#64748b",
        border: `1px solid ${active ? "#58a6ff" : "#30363d"}`,
      }}>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#0d1117" }}>
      {autofixFinding && (
        <AutoFixModal
          finding={autofixFinding}
          repo={repos.find(r => r.id === autofixFinding.repo_id)}
          onClose={() => setAutofixFinding(null)}
          onSuccess={(updated) => {
            setAutofixFinding(null);
            qc.invalidateQueries({ queryKey: ["real-sast-all"] });
            qc.invalidateQueries({ queryKey: ["real-sca-all"] });
          }}
        />
      )}
      {selectedFinding && (
        <FindingDetailDrawer
          finding={selectedFinding}
          onClose={() => setSelectedFinding(null)}
          onStatusChange={(status) => { updateStatus(selectedFinding, status); setSelectedFinding({ ...selectedFinding, status }); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Findings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} findings match current filters</p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: null,       label: `${allFindings.length} Total`,          color: "#64748b", activeColor: "#58a6ff" },
          { key: "critical", label: `${criticalCount} Critical`,            color: "#ef4444", activeColor: "#ef4444" },
          { key: "autofix",  label: `⚡ ${autofixCount} AutoFix Available`, color: "#eab308", activeColor: "#eab308" },
          { key: "prs",      label: `🔀 ${prCount} PRs Created`,           color: "#22c55e", activeColor: "#22c55e" },
          { key: "sla",      label: `⏰ ${slaBreachedCount} SLA Breached`,  color: "#f97316", activeColor: "#f97316" },
        ].map(({ key, label, color, activeColor }) => {
          const active = quickFilter === key;
          return (
            <button key={String(key)} onClick={() => setQuickFilter(active ? null : key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: active ? `${activeColor}20` : "rgba(30,40,58,0.6)",
                color: active ? activeColor : color,
                border: `1px solid ${active ? activeColor : "#30363d"}`,
              }}>
              {label}
            </button>
          );
        })}
        {quickFilter && (
          <button onClick={() => setQuickFilter(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-white transition-colors"
            style={{ border: "1px solid #30363d" }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] text-slate-600 font-mono uppercase">SEVERITY:</span>
          {["all", "critical", "high", "medium", "low"].map(s => (
            <PillBtn key={s} label={s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              active={sevFilter === s} onClick={() => setSevFilter(s)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] text-slate-600 font-mono uppercase">TYPE:</span>
          {[{ v: "all", l: "All" }, { v: "sast", l: "SAST" }, { v: "sca", l: "SCA" }, { v: "secret", l: "Secrets" }].map(({ v, l }) => (
            <PillBtn key={v} label={l} active={typeFilter === v} onClick={() => setTypeFilter(v)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-slate-600 font-mono uppercase">STATUS:</span>
            {[{ v: "all", l: "All" }, { v: "open", l: "Open" }, { v: "in_review", l: "In Review" }, { v: "fixed", l: "Fixed" }, { v: "ignored", l: "Ignored" }].map(({ v, l }) => (
              <PillBtn key={v} label={l} active={statusFilter === v} onClick={() => setStatusFilter(v)} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!urlRepo && (
              <select
                value={repoFilter}
                onChange={e => setRepoFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 outline-none"
                style={{ background: "#0d1117", border: "1px solid #30363d" }}>
                <option value="all">All Repos</option>
                {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                placeholder="Search findings..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs text-slate-300 outline-none w-48"
                style={{ background: "#0d1117", border: "1px solid #30363d" }}
              />
              {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600"><X className="w-3 h-3" /></button>}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">AutoFix</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Fixed Ver.</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Finding</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Location</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">ID</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f, i) => (
              <tr key={f.id}
                onClick={() => setSelectedFinding(f)}
                className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <SevBadge sev={f.severity} />
                    {(f.status === "fixed" || f.status === "resolved") && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: "#60a5fa", background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.3)" }}>✅ Fixed</span>
                    )}
                    {f.autofix_available && f.status !== "fixed" && f.status !== "resolved" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: "#52c41a", background: "rgba(82,196,26,0.12)", border: "1px solid rgba(82,196,26,0.25)" }}>🔧 AutoFix</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {f.autofix_pr_url ? (
                    <a href={f.autofix_pr_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-[10px] font-bold hover:underline"
                      style={{ color: "#22c55e" }}>
                      🔀 PR Open <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : f.autofix_available ? (
                    <span className="text-[10px] font-bold" style={{ color: "#eab308" }}>⚡ Available</span>
                  ) : (
                    <span className="text-slate-700">—</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {f.fixed_version ? (
                    <code className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "#0d1220", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>{f.fixed_version}</code>
                  ) : (
                    <span className="text-slate-700">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <TypeIcon type={f._type} />
                    <span className="text-[10px] text-slate-500 uppercase">{f._type}</span>
                  </div>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-xs font-medium text-white truncate">{f.title}</p>
                  {f.repo_id ? (
                    <Link
                      to={`/code/repositories/${f.repo_id}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline truncate w-fit">
                      <Server className="w-2.5 h-2.5 flex-shrink-0" />{f.repo_name}
                    </Link>
                  ) : (
                    <p className="text-[10px] text-slate-500 truncate">{f.repo_name}</p>
                  )}

                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">{f.file_path}</p>
                  {f.line_number && <p className="text-[10px] text-slate-600 font-mono">Line {f.line_number}</p>}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {(f.cwe_id || f.cve_id) && (
                    <a
                      href={f.cve_id
                        ? `https://nvd.nist.gov/vuln/detail/${f.cve_id}`
                        : `https://cwe.mitre.org/data/definitions/${f.cwe_id?.replace("CWE-", "")}.html`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-[11px] font-mono text-blue-400 hover:underline">
                      {f.cve_id || f.cwe_id} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <StatusDropdown status={f.status} onChange={(s) => updateStatus(f, s)} />
                </td>
                <td className="px-4 py-3 hidden lg:table-cell" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => setSelectedFinding(f)}
                      className="px-2 py-1 rounded text-[10px] text-slate-400 hover:text-white transition-colors"
                      style={{ background: "rgba(30,58,95,0.3)", border: "1px solid #30363d" }}>
                      Details
                    </button>
                    {f.autofix_available && (
                      <button
                        onClick={() => setAutofixFinding(f)}
                        className="px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-0.5 transition-all hover:opacity-90"
                        style={{ background: "rgba(82,196,26,0.12)", color: "#52c41a", border: "1px solid rgba(82,196,26,0.3)" }}>
                        <Wrench className="w-2.5 h-2.5" /> AutoFix
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(f, "ignored")}
                      className="px-2 py-1 rounded text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
                      style={{ border: "1px solid #30363d" }}>
                      Ignore
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center" style={{ background: "#0d1117" }}>
            <ShieldAlert className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No findings match your filters</p>
            <p className="text-slate-700 text-xs mt-1">Try adjusting the severity or type filters</p>
          </div>
        )}
      </div>
    </div>
  );
}