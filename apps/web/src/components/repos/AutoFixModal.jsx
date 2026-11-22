import React, { useState } from "react";
import { X, Wrench, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const SEV_STYLE = {
  critical: { color: "#ff4d4f", bg: "rgba(255,77,79,0.12)", border: "rgba(255,77,79,0.35)" },
  high: { color: "#fa8c16", bg: "rgba(250,140,22,0.12)", border: "rgba(250,140,22,0.3)" },
  medium: { color: "#fadb14", bg: "rgba(250,219,20,0.1)", border: "rgba(250,219,20,0.25)" },
  low: { color: "#52c41a", bg: "rgba(82,196,26,0.1)", border: "rgba(82,196,26,0.25)" },
};

export default function AutoFixModal({ finding, repo, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const s = SEV_STYLE[finding.severity] || SEV_STYLE.low;

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        "https://api.base44.com/api/apps/6a14246111a4fa5e22999619/functions/shieldAutoFix",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repo_full_name: repo?.full_name || finding.repo_name,
            github_token: repo?.github_token || "",
            file_path: finding.file_path,
            line_number: finding.line_number,
            cwe_id: finding.cwe_id,
            snippet: finding.snippet,
            title: finding.title,
            severity: finding.severity,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "AutoFix failed");

      const prUrl = data.pr_url || data.url || "#";
      // Update finding record
      const entityMap = { sast: "RealSASTFinding", sca: "RealSCAFinding", secret: "RealSecretFinding" };
      const entity = entityMap[finding._type] || "RealSASTFinding";
      await base44.entities[entity].update(finding.id, { status: "in_review", pr_url: prUrl });
      setResult(prUrl);
      onSuccess?.({ ...finding, status: "in_review", pr_url: prUrl });
    } catch (err) {
      setError(err.message || "Failed to generate AutoFix PR.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(13,17,23,0.88)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl w-full max-w-lg" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid #30363d" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(82,196,26,0.1)", border: "1px solid rgba(82,196,26,0.3)" }}>
              <Wrench className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Generate AutoFix Pull Request</h3>
              <p className="text-[11px] text-slate-500">ShieldAI will patch this vulnerability via PR</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Finding summary */}
          <div className="rounded-lg p-4 space-y-2" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                {finding.severity}
              </span>
              <span className="text-xs font-medium text-white">{finding.title}</span>
            </div>
            {finding.file_path && (
              <p className="text-[11px] text-slate-500 font-mono">
                {finding.file_path}{finding.line_number ? `:${finding.line_number}` : ""}
              </p>
            )}
            {finding.snippet && (
              <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto rounded p-2 mt-2 max-h-24"
                style={{ background: "#0a0f1e", border: "1px solid #30363d" }}>
                {finding.snippet.slice(0, 300)}
              </pre>
            )}
          </div>

          {/* Info text */}
          <div className="flex items-start gap-2 p-3 rounded-lg"
            style={{ background: "rgba(88,166,255,0.06)", border: "1px solid rgba(88,166,255,0.2)" }}>
            <AlertTriangle className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-400 leading-relaxed">
              ShieldAI will generate a security patch and open a Pull Request on GitHub for human review before merging. No changes are applied automatically.
            </p>
          </div>

          {/* Success */}
          {result && (
            <div className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: "rgba(82,196,26,0.08)", border: "1px solid rgba(82,196,26,0.3)" }}>
              <span className="text-green-400 text-sm">✅</span>
              <div>
                <p className="text-xs font-semibold text-green-400">Pull Request opened successfully!</p>
                <a href={result} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                  View PR on GitHub <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg"
              style={{ background: "rgba(255,77,79,0.08)", border: "1px solid rgba(255,77,79,0.25)" }}>
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
              style={{ background: "#0d1117", border: "1px solid #30363d" }}>
              {result ? "Close" : "Cancel"}
            </button>
            {!result && (
              <button onClick={handleGenerate} disabled={loading}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "#52c41a", color: "#0d1117" }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                {loading ? "Generating PR..." : "Generate PR"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}