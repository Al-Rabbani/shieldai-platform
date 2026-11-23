import React, { useState } from "react";
import { Trophy, TrendingUp, TrendingDown, Minus, Code, AlertTriangle, Check, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Mock developer data for demo
const DEMO_DEVELOPERS = [
  { username: "alice_chen", name: "Alice Chen", avatar: "👩‍💻", repos: 5, findings_introduced: 12, findings_fixed: 18, critical_introduced: 1, score: 87, trend: "up" },
  { username: "bob_smith", name: "Bob Smith", avatar: "👨‍💻", repos: 3, findings_introduced: 8, findings_fixed: 14, critical_introduced: 0, score: 92, trend: "up" },
  { username: "charlie_dev", name: "Charlie Dev", avatar: "🧑‍💻", repos: 7, findings_introduced: 24, findings_fixed: 9, critical_introduced: 3, score: 54, trend: "down" },
  { username: "diana_code", name: "Diana Code", avatar: "👩‍🔬", repos: 4, findings_introduced: 15, findings_fixed: 15, critical_introduced: 2, score: 75, trend: "stable" },
];

export default function DeveloperScoresPage() {
  const [selectedDev, setSelectedDev] = useState(null);

  const calculateScore = (findingsIntroduced, findingsFixed, criticalIntroduced) => {
    let score = 100;
    score -= criticalIntroduced * 20;
    score -= (findingsIntroduced - criticalIntroduced) * 5;
    score += findingsFixed * 8;
    return Math.max(0, Math.min(100, score));
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case "down": return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[#C9A84C]" />
            Developer Security Scorecard
          </h1>
          <p className="text-slate-400 mt-1">Per-developer accountability and gamification</p>
        </div>
        <Button className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
          <Share2 className="w-4 h-4 mr-2" />
          Share Leaderboard
        </Button>
      </div>

      {/* Leaderboard */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Security Leaderboard (Last 90 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Developer</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Repos</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Introduced</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Fixed</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Critical</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Score</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Trend</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_DEVELOPERS.map((dev, idx) => (
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{dev.avatar}</span>
                        <div>
                          <div className="text-white font-medium">{dev.name}</div>
                          <div className="text-xs text-slate-400">@{dev.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white">{dev.repos}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{dev.findings_introduced}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{dev.findings_fixed}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={dev.critical_introduced > 0 ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-400"}>
                        {dev.critical_introduced}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                          dev.score >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                          dev.score >= 60 ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {dev.score}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{getTrendIcon(dev.trend)}</td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDev(dev)}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Developer Detail Modal */}
      {selectedDev && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">{selectedDev.avatar}</span>
                {selectedDev.name}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDev(null)}>
                <span className="text-2xl">×</span>
              </Button>
            </div>
            <div className="p-6 space-y-6">
              {/* Score Gauge */}
              <div className="text-center">
                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-4xl font-bold ${
                  selectedDev.score >= 80 ? "bg-emerald-500/20 text-emerald-400 border-4 border-emerald-500" :
                  selectedDev.score >= 60 ? "bg-yellow-500/20 text-yellow-400 border-4 border-yellow-500" :
                  "bg-red-500/20 text-red-400 border-4 border-red-500"
                }`}>
                  {selectedDev.score}
                </div>
                <div className="text-slate-400 mt-2">Security Score</div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
                  <div className="text-2xl font-bold text-red-400">{selectedDev.findings_introduced}</div>
                  <div className="text-xs text-slate-400">Introduced (90d)</div>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{selectedDev.findings_fixed}</div>
                  <div className="text-xs text-slate-400">Fixed (90d)</div>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
                  <div className="text-2xl font-bold text-white">{selectedDev.repos}</div>
                  <div className="text-xs text-slate-400">Active Repos</div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <h3 className="text-white font-medium">Recommendations</h3>
                {selectedDev.critical_introduced > 0 && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-slate-300">
                    <AlertTriangle className="w-4 h-4 inline mr-2 text-red-400" />
                    Focus on reducing critical findings - consider additional security training
                  </div>
                )}
                {selectedDev.findings_fixed > selectedDev.findings_introduced && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-slate-300">
                    <Check className="w-4 h-4 inline mr-2 text-emerald-400" />
                    Great job fixing vulnerabilities faster than introducing them!
                  </div>
                )}
              </div>

              <Button className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
                <Share2 className="w-4 h-4 mr-2" />
                Share Scorecard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}