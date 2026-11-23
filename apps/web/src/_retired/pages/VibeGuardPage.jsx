import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, AlertTriangle, Package, Brain, Code, Search, CheckCircle, X, GitBranch, FileCode } from "lucide-react";

const GOLD = "#C9A84C";

const HALLUCINATED_PACKAGES = [
  { id: 1, name: "react-smooth-validator", imported_in: ["src/components/LoginForm.jsx", "src/utils/validation.js"], exists: false, squatting_risk: 92, downloads_if_squatted: 0 },
  { id: 2, name: "@ai-sdk/chat-utils", imported_in: ["src/agents/ChatAgent.ts"], exists: false, squatting_risk: 87, downloads_if_squatted: 0 },
  { id: 3, name: "crypto-hash-fast", imported_in: ["src/utils/hash.ts"], exists: true, downloads: 1247, squatting_risk: 0 },
  { id: 4, name: "express-rate-limiter-pro", imported_in: ["src/middleware/auth.ts"], exists: false, squatting_risk: 94, downloads_if_squatted: 0 },
  { id: 5, name: "lodash-deep-merge", imported_in: ["src/utils/object.ts", "src/services/data.ts"], exists: false, squatting_risk: 89, downloads_if_squatted: 0 },
];

const PROMPT_INJECTION_RISKS = [
  { id: 1, file: "src/routes/chat.ts", line: 47, pattern: "User input → LLM prompt (no sanitization)", severity: "critical", code: `const response = await openai.chat({ messages: [{ role: 'user', content: userInput }] });` },
  { id: 2, file: "src/agents/SupportAgent.ts", line: 112, pattern: "System prompt boundary missing", severity: "high", code: `const sysPrompt = "You are helpful. User says: " + userMessage;` },
  { id: 3, file: "src/api/summarize.ts", line: 23, pattern: "Unvalidated output used in downstream logic", severity: "medium", code: `const summary = await llm.summarize(article); db.save({ summary });` },
];

const AI_CODE_PATTERNS = [
  { id: 1, type: "Hardcoded API Key", file: "tests/ai-integration.test.js", line: 15, severity: "critical", code: `const API_KEY = "sk_test_51H..."; // AI-generated test file` },
  { id: 2, type: "Silent Exception Swallowing", file: "src/utils/aiErrorHandler.ts", line: 8, severity: "high", code: `try { await aiCall(); } catch (e) { /* AI forgot to handle this */ }` },
  { id: 3, type: "String Interpolation SQL", file: "src/db/userQueries.ts", line: 34, severity: "critical", code: `db.query("SELECT * FROM users WHERE id = " + userId);` },
  { id: 4, type: "Deprecated Crypto (MD5)", file: "src/utils/hash.ts", line: 5, severity: "high", code: `const hash = crypto.createHash('md5').update(data).digest('hex');` },
  { id: 5, type: "Non-existent Internal Module", file: "src/services/payment.ts", line: 12, severity: "medium", code: `import { processStripe } from '@internal/stripe-utils'; // Module doesn't exist` },
];

const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

function RiskGauge({ score }) {
  const r = 60, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ * 0.75;
  const color = score >= 80 ? "#ef4444" : score >= 60 ? "#f97316" : score >= 40 ? "#eab308" : "#22c55e";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke="#1F2937" strokeWidth={10} strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={circ * 0.125} strokeLinecap="round" />
        <circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={10} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ * 0.125} strokeLinecap="round" />
        <text x={70} y={75} textAnchor="middle" fill={color} fontSize={28} fontWeight="900">{score}</text>
        <text x={70} y={95} textAnchor="middle" fill="#6B7280" fontSize={9}>AI CODE RISK</text>
      </svg>
    </div>
  );
}

export default function VibeGuardPage() {
  const [tab, setTab] = useState("hallucinated");

  const aiFiles = 47;
  const hallucinated = HALLUCINATED_PACKAGES.filter(p => !p.exists).length;
  const promptRisks = PROMPT_INJECTION_RISKS.length;
  const aiRiskScore = 74;

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      {/* Hero Header */}
      <div className="fu rounded-2xl p-8 relative overflow-hidden" style={{ animationDelay: "60ms", background: "linear-gradient(135deg, #1a0520 0%, #2a0845 50%, #1a0520 100%)", border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 0 60px rgba(139,92,246,0.1)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #8b5cf6 0%, transparent 50%)" }} />
        <div className="relative flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: GOLD }}>BETA</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2" style={{ textShadow: "0 0 30px rgba(139,92,246,0.4)" }}>
              ShieldAI VibeGuard™
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              The world's first AI-generated code security scanner. 41% of all code is now AI-written. Traditional scanners can't keep up. VibeGuard was built for the AI coding era.
            </p>
          </div>
          <RiskGauge score={aiRiskScore} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="fu grid grid-cols-2 md:grid-cols-4 gap-4" style={{ animationDelay: "100ms" }}>
        {[
          { label: "AI-Written Files", value: aiFiles, color: "#8b5cf6", sub: "Detected via code patterns" },
          { label: "Hallucinated Packages", value: hallucinated, color: "#ef4444", sub: "Squatting risk" },
          { label: "Prompt Injection Risks", value: promptRisks, color: "#f97316", sub: "Unsanitized LLM calls" },
          { label: "AI Code Quality Issues", value: AI_CODE_PATTERNS.length, color: "#eab308", sub: "Common AI mistakes" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-5 border transition-all hover:scale-[1.02]" style={{ background: "#111827", borderColor: k.color + "33" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{k.label}</div>
            <div className="text-3xl font-black mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[10px] text-slate-500">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="fu flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#111827", animationDelay: "140ms" }}>
        {[
          { id: "hallucinated", label: "🎭 Hallucinated Packages", icon: Package },
          { id: "prompt", label: "💉 Prompt Injection", icon: Brain },
          { id: "patterns", label: "🤖 AI Code Patterns", icon: Code },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: tab === t.id ? GOLD : "transparent", color: tab === t.id ? "#0A0E1A" : "#9CA3AF" }}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Hallucinated Packages */}
      {tab === "hallucinated" && (
        <div className="fu rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "180ms" }}>
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "#1F2937" }}>
            <div>
              <h3 className="text-sm font-bold text-white">Hallucinated Package Detection</h3>
              <p className="text-xs text-slate-400 mt-0.5">Packages invented by AI that don't exist — squatting targets</p>
            </div>
            <button className="px-4 py-2 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>Scan All Repos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
                  {["Package Name", "Imported In", "Exists on Registry", "Squatting Risk", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HALLUCINATED_PACKAGES.map(pkg => (
                  <tr key={pkg.id} className="hover:bg-white/5" style={{ borderBottom: "1px solid #1F2937", borderLeft: pkg.exists ? "2px solid #22c55e" : "2px solid #ef4444" }}>
                    <td className="px-4 py-3">
                      <div className="font-mono text-white font-medium">{pkg.name}</div>
                      {!pkg.exists && <div className="text-[9px] text-red-400 mt-0.5">⚠️ Does NOT exist on npm/PyPI</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {pkg.imported_in.map((f, i) => (
                          <div key={i} className="flex items-center gap-1 text-[9px] text-slate-400">
                            <FileCode className="w-2.5 h-2.5" />{f}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {pkg.exists ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Yes ({pkg.downloads} downloads)</span>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-1"><X className="w-3.5 h-3.5" /> No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!pkg.exists ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pkg.squatting_risk}%`, background: "#ef4444" }} />
                          </div>
                          <span className="text-red-400 font-bold">{pkg.squatting_risk}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!pkg.exists && (
                        <button className="px-2.5 py-1 rounded-lg text-[9px] font-bold text-black" style={{ background: GOLD }}>Register Defensive</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prompt Injection */}
      {tab === "prompt" && (
        <div className="fu space-y-3" style={{ animationDelay: "180ms" }}>
          {PROMPT_INJECTION_RISKS.map(risk => (
            <div key={risk.id} className="rounded-xl border p-5" style={{ background: "#111827", borderLeft: `4px solid ${SEV_COLORS[risk.severity]}`, borderColor: "#1F2937" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase" style={{ background: SEV_COLORS[risk.severity] + "20", color: SEV_COLORS[risk.severity] }}>{risk.severity}</span>
                    <span className="text-sm font-bold text-white">{risk.pattern}</span>
                  </div>
                  <div className="text-xs text-slate-400 mb-3 flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5" />{risk.file}:{risk.line}
                  </div>
                  <pre className="text-[10px] font-mono p-3 rounded-lg overflow-x-auto" style={{ background: "#0d1220", color: "#a5f3fc" }}>{risk.code}</pre>
                </div>
                <div className="flex flex-col gap-2">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>Add Sanitization</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-bold border" style={{ borderColor: "#374151", color: "#9CA3AF" }}>Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Code Patterns */}
      {tab === "patterns" && (
        <div className="fu rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "180ms" }}>
          <div className="p-5 border-b" style={{ borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white">Common AI Coding Assistant Mistakes</h3>
            <p className="text-xs text-slate-400 mt-0.5">Patterns frequently generated by Copilot, Cursor, Claude Code</p>
          </div>
          <div className="space-y-2">
            {AI_CODE_PATTERNS.map(pattern => (
              <div key={pattern.id} className="p-4 border-b last:border-b-0 hover:bg-white/5" style={{ borderColor: "#1F2937" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black" style={{ background: SEV_COLORS[pattern.severity] + "20", color: SEV_COLORS[pattern.severity] }}>{pattern.type}</span>
                      <span className="text-[10px] text-slate-500">{pattern.file}:{pattern.line}</span>
                    </div>
                    <pre className="text-[10px] font-mono p-2 rounded bg-[#0d1220] text-slate-300 overflow-x-auto">{pattern.code}</pre>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-black flex-shrink-0" style={{ background: GOLD }}>Fix</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="fu text-center py-8" style={{ animationDelay: "220ms" }}>
        <p className="text-[10px] text-slate-600">
          VibeGuard™ is a ShieldAI innovation — protecting the AI-generated code revolution
        </p>
      </div>
    </div>
  );
}