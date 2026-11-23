import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Cloud, Server, AlertTriangle, RefreshCw, Shield, ChevronRight, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import SeverityBadge from "@/components/shared/SeverityBadge";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

const PROVIDER_CONFIG = {
  aws:   { color: "#f97316", icon: "☁️", label: "AWS" },
  gcp:   { color: "#3b82f6", icon: "🔵", label: "GCP" },
  azure: { color: "#0ea5e9", icon: "🌐", label: "Azure" },
};

function RiskDonut({ score }) {
  const r = 20, c = 2 * Math.PI * r;
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f97316" : "#10b981";
  const dash = (score / 100) * c;
  return (
    <svg width="56" height="56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle" fontSize="10" fill={color} fontFamily="monospace" fontWeight="bold">{score}</text>
    </svg>
  );
}

function AccountCard({ account }) {
  const cfg = PROVIDER_CONFIG[account.provider?.toLowerCase()] || PROVIDER_CONFIG.aws;
  return (
    <div className="rounded-xl p-5 card-hover" style={{ background: "#161b22", border: "1px solid #30363d" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.icon}</span>
          <div>
            <p className="text-sm font-bold text-white">{account.nickname || account.account_id}</p>
            <p className="text-[10px] text-slate-500 font-mono">{account.account_id}</p>
          </div>
        </div>
        <RiskDonut score={account.risk_score || 0} />
      </div>
      <div className="flex items-center gap-3 mb-3 text-[10px]">
        {account.critical_count > 0 && <span className="text-red-400 font-bold">🔴 {account.critical_count}</span>}
        {account.high_count > 0 && <span className="text-orange-400 font-bold">🟠 {account.high_count}</span>}
        {account.medium_count > 0 && <span className="text-yellow-400 font-bold">🟡 {account.medium_count}</span>}
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{account.last_scanned ? formatDistanceToNow(new Date(account.last_scanned), { addSuffix: true }) : "Never scanned"}</span>
        <Link to="/cloud/findings" className="flex items-center gap-1 text-blue-400 hover:underline">
          View Findings <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-40 rounded-xl animate-pulse" style={{ background: "#161b22" }} />;
}

export default function CloudDashboard() {
  const [filterProvider, setFilterProvider] = useState("all");
  const [filterService, setFilterService] = useState("all");
  const [filterSev, setFilterSev] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const qc = useQueryClient();

  const { data: accounts = [], isLoading: loadAccounts } = useQuery({
    queryKey: ["cloud-accounts"],
    queryFn: () => base44.entities.CloudAccount.list().catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: findings = [], isLoading: loadFindings } = useQuery({
    queryKey: ["cloud-findings-dash"],
    queryFn: () => base44.entities.CloudFinding.list("-detected_at", 200).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  // Stats
  const criticalMisconfigs = findings.filter(f => f.severity === "critical" && (f.status || f.finding_status) === "open").length;
  const avgCIS = accounts.length > 0
    ? Math.round(accounts.reduce((s, a) => s + (a.cis_score || a.compliance_score || 0), 0) / accounts.length)
    : 0;
  const regions = [...new Set(accounts.map(a => a.region).filter(Boolean))].length;

  // Filtered findings
  const filteredFindings = findings.filter(f => {
    if (filterProvider !== "all" && f.provider?.toLowerCase() !== filterProvider) return false;
    if (filterService !== "all" && !f.service?.toLowerCase().includes(filterService)) return false;
    if (filterSev !== "all" && f.severity !== filterSev) return false;
    if (filterStatus !== "all" && (f.status || f.finding_status) !== filterStatus) return false;
    return true;
  });

  const services = [...new Set(findings.map(f => f.service).filter(Boolean))];

  return (
    <div className="space-y-6 min-h-screen" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.3)" }}>
            <Cloud className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Cloud Security</h1>
            <p className="text-xs text-slate-500">{accounts.length} cloud accounts · {findings.length} total findings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => qc.invalidateQueries()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-400 hover:text-white transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link to="/cloud/accounts"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#0369a1,#0ea5e9)" }}>
            <Cloud className="w-3.5 h-3.5" /> Connect Account
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Cloud Accounts", value: accounts.length, color: "#0ea5e9", icon: Cloud },
          { label: "Critical Misconfigs", value: criticalMisconfigs, color: "#ef4444", icon: AlertTriangle, pulse: criticalMisconfigs > 0 },
          { label: "CIS Benchmark Score", value: avgCIS > 0 ? `${avgCIS}%` : "—", color: avgCIS >= 80 ? "#10b981" : "#eab308", icon: Shield },
          { label: "Regions Scanned", value: regions, color: "#8b5cf6", icon: Globe },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              {s.pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />}
            </div>
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Account Cards */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-4">Cloud Accounts</h2>
        {loadAccounts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-2xl p-16 text-center" style={{ background: "#161b22", border: "1px dashed #30363d" }}>
            <Cloud className="w-12 h-12 mx-auto mb-4 text-slate-700" />
            <p className="text-sm font-semibold text-slate-400 mb-2">No cloud accounts connected</p>
            <Link to="/cloud/accounts" className="text-xs text-blue-400 hover:underline">Connect your first cloud account →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {accounts.map(a => <AccountCard key={a.id} account={a} />)}
          </div>
        )}
      </div>

      {/* Findings Table */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-4">Cloud Findings</h2>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
            <option value="all">All Providers</option>
            <option value="aws">AWS</option>
            <option value="gcp">GCP</option>
            <option value="azure">Azure</option>
          </select>
          <select value={filterService} onChange={e => setFilterService(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
            <option value="all">All Services</option>
            {services.slice(0, 20).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_remediation">In Remediation</option>
            <option value="resolved">Resolved</option>
            <option value="accepted_risk">Accepted Risk</option>
          </select>
          <span className="ml-auto text-[10px] text-slate-500 self-center font-mono">{filteredFindings.length} findings</span>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                {["Title", "Service", "Severity", "Resource", "CIS Control", "Region", "Detected", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadFindings ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredFindings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Shield className="w-8 h-8 mx-auto mb-3 text-emerald-500/40" />
                    <p className="text-sm text-slate-500">No findings match your filters</p>
                  </td>
                </tr>
              ) : (
                filteredFindings.slice(0, 100).map((f, i) => {
                  const sevColor = SEV_COLOR[f.severity] || "#64748b";
                  const status = f.status || f.finding_status || "open";
                  return (
                    <tr key={f.id}
                      style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                      className="hover:bg-sky-500/3 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs text-white font-medium line-clamp-1 max-w-48 block">{f.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300">{f.service || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: sevColor, background: `${sevColor}20` }}>
                          {f.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-32 block">{f.resource || f.resource_id || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-500 font-mono">{f.cis_control || "—"}</td>
                      <td className="px-4 py-3 text-[10px] text-slate-400">{f.region || "—"}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        {f.detected_at ? formatDistanceToNow(new Date(f.detected_at), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded capitalize"
                          style={{
                            color: status === "open" ? "#ef4444" : status === "resolved" ? "#10b981" : "#f97316",
                            background: status === "open" ? "rgba(239,68,68,0.1)" : status === "resolved" ? "rgba(16,185,129,0.1)" : "rgba(249,115,22,0.1)"
                          }}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}