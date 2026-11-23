import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ExternalLink, Copy, X, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow, differenceInDays } from "date-fns";

const ACCENT = "#0ea5e9";
const SEV_STYLE = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)" },
  low:      { color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)" },
  info:     { color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)" },
};

function EpssBar({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 70 ? "#ef4444" : pct >= 30 ? "#eab308" : "#10b981";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "#1e293b" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-mono font-bold w-9 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

function RiskGauge({ score, size = 120 }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f97316" : pct >= 20 ? "#eab308" : "#10b981";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size*0.1} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.1}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ*0.25} strokeLinecap="round" />
      <text x={size/2} y={size/2} textAnchor="middle" fill={color} fontSize={size*0.24} fontWeight="800" fontFamily="JetBrains Mono" dominantBaseline="middle">{pct}</text>
    </svg>
  );
}

function FindingDrawer({ finding, onClose }) {
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();

  const updateMut = useMutation({
    mutationFn: (status) => base44.entities.VMFinding.update(finding?.id, { status }),
    onSuccess: (_, status) => { qc.invalidateQueries({ queryKey: ["vm-findings"] }); toast.success(`Marked as ${status}`); onClose(); },
  });

  if (!finding) return null;
  const sev = SEV_STYLE[finding.severity] || SEV_STYLE.info;
  const copyCmd = () => { navigator.clipboard.writeText(finding.patch_command || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="ml-auto w-full max-w-2xl h-full overflow-y-auto animate-slide-in-right"
        style={{ background: "#0d1117", borderLeft: "1px solid rgba(14,165,233,0.2)" }}>
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase border" style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}>{finding.severity}</span>
                {finding.exploited_in_wild && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold animate-pulse" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444" }}>
                    🔥 EXPLOITED IN WILD
                  </span>
                )}
                <a href={`https://nvd.nist.gov/vuln/detail/${finding.cve_id}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-mono hover:underline" style={{ color: ACCENT }}>
                  {finding.cve_id} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <h3 className="text-sm font-bold text-white">{finding.title}</h3>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white flex-shrink-0"><X className="w-5 h-5" /></button>
          </div>

          {/* Package info */}
          <div className="grid grid-cols-3 gap-3">
            {[["Package", finding.package_name], ["Installed", finding.installed_version], ["Fixed In", finding.fixed_version || "N/A"]].map(([k,v]) => (
              <div key={k} className="p-3 rounded-xl" style={{ background: "#161b22", border: "1px solid #1e293b" }}>
                <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">{k}</p>
                <p className="text-xs font-mono text-white">{v || "—"}</p>
              </div>
            ))}
          </div>

          {/* Scores */}
          <div className="p-4 rounded-xl space-y-3" style={{ background: "#161b22", border: "1px solid #1e293b" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">CVSS Score</span>
              <span className="text-lg font-black font-mono" style={{ color: (finding.cvss_score || 0) >= 9 ? "#ef4444" : (finding.cvss_score || 0) >= 7 ? "#f97316" : "#eab308" }}>{finding.cvss_score?.toFixed(1) || "—"}</span>
            </div>
            {finding.cvss_vector && <p className="text-[10px] font-mono text-slate-600 break-all">{finding.cvss_vector}</p>}
            {finding.epss_score !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">EPSS Score</span>
                  <span className="text-[10px] text-slate-600">Exploit probability (30d)</span>
                </div>
                <EpssBar score={finding.epss_score} />
              </div>
            )}
          </div>

          {/* Description */}
          {finding.description && (
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">Description</p>
              <p className="text-sm text-slate-300 leading-relaxed">{finding.description}</p>
            </div>
          )}

          {/* Remediation */}
          {finding.remediation && (
            <div className="p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <p className="text-[10px] font-mono text-emerald-400 uppercase mb-2">✓ Remediation</p>
              <p className="text-sm text-slate-300 leading-relaxed">{finding.remediation}</p>
            </div>
          )}

          {/* Patch command */}
          {finding.patch_command && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Patch Command</p>
                <button onClick={copyCmd} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-all"
                  style={{ background: "#1e293b", border: "1px solid #30363d", color: "#64748b" }}>
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="text-[11px] font-mono text-emerald-300 p-3 rounded-xl overflow-x-auto" style={{ background: "#030712", border: "1px solid #1e293b" }}>
                {finding.patch_command}
              </pre>
            </div>
          )}

          {/* Category */}
          {finding.category && (
            <span className="text-[10px] px-2.5 py-1 rounded font-mono uppercase" style={{ background: "rgba(14,165,233,0.1)", color: ACCENT, border: "1px solid rgba(14,165,233,0.2)" }}>
              {finding.category}
            </span>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={() => updateMut.mutate("fixed")}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
              ✓ Mark Fixed
            </button>
            <button onClick={() => updateMut.mutate("accepted_risk")}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", color: "#eab308" }}>
              Accept Risk
            </button>
            <button onClick={() => toast.info("Team assignment coming soon")}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: "#1e293b", border: "1px solid #30363d", color: "#64748b" }}>
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VMDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [sevFilter, setSevFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exploitedOnly, setExploitedOnly] = useState(false);
  const [patchOnly, setPatchOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sortField, setSortField] = useState("cvss_score");

  const { data: scans = [] } = useQuery({ queryKey: ["vm-scans"], queryFn: () => base44.entities.VMScan.list("-risk_score", 50) });
  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["vm-findings", id],
    queryFn: () => base44.entities.VMFinding.filter({ scan_id: id }, "-cvss_score", 200),
    enabled: !!id,
  });

  const vm = scans.find(s => s.id === id);
  const rescanMut = useMutation({
    mutationFn: () => base44.entities.VMScan.update(id, { status: "scanning", scanned_at: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vm-scans"] }); toast.success("Re-scan triggered"); },
  });

  const filtered = findings.filter(f => {
    if (sevFilter !== "all" && f.severity !== sevFilter) return false;
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (exploitedOnly && !f.exploited_in_wild) return false;
    if (patchOnly && !f.fixed_version) return false;
    return true;
  }).sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));

  const tags = vm?.tags ? vm.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  const daysSincePatched = vm?.last_patched ? differenceInDays(new Date(), new Date(vm.last_patched)) : null;

  return (
    <div className="min-h-screen -m-6" style={{ background: "#030712" }}>
      {selected && <FindingDrawer finding={selected} onClose={() => setSelected(null)} />}

      {/* Breadcrumb */}
      <div className="px-6 py-3 flex items-center gap-2 text-[11px] text-slate-600 font-mono" style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b" }}>
        <Link to="/cloud" className="hover:text-slate-400">Cloud</Link>
        <span>›</span>
        <Link to="/cloud/vms" className="hover:text-slate-400">VMs</Link>
        <span>›</span>
        <span style={{ color: ACCENT }}>{vm?.nickname || id}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-0">
        {/* Left info panel */}
        <div className="lg:w-72 flex-shrink-0 lg:sticky lg:top-0 lg:h-screen overflow-y-auto p-5 space-y-4" style={{ background: "#0a0f1e", borderRight: "1px solid #1e293b" }}>
          {/* Risk gauge */}
          <div className="flex flex-col items-center py-4">
            <RiskGauge score={vm?.risk_score} size={120} />
            <p className="text-xs text-slate-500 mt-2">Risk Score</p>
          </div>

          {/* VM Details */}
          <div className="space-y-0" style={{ borderTop: "1px solid #1e293b" }}>
            {vm && [
              ["Provider", vm.provider?.toUpperCase()],
              ["Instance ID", vm.instance_id],
              ["Instance Type", vm.instance_type],
              ["Region", vm.region],
              ["OS", `${vm.os_name} ${vm.os_version || ""}`],
              ["Kernel", vm.kernel_version],
              ["Status", vm.status],
              ["Packages", vm.packages_scanned ? `${vm.packages_scanned} scanned` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-start py-2.5" style={{ borderBottom: "1px solid #1e293b" }}>
                <span className="text-[11px] text-slate-500">{k}</span>
                <span className="text-[11px] text-white font-mono text-right max-w-[130px] truncate">{v || "—"}</span>
              </div>
            ))}
          </div>

          {/* Last patched warning */}
          {daysSincePatched !== null && (
            <div className="rounded-xl p-3" style={{
              background: daysSincePatched > 90 ? "rgba(239,68,68,0.08)" : daysSincePatched > 30 ? "rgba(234,179,8,0.08)" : "rgba(16,185,129,0.08)",
              border: `1px solid ${daysSincePatched > 90 ? "rgba(239,68,68,0.25)" : daysSincePatched > 30 ? "rgba(234,179,8,0.25)" : "rgba(16,185,129,0.2)"}`,
            }}>
              <p className="text-[11px] font-semibold" style={{ color: daysSincePatched > 90 ? "#ef4444" : daysSincePatched > 30 ? "#eab308" : "#10b981" }}>
                {daysSincePatched > 90 ? `⚠️ Overdue — last patched ${daysSincePatched} days ago` : `Patched ${daysSincePatched} days ago`}
              </p>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map(t => <span key={t} className="text-[9px] px-2 py-0.5 rounded font-mono" style={{ background: "#1e293b", color: "#475569" }}>{t}</span>)}
            </div>
          )}

          <button onClick={() => rescanMut.mutate()} disabled={rescanMut.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: `rgba(14,165,233,0.12)`, border: `1px solid rgba(14,165,233,0.3)`, color: ACCENT }}>
            <RefreshCw className={`w-4 h-4 ${rescanMut.isPending ? "animate-spin" : ""}`} /> Trigger Re-Scan
          </button>
        </div>

        {/* Right findings panel */}
        <div className="flex-1 p-5 space-y-4">
          {/* Sev summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Critical", count: findings.filter(f => f.severity === "critical").length, color: "#ef4444" },
              { label: "High",     count: findings.filter(f => f.severity === "high").length,     color: "#f97316" },
              { label: "Medium",   count: findings.filter(f => f.severity === "medium").length,   color: "#eab308" },
              { label: "Low",      count: findings.filter(f => f.severity === "low").length,      color: "#3b82f6" },
            ].map(({ label, count, color }) => (
              <div key={label} className="rounded-xl p-3 text-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: `${color}10`, border: `1px solid ${color}20` }}
                onClick={() => setSevFilter(sevFilter === label.toLowerCase() ? "all" : label.toLowerCase())}>
                <p className="text-xl font-black font-mono" style={{ color }}>{count}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="w-32 h-8 text-xs" style={{ background: "#0a0f1e", border: "1px solid #1e293b", color: "#e2e8f0" }}><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent style={{ background: "#111827", borderColor: "#1e293b" }}>
                {["all","critical","high","medium","low"].map(s => <SelectItem key={s} value={s} className="text-slate-200 capitalize">{s === "all" ? "All Severities" : s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs" style={{ background: "#0a0f1e", border: "1px solid #1e293b", color: "#e2e8f0" }}><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent style={{ background: "#111827", borderColor: "#1e293b" }}>
                {["all","open","fixed","accepted_risk"].map(s => <SelectItem key={s} value={s} className="text-slate-200 capitalize">{s === "all" ? "All Status" : s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <button onClick={() => setExploitedOnly(!exploitedOnly)}
              className="h-8 px-3 rounded-lg text-xs font-semibold transition-all"
              style={{ background: exploitedOnly ? "rgba(239,68,68,0.15)" : "#1e293b", border: `1px solid ${exploitedOnly ? "rgba(239,68,68,0.3)" : "#30363d"}`, color: exploitedOnly ? "#ef4444" : "#64748b" }}>
              🔥 Exploited in Wild
            </button>
            <button onClick={() => setPatchOnly(!patchOnly)}
              className="h-8 px-3 rounded-lg text-xs font-semibold transition-all"
              style={{ background: patchOnly ? "rgba(16,185,129,0.1)" : "#1e293b", border: `1px solid ${patchOnly ? "rgba(16,185,129,0.25)" : "#30363d"}`, color: patchOnly ? "#10b981" : "#64748b" }}>
              ✓ Patch Available
            </button>
            <span className="text-xs text-slate-600 ml-auto font-mono">{filtered.length} findings</span>
          </div>

          {/* Table */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid #1e293b" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#030712", borderBottom: "1px solid #1e293b" }}>
                  {["Sev", "CVE ID", "Title", "Package", "Version → Fixed", "CVSS", "EPSS", "Status"].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && [1,2,3,4,5].map(i => (
                  <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td colSpan={8} className="px-3 py-3"><div className="h-4 rounded animate-pulse" style={{ background: "#1e293b" }} /></td>
                  </tr>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">No CVEs found matching filters</td></tr>
                )}
                {filtered.map(f => {
                  const sev = SEV_STYLE[f.severity] || SEV_STYLE.info;
                  const epss = Math.round((f.epss_score || 0) * 100);
                  const epssColor = epss >= 70 ? "#ef4444" : epss >= 30 ? "#eab308" : "#10b981";
                  return (
                    <tr key={f.id} onClick={() => setSelected(f)}
                      className="cursor-pointer hover:bg-sky-500/5 transition-all"
                      style={{ borderBottom: "1px solid #1e293b" }}>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}>{f.severity}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <a href={`https://nvd.nist.gov/vuln/detail/${f.cve_id}`} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[11px] font-mono hover:underline" style={{ color: ACCENT }}>{f.cve_id}</a>
                          {f.exploited_in_wild && <span className="text-[10px] animate-pulse">🔥</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px]"><p className="text-xs text-white truncate">{f.title}</p></td>
                      <td className="px-3 py-2.5"><p className="text-[11px] font-mono text-slate-400 truncate max-w-[100px]">{f.package_name}</p></td>
                      <td className="px-3 py-2.5">
                        <p className="text-[11px] font-mono whitespace-nowrap">
                          <span className="text-slate-500">{f.installed_version}</span>
                          {f.fixed_version && <span className="text-emerald-400"> → {f.fixed_version}</span>}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-mono font-bold" style={{ color: (f.cvss_score || 0) >= 9 ? "#ef4444" : (f.cvss_score || 0) >= 7 ? "#f97316" : "#eab308" }}>
                          {f.cvss_score?.toFixed(1) || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 w-20">
                        <span className="text-[11px] font-mono font-bold" style={{ color: epssColor }}>{epss}%</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded capitalize" style={{
                          background: f.status === "fixed" ? "rgba(16,185,129,0.1)" : f.status === "accepted_risk" ? "rgba(234,179,8,0.08)" : "#1e293b",
                          color: f.status === "fixed" ? "#10b981" : f.status === "accepted_risk" ? "#eab308" : "#64748b"
                        }}>{f.status?.replace(/_/g, " ")}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}