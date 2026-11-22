import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Bot, MessageSquare, TrendingUp, AlertCircle, Database, Cloud, Lock, FileText, ExternalLink, Search, Mic, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const GOLD = "#C9A84C";
const SEVERITY_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", safe: "#22c55e" };

const SUGGESTED_QUESTIONS = [
  "What are my most critical findings right now?",
  "Which cloud accounts have the highest risk?",
  "Show me all internet-facing services with critical vulnerabilities",
  "What would an attacker target first in my environment?",
  "Which developer introduced the most critical findings this month?",
  "Am I compliant with SOC2 right now?",
  "What's my biggest threat this week?",
  "Which findings have breached their SLA?",
];

export default function ShieldAIAnalystPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const { data: findings = [] } = useQuery({
    queryKey: ["triaged-findings"],
    queryFn: () => base44.entities.TriagedFinding.list(),
  });

  const { data: cloudAccounts = [] } = useQuery({
    queryKey: ["cloud-accounts"],
    queryFn: () => base44.entities.CloudAccount.list(),
  });

  const { data: securityGraph = [] } = useQuery({
    queryKey: ["security-graph"],
    queryFn: () => base44.entities.SecurityGraph.list(),
  });

  const { data: compliance = [] } = useQuery({
    queryKey: ["compliance-frameworks"],
    queryFn: () => base44.entities.ComplianceFramework.list(),
  });

  const { data: threatIntel = [] } = useQuery({
    queryKey: ["threat-intel"],
    queryFn: () => base44.entities.ThreatIntelFeed.list(),
  });

  const criticalFindings = findings.filter(f => f.normalized_severity === "critical" && f.status !== "fixed");
  const highRiskCloud = cloudAccounts.filter(a => (a.risk_score || 0) > 70);
  const internetFacing = securityGraph.filter(n => n.is_internet_facing && (n.risk_level === "critical" || n.risk_level === "high"));

  const askAnalyst = async (question) => {
    setIsThinking(true);
    const userMessage = { role: "user", content: question, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response based on real entity data
    setTimeout(() => {
      let answer = "";
      let results = null;

      if (question.toLowerCase().includes("critical findings")) {
        answer = `I found ${criticalFindings.length} critical findings that need immediate attention. The top priorities are ${criticalFindings.slice(0, 3).map(f => f.title).join(", ")}. These have an average CVSS score of ${(criticalFindings.reduce((sum, f) => sum + (f.cvss_score || 0), 0) / criticalFindings.length || 0).toFixed(1)}.`;
        results = { type: "findings", data: criticalFindings.slice(0, 10) };
      } else if (question.toLowerCase().includes("cloud")) {
        answer = `${highRiskCloud.length} cloud accounts have elevated risk scores above 70. ${cloudAccounts.filter(a => a.provider === "aws").length} are AWS, ${cloudAccounts.filter(a => a.provider === "azure").length} Azure, and ${cloudAccounts.filter(a => a.provider === "gcp").length} GCP. The highest risk account is ${highRiskCloud[0]?.account_name || "N/A"} with a score of ${highRiskCloud[0]?.risk_score || 0}.`;
        results = { type: "cloud", data: highRiskCloud };
      } else if (question.toLowerCase().includes("internet-facing") || question.toLowerCase().includes("attacker target")) {
        answer = `${internetFacing.length} internet-facing assets are at critical or high risk. These are your most likely attacker targets. I recommend immediate review of ${internetFacing.slice(0, 3).map(n => n.node_name).join(", ")}.`;
        results = { type: "graph", data: internetFacing };
      } else if (question.toLowerCase().includes("soc2") || question.toLowerCase().includes("compliant")) {
        const soc2 = compliance.find(f => f.name === "SOC2");
        if (soc2) {
          answer = `Your SOC2 compliance score is ${soc2.overall_score || 0}%. ${soc2.controls_passing || 0} controls are passing, but ${soc2.controls_failing || 0} controls are failing. Focus on the failing controls to achieve compliance.`;
          results = { type: "compliance", data: soc2 };
        } else {
          answer = "SOC2 compliance monitoring is not yet configured. Connect your compliance framework to enable this analysis.";
        }
      } else if (question.toLowerCase().includes("threat") || question.toLowerCase().includes("week")) {
        const recentThreats = threatIntel.filter(t => {
          const created = new Date(t.created_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return created >= weekAgo;
        });
        answer = `${recentThreats.length} new threats were detected this week. The most severe is ${recentThreats[0]?.title || "N/A"} with ${recentThreats.filter(t => t.severity === "critical").length} critical severity threats affecting your environment.`;
        results = { type: "threats", data: recentThreats.slice(0, 10) };
      } else if (question.toLowerCase().includes("sla") || question.toLowerCase().includes("breached")) {
        const breached = findings.filter(f => f.sla_breached && f.status !== "fixed");
        answer = `${breached.length} findings have breached their SLA deadlines. This is a critical governance issue. The oldest breached finding is ${breached[0]?.title || "N/A"}, which is ${(new Date() - new Date(breached[0]?.due_date)) / (1000 * 60 * 60 * 24) | 0} days overdue.`;
        results = { type: "findings", data: breached };
      } else {
        answer = "I can help you analyze your security posture. Try asking about critical findings, cloud risk, compliance status, or threat intelligence. Use / commands for specific queries.";
      }

      const aiMessage = { role: "assistant", content: answer, results, timestamp: new Date() };
      setMessages(prev => [...prev, aiMessage]);
      setIsThinking(false);
    }, 1500);
  };

  const handleAsk = () => {
    if (input.trim()) {
      askAnalyst(input);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex">
      {/* Left Panel - Conversation */}
      <div className="w-2/5 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              <Bot className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">GDS Analyst 🤖</h1>
              <p className="text-xs text-slate-400">Powered by your security data</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <div className="text-white font-medium mb-2">Ask me anything about your security</div>
              <div className="text-slate-400 text-sm mb-6">I have access to all your findings, cloud accounts, compliance status, and threat intelligence</div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === "user" ? "bg-[#C9A84C] text-black" : "bg-[#111827] border border-slate-700 text-white"}`}>
                  <p className="text-sm">{msg.content}</p>
                  <div className="text-xs mt-2 opacity-60">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))
          )}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-[#111827] border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="text-xs">Analyzing your security data...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-slate-400">Suggested:</span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                <button key={i} onClick={() => askAnalyst(q)} className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleAsk()} placeholder="Ask about your security posture..." className="flex-1 bg-slate-800 border-slate-700 text-white" />
            <Button onClick={handleAsk} className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <Mic className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Results */}
      <div className="flex-1 p-6 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <div className="text-white font-medium mb-2">Results will appear here</div>
              <div className="text-slate-400 text-sm">Ask a question to see data visualizations and insights</div>
            </div>
          </div>
        ) : (
          messages.filter(m => m.results).slice(-1).map((msg, idx) => (
            <div key={idx} className="space-y-6">
              <Card className="bg-[#111827] border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Analysis Results</h3>
                  {msg.results.type === "findings" && (
                    <div className="space-y-2">
                      {msg.results.data.map((finding, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                          <div>
                            <div className="text-sm font-semibold text-white">{finding.title}</div>
                            <div className="text-xs text-slate-400">{finding.asset_name || "Unknown asset"} • CVSS {finding.cvss_score || 0}</div>
                          </div>
                          <Badge style={{ background: `${SEVERITY_COLORS[finding.normalized_severity || "medium"]}20`, color: SEVERITY_COLORS[finding.normalized_severity || "medium"] }}>
                            {finding.normalized_severity || "medium"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.results.type === "cloud" && (
                    <div className="grid grid-cols-2 gap-4">
                      {msg.results.data.map((account, i) => (
                        <div key={i} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                          <div className="text-sm font-semibold text-white mb-1">{account.account_name}</div>
                          <div className="text-xs text-slate-400 mb-2">{account.provider} • {account.region}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Risk:</span>
                            <Badge style={{ background: account.risk_score > 70 ? `${SEVERITY_COLORS.critical}20` : `${SEVERITY_COLORS.medium}20`, color: account.risk_score > 70 ? SEVERITY_COLORS.critical : SEVERITY_COLORS.medium }}>
                              {account.risk_score || 0}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.results.type === "threats" && (
                    <div className="space-y-2">
                      {msg.results.data.map((threat, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                          <AlertCircle className="w-5 h-5" style={{ color: SEVERITY_COLORS[threat.severity || "medium"] }} />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-white">{threat.title}</div>
                            <div className="text-xs text-slate-400">Detected {new Date(threat.created_date).toLocaleDateString()}</div>
                          </div>
                          <Badge style={{ background: `${SEVERITY_COLORS[threat.severity || "medium"]}20`, color: SEVERITY_COLORS[threat.severity || "medium"] }}>
                            {threat.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}