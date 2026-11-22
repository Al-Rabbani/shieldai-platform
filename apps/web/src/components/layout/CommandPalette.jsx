import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, LayoutDashboard, Shield, Cloud, Target, Eye, Fish, Monitor, Bot, BookOpen, Settings, Plug, Network, UserCheck, Database, Brain, Workflow } from "lucide-react";

const PAGES = [
  { label: "Executive Dashboard", path: "/executive-dashboard", icon: LayoutDashboard },
  { label: "Code Security", path: "/code", icon: Shield },
  { label: "Cloud Security", path: "/cloud", icon: Cloud },
  { label: "Attack Surface", path: "/attack/surface", icon: Target },
  { label: "IOC Radar", path: "/ioc-radar", icon: Target },
  { label: "Dark Web Monitor", path: "/dark-web", icon: Eye },
  { label: "Phishing Monitor", path: "/phishing-monitor", icon: Fish },
  { label: "Device Agents", path: "/device-agents", icon: Monitor },
  { label: "LLM Security", path: "/llm-security", icon: Bot },
  { label: "Identity Intelligence", path: "/identity-intelligence", icon: Eye },
  { label: "Threat Actors", path: "/threat-actors", icon: Shield },
  { label: "Ransomware Tracker", path: "/ransomware-tracker", icon: Shield },
  { label: "Geo Threat Map", path: "/geo-threat-map", icon: Target },
  { label: "AI Agent Console", path: "/ai-agents", icon: Bot },
  { label: "Integrations Hub", path: "/integrations", icon: Plug },
  { label: "Audit Log", path: "/audit-log", icon: BookOpen },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "AutoTriage", path: "/autotriage", icon: Shield },
  { label: "Compliance", path: "/governance/compliance", icon: Shield },
  { label: "Security Graph", path: "/security-graph", icon: Network },
  { label: "CIEM — Cloud Identity", path: "/ciem", icon: UserCheck },
  { label: "DSPM — Data Security", path: "/dspm", icon: Database },
  { label: "AI-SPM — AI Security", path: "/ai-spm", icon: Brain },
  { label: "Workflow Automation", path: "/workflows", icon: Workflow },
  { label: "Code-to-Cloud Correlation", path: "/code-to-cloud", icon: Shield },
  { label: "Custom Rules Engine", path: "/custom-rules", icon: Shield },
  { label: "Secrets Monitor", path: "/secrets-monitor", icon: Shield },
  { label: "CI/CD Pipeline Security", path: "/cicd-security", icon: Shield },
  { label: "Financial Risk Quantification", path: "/risk-quantification", icon: Shield },
  { label: "MCP / Agentic AI Security", path: "/mcp-security", icon: Shield },
  { label: "Zero-Day Package Protection", path: "/zero-day-protection", icon: Shield },
  { label: "Regulatory Intelligence", path: "/regulatory-intelligence", icon: Shield },
  { label: "Threat Hunting Console", path: "/threat-hunting", icon: Shield },
  { label: "Security Program Maturity", path: "/security-maturity", icon: Shield },
  { label: "Hardened Container Images", path: "/hardened-images", icon: Shield },
  { label: "Compliance Evidence Hub", path: "/compliance-evidence", icon: Shield },
  { label: "Breaking Changes Analysis", path: "/breaking-changes", icon: Shield },
  { label: "Pentest on Deploy", path: "/pentest-on-deploy", icon: Shield },
  { label: "Landing Page", path: "/landing", icon: Shield },
  { label: "Pricing & Plans", path: "/pricing", icon: Shield },
  { label: "Documentation", path: "/docs", icon: Shield },
  { label: "Alert Center", path: "/alerts", icon: Shield },
  { label: "Welcome & Setup", path: "/welcome", icon: Shield },
  { label: "Platform Analytics", path: "/platform-analytics", icon: Shield },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = PAGES.filter(p => p.label.toLowerCase().includes(query.toLowerCase()));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: "#111827", borderColor: "#374151" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "#1F2937" }}>
          <Search className="w-4 h-4 text-slate-400" />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search pages and actions..."
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none" />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded font-mono text-slate-500" style={{ background: "#1F2937" }}>ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.map(page => (
            <button key={page.path}
              onClick={() => { navigate(page.path); setOpen(false); setQuery(""); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors">
              <page.icon className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-200">{page.label}</span>
              <span className="ml-auto text-xs text-slate-600 font-mono">{page.path}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">No results for "{query}"</div>
          )}
        </div>
        <div className="px-4 py-2 border-t flex items-center gap-4 text-[10px] text-slate-600" style={{ borderColor: "#1F2937" }}>
          <span><kbd className="font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="font-mono">↵</kbd> Select</span>
          <span><kbd className="font-mono">Ctrl+K</kbd> Toggle</span>
        </div>
      </div>
    </div>
  );
}