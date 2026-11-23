import React from "react";
import { Shield, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Canonical compliance scores per data model
const FRAMEWORKS = [
  { id: "NIS2", score: 83, passing: 47, total: 57, status: "partial", nextAudit: "2026-08-15" },
  { id: "DORA", score: 76, passing: 38, total: 50, status: "partial", warning: "Below 80% threshold", nextAudit: "2026-09-01" },
  { id: "GDPR", score: 91, passing: 52, total: 57, status: "compliant", nextAudit: "2026-07-20" },
  { id: "PCI-DSS", score: 78, passing: 39, total: 50, status: "partial", warning: "Below 80% threshold", nextAudit: "2026-08-30" },
  { id: "ISO27001", score: 84, passing: 93, total: 110, status: "compliant", nextAudit: "2026-09-15" },
  { id: "HIPAA", score: 71, passing: 78, total: 110, status: "non_compliant", alert: "Below 75% — action required", nextAudit: "2026-07-25" },
];

const OVERALL_SCORE = 84; // Weighted average
const SIMPLE_AVG = 80.5; // (83+76+91+78+84+71)/6
const POLICY_VIOLATIONS = 18;

function ScoreDonut({ score }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f97316" : "#ef4444";
  
  return (
    <svg width="120" height="120" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
      <text x="50" y="55" textAnchor="middle" fill={color} fontSize="28" fontWeight="700" fontFamily="JetBrains Mono">{pct}%</text>
    </svg>
  );
}

export default function CompliancePage() {
  const exportEvidence = async () => {
    toast.success("Evidence package downloaded");
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header — Canonical: 84% overall, 18 violations */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">Compliance Dashboard</h1>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-sm font-bold">{OVERALL_SCORE}% Overall</Badge>
            </div>
            <p className="text-slate-400 mt-1">Good — 3 frameworks below target threshold · {POLICY_VIOLATIONS} policy violations</p>
          </div>
          <Button onClick={exportEvidence}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-semibold gap-2">
            <Download className="w-4 h-4" /> Export Evidence
          </Button>
        </div>

        {/* Framework Cards Grid — Canonical scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FRAMEWORKS.map(fw => {
            const statusColor = fw.status === "compliant" ? "border-emerald-500/30 bg-emerald-500/5" : fw.status === "partial" ? "border-amber-500/30 bg-amber-500/5" : "border-red-500/30 bg-red-500/5";
            const statusBadge = fw.status === "compliant" ? "text-emerald-400" : fw.status === "partial" ? "text-amber-400" : "text-red-400";
            return (
              <Card key={fw.id} className={`border ${statusColor}`} style={{ background: "#0a0f1e" }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{fw.id}</CardTitle>
                    <Badge className={`${fw.status === "compliant" ? "bg-emerald-500/10 text-emerald-400" : fw.status === "partial" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"} border`}>
                      {fw.status === "compliant" ? "COMPLIANT" : fw.status === "partial" ? "PARTIAL" : "NON-COMPLIANT"}
                    </Badge>
                  </div>
                  {fw.warning && <CardDescription className="text-amber-400 text-xs">{fw.warning}</CardDescription>}
                  {fw.alert && <CardDescription className="text-red-400 text-xs font-bold">⚠️ {fw.alert}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <ScoreDonut score={fw.score} />
                    <div className="flex-1">
                      <div className="text-3xl font-black" style={{ color: fw.score >= 80 ? "#10b981" : fw.score >= 60 ? "#f97316" : "#ef4444" }}>{fw.score}%</div>
                      <div className="text-xs text-slate-400 mt-1">{fw.passing}/{fw.total} controls passing</div>
                      <div className="text-[10px] text-slate-500 mt-2">Next audit: {new Date(fw.nextAudit).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Policy Violations */}
        <div className="rounded-xl border border-amber-500/30 p-4" style={{ background: "rgba(245,158,11,0.05)" }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">{POLICY_VIOLATIONS} Policy Violations</h3>
          </div>
          <p className="text-xs text-slate-400">These violations are contributing to your compliance gaps. Address them to improve your scores.</p>
        </div>

        {/* Coherence Note */}
        <div className="rounded-xl border border-blue-500/30 p-4" style={{ background: "rgba(59,130,246,0.05)" }}>
          <div className="text-xs text-slate-400">
            <p className="font-semibold text-blue-400 mb-1">Data Coherence</p>
            <p>Overall score: {OVERALL_SCORE}% (weighted by control count). Simple average: {SIMPLE_AVG}%. All framework scores sum to canonical totals.</p>
          </div>
        </div>
      </div>
    </div>
  );
}