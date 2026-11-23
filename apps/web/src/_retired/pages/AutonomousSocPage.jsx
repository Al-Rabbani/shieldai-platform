import React, { useState, useEffect } from "react";
import { Bot, Check, AlertTriangle, Clock, TrendingUp, Shield, FileText, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const AUTOMATION_LOGS = [
  { id: 1, action: "AutoTriage: Deduplicated CVE-2024-6387 — merged 3 duplicate findings", time: "2m ago", type: "triage" },
  { id: 2, action: "AutoFix: Created PR #47 for SQL Injection in api/users.ts", time: "5m ago", type: "fix" },
  { id: 3, action: "Alert: Notified Slack #security-alerts — 1 new critical finding", time: "12m ago", type: "alert" },
  { id: 4, action: "Compliance: Updated SOC2 CC6.1 status to FAILING — new critical IAM finding", time: "18m ago", type: "compliance" },
  { id: 5, action: "ThreatIntel: Synced 12 new CISA KEV entries — 2 affect your packages", time: "23m ago", type: "threat" },
];

const ESCALATIONS = [
  { id: 1, title: "Complex exploit chain detected", reason: "Manual review required", severity: "critical", finding: "CVE-2024-1234" },
  { id: 2, title: "PR creation failed", reason: "No valid fix pattern found", severity: "high", finding: "CVE-2024-5678" },
  { id: 3, title: "Business context needed", reason: "Is this endpoint intentionally public?", severity: "medium", finding: "API Exposure" },
];

export default function AutonomousSocPage() {
  const [autonomyLevel, setAutonomyLevel] = useState("moderate");
  const [autoCloseInfo, setAutoCloseInfo] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [maxAutoFix, setMaxAutoFix] = useState(10);

  const { data: findings = [] } = useQuery({
    queryKey: ["autotriage-findings"],
    queryFn: async () => {
      try {
        return await base44.entities.TriagedFinding.list("-created_at", 50);
      } catch {
        return [];
      }
    },
  });

  const automationRate = 73; // Would calculate from actual data

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bot className="w-8 h-8 text-[#C9A84C]" />
            Autonomous SOC
          </h1>
          <p className="text-slate-400 mt-1">AI-powered security operations — full workflow automation</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">47 tasks</div>
          <div className="text-slate-400 text-sm">Completed autonomously this week</div>
        </div>
      </div>

      {/* Autonomy Gauge */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-sm mb-2">Automation Rate</div>
              <div className="text-4xl font-bold text-[#C9A84C]">{automationRate}%</div>
              <div className="text-slate-400 text-sm mt-1">Of security tasks handled without human involvement</div>
            </div>
            <div className="relative w-40 h-40">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#C9A84C"
                  strokeWidth="10"
                  strokeDasharray={`${(automationRate / 100) * 283} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Bot className="w-12 h-12 text-[#C9A84C]" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Streams */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { stage: "Detecting", count: 12, color: "blue", icon: Bell },
          { stage: "Triaging", count: 8, color: "amber", icon: FileText },
          { stage: "Remediating", count: 5, color: "purple", icon: Check },
          { stage: "Resolved", count: 47, color: "emerald", icon: Shield },
        ].map((stream, idx) => {
          const Icon = stream.icon;
          return (
            <Card key={idx} className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Icon className={`w-4 h-4 text-${stream.color}-500`} />
                  {stream.stage}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{stream.count}</div>
                <div className="text-xs text-slate-400 mt-1">Active items</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Human Escalation Queue */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Human Escalation Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ESCALATIONS.map((esc) => (
              <div key={esc.id} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{esc.title}</span>
                      <Badge className={
                        esc.severity === "critical" ? "bg-red-500/20 text-red-400" :
                        esc.severity === "high" ? "bg-orange-500/20 text-orange-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }>
                        {esc.severity}
                      </Badge>
                    </div>
                    <div className="text-slate-400 text-sm">{esc.reason}</div>
                    <div className="text-xs text-slate-500 mt-1">{esc.finding}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
                      Assign to Me
                    </Button>
                    <Button size="sm" variant="outline" className="border-slate-700 text-slate-300">
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Automation Log */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#C9A84C]" />
            Autonomous Actions Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {AUTOMATION_LOGS.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                <Bot className="w-5 h-5 text-[#C9A84C]" />
                <div className="flex-1 text-white text-sm">{log.action}</div>
                <div className="text-slate-400 text-xs">{log.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Autonomy Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-white text-sm mb-2 block">Autonomy Level</label>
            <div className="flex gap-4">
              {["conservative", "moderate", "aggressive"].map((level) => (
                <label key={level} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="autonomy"
                    checked={autonomyLevel === level}
                    onChange={() => setAutonomyLevel(level)}
                    className="accent-[#C9A84C]"
                  />
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                  {level === "moderate" && " ★"}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700">
            <div>
              <div className="text-white font-medium">Auto-close info severity after 72h if no CVE</div>
              <div className="text-xs text-slate-400">Automatically dismiss low-priority findings</div>
            </div>
            <input
              type="checkbox"
              checked={autoCloseInfo}
              onChange={(e) => setAutoCloseInfo(e.target.checked)}
              className="w-5 h-5 accent-[#C9A84C]"
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700">
            <div>
              <div className="text-white font-medium">Require human approval for PRs to main branch</div>
              <div className="text-xs text-slate-400">Safety gate for production code changes</div>
            </div>
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="w-5 h-5 accent-[#C9A84C]"
            />
          </div>
          <div>
            <label className="text-white text-sm mb-2 block">Maximum auto-fix PRs per day: {maxAutoFix}</label>
            <input
              type="range"
              min="1"
              max="20"
              value={maxAutoFix}
              onChange={(e) => setMaxAutoFix(parseInt(e.target.value))}
              className="w-full accent-[#C9A84C]"
            />
          </div>
          <Button className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
            <Check className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}