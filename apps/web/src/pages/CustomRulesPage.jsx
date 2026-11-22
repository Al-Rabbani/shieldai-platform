import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Code, Cloud, Shield, CheckCircle, AlertTriangle, Play, Trash2, Edit, Download } from "lucide-react";
import RiskScoringRulesTab from "@/components/rules/RiskScoringRulesTab";

const GOLD = "#C9A84C";

const SAMPLE_RULES = [
  { id: 1, name: "Block AWS Admin Wildcards", type: "cloud", severity: "critical", status: "active", matches: 3, author: "security-team", desc: "Detects IAM policies with Action:* and Resource:* combinations." },
  { id: 2, name: "No Hardcoded Secrets in JS", type: "sast", severity: "high", status: "active", matches: 7, author: "sarah.chen", desc: "Flags assignment of string literals matching common secret patterns." },
  { id: 3, name: "Require TLS 1.2+ on Load Balancers", type: "cloud", severity: "high", status: "active", matches: 1, author: "security-team", desc: "Ensures all ALB/NLB listeners use TLS 1.2 or above." },
  { id: 4, name: "Detect eval() usage in Node.js", type: "sast", severity: "medium", status: "active", matches: 2, author: "james.malik", desc: "Finds unsafe eval() calls that could enable code injection." },
  { id: 5, name: "Block GPL-3.0 Licenses in Production", type: "compliance", severity: "high", status: "draft", matches: 0, author: "legal-team", desc: "Flags direct dependencies with GPL-3.0 license in production repos." },
  { id: 6, name: "Require MFA on All IAM Users", type: "cloud", severity: "critical", status: "active", matches: 4, author: "security-team", desc: "Detects IAM users without MFA device attached." },
];

const COMMUNITY_RULES = [
  { name: "OWASP A01 - Broken Access Control", type: "sast", severity: "critical", downloads: 1240, author: "owasp-foundation" },
  { name: "CIS AWS Benchmark v2.0", type: "cloud", severity: "high", downloads: 892, author: "cis-security" },
  { name: "GDPR Article 32 Data Checks", type: "compliance", severity: "high", downloads: 445, author: "gdpr-toolkit" },
  { name: "Kubernetes RBAC Least Privilege", type: "cloud", severity: "medium", downloads: 331, author: "k8s-sec" },
];

const TYPE_COLORS = { sast: "#6366f1", cloud: "#f97316", compliance: "#8b5cf6" };
const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

function RuleBadge({ type }) {
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: TYPE_COLORS[type] + "22", color: TYPE_COLORS[type], border: `1px solid ${TYPE_COLORS[type]}44` }}>{type}</span>;
}

function SevBadge({ s }) {
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: SEV_COLORS[s] + "22", color: SEV_COLORS[s] }}>{s}</span>;
}

const STEPS = ["Metadata", "Logic", "Test", "Publish"];

function RuleBuilderModal({ onClose }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", type: "sast", severity: "high", desc: "", logic: `// Example SAST rule\nfunction match(node) {\n  return node.type === 'CallExpression' &&\n         node.callee.name === 'eval';\n}` });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-2xl rounded-2xl border overflow-hidden" style={{ background: "#111827", borderColor: "#374151" }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#1F2937" }}>
          <h3 className="font-bold text-white">Create Custom Rule</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>

        {/* Step indicator */}
        <div className="flex px-5 pt-4 gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: i <= step ? GOLD : "#1F2937", color: i <= step ? "#0A0E1A" : "#6B7280" }}>{i + 1}</div>
              <span className="text-xs" style={{ color: i === step ? GOLD : "#6B7280" }}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-6 h-px mx-1" style={{ background: i < step ? GOLD : "#374151" }} />}
            </div>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {step === 0 && (
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Rule Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white border" style={{ background: "#1F2937", borderColor: "#374151" }}
                  placeholder="e.g. Detect unsafe eval() usage" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white border" style={{ background: "#1F2937", borderColor: "#374151" }}>
                    <option value="sast">SAST</option>
                    <option value="cloud">Cloud</option>
                    <option value="compliance">Compliance</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Severity</label>
                  <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white border" style={{ background: "#1F2937", borderColor: "#374151" }}>
                    <option value="critical">Critical</option><option value="high">High</option>
                    <option value="medium">Medium</option><option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Description</label>
                <textarea value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white border min-h-[60px]" style={{ background: "#1F2937", borderColor: "#374151" }}
                  placeholder="What does this rule detect?" />
              </div>
            </>
          )}
          {step === 1 && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Rule Logic (JavaScript AST matcher)</label>
              <textarea value={form.logic} onChange={e => setForm({ ...form, logic: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm font-mono text-green-400 border min-h-[180px]" style={{ background: "#0d1220", borderColor: "#374151" }} />
              <p className="text-[10px] text-slate-500 mt-1">Use the AST node matcher API. Return <code className="text-blue-400">true</code> to flag a match.</p>
            </div>
          )}
          {step === 2 && (
            <div className="text-center py-8">
              <Play className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-bold mb-1">Test Against Sample Code</p>
              <p className="text-slate-400 text-sm mb-4">Run the rule against 3 synthetic test cases</p>
              <div className="space-y-2 text-left">
                {["eval('malicious code')", "const fn = eval", "safeFunction()"].map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "#1F2937" }}>
                    <code className="text-xs font-mono text-slate-300 flex-1">{c}</code>
                    {i < 2 ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-slate-600" />}
                    <span className="text-[10px]" style={{ color: i < 2 ? "#22c55e" : "#6B7280" }}>{i < 2 ? "MATCH" : "PASS"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-bold text-lg mb-1">Ready to Publish</p>
              <p className="text-slate-400 text-sm">Rule "{form.name || "Untitled Rule"}" will be activated immediately across all connected repositories.</p>
              <div className="mt-4 p-3 rounded-lg text-left" style={{ background: "#1F2937" }}>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-500">Name:</span><span className="text-white">{form.name || "Untitled"}</span>
                  <span className="text-slate-500">Type:</span><span style={{ color: TYPE_COLORS[form.type] }}>{form.type}</span>
                  <span className="text-slate-500">Severity:</span><span style={{ color: SEV_COLORS[form.severity] }}>{form.severity}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between px-5 pb-5">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="px-4 py-2 rounded-lg text-sm border text-slate-300" style={{ borderColor: "#374151", background: "transparent" }}>
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button onClick={() => step < 3 ? setStep(s => s + 1) : onClose()}
            className="px-4 py-2 rounded-lg text-sm font-bold text-black" style={{ background: GOLD }}>
            {step < 3 ? "Next" : "Publish Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomRulesPage() {
  const [tab, setTab] = useState("my-rules");
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
        <Link to="/" className="hover:text-white">Overview</Link><span>/</span>
        <span style={{ color: GOLD }}>Custom Rules</span>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Custom Rules Engine</h1>
          <p className="text-slate-400 text-sm mt-0.5">Write, test, and deploy organisation-specific security rules</p>
        </div>
        <button onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black" style={{ background: GOLD }}>
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
        {[
          { label: "Active Rules", value: SAMPLE_RULES.filter(r => r.status === "active").length, color: "#22c55e" },
          { label: "Total Matches (30d)", value: SAMPLE_RULES.reduce((s, r) => s + r.matches, 0), color: "#ef4444" },
          { label: "Community Rules", value: COMMUNITY_RULES.length, color: "#6366f1" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: k.color + "33" }}>
            <div className="text-[10px] text-slate-500 mb-1">{k.label}</div>
            <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#111827" }}>
        {[{ id: "my-rules", label: "My Rules" }, { id: "risk-scoring", label: "Risk Scoring Rules" }, { id: "community", label: "Community Gallery" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: tab === t.id ? GOLD : "transparent", color: tab === t.id ? "#0A0E1A" : "#9CA3AF" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "my-rules" && (
        <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
              {["Rule", "Type", "Severity", "Status", "Matches (30d)", "Author", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {SAMPLE_RULES.map(r => (
                <tr key={r.id} className="hover:bg-white/5" style={{ borderBottom: "1px solid #1F2937" }}>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{r.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
                  </td>
                  <td className="px-4 py-3"><RuleBadge type={r.type} /></td>
                  <td className="px-4 py-3"><SevBadge s={r.severity} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold ${r.status === "active" ? "text-emerald-400" : "text-yellow-400"}`}>
                      {r.status === "active" ? "● Active" : "○ Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: r.matches > 0 ? "#ef4444" : "#6B7280" }}>{r.matches}</td>
                  <td className="px-4 py-3 text-slate-400">{r.author}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"><Edit className="w-3.5 h-3.5" /></button>
                      <button className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "risk-scoring" && (
        <RiskScoringRulesTab />
      )}

      {tab === "community" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMMUNITY_RULES.map(r => (
            <div key={r.name} className="rounded-xl border p-4 hover:scale-[1.01] transition-all" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-bold text-white text-sm">{r.name}</div>
                <RuleBadge type={r.type} />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span>by {r.author}</span>
                  <span className="flex items-center gap-1"><Download className="w-3 h-3" />{r.downloads}</span>
                </div>
                <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>Import</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBuilder && <RuleBuilderModal onClose={() => setShowBuilder(false)} />}
    </div>
  );
}