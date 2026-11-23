import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, TrendingUp, Shield, AlertTriangle, Target, Activity, Calendar, BarChart3, Bell } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSWeeklyExecutiveReportPage() {
  const [periodDays, setPeriodDays] = useState(7);

  const generateReportMutation = useMutation({
    mutationFn: (params) => base44.functions.invoke("gdsWeeklyExecutiveReport", params),
  });

  const handleGenerateReport = async () => {
    try {
      const response = await generateReportMutation.mutateAsync({ period_days: periodDays });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GDS_Weekly_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Weekly Executive Report" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <FileText className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Weekly Executive Report</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Comprehensive weekly security posture and compliance summary for leadership</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>
            <Bell className="w-3 h-3" style={{ color: CYAN }} />
            <span className="text-[10px] font-black" style={{ color: CYAN }}>AUTO-WEEKLY</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40` }}>
              <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Security</p>
              <p className="text-sm font-black text-white">Posture Trends</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Active findings and risk levels</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
              <Shield className="w-5 h-5" style={{ color: CYAN }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Compliance</p>
              <p className="text-sm font-black text-white">Framework Status</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>SOC 2, ISO 27001, NIST rates</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}40` }}>
              <Target className="w-5 h-5" style={{ color: HIGH }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Risk</p>
              <p className="text-sm font-black text-white">Levels</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Overall risk scoring</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40` }}>
              <Activity className="w-5 h-5" style={{ color: LOW }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Incidents</p>
              <p className="text-sm font-black text-white">Active</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Open security incidents</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Generate Weekly Report</h3>
        
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

        <button
          onClick={handleGenerateReport}
          disabled={generateReportMutation.isPending}
          className="w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
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
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Weekly Executive Report PDF
            </>
          )}
        </button>

        <div className="mt-6">
          <h4 className="text-xs font-bold text-white mb-3">Report Includes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "Executive summary with key metrics",
              "Security posture trends (Critical/High/Medium findings)",
              "Compliance status by framework (SOC 2, ISO 27001, NIST)",
              "Active incident summary",
              "Attack path identification",
              "Priority action recommendations",
              "Confidential executive formatting"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: CYAN }} />
                <span className="text-[10px]" style={{ color: TEXT }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5" style={{ background: `${CYAN}05`, border: `1px solid ${CYAN}30` }}>
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: CYAN }} />
          <div>
            <p className="text-xs font-bold text-white">Automated Weekly Delivery</p>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>
              This report is automatically generated every Monday at 8:00 AM (Dublin time). 
              The automation runs in the background and the PDF is available for download anytime.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}