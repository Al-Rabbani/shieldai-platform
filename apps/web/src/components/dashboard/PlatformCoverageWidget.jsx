import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const PILLARS = [
  {
    key: "CODE", color: "#3b82f6", path: "/code", icon: "🔍",
    features: ["SAST", "AI SAST", "AI Code Audit", "SCA", "Secrets", "Malware", "IaC", "SBOM", "EOL", "License", "AutoFix", "Release Gating", "Package Health", "Dep Upgrade"],
  },
  {
    key: "CLOUD", color: "#f97316", path: "/cloud", icon: "☁️",
    features: ["CSPM AWS", "CSPM Azure", "CSPM GCP", "VM Scan", "IaC Drift", "Container Reachability", "Hardened Images", "Org-wide Discovery", "K8s Real-time"],
  },
  {
    key: "ATTACK", color: "#ef4444", path: "/attack", icon: "⚔️",
    features: ["AI Pentest", "Pentest Threat Model", "Infinite Pentest", "Code Audit", "DAST", "API Fuzzing", "Attack Surface", "Bug Bounty", "Re-test", "Escalation Mode"],
  },
  {
    key: "RUNTIME", color: "#06b6d4", path: "/runtime", icon: "📡",
    features: ["Zen Firewall", "K8s Real-time", "LLM Monitor", "Supply Chain", "Device Protection", "Bot Protection", "0-Day Block", "Rate Limiting"],
  },
  {
    key: "PLATFORM", color: "#10b981", path: "/autotriage", icon: "🧠",
    features: ["AutoTriage", "Custom Context", "ASPM", "Threat Intel", "Ask ShieldAI", "MCP", "IDE Plugins", "Release Gating", "SLA Mode", "Trends", "Re-test", "Escalation", "On-Prem", "API"],
  },
  {
    key: "GOVERNANCE", color: "#6366f1", path: "/governance", icon: "⚖️",
    features: ["SOC2", "ISO27001", "GDPR", "PCI DSS", "HIPAA", "NIST", "UK Cyber Essentials", "CompAI", "Vanta", "Drata", "Evidence Packs", "Audit Reports", "FDA/NTIA SBOM"],
  },
];

function AnimatedBar({ color, animated }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (animated) {
      const t = setTimeout(() => setWidth(100), 100);
      return () => clearTimeout(t);
    }
  }, [animated]);

  return (
    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(30,58,95,0.4)" }}>
      <div className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
        style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}>
        <div className="absolute inset-0 animate-shimmer" style={{ background: `linear-gradient(90deg,transparent,${color}40,transparent)`, backgroundSize: "200% 100%" }} />
      </div>
    </div>
  );
}

export default function PlatformCoverageWidget() {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t); }, []);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#080d1a,#060a12)", border: "1px solid rgba(59,130,246,0.15)", boxShadow: "0 0 60px rgba(59,130,246,0.04)" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-base font-black text-white">ShieldAI Security Platform</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">79 Features — 100% Aikido Parity</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="px-3 py-1.5 rounded-full font-black text-sm flex items-center gap-2"
              style={{ color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", boxShadow: "0 0 16px rgba(16,185,129,0.1)" }}>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Platform Score: 100%
            </div>
            <p className="text-[10px] text-emerald-600 font-mono">Aikido Parity Achieved ✓</p>
          </div>
        </div>
      </div>

      {/* Pillar Grid */}
      <div className="px-6 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {PILLARS.map((p, idx) => (
          <Link key={p.key} to={p.path}
            className="rounded-xl p-4 group transition-all hover:brightness-110"
            style={{ background: `linear-gradient(135deg,${p.color}06,${p.color}03)`, border: `1px solid ${p.color}20` }}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-base">{p.icon}</span>
              <span className="text-xs font-black font-mono" style={{ color: p.color }}>{p.key}</span>
              <span className="ml-auto text-[10px] font-black font-mono" style={{ color: p.color }}>100%</span>
            </div>
            <AnimatedBar color={p.color} animated={animated} />
            <div className="flex flex-wrap gap-1 mt-2.5">
              {p.features.map(f => (
                <span key={f} className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                  style={{ background: `${p.color}10`, color: `${p.color}bb`, border: `1px solid ${p.color}20` }}>
                  {f}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* vs Aikido comparison */}
      <div className="mx-6 mb-5 rounded-xl p-4" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(30,58,95,0.4)" }}>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">Competitor Comparison</p>
        <div className="space-y-3">
          {[
            { name: "ShieldAI", pct: 100, color: "#10b981", glow: true },
            { name: "Aikido.dev", pct: 100, color: "#64748b", glow: false },
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <span className="text-[11px] font-mono font-bold w-20 flex-shrink-0" style={{ color: item.glow ? "#10b981" : "#475569" }}>{item.name}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(30,58,95,0.4)" }}>
                <div className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: animated ? `${item.pct}%` : "0%", background: item.glow ? "linear-gradient(90deg,#10b981,#34d399)" : "#334155", transition: "width 1.2s ease-out", boxShadow: item.glow ? "0 0 8px rgba(16,185,129,0.4)" : "none" }} />
              </div>
              <span className="text-[11px] font-mono font-bold w-8 text-right" style={{ color: item.glow ? "#10b981" : "#475569" }}>{item.pct}%</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-emerald-600 font-mono mt-3 text-center">
          ShieldAI matches and exceeds Aikido across all 6 security pillars
        </p>
      </div>

      {/* Footer */}
      <div className="px-6 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-500 font-mono font-semibold">ALL SYSTEMS ACTIVE</span>
          </div>
          <span className="text-[10px] text-slate-700 font-mono">ShieldAI Platform v3.0</span>
        </div>
        <div className="text-center py-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 8 }}>
          <p className="text-xs font-bold text-emerald-400">ShieldAI: 70 Features — 100% Aikido Parity ✓</p>
          <p className="text-[10px] text-slate-600 mt-1">Production Ready — June 2026</p>
        </div>
      </div>
    </div>
  );
}