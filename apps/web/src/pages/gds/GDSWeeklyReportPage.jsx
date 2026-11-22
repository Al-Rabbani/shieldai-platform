import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Calendar, TrendingUp, Shield, AlertCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSWeeklyReportPage() {
  const [periodDays, setPeriodDays] = useState(7);

  const generateReportMutation = useMutation({
    mutationFn: (days) => base44.functions.invoke("gdsWeeklySummaryReport", { period_days: days }),
  });

  const handleGenerateReport = async () => {
    try {
      const response = await generateReportMutation.mutateAsync(periodDays);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GDS_Weekly_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Weekly Summary Report" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <FileText className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Weekly Security Summary</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Executive PDF reports with security posture trends and compliance status</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
              <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Security Trends</p>
              <p className="text-sm font-bold text-white">Vulnerability Analysis</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Comprehensive breakdown of findings by severity with trend indicators</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40` }}>
              <Shield className="w-5 h-5" style={{ color: LOW }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Compliance Status</p>
              <p className="text-sm font-bold text-white">Framework Coverage</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>SOC 2, ISO 27001, and other framework compliance metrics</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40` }}>
              <AlertCircle className="w-5 h-5" style={{ color: DANGER }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Incident Summary</p>
              <p className="text-sm font-bold text-white">Security Events</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Critical security incidents and response actions taken</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Generate Executive Report</h3>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: MUTED }} />
            <span className="text-xs font-semibold" style={{ color: MUTED }}>Report Period:</span>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30].map(days => (
              <button
                key={days}
                onClick={() => setPeriodDays(days)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: periodDays === days ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${periodDays === days ? CYAN + "40" : BORDER}`,
                  color: periodDays === days ? CYAN : MUTED
                }}
              >
                Last {days} days
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${CYAN}30` }}>
          <FileText className="w-5 h-5 flex-shrink-0" style={{ color: CYAN }} />
          <div className="flex-1">
            <p className="text-xs font-bold text-white">PDF Executive Summary</p>
            <p className="text-[10px]" style={{ color: MUTED }}>Professional PDF report formatted for executive review and board presentations</p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={generateReportMutation.isPending}
            className="px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
            style={{
              background: generateReportMutation.isPending ? "rgba(255,255,255,0.1)" : `${CYAN}15`,
              border: `1px solid ${CYAN}40`,
              color: generateReportMutation.isPending ? MUTED : CYAN,
              opacity: generateReportMutation.isPending ? 0.6 : 1
            }}
          >
            {generateReportMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: CYAN, borderTopColor: "transparent" }} />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF
              </>
            )}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Risk Score", icon: TrendingUp, color: CYAN },
            { label: "Findings Summary", icon: AlertCircle, color: HIGH },
            { label: "Compliance Rate", icon: Shield, color: LOW },
            { label: "Incident Log", icon: FileText, color: DANGER }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <item.icon className="w-4 h-4" style={{ color: item.color }} />
              <span className="text-[10px] font-semibold" style={{ color: MUTED }}>{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-3">Report Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "Executive summary with key metrics",
            "Severity breakdown with visual indicators",
            "Compliance framework status",
            "Security incident timeline",
            "Risk score trends and analysis",
            "Professional PDF formatting"
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: CYAN }} />
              <span className="text-xs" style={{ color: TEXT }}>{feature}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}