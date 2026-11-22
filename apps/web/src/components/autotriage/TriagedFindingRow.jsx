import { useState } from "react";
import { ChevronRight, ExternalLink, Wrench } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e", info: "#64748b" };
const SEV_BG = { critical: "rgba(239,68,68,0.12)", high: "rgba(249,115,22,0.12)", medium: "rgba(234,179,8,0.12)", low: "rgba(34,197,94,0.12)" };

const ASSET_ICONS = { repository: "📦", vm: "🖥️", cloud: "☁️", api: "🔌", container: "🐳", domain: "🌐" };

const SCANNER_COLORS = { SAST: "#3b82f6", SCA: "#10b981", DAST: "#f97316", Pentest: "#ef4444", VMScanner: "#8b5cf6", CloudScanner: "#06b6d4", Secrets: "#f59e0b", ContainerScanner: "#ec4899", License: "#eab308", EOL: "#64748b" };

function EpssBar({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 70 ? "#ef4444" : pct >= 30 ? "#f97316" : "#22c55e";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
}

function SlaCell({ finding }) {
  if (finding.sla_breached) {
    return <span className="text-xs font-bold text-red-400 font-mono animate-pulse">BREACHED</span>;
  }
  if (!finding.sla_deadline) return <span className="text-xs text-slate-600 font-mono">—</span>;
  const days = Math.ceil((new Date(finding.sla_deadline) - new Date()) / 86400000);
  const color = days <= 3 ? "#f97316" : days <= 7 ? "#eab308" : "#64748b";
  return <span className="text-xs font-mono font-semibold" style={{ color }}>{days}d left</span>;
}

function ReachabilityBadge({ r }) {
  if (r === "reachable") return <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>REACHABLE</span>;
  if (r === "not_reachable") return <span className="text-[10px] font-mono px-2 py-0.5 rounded text-slate-500 line-through" style={{ background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.2)" }}>NOT REACHABLE</span>;
  return <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: "#eab308", background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}>UNKNOWN</span>;
}

function ExploitBadge({ e }) {
  if (e === "exploited_in_wild") return <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded animate-pulse" style={{ color: "#ef4444", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.5)" }}>🔥 WILD</span>;
  if (e === "poc_available") return <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: "#f97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" }}>🟠 PoC</span>;
  if (e === "theoretical") return <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: "#eab308", background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}>📋 THEORY</span>;
  return <span className="text-[10px] font-mono px-2 py-0.5 rounded text-slate-600" style={{ background: "rgba(100,116,139,0.08)" }}>NONE</span>;
}

export default function TriagedFindingRow({ finding: f, index, expanded, onToggle, onUpdate }) {
  const scanners = (f.source_scanners || "").split(",").map(s => s.trim()).filter(Boolean);

  const bgColor = index % 2 === 0 ? "#0a0f1e" : "#080d18";
  const leftBorder = f.sla_breached ? "3px solid #ef4444" : f.exploitability === "exploited_in_wild" ? "3px solid #ef4444" : "3px solid transparent";

  return (
    <>
      <div className="cursor-pointer transition-colors hover:bg-slate-800/20"
        style={{ background: bgColor, borderBottom: "1px solid rgba(30,58,95,0.3)", borderLeft: leftBorder }}
        onClick={onToggle}>
        <div className="grid items-center px-4 py-3 gap-2"
          style={{ gridTemplateColumns: "20px 80px 1fr 120px 110px 100px 110px 60px 80px 100px 90px 100px" }}>
          {/* Expand */}
          <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${expanded ? "rotate-90" : ""}`} />

          {/* Severity */}
          <span className="text-[10px] font-bold font-mono px-2 py-1 rounded uppercase"
            style={{ color: SEV_COLORS[f.severity], background: SEV_BG[f.severity], border: `1px solid ${SEV_COLORS[f.severity]}40` }}>
            {f.severity}
          </span>

          {/* Title + Asset */}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{f.title}</p>
            <p className="text-[10px] text-slate-500 font-mono">{ASSET_ICONS[f.asset_type] || "📄"} {f.asset_name} {f.cve_id && <span className="text-blue-400 ml-1">{f.cve_id}</span>}</p>
          </div>

          {/* Team */}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded w-fit max-w-full truncate"
            style={{ color: "#a78bfa", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
            {f.owner_team || "—"}
          </span>

          {/* Scanners */}
          <div className="flex flex-wrap gap-1">
            {scanners.slice(0, 2).map(s => (
              <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
                style={{ color: SCANNER_COLORS[s] || "#64748b", background: `${SCANNER_COLORS[s] || "#64748b"}18`, border: `1px solid ${SCANNER_COLORS[s] || "#64748b"}30` }}>
                {s}
              </span>
            ))}
            {scanners.length > 2 && <span className="text-[9px] font-mono text-slate-500">+{scanners.length - 2}</span>}
          </div>

          {/* Reachability */}
          <ReachabilityBadge r={f.reachability} />

          {/* Exploitability */}
          <ExploitBadge e={f.exploitability} />

          {/* CVSS */}
          <span className="text-sm font-black font-mono"
            style={{ color: (f.cvss_score || 0) >= 9 ? "#ef4444" : (f.cvss_score || 0) >= 7 ? "#f97316" : "#eab308" }}>
            {f.cvss_score?.toFixed(1) || "—"}
          </span>

          {/* EPSS */}
          <EpssBar score={f.epss_score} />

          {/* SLA */}
          <SlaCell finding={f} />

          {/* AutoFix */}
          {f.autofix_available ? (
            <button onClick={e => { e.stopPropagation(); window.open(f.autofix_pr_url || "#", "_blank"); }}
              className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded transition-all hover:opacity-80"
              style={{ color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <span>🔧</span> Fix
            </button>
          ) : (
            <span className="text-[10px] text-slate-600 font-mono">—</span>
          )}

          {/* Status */}
          <div onClick={e => e.stopPropagation()}>
            <Select value={f.status} onValueChange={v => onUpdate({ status: v })}>
              <SelectTrigger className="h-7 text-[10px] px-2 font-mono w-full" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.5)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["open","in_remediation","fixed","accepted_risk","false_positive"].map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g," ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* EXPANDED ROW */}
      {expanded && (
        <div className="px-6 py-5 space-y-4" style={{ background: "#050a10", borderBottom: "1px solid rgba(30,58,95,0.4)", borderLeft: leftBorder }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Description */}
              <div>
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-sm text-slate-300 leading-relaxed">{f.description || "No description available."}</p>
              </div>
              {/* Dedup key */}
              {f.source_count > 1 && (
                <div className="rounded-lg p-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase mb-1">🔀 Deduplication Applied</p>
                  <p className="text-xs text-slate-400">This finding was reported by <span className="text-white font-bold">{f.source_count} scanners</span> and merged into 1 unique issue.</p>
                  <code className="text-[10px] font-mono text-emerald-300 mt-1 block break-all">{f.dedup_key}</code>
                </div>
              )}
              {/* Scanners breakdown */}
              {scanners.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">Source Scanners</p>
                  <div className="flex flex-wrap gap-2">
                    {scanners.map(s => (
                      <span key={s} className="text-xs font-mono font-bold px-2.5 py-1 rounded"
                        style={{ color: SCANNER_COLORS[s] || "#64748b", background: `${SCANNER_COLORS[s] || "#64748b"}18`, border: `1px solid ${SCANNER_COLORS[s] || "#64748b"}40` }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {/* Remediation */}
              <div>
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Remediation</p>
                <p className="text-sm text-slate-300 leading-relaxed">{f.remediation || "No remediation steps available."}</p>
              </div>
              {/* Reachability explanation */}
              <div className="rounded-lg p-3" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.5)" }}>
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">Reachability Analysis</p>
                <p className="text-xs text-slate-400">
                  {f.reachability === "reachable" && "This finding is reachable via known code paths. Prioritize immediately."}
                  {f.reachability === "not_reachable" && "Code analysis confirms this path is not reachable. Lower priority — verify before dismissing."}
                  {f.reachability === "unknown" && "Reachability analysis pending or insufficient context. Treat as potentially reachable."}
                </p>
              </div>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 flex-wrap" style={{ borderTop: "1px solid rgba(30,58,95,0.3)" }}>
            {f.autofix_pr_url && (
              <button onClick={() => window.open(f.autofix_pr_url, "_blank")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all hover:opacity-80"
                style={{ color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
                🔧 View AutoFix PR <ExternalLink className="w-3 h-3" />
              </button>
            )}
            {f.cve_id && (
              <button onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${f.cve_id}`, "_blank")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:opacity-80"
                style={{ color: "#60a5fa", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>
                🔗 NVD: {f.cve_id} <ExternalLink className="w-3 h-3" />
              </button>
            )}
            <button onClick={() => { onUpdate({ status: "accepted_risk" }); }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:opacity-80"
              style={{ color: "#64748b", background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.2)" }}>
              Accept Risk
            </button>
            <button onClick={() => { onUpdate({ status: "false_positive" }); }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:opacity-80"
              style={{ color: "#64748b", background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.2)" }}>
              Mark False Positive
            </button>
            <button onClick={() => { onUpdate({ status: "in_remediation" }); }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:opacity-80"
              style={{ color: "#f97316", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
              Assign Owner
            </button>
            <button onClick={() => { toast.info("Jira integration — connect Jira in Integrations hub"); }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:opacity-80"
              style={{ color: "#a78bfa", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
              📋 Create Jira Ticket
            </button>
          </div>
        </div>
      )}
    </>
  );
}