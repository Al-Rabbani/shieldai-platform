import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Shield, DollarSign, Target } from "lucide-react";

const GOLD = "#C9A84C";

const PRIORITY_ACTIONS = [
  {
    priority: "CRITICAL",
    timeframe: "Fix in next 2 hours",
    finding: "Hardcoded AWS credentials in shieldDASTScan.ts:367",
    risk: "$890K financial exposure",
    reachability: "exploitable",
    whyNow: "Currently being probed by 3 active threat actor campaigns",
    action: "View AutoFix PR",
  },
  {
    priority: "CRITICAL",
    timeframe: "Fix today",
    finding: "SQL Injection in /api/users — Production Login Endpoint",
    risk: "$340K financial exposure",
    reachability: "exploitable",
    whyNow: "CVE actively exploited in wild. CVSS 9.8. Matches Lazarus Group TTPs",
    action: "Generate AutoFix",
  },
  {
    priority: "HIGH",
    timeframe: "Fix this week",
    finding: "webpack 5.0.0 — CVE-2023-28154 — 3 repos affected",
    risk: "$180K financial exposure",
    reachability: "likely",
    whyNow: "Public PoC exploit published 6 days ago. Upgrade takes 5 minutes",
    action: "View AutoFix PR",
  },
];

const REACHABILITY_COLORS = {
  exploitable: { bg: "bg-red-900/30", text: "text-red-300", border: "border-red-700" },
  likely: { bg: "bg-orange-900/30", text: "text-orange-300", border: "border-orange-700" },
};

export function AIPriorityEngine() {
  return (
    <Card className="p-6 bg-[#111827] border border-yellow-700/50">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-xl">🎯</span>
          AI Priority Engine — Fix These 3 Things Today
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Based on reachability analysis, financial impact, and active exploitation — these are your highest leverage fixes right now
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PRIORITY_ACTIONS.map((action, idx) => {
          const colors = REACHABILITY_COLORS[action.reachability];
          return (
            <div
              key={idx}
              className="p-4 rounded-lg bg-gray-900/50 border border-gray-700 hover:border-gray-600 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <Badge className={`${colors.bg} ${colors.text} ${colors.border} border text-xs font-semibold`}>
                  {action.priority}
                </Badge>
                <span className="text-[10px] text-gray-400">{action.timeframe}</span>
              </div>

              <div className="text-sm font-semibold text-white mb-3 line-clamp-2">
                {action.finding}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <DollarSign className="w-3 h-3" />
                  <span>{action.risk}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Target className="w-3 h-3" />
                  <span className={colors.text}>
                    {action.reachability === "exploitable" ? "🔴 EXPLOITABLE" : "🟠 LIKELY"}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-2">{action.whyNow}</div>
                  <Button className="w-full h-7 text-xs bg-yellow-600 hover:bg-yellow-500 text-black">
                    {action.action}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          847 other findings are theoretical and have been filtered.{" "}
          <a href="/code/findings" className="text-indigo-400 hover:text-indigo-300 hover:underline">
            View all findings →
          </a>
        </p>
      </div>
    </Card>
  );
}

export default AIPriorityEngine;