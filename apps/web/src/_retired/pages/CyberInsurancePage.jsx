import React, { useState } from "react";
import { DollarSign, TrendingUp, Shield, CheckCircle, AlertTriangle, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const GOLD = "#C9A84C";

const INSURANCE_FACTORS = [
  { factor: "Multi-factor authentication", status: "enabled", industryAvg: 73, impact: -12 },
  { factor: "Endpoint protection (EDR)", status: "active", value: "3 devices", industryAvg: 61, impact: -8 },
  { factor: "Vulnerability patching SLA", status: "warning", value: "2 SLA breaches", industryAvg: 55, impact: +15 },
  { factor: "Backup and recovery", status: "unknown", industryAvg: 68, impact: +5 },
  { factor: "Security awareness training", status: "unknown", industryAvg: 72, impact: +8 },
  { factor: "Encryption at rest", status: "enabled", value: "Via cloud config", industryAvg: 81, impact: -6 },
  { factor: "Incident response plan", status: "unknown", industryAvg: 45, impact: +12 },
  { factor: "Code scanning (SAST/SCA)", status: "active", industryAvg: 31, impact: -15 },
  { factor: "Cloud security posture", status: "active", value: "Score 85", industryAvg: 42, impact: -10 },
  { factor: "Compliance certifications", status: "warning", value: "In progress", industryAvg: 38, impact: -3 },
  { factor: "Network segmentation", status: "unknown", industryAvg: 52, impact: +8 },
  { factor: "Privileged access management", status: "unknown", industryAvg: 59, impact: +10 },
  { factor: "Security monitoring (SOC)", status: "active", value: "Automated", industryAvg: 35, impact: -18 },
  { factor: "Supply chain security", status: "active", value: "SafeChain", industryAvg: 22, impact: -12 },
  { factor: "Dark web monitoring", status: "active", industryAvg: 28, impact: -7 },
];

export default function CyberInsurancePage() {
  const totalImpact = INSURANCE_FACTORS.reduce((sum, f) => sum + f.impact, 0);
  const riskGrade = totalImpact < -20 ? "A" : totalImpact < 0 ? "B+" : totalImpact < 20 ? "C" : "D";
  const basePremium = 100000;
  const adjustedPremium = basePremium * (1 + totalImpact / 100);
  const savings = basePremium - adjustedPremium;

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            <DollarSign className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Cyber Insurance Risk Profile</h1>
            <p className="text-slate-400 text-sm">Your ShieldAI security posture directly affects your cyber insurance premium. Improve your score, reduce your cost.</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-slate-400 mb-1">Current Risk Grade</div>
            <div className={`text-5xl font-black ${
              riskGrade === "A" ? "text-green-400" :
              riskGrade === "B+" ? "text-emerald-400" :
              riskGrade === "C" ? "text-amber-400" : "text-red-400"
            }`}>
              {riskGrade}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Impact Summary */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="bg-[#111827] border-slate-700">
          <CardContent className="p-6">
            <div className="text-slate-400 text-sm mb-2">Base Premium</div>
            <div className="text-3xl font-black text-white">${basePremium.toLocaleString()}/year</div>
            <div className="text-xs text-slate-500 mt-1">Industry average for your profile</div>
          </CardContent>
        </Card>
        <Card className="bg-[#111827] border-slate-700">
          <CardContent className="p-6">
            <div className="text-slate-400 text-sm mb-2">ShieldAI-Adjusted Premium</div>
            <div className="text-3xl font-black text-emerald-400">${adjustedPremium.toLocaleString()}/year</div>
            <div className="text-xs text-emerald-500/70 mt-1">Based on your security posture</div>
          </CardContent>
        </Card>
        <Card className="bg-[#111827] border-slate-700 border-2" style={{ borderColor: GOLD }}>
          <CardContent className="p-6">
            <div className="text-slate-400 text-sm mb-2">Estimated Annual Savings</div>
            <div className="text-3xl font-black" style={{ color: GOLD }}>${savings.toLocaleString()}/year</div>
            <div className="text-xs mt-1" style={{ color: GOLD }}>
              {((savings / basePremium) * 100).toFixed(0)}% reduction vs industry average
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insurance Risk Assessment Table */}
      <Card className="bg-[#111827] border-slate-700 mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: GOLD }} />
            Insurance Risk Assessment (15 Factors)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {INSURANCE_FACTORS.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="flex items-center gap-3 flex-1">
                  {item.status === "enabled" || item.status === "active" ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : item.status === "warning" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-slate-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{item.factor}</div>
                    {item.value && <div className="text-xs text-slate-400">{item.value}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 mb-1">Industry Avg</div>
                    <Progress value={item.industryAvg} className="w-24 h-2" />
                    <div className="text-xs text-slate-500 mt-1">{item.industryAvg}%</div>
                  </div>
                  <div className="text-right w-24">
                    <div className="text-xs text-slate-400 mb-1">Premium Impact</div>
                    <div className={`text-sm font-bold ${item.impact < 0 ? "text-green-400" : item.impact > 0 ? "text-red-400" : "text-slate-400"}`}>
                      {item.impact > 0 ? "+" : ""}{item.impact}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card className="bg-[#111827] border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: GOLD }} />
              Top 3 Improvements to Reduce Premium
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
              <div className="text-sm font-semibold text-white mb-1">Fix 2 SLA breaches</div>
              <div className="text-xs text-slate-400">Potential savings: +$15,000/year</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
              <div className="text-sm font-semibold text-white mb-1">Document incident response plan</div>
              <div className="text-xs text-slate-400">Potential savings: +$12,000/year</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
              <div className="text-sm font-semibold text-white mb-1">Add backup monitoring</div>
              <div className="text-xs text-slate-400">Potential savings: +$5,000/year</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: GOLD }} />
              Insurance Application Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-400">Generate a comprehensive security posture report to share with your cyber insurance broker for premium negotiations.</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle className="w-3 h-3 text-green-400" />
                Organization security posture summary
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle className="w-3 h-3 text-green-400" />
                All 15 factors with evidence
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle className="w-3 h-3 text-green-400" />
                Risk grade and justification
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle className="w-3 h-3 text-green-400" />
                Industry benchmark comparison
              </div>
            </div>
            <Button className="w-full" style={{ background: GOLD, color: "#0A0E1A" }}>
              <Download className="w-4 h-4 mr-2" />
              Generate Insurance Report (PDF)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Partner Logos */}
      <Card className="bg-[#111827] border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Potential Insurance Partners (Coming Soon)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 opacity-50">
            {["Coalition", "At-Bay", "Corvus", "Cowbell", "Beazley"].map((partner, idx) => (
              <div key={idx} className="px-6 py-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <span className="text-sm font-semibold text-slate-400">{partner}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}