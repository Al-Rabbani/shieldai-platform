import React, { useState } from "react";
import { X, Sparkles } from "lucide-react";

const GOLD = "#C9A84C";

const UPDATES = [
  { date: "2026-06-16", tag: "NEW", title: "Vulnerability Reachability Analysis", desc: "Eliminate 85% of false positives — ShieldAI now traces actual call paths to confirm which CVEs are exploitable in your codebase.", color: "#22c55e" },
  { date: "2026-06-15", tag: "NEW", title: "MSSP Multi-Tenant Control Plane", desc: "Manage multiple client organizations from a single console with cross-client risk analytics and one-click report generation.", color: GOLD },
  { date: "2026-06-14", tag: "NEW", title: "Live Global Threat Feed", desc: "Real-time feed of CVEs, ransomware attacks, breaches, and APT activity — filtered to your tech stack and industry.", color: "#ef4444" },
  { date: "2026-06-13", tag: "NEW", title: "AI Agent Console", desc: "6 autonomous AI security agents that triage, fix, investigate, and respond to threats 24/7 without human intervention.", color: "#8b5cf6" },
  { date: "2026-06-12", tag: "NEW", title: "Executive Dashboard & Board Reports", desc: "CISO-grade dashboard with one-click PDF report generation, 30-day risk trends, compliance readiness, and pillar health scores.", color: "#3b82f6" },
];

export default function WhatsNew({ onClose }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border overflow-hidden"
        style={{ background: "#111827", borderColor: "#374151" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1F2937" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="font-bold text-white">What's New in ShieldAI</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-black text-black" style={{ background: GOLD }}>5 updates</span>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto divide-y" style={{ divideColor: "#1F2937" }}>
          {UPDATES.map((u, i) => (
            <div key={i} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: u.color + "20", color: u.color }}>{u.tag}</span>
                <span className="text-[10px] text-slate-500">{u.date}</span>
              </div>
              <div className="text-sm font-bold text-white mb-1">{u.title}</div>
              <div className="text-xs text-slate-400 leading-relaxed">{u.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}