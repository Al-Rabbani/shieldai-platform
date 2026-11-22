import React from "react";
import { Link } from "react-router-dom";
import { Lock, Unlock, RefreshCw, Eye, GitBranch, Package, AlertTriangle, Scale, Clock, TestTube2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const PROVIDER_STYLE = {
  github:       { bg: "#1a1a1a", color: "#fff",     label: "GitHub" },
  gitlab:       { bg: "#fc6d26", color: "#fff",     label: "GitLab" },
  bitbucket:    { bg: "#0052cc", color: "#fff",     label: "Bitbucket" },
  azure_devops: { bg: "#0078d4", color: "#fff",     label: "Azure DevOps" },
};

const LANG_STYLE = {
  TypeScript: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  Python:     { bg: "rgba(234,179,8,0.15)",  color: "#facc15" },
  Java:       { bg: "rgba(239,68,68,0.15)",  color: "#f87171" },
  HCL:        { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
  Go:         { bg: "rgba(6,182,212,0.15)",  color: "#22d3ee" },
  JavaScript: { bg: "rgba(234,179,8,0.15)",  color: "#facc15" },
};

const STATUS_STYLE = {
  connected:    { label: "Connected",    color: "#10b981", pulse: false },
  scanning:     { label: "Scanning",     color: "#3b82f6", pulse: true  },
  error:        { label: "Error",        color: "#ef4444", pulse: false },
  disconnected: { label: "Disconnected", color: "#6b7280", pulse: false },
};

function QualityBar({ score }) {
  const color = score >= 71 ? "#10b981" : score >= 41 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-400">Quality</span>
        <span className="text-xs font-mono font-semibold" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

function RiskGauge({ score }) {
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#10b981";
  const r = 16, circ = 2 * Math.PI * r;
  const fill = circ - (score / 100) * circ;
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg width="48" height="48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <span className="absolute text-[10px] font-bold text-white">{score}</span>
    </div>
  );
}

export default function RepoCard({ repo, onRescan }) {
  const prov = PROVIDER_STYLE[repo.provider] || PROVIDER_STYLE.github;
  const lang = LANG_STYLE[repo.language] || { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" };
  const st   = STATUS_STYLE[repo.status] || STATUS_STYLE.disconnected;
  const cov  = repo.test_coverage_pct ?? 0;
  const covColor = cov >= 70 ? "#10b981" : cov >= 40 ? "#f59e0b" : "#ef4444";

  let scannedAgo = "Never";
  if (repo.last_scanned) {
    try { scannedAgo = formatDistanceToNow(new Date(repo.last_scanned), { addSuffix: true }); } catch {}
  }

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-5 hover:border-indigo-500/30 transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col gap-4"
      style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.03),rgba(15,23,42,0.8))" }}>
      
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: prov.bg, color: prov.color }}>{prov.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={lang}>{repo.language}</span>
            {repo.team && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{repo.team}</span>}
            <span>{repo.is_private ? <Lock className="w-3 h-3 text-slate-500" /> : <Unlock className="w-3 h-3 text-slate-600" />}</span>
          </div>
          <h3 className="font-bold text-white text-sm truncate">{repo.name}</h3>
          <p className="text-[11px] font-mono text-slate-500 truncate">{repo.full_name}</p>
        </div>
        <RiskGauge score={repo.risk_score ?? 0} />
      </div>

      {/* Status + last scanned */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${st.pulse ? "animate-pulse" : ""}`} style={{ background: st.color }} />
          <span className="text-[11px]" style={{ color: st.color }}>{st.label}</span>
        </div>
        <span className="text-[10px] text-slate-600 font-mono">{scannedAgo}</span>
      </div>

      {/* Quality bar */}
      <QualityBar score={repo.code_quality_score ?? 0} />

      {/* Finding counts */}
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-slate-300 font-mono">{repo.critical_count ?? 0}</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-slate-300 font-mono">{repo.high_count ?? 0}</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /><span className="text-slate-300 font-mono">{repo.medium_count ?? 0}</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-slate-300 font-mono">{repo.low_count ?? 0}</span></span>
        <span className="text-slate-600 text-[10px] ml-auto">total: {repo.total_findings ?? 0}</span>
      </div>

      {/* Deps / EOL / License */}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="flex items-center gap-1 text-slate-400"><Package className="w-3 h-3" /><span>{repo.outdated_deps ?? 0} outdated</span></div>
        <div className="flex items-center gap-1" style={{ color: (repo.eol_packages ?? 0) > 0 ? "#f59e0b" : "#64748b" }}><AlertTriangle className="w-3 h-3" /><span>{repo.eol_packages ?? 0} EOL</span></div>
        <div className="flex items-center gap-1" style={{ color: (repo.license_violations ?? 0) > 0 ? "#ef4444" : "#64748b" }}><Scale className="w-3 h-3" /><span>{repo.license_violations ?? 0} lic.</span></div>
      </div>

      {/* Tech debt + coverage + duplication */}
      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{repo.tech_debt_hours ?? 0}h debt</span></div>
        <div className="flex items-center gap-1" style={{ color: covColor }}><TestTube2 className="w-3 h-3" /><span>{cov}% cov.</span></div>
        <div className="flex items-center gap-1"><GitBranch className="w-3 h-3" /><span>{repo.open_prs ?? 0} PRs</span></div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <Link to={`/code/repositories/${repo.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/10 transition-all">
          <Eye className="w-3 h-3" /> View Details
        </Link>
        <button onClick={() => onRescan(repo)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-slate-700 hover:bg-slate-800 transition-all">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}