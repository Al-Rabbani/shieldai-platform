import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, ArrowRight, CheckCircle2, Zap, Shield, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const WORKFLOWS = [
  {
    id: 1,
    title: "Fix Dependencies with AutoTriage + AutoFix",
    icon: Zap,
    color: "#f59e0b",
    steps: [
      { num: 1, title: "Open AutoTriage", desc: "Filter to SCA findings" },
      { num: 2, title: "Review reachability", desc: "Dismiss non-reachable findings" },
      { num: 3, title: "Click AutoFix", desc: "For reachable findings — review the PR" },
      { num: 4, title: "Merge PR", desc: "Finding auto-resolves" },
      { num: 5, title: "Check Trends", desc: "See velocity improvement in reports" },
    ],
  },
  {
    id: 2,
    title: "Jira Cloud + Slack Workflow",
    icon: Layers,
    color: "#3b82f6",
    steps: [
      { num: 1, title: "Connect Jira", desc: "Go to /integrations and connect Jira Cloud" },
      { num: 2, title: "Connect Slack", desc: "Connect your Slack workspace" },
      { num: 3, title: "Configure automation", desc: "New critical findings → auto-create Jira ticket → notify #security-alerts" },
      { num: 4, title: "Auto-close", desc: "When finding resolved → Jira ticket closes → Slack notification sent" },
    ],
    logos: ["Jira", "Slack", "ShieldAI"],
  },
  {
    id: 3,
    title: "Linear + Slack Workflow",
    icon: Layers,
    color: "#8b5cf6",
    steps: [
      { num: 1, title: "Connect Linear", desc: "Go to /integrations and connect Linear" },
      { num: 2, title: "Connect Slack", desc: "Connect your Slack workspace" },
      { num: 3, title: "Configure automation", desc: "New critical findings → auto-create Linear issue → notify #security" },
      { num: 4, title: "Auto-close", desc: "When finding resolved → Linear issue closes → Slack notification sent" },
    ],
    logos: ["Linear", "Slack", "ShieldAI"],
  },
];

export default function GuidesPage() {
  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#030712" }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Workflows & Guides</h1>
      </div>
      <p className="text-slate-500 text-sm">
        Step-by-step workflows to get the most out of ShieldAI.
      </p>

      {/* Workflow Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {WORKFLOWS.map((wf) => (
          <div key={wf.id} className="rounded-xl p-5 flex flex-col" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${wf.color}15` }}>
                <wf.icon className="w-5 h-5" style={{ color: wf.color }} />
              </div>
              <h3 className="text-sm font-bold text-white">{wf.title}</h3>
            </div>

            {wf.logos && (
              <div className="flex items-center gap-2 mb-4">
                {wf.logos.map((logo, i) => (
                  <React.Fragment key={i}>
                    <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">{logo}</span>
                    {i < wf.logos.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
                  </React.Fragment>
                ))}
              </div>
            )}

            <div className="space-y-3 flex-1">
              {wf.steps.map((step) => (
                <div key={step.num} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: wf.color }}>
                    {step.num}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{step.title}</p>
                    <p className="text-[10px] text-slate-500">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button size="sm" variant="outline" className="w-full mt-4 h-8 text-xs border-slate-700">
              Start Workflow <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="pt-4 flex items-center gap-3 flex-wrap" style={{ borderTop: "1px solid rgba(30,58,95,0.3)" }}>
        <span className="text-[10px] text-slate-600 font-mono">RELATED:</span>
        <Link to="/" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          ← Dashboard
        </Link>
        <Link to="/integrations" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          🔌 Integrations
        </Link>
        <Link to="/settings/webhooks" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          🔌 Webhooks
        </Link>
      </div>
    </div>
  );
}