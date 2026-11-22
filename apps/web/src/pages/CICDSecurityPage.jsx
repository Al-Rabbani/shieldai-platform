import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, AlertTriangle, Copy, GitBranch, Shield, Clock, Package } from "lucide-react";

const GOLD = "#C9A84C";

const PIPELINES = [
  { id: 1, name: "api-gateway / main", provider: "GitHub Actions", runs_30d: 142, pass_rate: 94, sast: true, sca: true, secrets: true, dast: false, sbom: true, score: 88, last_run: "14m ago", status: "passing" },
  { id: 2, name: "auth-service / main", provider: "GitHub Actions", runs_30d: 88, pass_rate: 97, sast: true, sca: true, secrets: true, dast: true, sbom: true, score: 100, last_run: "2h ago", status: "passing" },
  { id: 3, name: "payment-svc / release", provider: "GitLab CI", runs_30d: 34, pass_rate: 76, sast: true, sca: false, secrets: false, dast: false, sbom: false, score: 40, last_run: "5h ago", status: "failing" },
  { id: 4, name: "data-pipeline / main", provider: "GitHub Actions", runs_30d: 211, pass_rate: 99, sast: true, sca: true, secrets: true, dast: false, sbom: true, score: 80, last_run: "1h ago", status: "passing" },
  { id: 5, name: "notification-svc / main", provider: "Bitbucket", runs_30d: 21, pass_rate: 62, sast: false, sca: false, secrets: false, dast: false, sbom: false, score: 0, last_run: "3d ago", status: "missing_gates" },
  { id: 6, name: "admin-portal / main", provider: "GitHub Actions", runs_30d: 57, pass_rate: 88, sast: true, sca: true, secrets: false, dast: false, sbom: false, score: 60, last_run: "2d ago", status: "warning" },
];

const FINDINGS = [
  { id: 1, pipeline: "payment-svc", finding: "Poisoned Pipeline Execution (PPE) risk", severity: "critical", step: "checkout", desc: "Untrusted code from fork PRs runs in privileged context." },
  { id: 2, pipeline: "notification-svc", finding: "Secrets printed in build logs", severity: "high", step: "deploy", desc: "AWS_SECRET_KEY echoed during deployment step." },
  { id: 3, pipeline: "admin-portal", finding: "Unpinned dependency in workflow", severity: "medium", step: "setup", desc: "actions/checkout@v3 unpinned — supply chain risk." },
  { id: 4, pipeline: "data-pipeline", finding: "GITHUB_TOKEN over-permissioned", severity: "medium", step: "release", desc: "Workflow uses write-all permissions when read-only suffices." },
];

const YAML_TEMPLATE = `name: ShieldAI Security Gate

on: [push, pull_request]

jobs:
  shield-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: ShieldAI SAST Scan
        uses: shieldai/sast-action@v2
        with:
          api-key: \${{ secrets.SHIELDAI_API_KEY }}
          fail-on: critical,high

      - name: ShieldAI SCA Scan
        uses: shieldai/sca-action@v2
        with:
          api-key: \${{ secrets.SHIELDAI_API_KEY }}
          block-exploited-in-wild: true

      - name: ShieldAI Secrets Scan
        uses: shieldai/secrets-action@v2
        with:
          api-key: \${{ secrets.SHIELDAI_API_KEY }}
          block-on-active-secrets: true

      - name: Generate SBOM
        uses: shieldai/sbom-action@v1
        with:
          api-key: \${{ secrets.SHIELDAI_API_KEY }}`;

const SUPPLY_CHAIN = [
  { name: "actions/checkout@v4", trust: 98, pinned: true, publisher: "GitHub" },
  { name: "actions/setup-node@v4", trust: 97, pinned: true, publisher: "GitHub" },
  { name: "docker/build-push-action@v5", trust: 91, pinned: true, publisher: "Docker" },
  { name: "shieldai/sast-action@v2", trust: 100, pinned: true, publisher: "ShieldAI" },
  { name: "aws-actions/configure-credentials@v4", trust: 95, pinned: false, publisher: "AWS" },
  { name: "codecov/codecov-action@v3", trust: 72, pinned: false, publisher: "Codecov" },
];

const RUN_HISTORY = [
  { id: "#1842", pipeline: "api-gateway", status: "pass", sast: "pass", sca: "pass", time: "3m 12s", at: "14m ago" },
  { id: "#1841", pipeline: "auth-service", status: "pass", sast: "pass", sca: "pass", time: "2m 44s", at: "2h ago" },
  { id: "#1840", pipeline: "payment-svc", status: "fail", sast: "fail", sca: "pass", time: "1m 58s", at: "5h ago" },
  { id: "#1839", pipeline: "data-pipeline", status: "pass", sast: "pass", sca: "pass", time: "4m 01s", at: "6h ago" },
  { id: "#1838", pipeline: "admin-portal", status: "warn", sast: "pass", sca: "warn", time: "2m 22s", at: "1d ago" },
];

const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const STATUS_COLORS = { passing: "#22c55e", failing: "#ef4444", warning: "#eab308", missing_gates: "#6B7280" };

function GateIcon({ ok }) {
  return ok ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />;
}

export default function CICDSecurityPage() {
  const [tab, setTab] = useState("pipelines");
  const [copied, setCopied] = useState(false);

  const copy = () => { navigator.clipboard.writeText(YAML_TEMPLATE); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const tabs = [
    { id: "pipelines", label: "Pipeline Inventory" },
    { id: "findings", label: "Findings" },
    { id: "templates", label: "Gate Templates" },
    { id: "supply-chain", label: "Supply Chain" },
    { id: "history", label: "Run History" },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
        <Link to="/" className="hover:text-white">Overview</Link><span>/</span>
        <span style={{ color: GOLD }}>CI/CD Security</span>
      </div>
      <div>
        <h1 className="text-2xl font-black text-white">CI/CD Pipeline Security</h1>
        <p className="text-slate-400 text-sm mt-0.5">Enforce security gates, detect pipeline attacks, and secure your supply chain</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pipelines Monitored", value: PIPELINES.length, color: "#6366f1" },
          { label: "With Full Gates", value: PIPELINES.filter(p => p.score >= 80).length, color: "#22c55e" },
          { label: "Missing Gates", value: PIPELINES.filter(p => p.score < 40).length, color: "#ef4444" },
          { label: "Pipeline Findings", value: FINDINGS.length, color: "#f97316" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: k.color + "33" }}>
            <div className="text-[10px] text-slate-500 mb-1">{k.label}</div>
            <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl w-fit overflow-x-auto" style={{ background: "#111827" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
            style={{ background: tab === t.id ? GOLD : "transparent", color: tab === t.id ? "#0A0E1A" : "#9CA3AF" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pipelines" && (
        <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
              {["Pipeline", "Provider", "Gate Score", "SAST", "SCA", "Secrets", "DAST", "SBOM", "Last Run"].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {PIPELINES.map(p => (
                <tr key={p.id} className="hover:bg-white/5" style={{ borderBottom: "1px solid #1F2937" }}>
                  <td className="px-3 py-3">
                    <div className="text-white font-medium">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.runs_30d} runs · {p.pass_rate}% pass</div>
                  </td>
                  <td className="px-3 py-3 text-slate-400">{p.provider}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black" style={{ color: p.score >= 80 ? "#22c55e" : p.score >= 50 ? "#eab308" : "#ef4444" }}>{p.score}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3"><GateIcon ok={p.sast} /></td>
                  <td className="px-3 py-3"><GateIcon ok={p.sca} /></td>
                  <td className="px-3 py-3"><GateIcon ok={p.secrets} /></td>
                  <td className="px-3 py-3"><GateIcon ok={p.dast} /></td>
                  <td className="px-3 py-3"><GateIcon ok={p.sbom} /></td>
                  <td className="px-3 py-3 text-slate-400">{p.last_run}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "findings" && (
        <div className="space-y-3">
          {FINDINGS.map(f => (
            <div key={f.id} className="rounded-xl border p-4" style={{ background: "#111827", borderLeft: `3px solid ${SEV_COLORS[f.severity]}`, borderColor: "#1F2937" }}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: SEV_COLORS[f.severity] + "22", color: SEV_COLORS[f.severity] }}>{f.severity}</span>
                    <span className="text-sm font-bold text-white">{f.finding}</span>
                  </div>
                  <div className="text-xs text-slate-400">{f.desc}</div>
                  <div className="mt-2 text-[10px] text-slate-500">Pipeline: <span className="text-slate-300">{f.pipeline}</span> · Step: <span className="font-mono text-blue-400">{f.step}</span></div>
                </div>
                <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-black flex-shrink-0" style={{ background: GOLD }}>Fix</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "templates" && (
        <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white">GitHub Actions — Full Security Gate</h3>
            <button onClick={copy} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border" style={{ borderColor: "#374151", color: copied ? "#22c55e" : "#9CA3AF", background: "transparent" }}>
              <Copy className="w-3.5 h-3.5" />{copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-x-auto" style={{ color: "#a5f3fc", background: "#0d1220", lineHeight: 1.7 }}>{YAML_TEMPLATE}</pre>
        </div>
      )}

      {tab === "supply-chain" && (
        <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
              {["Action", "Publisher", "Trust Score", "Pinned", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {SUPPLY_CHAIN.map(a => (
                <tr key={a.name} className="hover:bg-white/5" style={{ borderBottom: "1px solid #1F2937" }}>
                  <td className="px-4 py-3 font-mono text-blue-400">{a.name}</td>
                  <td className="px-4 py-3 text-slate-300">{a.publisher}</td>
                  <td className="px-4 py-3">
                    <span className="font-black" style={{ color: a.trust >= 90 ? "#22c55e" : a.trust >= 75 ? "#eab308" : "#ef4444" }}>{a.trust}</span>
                  </td>
                  <td className="px-4 py-3">
                    {a.pinned ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                  </td>
                  <td className="px-4 py-3">
                    {!a.pinned && <button className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: GOLD, color: "#0A0E1A" }}>Pin SHA</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
              {["Run", "Pipeline", "SAST", "SCA", "Duration", "When"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {RUN_HISTORY.map(r => {
                const c = { pass: "#22c55e", fail: "#ef4444", warn: "#eab308" };
                return (
                  <tr key={r.id} className="hover:bg-white/5" style={{ borderBottom: "1px solid #1F2937" }}>
                    <td className="px-4 py-3 font-mono text-slate-300">{r.id}</td>
                    <td className="px-4 py-3 text-white">{r.pipeline}</td>
                    <td className="px-4 py-3"><span className="font-bold capitalize" style={{ color: c[r.sast] }}>{r.sast}</span></td>
                    <td className="px-4 py-3"><span className="font-bold capitalize" style={{ color: c[r.sca] }}>{r.sca}</span></td>
                    <td className="px-4 py-3 text-slate-400">{r.time}</td>
                    <td className="px-4 py-3 text-slate-500">{r.at}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}