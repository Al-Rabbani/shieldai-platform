import React from "react";
import { DollarSign, Clock, Check, Bell, Target, TrendingUp, Shield, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function RoiDashboardPage() {
  // Mock ROI data - would calculate from real entity data
  const roiMetrics = {
    riskReduced: 2400000,
    hoursSaved: 142,
    alertsResolved: 847,
    mttdMinutes: 4.2,
    mttrHours: 6.8,
    breachesPrevented: 3,
  };

  const handleGenerateReport = () => {
    // Would call shieldPentestReport with report_type=board_roi
    alert("Generating board report...");
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-[#C9A84C]" />
            Security ROI Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Board-level business case for security investment</p>
        </div>
        <Button onClick={handleGenerateReport} className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
          <FileText className="w-4 h-4 mr-2" />
          Generate Board Report
        </Button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-6 h-6 text-emerald-500" />
              <span className="text-slate-400 text-sm">Risk Reduced This Month</span>
            </div>
            <div className="text-3xl font-bold text-white">{formatCurrency(roiMetrics.riskReduced)}</div>
            <div className="text-xs text-emerald-400 mt-1">Based on FAIR model × findings</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-6 h-6 text-blue-500" />
              <span className="text-slate-400 text-sm">Developer Hours Saved</span>
            </div>
            <div className="text-3xl font-bold text-white">{roiMetrics.hoursSaved}h</div>
            <div className="text-xs text-blue-400 mt-1">Auto-fix PRs × avg remediation</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Check className="w-6 h-6 text-purple-500" />
              <span className="text-slate-400 text-sm">Alerts Resolved Autonomously</span>
            </div>
            <div className="text-3xl font-bold text-white">{roiMetrics.alertsResolved}</div>
            <div className="text-xs text-purple-400 mt-1">From AuditLog auto-resolved</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="w-6 h-6 text-amber-500" />
              <span className="text-slate-400 text-sm">Mean Time to Detect</span>
            </div>
            <div className="text-3xl font-bold text-white">{roiMetrics.mttdMinutes}m</div>
            <div className="text-xs text-amber-400 mt-1">From ScanJob timestamps</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-6 h-6 text-red-500" />
              <span className="text-slate-400 text-sm">Mean Time to Remediate</span>
            </div>
            <div className="text-3xl font-bold text-white">{roiMetrics.mttrHours}h</div>
            <div className="text-xs text-red-400 mt-1">Detection → Resolution</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-6 h-6 text-emerald-500" />
              <span className="text-slate-400 text-sm">Breaches Prevented (est.)</span>
            </div>
            <div className="text-3xl font-bold text-white">{roiMetrics.breachesPrevented}</div>
            <div className="text-xs text-emerald-400 mt-1">Critical findings fixed before SLA</div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Risk Exposure Chart */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C9A84C]" />
            Financial Risk Exposure Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {[65, 58, 52, 48, 42, 38].map((value, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-red-500/20 to-red-500/60 rounded-t-lg transition-all"
                  style={{ height: `${value}%` }}
                />
                <div className="text-slate-400 text-xs">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][idx]}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Risk reduced 34% this quarter</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Comparison */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white text-sm">What ShieldAI Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">$299/mo</div>
            <div className="text-slate-400 text-xs">Professional plan</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white text-sm">What a Breach Would Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400 mb-1">$4.45M</div>
            <div className="text-slate-400 text-xs">IBM Cost of Breach 2025 avg</div>
          </CardContent>
        </Card>

        <Card className="border-[#C9A84C]/30 bg-[#C9A84C]/10">
          <CardHeader>
            <CardTitle className="text-[#C9A84C] text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#C9A84C] mb-1">1,488x</div>
            <div className="text-slate-400 text-xs">For every $1 spent</div>
          </CardContent>
        </Card>
      </div>

      {/* Board Report Preview */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Executive Summary Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-5 gap-4">
            {[
              { slide: 1, title: "Risk Posture & Trend", icon: TrendingUp },
              { slide: 2, title: "Financial Impact", icon: DollarSign },
              { slide: 3, title: "Key Achievements", icon: Check },
              { slide: 4, title: "Compliance Status", icon: FileText },
              { slide: 5, title: "Recommended Investments", icon: Target },
            ].map((slide, idx) => {
              const Icon = slide.icon;
              return (
                <div key={idx} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
                  <Icon className="w-6 h-6 text-[#C9A84C] mx-auto mb-2" />
                  <div className="text-white text-sm font-medium">{slide.title}</div>
                  <div className="text-slate-400 text-xs mt-1">Slide {slide.slide}</div>
                </div>
              );
            })}
          </div>
          <Button className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
            <Download className="w-4 h-4 mr-2" />
            Download Board Report (PDF)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}