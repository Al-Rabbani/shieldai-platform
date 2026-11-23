import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, GitBranch, AlertTriangle, CheckCircle2, ChevronRight, Terminal, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const REACHABILITY_DATA = [
  {
    cve: "CVE-2024-1234",
    package: "lodash",
    version: "4.17.20",
    finding: "Prototype Pollution",
    severity: "high",
    status: "reachable",
    hops: 3,
    entryPoint: "POST /api/users",
    sink: "_.merge()",
  },
  {
    cve: "CVE-2024-5678",
    package: "axios",
    version: "0.21.1",
    finding: "SSRF",
    severity: "critical",
    status: "not_reachable",
    hops: 0,
    reason: "Vulnerable function never called in production",
  },
  {
    cve: "CVE-2024-9012",
    package: "express",
    version: "4.17.1",
    finding: "Path Traversal",
    severity: "medium",
    status: "unknown",
    hops: -1,
  },
];

const CALL_GRAPH = {
  reachable: [
    { type: "entry", label: "HTTP Request: POST /api/users", code: "app.post('/api/users', userController.create)" },
    { type: "function", label: "userController.create()", code: "async function create(req, res) { const data = req.body; ..." },
    { type: "data_flow", label: "Untrusted data: req.body", code: "const userData = req.body;" },
    { type: "sink", label: "_.merge(userData)", code: "const merged = _.merge({}, defaults, userData);", vulnerable: true },
  ],
};

export default function ReachabilityPage() {
  const [selectedFinding, setSelectedFinding] = useState(REACHABILITY_DATA[0]);
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(false);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = REACHABILITY_DATA.filter(f => {
    if (filter === "all") return true;
    return f.status === filter;
  });

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#030712" }}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-5 h-5 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Reachability Analysis</h1>
        </div>
        <p className="text-slate-500 text-sm">
          See exactly how a vulnerability is reachable in your codebase — the full execution path from HTTP request to vulnerable function.
        </p>
      </div>

      {/* Concept Explainer */}
      <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <h3 className="text-sm font-bold text-white mb-3">3 Types of Reachability</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              type: "Dependency-Level",
              desc: "Does your code ever call the vulnerable symbol?",
              icon: GitBranch,
              color: "#3b82f6",
            },
            {
              type: "Function-Level",
              desc: "Can untrusted input flow into the dangerous sink?",
              icon: AlertTriangle,
              color: "#f59e0b",
            },
            {
              type: "Contextual (Runtime)",
              desc: "Is this code actually in your production build?",
              icon: CheckCircle2,
              color: "#10b981",
            },
          ].map((item, i) => (
            <div key={i} className="rounded-lg p-4" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.3)" }}>
              <item.icon className="w-5 h-5 mb-3" style={{ color: item.color }} />
              <h4 className="text-xs font-bold text-white mb-2">{item.type}</h4>
              <p className="text-[11px] text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Find reachability for a finding or CVE..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-1">
          {[
            { key: "all", label: "All" },
            { key: "reachable", label: "Reachable" },
            { key: "not_reachable", label: "Not Reachable" },
            { key: "unknown", label: "Unknown" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filter === f.key
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Findings List */}
        <div className="lg:col-span-1 space-y-3">
          {filtered.map((f, i) => (
            <div
              key={i}
              onClick={() => setSelectedFinding(f)}
              className={`rounded-xl p-4 cursor-pointer transition-all ${
                selectedFinding.cve === f.cve
                  ? "border-blue-500 bg-blue-500/5"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              }`}
              style={{ border: "1px solid" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-mono text-white font-bold">{f.cve}</p>
                  <p className="text-[10px] text-slate-500">{f.package}@{f.version}</p>
                </div>
                <Badge className="text-[9px]" style={{
                  background: f.severity === "critical" ? "rgba(239,68,68,0.15)" :
                    f.severity === "high" ? "rgba(249,115,22,0.15)" : "rgba(234,179,8,0.15)",
                  color: f.severity === "critical" ? "#ef4444" :
                    f.severity === "high" ? "#f97316" : "#eab308",
                }}>
                  {f.severity}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mb-2">{f.finding}</p>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  f.status === "reachable" ? "bg-red-500/10 text-red-400" :
                    f.status === "not_reachable" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"
                }`}>
                  {f.status === "reachable" ? "🔴 Reachable" : f.status === "not_reachable" ? "🟢 Not Reachable" : "⚪ Unknown"}
                </span>
                {f.hops > 0 && (
                  <span className="text-[10px] text-slate-500">{f.hops} hops</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Call Graph Visualization */}
        <div className="lg:col-span-2">
          <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Call Graph</h3>
              <Badge className="text-[10px]" style={{
                background: selectedFinding.status === "reachable" ? "rgba(239,68,68,0.15)" :
                  selectedFinding.status === "not_reachable" ? "rgba(16,185,129,0.15)" : "rgba(107,114,128,0.15)",
                color: selectedFinding.status === "reachable" ? "#ef4444" :
                  selectedFinding.status === "not_reachable" ? "#10b981" : "#6b7280",
              }}>
                {selectedFinding.status === "reachable" ? "REACHABLE" : selectedFinding.status === "not_reachable" ? "NOT REACHABLE" : "UNKNOWN"}
              </Badge>
            </div>

            {/* Reachability Verdict Banner */}
            <div className={`rounded-lg p-4 mb-4 ${
              selectedFinding.status === "reachable" ? "bg-red-500/10 border border-red-500/30" :
                selectedFinding.status === "not_reachable" ? "bg-emerald-500/10 border border-emerald-500/30" :
                  "bg-slate-700/10 border border-slate-700/30"
            }`}>
              <p className={`text-xs font-semibold ${
                selectedFinding.status === "reachable" ? "text-red-400" :
                  selectedFinding.status === "not_reachable" ? "text-emerald-400" : "text-slate-400"
              }`}>
                {selectedFinding.status === "reachable" && "🔴 REACHABLE — Untrusted data flows from HTTP input to SQL sink through 3 hops"}
                {selectedFinding.status === "not_reachable" && "🟢 NOT REACHABLE — Vulnerable function is never called in production code path"}
                {selectedFinding.status === "unknown" && "⚪ UNKNOWN — Insufficient data to determine reachability"}
              </p>
            </div>

            {/* Call Graph Nodes */}
            {selectedFinding.status === "reachable" && (
              <div className="space-y-3">
                {CALL_GRAPH.reachable.map((node, i) => (
                  <React.Fragment key={i}>
                    <div className={`rounded-lg p-3 border ${
                      node.type === "entry" ? "bg-blue-500/10 border-blue-500/30" :
                        node.type === "function" ? "bg-slate-800/50 border-slate-700/50" :
                          node.type === "data_flow" ? "bg-amber-500/10 border-amber-500/30" :
                            "bg-red-500/10 border-red-500/30"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase ${
                          node.type === "entry" ? "text-blue-400" :
                            node.type === "function" ? "text-slate-400" :
                              node.type === "data_flow" ? "text-amber-400" : "text-red-400"
                        }`}>
                          {node.type === "entry" ? "Entry Point" : node.type === "function" ? "Function Call" : node.type === "data_flow" ? "Data Flow" : "🔴 Sink"}
                        </span>
                        <button onClick={() => copyCode(node.code)} className="text-slate-500 hover:text-white">
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-xs font-mono text-white mb-1">{node.label}</p>
                      <pre className="text-[10px] font-mono text-slate-400 bg-black/30 p-2 rounded overflow-x-auto">
                        {node.code}
                      </pre>
                    </div>
                    {i < CALL_GRAPH.reachable.length - 1 && (
                      <div className="flex items-center justify-center">
                        <div className="w-0.5 h-6 bg-slate-700" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {selectedFinding.status === "not_reachable" && (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm text-emerald-400 font-semibold">This vulnerability is not reachable</p>
                <p className="text-xs text-slate-500 mt-2">{selectedFinding.reason}</p>
              </div>
            )}

            {selectedFinding.status === "unknown" && (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-semibold">Reachability unknown</p>
                <p className="text-xs text-slate-500 mt-2">Run a local scan to determine reachability</p>
                <Button size="sm" variant="outline" className="mt-4 h-8 text-xs border-slate-700">
                  <Terminal className="w-3 h-3 mr-1.5" /> Run Local Scan
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="pt-4 flex items-center gap-3 flex-wrap" style={{ borderTop: "1px solid rgba(30,58,95,0.3)" }}>
        <span className="text-[10px] text-slate-600 font-mono">RELATED:</span>
        <Link to="/code" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          ← Code Security
        </Link>
        <Link to="/code/findings" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          All Findings
        </Link>
        <Link to="/code/sast" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          SAST
        </Link>
      </div>
    </div>
  );
}