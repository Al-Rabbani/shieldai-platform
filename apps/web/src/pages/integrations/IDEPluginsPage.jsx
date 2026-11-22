import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Code2, Shield, Search, Package, Terminal, Download, 
  CheckCircle2, ExternalLink, ChevronRight, Laptop,
  Zap, Lock, FileJson, AlertTriangle, Globe, Server
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const IDE_DATA = [
  {
    name: "VS Code",
    icon: "🟦",
    status: "Most Popular",
    statusColor: "#10b981",
    install: "Install from VS Code Marketplace",
    url: "https://marketplace.visualstudio.com/items?itemName=shieldai.shieldai",
    features: ["SAST", "Secrets", "SCA", "AutoFix", "Full Workspace Scan", "IaC"],
    popular: true,
  },
  {
    name: "JetBrains",
    icon: "⚫",
    status: "Full Support",
    statusColor: "#10b981",
    install: "Install from JetBrains Marketplace",
    url: "https://plugins.jetbrains.com/plugin/shieldai",
    features: ["IntelliJ", "GoLand", "PyCharm", "WebStorm", "PhpStorm", "Rider", "RubyMine", "RustRover", "Android Studio"],
  },
  {
    name: "Cursor IDE",
    icon: "🔵",
    status: "AI-Native + MCP",
    statusColor: "#10b981",
    install: "Install Cursor Extension",
    url: "https://cursor.sh/extensions/shieldai",
    features: ["SAST", "Secrets", "SCA", "MCP Integration", "AI Chat"],
    note: "Includes MCP integration — ask ShieldAI from Cursor chat",
  },
  {
    name: "Windsurf IDE",
    icon: "🌊",
    status: "Supported",
    statusColor: "#10b981",
    install: "Install Windsurf Extension",
    url: "https://windsurf.ai/extensions/shieldai",
    features: ["SAST", "Secrets", "SCA", "AutoFix"],
  },
  {
    name: "Visual Studio",
    icon: "🟣",
    status: "Supported",
    statusColor: "#10b981",
    install: "Install from Visual Studio Marketplace",
    url: "https://marketplace.visualstudio.com/items?itemName=ShieldAI.ShieldAIVS",
    features: [".NET", "C#", "VB.NET", "SAST", "SCA"],
  },
  {
    name: "Eclipse IDE",
    icon: "🟠",
    status: "Supported — IaC",
    statusColor: "#10b981",
    install: "Install Eclipse Plugin",
    url: "https://marketplace.eclipse.org/content/shieldai",
    features: ["Java", "IaC Scanning", "SAST"],
  },
  {
    name: "Kiro IDE",
    icon: "🔷",
    status: "New",
    statusColor: "#3b82f6",
    install: "Install Kiro Extension",
    url: "https://kiro.dev/extensions/shieldai",
    features: ["SAST", "Secrets", "SCA"],
    badge: "NEW",
  },
  {
    name: "Google Antigravity",
    icon: "🌈",
    status: "New",
    statusColor: "#3b82f6",
    install: "Install Antigravity Extension",
    url: "https://antigravity.google.dev/extensions/shieldai",
    features: ["SAST", "Secrets", "SCA", "AutoFix"],
    badge: "NEW",
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Real-Time Code Scanning",
    desc: "SAST + secrets scanning as you type, inline red squiggles",
    color: "#ef4444",
  },
  {
    icon: Search,
    title: "Full Workspace Scan",
    desc: "Scan your entire project at once, see all findings in one view",
    color: "#3b82f6",
  },
  {
    icon: Package,
    title: "SCA in IDE",
    desc: "Vulnerable dependency warnings in package.json/requirements.txt as you edit",
    color: "#f59e0b",
  },
  {
    icon: Shield,
    title: "Expansion Packs",
    desc: "Safe Chain (malicious package blocking) + Secrets pre-commit hook installed alongside the IDE plugin",
    color: "#10b981",
  },
];

export default function IDEPluginsPage() {
  return (
    <div className="p-6 space-y-8 min-h-screen" style={{ background: "#030712" }}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Laptop className="w-5 h-5 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">ShieldAI IDE Plugins</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Security scanning directly in your editor. Catch issues at the moment they're introduced — before any commit, PR, or deploy.
        </p>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-sm font-bold text-white mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <f.icon className="w-6 h-6 mb-3" style={{ color: f.color }} />
              <h3 className="text-xs font-bold text-white mb-2">{f.title}</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* IDE Grid */}
      <div>
        <h2 className="text-sm font-bold text-white mb-4">Supported IDEs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {IDE_DATA.map((ide, i) => (
            <div key={i} className="rounded-xl p-5 flex flex-col gap-3" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ide.icon}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{ide.name}</h3>
                    {ide.badge && (
                      <Badge className="text-[9px] mt-1" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                        {ide.badge}
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-medium" style={{ color: ide.statusColor }}>
                  {ide.status}
                </span>
              </div>

              {ide.features && (
                <div className="flex flex-wrap gap-1">
                  {ide.features.slice(0, 4).map((feat, idx) => (
                    <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
                      {feat}
                    </span>
                  ))}
                  {ide.features.length > 4 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
                      +{ide.features.length - 4}
                    </span>
                  )}
                </div>
              )}

              {ide.note && (
                <p className="text-[10px] text-slate-500">{ide.note}</p>
              )}

              <a
                href={ide.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto"
              >
                <Button size="sm" className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-500">
                  <Download className="w-3 h-3 mr-1.5" /> {ide.install}
                </Button>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* MDM Deployment */}
      <div className="rounded-xl p-6" style={{ background: "linear-gradient(135deg, #0f172a, #0a0f1e)", border: "1px solid rgba(59,130,246,0.3)" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-sm font-bold text-white mb-2">Enterprise MDM Deployment</h2>
            <p className="text-xs text-slate-500">
              Deploy ShieldAI IDE plugins silently across your entire engineering org via MDM.
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs border-slate-700">
            <Download className="w-3 h-3 mr-1.5" /> Download MDM Config
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {[
            { step: 1, title: "Download Config", desc: "Get the MDM configuration package" },
            { step: 2, title: "Deploy via MDM", desc: "Push via Jamf / Intune / Kandji" },
            { step: 3, title: "Auto-Install", desc: "Plugin appears pre-installed for all engineers" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "#3b82f6" }}>
                {item.step}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{item.title}</p>
                <p className="text-[10px] text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="pt-4 flex items-center gap-3 flex-wrap" style={{ borderTop: "1px solid rgba(30,58,95,0.3)" }}>
        <span className="text-[10px] text-slate-600 font-mono">RELATED:</span>
        <Link to="/integrations" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          ← All Integrations
        </Link>
        <Link to="/settings/webhooks" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          🔌 Webhooks
        </Link>
        <Link to="/guides" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          📖 Workflows & Guides
        </Link>
      </div>
    </div>
  );
}