import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, RefreshCw, Sparkles, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MUTED,
  SevBadge, Card, Breadcrumb, PAGE_BG
} from "@/components/gds/GDSOSShared";

const SUGGESTIONS = [
  "What are my riskiest packages?",
  "Which cloud findings should I fix first?",
  "What's my GDPR compliance exposure?",
  "Are any of my CVEs actively exploited?",
  "What's my overall security grade?",
  "How many SLA breaches do I have?",
  "Show me my autofix opportunities",
];

function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  const findings = msg.top_findings || [];
  const sd = msg.supporting_data;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
        style={{ background: isUser ? `${CYAN}20` : "rgba(139,92,246,0.2)", border: `1px solid ${isUser ? CYAN + "40" : "#8b5cf640"}` }}>
        {isUser ? <User className="w-3.5 h-3.5" style={{ color: CYAN }} /> : <Bot className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />}
      </div>
      <div className={`max-w-[80%] space-y-2 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className="rounded-2xl px-4 py-3"
          style={{ background: isUser ? `${CYAN}15` : CARD, border: `1px solid ${isUser ? CYAN + "30" : BORDER}` }}>
          {msg.intent && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full mb-2 inline-block uppercase"
              style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)" }}>{msg.intent}</span>
          )}
          {isUser
            ? <p className="text-sm text-white">{msg.content}</p>
            : <div className="text-sm text-white prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>}
        </div>
        {sd && (
          <div className="flex gap-2 flex-wrap">
            {sd.findings_analyzed != null && <div className="px-3 py-1.5 rounded-lg text-center" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}><p className="text-[9px]" style={{ color: MUTED }}>Analyzed</p><p className="text-base font-black font-mono" style={{ color: CYAN }}>{sd.findings_analyzed}</p></div>}
            {sd.critical != null && <div className="px-3 py-1.5 rounded-lg text-center" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}20` }}><p className="text-[9px]" style={{ color: MUTED }}>Critical</p><p className="text-base font-black font-mono" style={{ color: DANGER }}>{sd.critical}</p></div>}
          </div>
        )}
        {findings.length > 0 && (
          <div className="w-full rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            <table className="w-full">
              <thead><tr style={{ background: "#050e1f" }}>
                {["Title","Sev","CVE","AutoFix"].map(h => <th key={h} className="px-3 py-1.5 text-left text-[9px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {findings.slice(0, 5).map((f, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <td className="px-3 py-1.5 text-[10px] text-white max-w-[140px] truncate">{f.title}</td>
                    <td className="px-3 py-1.5"><SevBadge sev={f.severity} /></td>
                    <td className="px-3 py-1.5 text-[9px] font-mono" style={{ color: HIGH }}>{f.cve_id || "—"}</td>
                    <td className="px-3 py-1.5 text-center text-[9px] font-black" style={{ color: f.autofix_available ? "#00ff88" : MUTED }}>{f.autofix_available ? "YES" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GDSAICopilotPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    base44.functions.invoke("gdsAISecurityCopilot", { action: "summarize" })
      .then(r => {
        if (r.data) setMessages([{ role: "assistant", content: r.data.summary || r.data.answer || "Welcome! Ask me anything about your security posture.", intent: r.data.intent_detected, supporting_data: r.data.supporting_data, top_findings: r.data.top_findings }]);
      })
      .catch(() => setMessages([{ role: "assistant", content: "Welcome to the GDS OS AI Security Copilot. Ask me anything about your security posture." }]))
      .finally(() => setInitializing(false));
  }, []);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const r = await base44.functions.invoke("gdsAISecurityCopilot", { action: "query", question: q });
      const d = r.data || {};
      setMessages(m => [...m, { role: "assistant", content: d.answer || d.response || d.summary || "I couldn't find a clear answer. Try rephrasing.", intent: d.intent_detected, supporting_data: d.supporting_data, top_findings: d.top_findings }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: `Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  const quickAction = async (action) => {
    setLoading(true);
    try {
      const r = await base44.functions.invoke("gdsAISecurityCopilot", { action });
      const d = r.data || {};
      const label = action === "summarize" ? "Security Summary" : "Recommendations";
      const content = action === "recommend"
        ? (d.recommendations || []).map((rec, i) => `${i + 1}. ${typeof rec === "string" ? rec : rec.text || rec.recommendation}`).join("\n\n") || d.answer || "No recommendations."
        : d.summary || d.answer || "Done.";
      setMessages(m => [...m, { role: "assistant", content: `**${label}**\n\n${content}`, intent: d.intent_detected, supporting_data: d.supporting_data, top_findings: d.top_findings }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: `Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ ...PAGE_BG, display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", gap: 0 }}>
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <Breadcrumb items={[{ label: "AI Security Copilot" }]} />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)" }}>
            <Sparkles className="w-5 h-5" style={{ color: "#8b5cf6" }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">AI Security Copilot</h1>
            <p className="text-xs" style={{ color: MUTED }}>Ask anything about your security posture</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4" style={{ scrollbarWidth: "thin" }}>
        {initializing
          ? <div className="flex items-center gap-3 p-4"><RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#8b5cf6" }} /><span className="text-sm" style={{ color: MUTED }}>Loading your security posture…</span></div>
          : messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)" }}>
              <Bot className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
            </div>
            <div className="px-4 py-3 rounded-2xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex gap-1 items-center">
                {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#8b5cf6", animationDelay: `${i * 200}ms` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 px-6 pb-2 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => quickAction("summarize")} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6" }}>
            <Sparkles className="w-3 h-3" /> Summarize Everything
          </button>
          <button onClick={() => quickAction("recommend")} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50" style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <Sparkles className="w-3 h-3" /> Get Recommendations
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} disabled={loading} className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:opacity-80 disabled:opacity-50" style={{ background: `${CYAN}08`, border: `1px solid ${BORDER}`, color: MUTED }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 px-6 pb-6">
        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask a security question…" disabled={loading || initializing}
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-600" />
          <button onClick={() => send()} disabled={loading || !input.trim() || initializing}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)" }}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#8b5cf6" }} /> : <Send className="w-4 h-4" style={{ color: "#8b5cf6" }} />}
          </button>
        </div>
      </div>
    </div>
  );
}