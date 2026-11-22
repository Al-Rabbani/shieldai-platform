import React, { useState } from "react";
import { ArrowRight, AlertTriangle, Code, Shield, Check, FileText, DollarSign, TrendingUp, Activity, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Demo timeline data for when no real breaches exist
const DEMO_TIMELINE = {
  cve_id: "CVE-2021-44228",
  package: "log4j",
  cvss: 10.0,
  stages: [
    { type: "code_commit", date: "2021-11-01", title: "Vulnerable Code Committed", desc: "Developer introduces log4j dependency", severity: "info" },
    { type: "sast_found", date: "2021-11-04", title: "SAST Detection", desc: "ShieldAI SAST scanner identifies CVE-2021-44228", severity: "critical" },
    { type: "sla_missed", date: "2021-11-28", title: "SLA Deadline Missed", desc: "Critical finding not fixed within 28-day SLA", severity: "high" },
    { type: "exploited", date: "2021-12-02", title: "Attacker Exploited", desc: "Threat actor scans and exploits vulnerable endpoint", severity: "critical" },
    { type: "breach_detected", date: "2021-12-02", title: "Breach Detected", desc: "EDR detects suspicious JNDI lookup activity", severity: "critical" },
  ],
  prevention_cost: "$400 (2 dev hours)",
  breach_cost: "$240,000 (estimated)",
};

export default function BreachTimelinePage() {
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [showDemo, setShowDemo] = useState(true);

  // Fetch findings that have both SAST detection and runtime threat correlation
  const { data: findings = [] } = useQuery({
    queryKey: ["breach-timeline-findings"],
    queryFn: async () => {
      try {
        const triaged = await base44.entities.TriagedFinding.list("-created_at", 100);
        return triaged.filter(f => f.cve_id && f.severity === "critical");
      } catch {
        return [];
      }
    },
  });

  const timeline = showDemo ? DEMO_TIMELINE : selectedFinding;

  const getStageColor = (severity) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 border-red-500/50 text-red-400";
      case "high": return "bg-orange-500/20 border-orange-500/50 text-orange-400";
      case "medium": return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
      default: return "bg-slate-500/20 border-slate-500/50 text-slate-400";
    }
  };

  const getStageIcon = (type) => {
    switch (type) {
      case "code_commit": return Code;
      case "sast_found": return Shield;
      case "sla_missed": return AlertTriangle;
      case "exploited": return AlertTriangle;
      case "breach_detected": return Shield;
      default: return Clock;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-[#C9A84C]" />
            Code-to-Breach Timeline
          </h1>
          <p className="text-slate-400 mt-1">Track the complete journey from vulnerability introduction to breach detection</p>
        </div>
        {findings.length > 0 && (
          <select
            value={selectedFinding?.id || ""}
            onChange={(e) => {
              const finding = findings.find(f => f.id === e.target.value);
              setSelectedFinding(finding);
              setShowDemo(false);
            }}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
          >
            <option value="">Select a finding...</option>
            {findings.map(f => (
              <option key={f.id} value={f.id}>{f.cve_id || f.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Timeline Visualization */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">
            {timeline?.cve_id || "Select a Finding"}
            {timeline && (
              <Badge className="ml-3 bg-red-500/20 text-red-400 border-red-500/30">
                CVSS {timeline.cvss}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline ? (
            <div className="space-y-6">
              {/* Horizontal Timeline */}
              <div className="relative">
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2" />
                <div className="relative flex items-center justify-between">
                  {timeline.stages.map((stage, idx) => {
                    const Icon = getStageIcon(stage.type);
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${getStageColor(stage.severity)} z-10`}>
                          <Icon className="w-8 h-8" />
                        </div>
                        <div className="mt-3 text-center">
                          <div className="text-white font-medium text-sm">{stage.title}</div>
                          <div className="text-xs text-slate-400">{stage.date}</div>
                          <div className="text-xs text-slate-500 mt-1 max-w-[150px]">{stage.desc}</div>
                        </div>
                        {idx < timeline.stages.length - 1 && (
                          <ArrowRight className="absolute text-slate-600 w-6 h-6" style={{ left: `${(idx + 1) * 20}%` }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Key Insight */}
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 mt-1" />
                  <div>
                    <div className="text-white font-medium mb-1">This breach was preventable</div>
                    <div className="text-slate-400 text-sm">
                      SAST detected {timeline.cve_id} {timeline.stages[2]?.date ? timeline.stages[2].date : "28 days"} before exploitation. 
                      Had the SLA been met, this breach would not have occurred.
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Prevention Cost</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{timeline.prevention_cost}</div>
                  <div className="text-xs text-slate-400 mt-1">2 developer hours to patch</div>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <DollarSign className="w-5 h-5" />
                    <span className="font-medium">Breach Response Cost</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{timeline.breach_cost}</div>
                  <div className="text-xs text-slate-400 mt-1">Incident response, forensics, downtime</div>
                </div>
              </div>

              {/* ROI Calculation */}
              <div className="p-4 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/30">
                <div className="flex items-center gap-2 text-[#C9A84C] mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Security ROI</span>
                </div>
                <div className="text-white">
                  For every $1 spent on prevention, you save <span className="font-bold text-[#C9A84C]">$600</span> in breach response costs.
                </div>
              </div>

              <Button className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
                <FileText className="w-4 h-4 mr-2" />
                Generate Executive Report
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <div className="text-white font-medium mb-2">No breach timeline available</div>
              <div className="text-slate-400 text-sm mb-4">
                Connect your GitHub and cloud accounts to see real breach timelines
              </div>
              <Button onClick={() => setShowDemo(true)} variant="outline" className="border-slate-700 text-slate-300">
                View Demo Timeline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}