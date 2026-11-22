import React from "react";
import { Rss, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const releases = [
  {
    version: "v2.0.0",
    date: "June 16, 2026",
    type: "major",
    changes: [
      { emoji: "✨", text: "NEW: VibeGuard™ — AI-Generated Code Security Scanner" },
      { emoji: "✨", text: "NEW: Security Graph with Attack Path Visualization" },
      { emoji: "✨", text: "NEW: DSPM — Data Security Posture Management" },
      { emoji: "✨", text: "NEW: CIEM — Cloud Identity Entitlement Management" },
      { emoji: "✨", text: "NEW: Threat Hunting Console" },
      { emoji: "✨", text: "NEW: Workflow Automation Canvas" },
      { emoji: "✨", text: "NEW: MCP & Agentic AI Security" },
      { emoji: "✨", text: "NEW: ShieldAI Home + Gov + Edge tiers" },
      { emoji: "✨", text: "NEW: Full Integrations Hub (20 integrations)" },
      { emoji: "🔧", text: "IMPROVED: Real Semgrep-powered SAST engine" },
      { emoji: "🔧", text: "IMPROVED: OSV.dev + NVD SCA database integration" },
      { emoji: "🔧", text: "IMPROVED: Trivy-powered container scanning" },
      { emoji: "🔧", text: "IMPROVED: Global search (Cmd+K)" },
      { emoji: "🔧", text: "IMPROVED: Full finding detail drawer with evidence" },
      { emoji: "🔧", text: "IMPROVED: Real-time scan progress indicators" },
      { emoji: "🐛", text: "FIXED: Data consistency across all dashboard metrics" },
      { emoji: "🐛", text: "FIXED: Mobile responsiveness on all pages" },
    ],
  },
  {
    version: "v1.9.0",
    date: "May 28, 2026",
    type: "minor",
    changes: [
      { emoji: "✨", text: "NEW: Autonomous SOC with 6 AI agents" },
      { emoji: "✨", text: "NEW: Post-Quantum Cryptography Scanner" },
      { emoji: "✨", text: "NEW: MSSP Multi-Tenant Portal" },
      { emoji: "🔧", text: "IMPROVED: AutoFix PR quality and coverage" },
    ],
  },
  {
    version: "v1.8.0",
    date: "May 12, 2026",
    type: "minor",
    changes: [
      { emoji: "✨", text: "NEW: ShieldAI VibeGuard beta" },
      { emoji: "✨", text: "NEW: Executive Dashboard redesign" },
      { emoji: "✨", text: "NEW: Compliance Evidence Auto-Collection" },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">ShieldAI Changelog</h1>
          <p className="text-slate-400">What's new — stay up to date with the latest improvements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Rss className="w-4 h-4 mr-2" />
            RSS Feed
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Email Updates
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {releases.map((release) => (
          <Card key={release.version} className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-white">{release.version}</div>
                <Badge className={release.type === "major" ? "bg-primary/10 text-primary border-primary/20" : "bg-slate-800 text-slate-400"}>
                  {release.type === "major" ? "Major Release" : "Minor Release"}
                </Badge>
                <span className="text-slate-500 text-sm">{release.date}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {release.changes.map((change, i) => (
                  <li key={i} className="text-slate-300 flex items-start gap-2">
                    <span>{change.emoji}</span>
                    <span>{change.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-slate-500 text-sm">
        <p>Want to suggest features or report bugs?</p>
        <a href="/support" className="text-primary hover:underline">Contact Support →</a>
      </div>
    </div>
  );
}