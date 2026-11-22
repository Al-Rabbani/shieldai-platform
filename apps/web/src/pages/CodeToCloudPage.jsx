import React, { useState } from "react";
import { Link } from "react-router-dom";
import { GitBranch, Cloud, AlertTriangle, CheckCircle, ArrowRight, Shield, Clock, Package, ChevronDown, ChevronUp } from "lucide-react";

const GOLD = "#C9A84C";

const TRACES = [
  {
    id: 1, repo: "api-gateway", branch: "main", commit: "a3f9c12", developer: "sarah.chen",
    pipeline: "github-actions", deploy_time: "14m ago", cloud_resource: "ecs/api-gateway-prod",
    region: "us-east-1", finding: "SQL Injection in /api/users", severity: "critical",
    status: "open", file: "src/routes/users.js", line: 142, cve: null,
  },
  {
    id: 2, repo: "auth-service", branch: "main", commit: "b7d2e88", developer: "james.malik",
    pipeline: "github-actions", deploy_time: "2h ago", cloud_resource: "lambda/auth-verify",
    region: "eu-west-1", finding: "Hardcoded JWT secret", severity: "critical",
    status: "open", file: "config/auth.js", line: 8, cve: null,
  },
  {
    id: 3, repo: "payment-svc", branch: "release/2.4", commit: "c1a0f55", developer: "priya.nair",
    pipeline: "gitlab-ci", deploy_time: "5h ago", cloud_resource: "ec2/payment-worker",
    region: "eu-west-2", finding: "CVE-2024-21626 (runc escape)", severity: "high",
    status: "open", file: "Dockerfile", line: 1, cve: "CVE-2024-21626",
  },
  {
    id: 4, repo: "data-pipeline", branch: "main", commit: "d4b8a23", developer: "tom.wright",
    pipeline: "github-actions", deploy_time: "1d ago", cloud_resource: "s3/data-exports-prod",
    region: "us-east-1", finding: "S3 bucket public ACL", severity: "high",
    status: "acknowledged", file: "terraform/s3.tf", line: 22, cve: null,
  },
  {
    id: 5, repo: "admin-portal", branch: "main", commit: "e9c3d71", developer: "lisa.ho",
    pipeline: "github-actions", deploy_time: "2d ago", cloud_resource: "cloudfront/admin",
    region: "us-east-1", finding: "Reflected XSS in search param", severity: "medium",
    status: "in_remediation", file: "src/pages/Search.jsx", line: 88, cve: null,
  },
  {
    id: 6, repo: "notification-svc", branch: "main", commit: "f2a1e44", developer: "carlos.d",
    pipeline: "bitbucket", deploy_time: "3d ago", cloud_resource: "sqs/notify-queue",
    region: "ap-southeast-1", finding: "No encryption at rest", severity: "medium",
    status: "open", file: "terraform/sqs.tf", line: 15, cve: null,
  },
  {
    id: 7, repo: "ml-inference", branch: "main", commit: "g7f4c90", developer: "nina.patel",
    pipeline: "github-actions", deploy_time: "4d ago", cloud_resource: "sagemaker/inference-ep",
    region: "us-west-2", finding: "Outdated numpy (CVE-2023-44271)", severity: "low",
    status: "fixed", file: "requirements.txt", line: 4, cve: "CVE-2023-44271",
  },
  {
    id: 8, repo: "api-gateway", branch: "main", commit: "h3b2f11", developer: "sarah.chen",
    pipeline: "github-actions", deploy_time: "5d ago", cloud_resource: "ecs/api-gateway-prod",
    region: "us-east-1", finding: "Missing rate limiting", severity: "medium",
    status: "open", file: "src/middleware/index.js", line: 31, cve: null,
  },
];

const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const STATUS_COLORS = { open: "#ef4444", acknowledged: "#eab308", in_remediation: "#8b5cf6", fixed: "#22c55e" };

function SevBadge({ s }) {
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: SEV_COLORS[s] + "22", color: SEV_COLORS[s], border: `1px solid ${SEV_COLORS[s]}44` }}>{s}</span>;
}

function TraceRow({ t, expanded, onToggle }) {
  return (
    <div className="rounded-xl border overflow-hidden transition-all" style={{ background: "#111827", borderColor: expanded ? SEV_COLORS[t.severity] + "66" : "#1F2937", borderLeft: `3px solid ${SEV_COLORS[t.severity]}` }}>
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SevBadge s={t.severity} />
            <span className="text-sm font-bold text-white truncate">{t.finding}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{t.repo}@{t.commit.slice(0,7)}</span>
            <span>→</span>
            <span className="flex items-center gap-1"><Cloud className="w-3 h-3" />{t.cloud_resource}</span>
            <span className="text-slate-600">{t.deploy_time}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_COLORS[t.status] + "22", color: STATUS_COLORS[t.status] }}>{t.status.replace("_", " ")}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 grid grid-cols-2 md:grid-cols-4 gap-4" style={{ borderColor: "#1F2937" }}>
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Developer</div>
            <div className="text-xs text-white font-medium">{t.developer}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Pipeline</div>
            <div className="text-xs text-white font-medium">{t.pipeline}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Source File</div>
            <div className="text-xs font-mono text-blue-400">{t.file}:{t.line}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Region</div>
            <div className="text-xs text-white font-medium">{t.region}</div>
          </div>
          {t.cve && (
            <div className="col-span-2">
              <div className="text-[10px] text-slate-500 mb-1">CVE</div>
              <span className="text-xs font-bold text-red-400">{t.cve}</span>
            </div>
          )}
          <div className="col-span-2 md:col-span-4 flex gap-2 mt-1">
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>Create Ticket</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold border text-slate-300" style={{ borderColor: "#374151", background: "transparent" }}>View in Repo</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold border text-slate-300" style={{ borderColor: "#374151", background: "transparent" }}>View Cloud Resource</button>
          </div>
        </div>
      )}
    </div>
  );
}

const LEADERBOARD = [
  { name: "sarah.chen", findings: 3, critical: 2, repos: ["api-gateway"] },
  { name: "james.malik", findings: 1, critical: 1, repos: ["auth-service"] },
  { name: "priya.nair", findings: 1, critical: 0, repos: ["payment-svc"] },
  { name: "tom.wright", findings: 1, critical: 0, repos: ["data-pipeline"] },
  { name: "lisa.ho", findings: 1, critical: 0, repos: ["admin-portal"] },
];

export default function CodeToCloudPage() {
  const [tab, setTab] = useState("traces");
  const [expanded, setExpanded] = useState(null);
  const [sevFilter, setSevFilter] = useState("all");

  const filtered = TRACES.filter(t => sevFilter === "all" || t.severity === sevFilter);

  const tabs = [
    { id: "traces", label: "Deployment Traces" },
    { id: "leaderboard", label: "Developer Risk" },
    { id: "pipeline", label: "Pipeline Audit" },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
        <Link to="/" className="hover:text-white">Overview</Link><span>/</span>
        <span style={{ color: GOLD }}>Code-to-Cloud</span>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Code-to-Cloud Correlation</h1>
          <p className="text-slate-400 text-sm mt-0.5">Trace every finding from source commit → pipeline → cloud resource</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Traced Findings", value: TRACES.length, color: "#6366f1" },
          { label: "Critical", value: TRACES.filter(t => t.severity === "critical").length, color: "#ef4444" },
          { label: "Repos Affected", value: [...new Set(TRACES.map(t => t.repo))].length, color: GOLD },
          { label: "Fixed", value: TRACES.filter(t => t.status === "fixed").length, color: "#22c55e" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: k.color + "33" }}>
            <div className="text-[10px] text-slate-500 mb-1">{k.label}</div>
            <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#111827" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: tab === t.id ? GOLD : "transparent", color: tab === t.id ? "#0A0E1A" : "#9CA3AF" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "traces" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {["all", "critical", "high", "medium", "low"].map(s => (
              <button key={s} onClick={() => setSevFilter(s)}
                className="px-3 py-1 rounded-lg text-xs font-bold border transition-all capitalize"
                style={{ borderColor: sevFilter === s ? (SEV_COLORS[s] || GOLD) : "#374151", color: sevFilter === s ? (SEV_COLORS[s] || GOLD) : "#9CA3AF", background: "transparent" }}>
                {s}
              </button>
            ))}
          </div>
          {filtered.map(t => (
            <TraceRow key={t.id} t={t} expanded={expanded === t.id} onToggle={() => setExpanded(expanded === t.id ? null : t.id)} />
          ))}
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white">Developer Risk Leaderboard</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ranked by number of findings introduced in deployed code</p>
          </div>
          <table className="w-full text-xs">
            <thead><tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
              {["Rank", "Developer", "Total Findings", "Critical", "Repos"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {LEADERBOARD.map((d, i) => (
                <tr key={d.name} className="hover:bg-white/5" style={{ borderBottom: "1px solid #1F2937" }}>
                  <td className="px-4 py-3 text-slate-400 font-bold">#{i + 1}</td>
                  <td className="px-4 py-3 text-white font-medium">{d.name}</td>
                  <td className="px-4 py-3"><span className="font-bold" style={{ color: d.findings > 2 ? "#ef4444" : "#eab308" }}>{d.findings}</span></td>
                  <td className="px-4 py-3"><span className="font-bold text-red-400">{d.critical}</span></td>
                  <td className="px-4 py-3 text-slate-400">{d.repos.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "pipeline" && (
        <div className="space-y-3">
          {[
            { name: "github-actions / api-gateway", gate: true, sast: true, sca: true, secrets: true, score: 100 },
            { name: "github-actions / auth-service", gate: true, sast: true, sca: false, secrets: true, score: 75 },
            { name: "gitlab-ci / payment-svc", gate: false, sast: true, sca: true, secrets: false, score: 50 },
            { name: "bitbucket / notification-svc", gate: false, sast: false, sca: false, secrets: false, score: 0 },
          ].map(p => (
            <div key={p.name} className="rounded-xl border p-4 flex items-center gap-4 flex-wrap" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-bold text-white">{p.name}</div>
                <div className="flex gap-3 mt-2">
                  {[["SAST Gate", p.sast], ["SCA Gate", p.sca], ["Secrets Gate", p.secrets], ["Block on Critical", p.gate]].map(([label, ok]) => (
                    <div key={label} className="flex items-center gap-1 text-[10px]">
                      {ok ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-red-400" />}
                      <span className={ok ? "text-emerald-400" : "text-red-400"}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black" style={{ color: p.score >= 75 ? "#22c55e" : p.score >= 50 ? "#eab308" : "#ef4444" }}>{p.score}%</div>
                <div className="text-[10px] text-slate-500">Gate Score</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}