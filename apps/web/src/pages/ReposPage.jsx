import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import {
  GitBranch, Plus, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Shield, Loader2, ExternalLink, ChevronRight, Code2
} from "lucide-react";
import ConnectRepoModal from "@/components/repos/ConnectRepoModal";
import { formatDistanceToNow } from "date-fns";

const SEV = {
  critical: { color: "#ff4d4f", bg: "rgba(255,77,79,0.12)", border: "rgba(255,77,79,0.35)" },
  high: { color: "#fa8c16", bg: "rgba(250,140,22,0.12)", border: "rgba(250,140,22,0.3)" },
  medium: { color: "#fadb14", bg: "rgba(250,219,20,0.1)", border: "rgba(250,219,20,0.25)" },
  low: { color: "#52c41a", bg: "rgba(82,196,26,0.1)", border: "rgba(82,196,26,0.25)" },
};

function RiskBadge({ score }) {
  const color = score > 70 ? "#ff4d4f" : score > 40 ? "#fa8c16" : "#52c41a";
  const bg = score > 70 ? "rgba(255,77,79,0.12)" : score > 40 ? "rgba(250,140,22,0.12)" : "rgba(82,196,26,0.1)";
  return (
    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded"
      style={{ color, background: bg, border: `1px solid ${color}40` }}>
      {score}/100
    </span>
  );
}

function StatusIndicator({ status }) {
  if (status === "scanning") return (
    <div className="flex items-center gap-1.5">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
      <span className="text-xs text-blue-400 font-mono">Scanning...</span>
    </div>
  );
  if (status === "complete") return (
    <div className="flex items-center gap-1.5">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      <span className="text-xs text-emerald-400 font-mono">Complete</span>
    </div>
  );
  if (status === "failed") return (
    <div className="flex items-center gap-1.5">
      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
      <span className="text-xs text-red-400 font-mono">Failed</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5">
      <Clock className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-xs text-slate-500 font-mono">Idle</span>
    </div>
  );
}

function LanguageBadge({ lang }) {
  const colors = {
    TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3572a5",
    Java: "#b07219", Go: "#00add8", Rust: "#dea584", Ruby: "#701516",
    PHP: "#4f5d95", "C#": "#178600", Kotlin: "#a97bff",
  };
  const c = colors[lang] || "#58a6ff";
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: `${c}20`, color: c, border: `1px solid ${c}40` }}>
      {lang || "Unknown"}
    </span>
  );
}

function RepoCard({ repo, onScan }) {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(repo.scan_status === "scanning");

  const handleScan = async (e) => {
    e.stopPropagation();
    setScanning(true);
    await onScan(repo);
  };

  const lastScanned = repo.last_scanned
    ? formatDistanceToNow(new Date(repo.last_scanned), { addSuffix: true })
    : "Never";

  return (
    <div className="rounded-xl p-5 transition-all duration-200 hover:border-blue-500/40 cursor-pointer group"
      style={{ background: "#161b22", border: "1px solid #30363d" }}
      onClick={() => navigate(`/findings?repo=${repo.id}`)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#0d1117", border: "1px solid #30363d" }}>
            <GitBranch className="w-4 h-4 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{repo.name}</p>
            <p className="text-[11px] text-slate-500 font-mono truncate">{repo.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <LanguageBadge lang={repo.language} />
          {repo.risk_score != null && <RiskBadge score={repo.risk_score} />}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Clock className="w-3 h-3" />
          <span className="font-mono">{lastScanned}</span>
        </div>
        <StatusIndicator status={repo.scan_status} />
      </div>

      {repo.total_findings > 0 && (
        <div className="flex items-center gap-3 mb-4">
          {repo.critical_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-bold font-mono" style={{ color: SEV.critical.color }}>
              🔴 {repo.critical_count}
            </span>
          )}
          {repo.high_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-bold font-mono" style={{ color: SEV.high.color }}>
              🟠 {repo.high_count}
            </span>
          )}
          {repo.medium_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-bold font-mono" style={{ color: SEV.medium.color }}>
              🟡 {repo.medium_count}
            </span>
          )}
          {repo.low_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-bold font-mono" style={{ color: SEV.low.color }}>
              🟢 {repo.low_count}
            </span>
          )}
          <span className="text-[10px] text-slate-600 font-mono ml-auto">{repo.total_findings} total</span>
        </div>
      )}

      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={handleScan}
          disabled={scanning || repo.scan_status === "scanning"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "rgba(88,166,255,0.12)", color: "#58a6ff", border: "1px solid rgba(88,166,255,0.3)" }}>
          {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Scan Now
        </button>
        <Link
          to={`/findings?repo=${repo.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
          style={{ background: "rgba(30,58,95,0.3)", color: "#94a3b8", border: "1px solid #30363d" }}>
          View Findings <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon: IconComp }) {
  const Icon = IconComp;
  return (
    <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">{label}</span>
      </div>
      <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
    </div>
  );
}

export default function ReposPage() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data: repos = [], isLoading } = useQuery({
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

  const allFindings = [
    ...sastFindings.filter(f => f.status === "open"),
    ...scaFindings.filter(f => f.status === "open"),
    ...secretFindings.filter(f => f.status === "open"),
  ];
  const totalCritical = allFindings.filter(f => f.severity === "critical").length;
  const totalHigh = allFindings.filter(f => f.severity === "high").length;
  const today = new Date().toDateString();
  const scannedToday = repos.filter(r => r.last_scanned && new Date(r.last_scanned).toDateString() === today).length;

  const handleScan = async (repo) => {
    await base44.entities.CodeRepository.update(repo.id, { scan_status: "scanning" });
    qc.invalidateQueries({ queryKey: ["repos"] });

    try {
      const scanId = `scan-${Date.now()}`;
      const jobRecord = await base44.entities.ScanJob.create({
        repo_id: repo.id,
        repo_name: repo.name,
        scan_type: "sast,sca,secrets",
        status: "running",
        started_at: new Date().toISOString(),
        triggered_by: "manual",
      });

      const response = await fetch(
        "https://api.base44.com/api/apps/6a14246111a4fa5e22999619/functions/shieldScanRepo",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repo_full_name: repo.full_name,
            github_token: repo.github_token,
            scan_types: ["sast", "sca", "secrets"],
          }),
        }
      );
      const data = await response.json();

      const creates = [];
      (data.findings || []).forEach(f => {
        creates.push(base44.entities.RealSASTFinding.create({
          repo_id: repo.id, repo_name: repo.name, scan_id: scanId,
          title: f.title, severity: f.severity, status: "open",
          file_path: f.file_path, line_number: f.line_number,
          snippet: f.snippet, cwe_id: f.cwe_id,
          autofix_available: f.autofix_available || false,
          confidence: f.confidence || 80,
          detected_at: new Date().toISOString(),
          rule_id: f.rule_id,
        }));
      });
      (data.vulnerabilities || []).forEach(v => {
        creates.push(base44.entities.RealSCAFinding.create({
          repo_id: repo.id, repo_name: repo.name, scan_id: scanId,
          package_name: v.package_name, installed_version: v.installed_version,
          fix_version: v.fix_version, vuln_id: v.vuln_id, cve_id: v.cve_id,
          title: v.title, severity: v.severity, status: "open",
          file_path: v.file_path, published: v.published,
          cvss_score: v.cvss_score, epss_score: v.epss_score,
          is_reachable: v.is_reachable || false,
        }));
      });
      (data.secrets || []).forEach(s => {
        creates.push(base44.entities.RealSecretFinding.create({
          repo_id: repo.id, repo_name: repo.name, scan_id: scanId,
          secret_type: s.secret_type, severity: s.severity || "critical",
          status: "open", file_path: s.file_path, line_number: s.line_number,
          snippet: s.snippet, remediation: s.remediation,
          detected_at: new Date().toISOString(),
        }));
      });
      await Promise.all(creates);

      const summary = data.summary || {};
      const duration = Math.round((Date.now() - new Date(jobRecord.started_at).getTime()) / 1000);
      await Promise.all([
        base44.entities.CodeRepository.update(repo.id, {
          scan_status: "complete",
          last_scanned: new Date().toISOString(),
          total_findings: summary.total || creates.length,
          critical_count: summary.critical || 0,
          high_count: summary.high || 0,
          medium_count: summary.medium || 0,
          low_count: summary.low || 0,
          risk_score: summary.risk_score || 0,
        }),
        base44.entities.ScanJob.update(jobRecord.id, {
          status: "complete",
          completed_at: new Date().toISOString(),
          duration_seconds: duration,
          files_scanned: summary.files_scanned || 0,
          findings_count: creates.length,
        }),
      ]);
    } catch (err) {
      await base44.entities.CodeRepository.update(repo.id, {
        scan_status: "failed",
        last_scanned: new Date().toISOString(),
      });
    }
    qc.invalidateQueries({ queryKey: ["repos"] });
    qc.invalidateQueries({ queryKey: ["real-sast-all"] });
    qc.invalidateQueries({ queryKey: ["real-sca-all"] });
    qc.invalidateQueries({ queryKey: ["real-secrets-all"] });
  };

  return (
    <div className="min-h-screen -m-6 p-6 space-y-6" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Code2 className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Repositories</h1>
          </div>
          <p className="text-sm text-slate-500">Connect your repositories and scan for vulnerabilities, secrets, and dependency issues.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "#58a6ff", color: "#0d1117" }}>
          <Plus className="w-4 h-4" />
          Connect Repository
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Repos Connected" value={repos.length} color="#58a6ff" icon={GitBranch} />
        <StatCard label="Open Critical" value={totalCritical} color="#ff4d4f" icon={AlertTriangle} />
        <StatCard label="Open High" value={totalHigh} color="#fa8c16" icon={Shield} />
        <StatCard label="Scanned Today" value={scannedToday} color="#52c41a" icon={CheckCircle2} />
      </div>

      {/* Repo List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: "#161b22", border: "1px solid #30363d", height: 180 }} />
          ))}
        </div>
      ) : repos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <GitBranch className="w-10 h-10 text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connect your first repository</h2>
          <p className="text-slate-500 mb-6 max-w-sm">Start scanning for vulnerabilities, exposed secrets, and dependency risks in your codebase.</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "#58a6ff", color: "#0d1117" }}>
            <Plus className="w-4 h-4" />
            Connect Repository
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {repos.map(repo => (
            <RepoCard key={repo.id} repo={repo} onScan={handleScan} />
          ))}
        </div>
      )}

      {showModal && (
        <ConnectRepoModal
          onClose={() => setShowModal(false)}
          onConnected={() => {
            setShowModal(false);
            qc.invalidateQueries({ queryKey: ["repos"] });
          }}
        />
      )}
    </div>
  );
}