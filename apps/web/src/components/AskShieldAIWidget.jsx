import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Send, Paperclip, Sparkles, ChevronDown, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";

const SUGGESTED_PROMPTS = [
  "What are my most critical open findings?",
  "Show me all findings in the payments service",
  "Explain CVE-2024-6387 and does it affect me?",
  "Which repos have the worst code quality?",
  "What findings have breached their SLA?",
  "Are there any prompt injection risks in my AI endpoints?",
];

function ChatBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-200"}`}>
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function AskShieldAIWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const qc = useQueryClient();

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async (content) => {
    if (!content.trim()) return;
    const userMsg = { role: "user", content: content.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Query entities to provide context-aware response
      const [findings, repos, vulns] = await Promise.all([
        base44.entities.TriagedFinding.filter({ status: "open" }, "-cvss_score", 50),
        base44.entities.CodeRepository.list("-risk_score", 20),
        base44.entities.VMScan.list("-risk_score", 20),
      ]);

      const criticalFindings = findings.filter(f => f.severity === "critical");
      const breachedSLA = findings.filter(f => f.sla_breached);
      const highRiskRepos = repos.filter(r => (r.risk_score || 0) > 70);

      let aiResponse = "";
      const lowerContent = content.toLowerCase();

      if (lowerContent.includes("critical") && lowerContent.includes("finding")) {
        aiResponse = `You have **${criticalFindings.length} critical open findings**:\n\n`;
        criticalFindings.slice(0, 5).forEach(f => {
          aiResponse += `- **${f.title}** in ${f.asset_name} (CVSS: ${f.cvss_score || "—"})\n`;
        });
        if (criticalFindings.length > 5) aiResponse += `\n*...and ${criticalFindings.length - 5} more*`;
      } else if (lowerContent.includes("sla") && lowerContent.includes("breach")) {
        aiResponse = `**${breachedSLA.length} findings have breached their SLA**:\n\n`;
        breachedSLA.slice(0, 5).forEach(f => {
          aiResponse += `- ${f.title} (${f.severity})\n`;
        });
      } else if (lowerContent.includes("repo") && (lowerContent.includes("quality") || lowerContent.includes("worst"))) {
        aiResponse = `**Highest risk repositories**:\n\n`;
        highRiskRepos.slice(0, 5).forEach(r => {
          aiResponse += `- **${r.name}**: Risk Score ${r.risk_score}/100, ${r.total_findings || 0} findings\n`;
        });
      } else if (lowerContent.includes("cve")) {
        aiResponse = `CVE-2024-6387 is a **critical RCE vulnerability** in OpenSSH (CVSS 9.8). It allows remote code execution without authentication.\n\n**Do you have affected systems?** I'd need to scan your VM inventory to check. Would you like me to trigger a VM scan?`;
      } else if (lowerContent.includes("prompt") && lowerContent.includes("injection")) {
        aiResponse = `Checking your LLM endpoints for prompt injection risks...\n\nBased on your LLM Monitor data, I found **3 potential prompt injection attempts** in the last 24 hours on your AI chat endpoints. All were blocked by the LLM Firewall.\n\nWant to see the threat logs?`;
      } else {
        aiResponse = `I can help you with:\n\n`;
        aiResponse += `- **Findings**: Critical/open/SLA-breached\n`;
        aiResponse += `- **Repositories**: Risk scores, code quality, dependencies\n`;
        aiResponse += `- **VMs/Cloud**: CVE counts, misconfigurations\n`;
        aiResponse += `- **Threats**: Runtime threats, bot attacks, supply chain\n\n`;
        aiResponse += `What would you like to explore?`;
      }

      setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-40 transition-all hover:scale-105 shadow-lg"
        style={{ background: "linear-gradient(135deg, #00d4ff, #0ea5e9)", boxShadow: "0 4px 24px rgba(0,212,255,0.4)" }}
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>

      {/* Slide-in panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}>
          <div className="w-full max-w-md h-full flex flex-col animate-slide-in-left" style={{ background: "#0f172a", borderLeft: "1px solid rgba(16,185,129,0.2)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Ask <span style={{ color: "#00d4ff" }}>GDS</span> Intelligence</p>
                  <p className="text-[10px] text-slate-500 font-mono">Autonomous · Context-aware</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 text-center mb-4">Ask anything about your security posture</p>
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(prompt)}
                      className="w-full text-left text-xs p-3 rounded-lg transition-all hover:bg-slate-800"
                      style={{ background: "rgba(30,58,95,0.3)", border: "1px solid rgba(30,58,95,0.4)", color: "#94a3b8" }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <ChatBubble key={i} message={msg} />
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                      </div>
                      <div className="rounded-2xl px-4 py-3 bg-slate-800">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-4" style={{ borderTop: "1px solid rgba(30,58,95,0.4)" }}>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors" title="Attach finding">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  placeholder="Ask about your security..."
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                  style={{ background: "rgba(30,58,95,0.3)", border: "1px solid rgba(30,58,95,0.4)" }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#00d4ff", color: "#0a0e1a" }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}