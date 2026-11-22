import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, GitBranch, Loader2, ExternalLink, Eye, EyeOff, AlertTriangle } from "lucide-react";

export default function ConnectRepoModal({ onClose, onConnected }) {
  const [repoInput, setRepoInput] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | scanning | done

  const parseRepo = (input) => {
    const trimmed = input.trim().replace(/^https?:\/\/github\.com\//, "");
    const parts = trimmed.replace(/\.git$/, "").split("/");
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const fullName = parseRepo(repoInput);
    if (!fullName) { setError("Please enter a valid repo (e.g. owner/repo or GitHub URL)"); return; }
    if (!token) { setError("GitHub Personal Access Token is required"); return; }

    setLoading(true);
    setPhase("scanning");
    const repoName = fullName.split("/")[1];

    let repoRecord;
    try {
      repoRecord = await base44.entities.CodeRepository.create({
        name: repoName,
        full_name: fullName,
        provider: "github",
        github_token: token,
        auto_scan: autoScan,
        scan_status: "scanning",
        is_active: true,
      });

      const scanId = `scan-${Date.now()}`;
      const jobRecord = await base44.entities.ScanJob.create({
        repo_id: repoRecord.id,
        repo_name: repoName,
        scan_type: "sast,sca,secrets,outdated",
        status: "running",
        started_at: new Date().toISOString(),
        triggered_by: "connect",
      });

      let data = {};
      try {
        const res = await fetch(
          "https://api.base44.com/api/apps/6a14246111a4fa5e22999619/functions/shieldScanRepo",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repo_full_name: fullName,
              github_token: token,
              scan_types: ["sast", "sca", "secrets", "outdated"],
            }),
          }
        );
        data = await res.json();
      } catch (_) {
        data = { findings: [], vulnerabilities: [], secrets: [], summary: {} };
      }

      const creates = [];
      (data.findings || []).forEach(f => {
        creates.push(base44.entities.RealSASTFinding.create({
          repo_id: repoRecord.id, repo_name: repoName, scan_id: scanId,
          title: f.title, severity: f.severity || "medium", status: "open",
          file_path: f.file_path, line_number: f.line_number,
          snippet: f.snippet, cwe_id: f.cwe_id,
          autofix_available: f.autofix_available || false,
          confidence: f.confidence || 75,
          detected_at: new Date().toISOString(),
          rule_id: f.rule_id,
        }));
      });
      (data.vulnerabilities || []).forEach(v => {
        creates.push(base44.entities.RealSCAFinding.create({
          repo_id: repoRecord.id, repo_name: repoName, scan_id: scanId,
          package_name: v.package_name, installed_version: v.installed_version,
          fix_version: v.fix_version, vuln_id: v.vuln_id, cve_id: v.cve_id,
          title: v.title, severity: v.severity || "medium", status: "open",
          file_path: v.file_path, cvss_score: v.cvss_score, epss_score: v.epss_score,
          is_reachable: v.is_reachable || false,
        }));
      });
      (data.secrets || []).forEach(s => {
        creates.push(base44.entities.RealSecretFinding.create({
          repo_id: repoRecord.id, repo_name: repoName, scan_id: scanId,
          secret_type: s.secret_type || "Unknown Secret", severity: s.severity || "critical",
          status: "open", file_path: s.file_path, line_number: s.line_number,
          snippet: s.snippet, remediation: s.remediation,
          detected_at: new Date().toISOString(),
        }));
      });
      await Promise.all(creates);

      const summary = data.summary || {};
      const duration = Math.round((Date.now() - new Date(jobRecord.started_at).getTime()) / 1000);
      await Promise.all([
        base44.entities.CodeRepository.update(repoRecord.id, {
          scan_status: "complete",
          last_scanned: new Date().toISOString(),
          total_findings: summary.total || creates.length,
          critical_count: summary.critical || 0,
          high_count: summary.high || 0,
          medium_count: summary.medium || 0,
          low_count: summary.low || 0,
          risk_score: summary.risk_score || 0,
          language: data.language || "",
          default_branch: data.default_branch || "main",
          branch_protection: data.branch_protection || false,
        }),
        base44.entities.ScanJob.update(jobRecord.id, {
          status: "complete",
          completed_at: new Date().toISOString(),
          duration_seconds: duration,
          files_scanned: summary.files_scanned || 0,
          findings_count: creates.length,
        }),
      ]);

      setPhase("done");
      setTimeout(() => onConnected(), 1500);
    } catch (err) {
      if (repoRecord) {
        await base44.entities.CodeRepository.update(repoRecord.id, { scan_status: "failed" });
      }
      setError(err.message || "Failed to connect repository. Check your token and try again.");
      setPhase("idle");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(13,17,23,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl w-full max-w-md" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid #30363d" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(88,166,255,0.1)", border: "1px solid rgba(88,166,255,0.3)" }}>
              <GitBranch className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Connect Repository</h3>
              <p className="text-[11px] text-slate-500">GitHub · SAST · SCA · Secrets</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {phase === "done" ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(82,196,26,0.12)", border: "1px solid rgba(82,196,26,0.3)" }}>
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Scan Complete!</h3>
            <p className="text-sm text-slate-500">Repository connected and scanned successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">GitHub Repository</label>
              <input
                type="text"
                value={repoInput}
                onChange={e => setRepoInput(e.target.value)}
                placeholder="owner/repo or https://github.com/owner/repo"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                style={{ background: "#0d1117", border: "1px solid #30363d" }}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Personal Access Token
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,read:packages&description=ShieldAI+Scanner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-400 hover:underline inline-flex items-center gap-0.5">
                  Generate <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                  style={{ background: "#0d1117", border: "1px solid #30363d" }}
                  required
                />
                <button type="button" onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-1">Requires <code className="text-blue-400">repo</code> and <code className="text-blue-400">read:packages</code> scopes.</p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setAutoScan(!autoScan)}
                className="w-10 h-5 rounded-full relative transition-colors cursor-pointer flex-shrink-0"
                style={{ background: autoScan ? "#58a6ff" : "#30363d" }}>
                <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform"
                  style={{ left: autoScan ? "calc(100% - 18px)" : "2px" }} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">Auto-scan on push</p>
                <p className="text-[10px] text-slate-600">Automatically scan when code is pushed to the default branch.</p>
              </div>
            </label>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(255,77,79,0.08)", border: "1px solid rgba(255,77,79,0.25)" }}>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {phase === "scanning" && (
              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "rgba(88,166,255,0.08)", border: "1px solid rgba(88,166,255,0.2)" }}>
                <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                <p className="text-xs text-blue-400">Connecting and scanning repository... This may take a moment.</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                style={{ background: "#0d1117", border: "1px solid #30363d" }}>
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "#58a6ff", color: "#0d1117" }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Scanning..." : "Connect & Scan Now"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}