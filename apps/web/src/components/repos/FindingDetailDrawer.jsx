import React, { useState } from "react";
import { X, ExternalLink, Wrench, Loader2, Code2 } from "lucide-react";

const SEV_STYLE = {
  critical: { color: "#ff4d4f", bg: "rgba(255,77,79,0.12)", border: "rgba(255,77,79,0.35)" },
  high: { color: "#fa8c16", bg: "rgba(250,140,22,0.12)", border: "rgba(250,140,22,0.3)" },
  medium: { color: "#fadb14", bg: "rgba(250,219,20,0.1)", border: "rgba(250,219,20,0.25)" },
  low: { color: "#52c41a", bg: "rgba(82,196,26,0.1)", border: "rgba(82,196,26,0.25)" },
};

function CodeSnippet({ snippet, lineNumber }) {
  if (!snippet) return null;
  const lines = snippet.split("\n");
  const highlightIdx = Math.floor(lines.length / 2);
  return (
    <div className="rounded-lg overflow-hidden font-mono text-xs" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ borderBottom: "1px solid #30363d", background: "#161b22" }}>
        <Code2 className="w-3 h-3 text-slate-500" />
        <span className="text-[10px] text-slate-500">{lineNumber ? `Line ${lineNumber}` : "Code snippet"}</span>
      </div>
      <div className="overflow-x-auto p-3 space-y-0.5">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-3"
            style={{ background: i === highlightIdx ? "rgba(255,77,79,0.08)" : "transparent", borderLeft: i === highlightIdx ? "2px solid #ff4d4f" : "2px solid transparent", paddingLeft: 8 }}>
            <span className="text-slate-700 select-none w-8 flex-shrink-0 text-right">
              {(lineNumber || 0) - highlightIdx + i}
            </span>
            <span className={i === highlightIdx ? "text-red-300" : "text-slate-400"}>{line || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FindingDetailDrawer({ finding, onClose, onStatusChange }) {
  const [notes, setNotes] = useState(finding.notes || "");
  const [assignee, setAssignee] = useState(finding.assignee || "");
  const [generating, setGenerating] = useState(false);
  const s = SEV_STYLE[finding.severity] || SEV_STYLE.low;

  const handleGeneratePR = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    setGenerating(false);
    window.open(`https://github.com/${finding.repo_name}/compare`, "_blank");
  };

  const idLabel = finding.cve_id || finding.cwe_id;
  const idUrl = finding.cve_id
    ? `https://nvd.nist.gov/vuln/detail/${finding.cve_id}`
    : `https://cwe.mitre.org/data/definitions/${finding.cwe_id?.replace("CWE-", "")}.html`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end"
      style={{ background: "rgba(13,17,23,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full sm:w-[520px] h-full overflow-y-auto animate-slide-in-right"
        style={{ background: "#161b22", borderLeft: "1px solid #30363d" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4"
          style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
              style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
              {finding.severity}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-mono">{finding._type}</span>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Title */}
          <div>
            <h2 className="text-base font-semibold text-white leading-snug mb-1">{finding.title}</h2>
            <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 font-mono">
              <span>{finding.repo_name}</span>
              {finding.file_path && <span>· {finding.file_path}{finding.line_number ? `:${finding.line_number}` : ""}</span>}
              {idLabel && (
                <a href={idUrl} target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-0.5">
                  {idLabel} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>

          {/* Metrics */}
          {(finding.cvss_score || finding.confidence || finding.epss_score) && (
            <div className="grid grid-cols-3 gap-3">
              {finding.cvss_score && (
                <div className="rounded-lg p-3 text-center" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
                  <p className="text-xs font-bold text-white">{finding.cvss_score}</p>
                  <p className="text-[10px] text-slate-600 font-mono">CVSS</p>
                </div>
              )}
              {finding.confidence && (
                <div className="rounded-lg p-3 text-center" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
                  <p className="text-xs font-bold text-white">{finding.confidence}%</p>
                  <p className="text-[10px] text-slate-600 font-mono">Confidence</p>
                </div>
              )}
              {finding.epss_score && (
                <div className="rounded-lg p-3 text-center" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
                  <p className="text-xs font-bold text-white">{(finding.epss_score * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-600 font-mono">EPSS</p>
                </div>
              )}
            </div>
          )}

          {/* SCA extras */}
          {finding._type === "sca" && finding.package_name && (
            <div className="rounded-lg p-3" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
              <p className="text-[10px] text-slate-500 font-mono mb-2">DEPENDENCY</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white">{finding.package_name}</span>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-red-400">{finding.installed_version}</span>
                  {finding.fix_version && <>→ <span className="text-green-400">{finding.fix_version}</span></>}
                </div>
              </div>
            </div>
          )}

          {/* Code snippet */}
          {finding.snippet && <CodeSnippet snippet={finding.snippet} lineNumber={finding.line_number} />}

          {/* Remediation */}
          {finding.remediation && (
            <div className="rounded-lg p-3" style={{ background: "rgba(88,166,255,0.06)", border: "1px solid rgba(88,166,255,0.2)" }}>
              <p className="text-[10px] text-blue-400 font-mono mb-1.5">REMEDIATION</p>
              <p className="text-xs text-slate-300 leading-relaxed">{finding.remediation}</p>
            </div>
          )}

          {/* Status */}
          <div>
            <p className="text-[10px] text-slate-500 font-mono mb-2">STATUS</p>
            <div className="flex gap-2 flex-wrap">
              {["open", "in_review", "fixed", "ignored"].map(s => (
                <button key={s}
                  onClick={() => onStatusChange(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                  style={{
                    background: finding.status === s ? "rgba(88,166,255,0.15)" : "#0d1117",
                    color: finding.status === s ? "#58a6ff" : "#64748b",
                    border: `1px solid ${finding.status === s ? "rgba(88,166,255,0.4)" : "#30363d"}`,
                  }}>
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] text-slate-500 font-mono mb-2">NOTES</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add investigation notes..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-xs text-slate-300 placeholder-slate-600 outline-none resize-none"
              style={{ background: "#0d1117", border: "1px solid #30363d" }}
            />
          </div>

          {/* AutoFix */}
          {finding.autofix_available && (
            <button
              onClick={handleGeneratePR}
              disabled={generating}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "#52c41a", color: "#0d1117" }}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
              {generating ? "Generating PR..." : "Generate AutoFix PR"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}