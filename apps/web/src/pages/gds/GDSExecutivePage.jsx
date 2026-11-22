import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, FileText, Target, Activity, Download, Calendar, Zap } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

const handleDownloadPDF = async (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default function GDSExecutivePage() {
  const [periodDays, setPeriodDays] = useState(30);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["executive-dashboard"],
    queryFn: () => base44.functions.invoke("gdsExecutiveIntelligence", { action: 'executive_dashboard' }).then(r => r.data.result),
    refetchInterval: 60000,
  });

  const generateReportMutation = useMutation({
    mutationFn: async (params) => {
      const response = await base44.functions.invoke("gdsExecutiveReport", { period_days: params.period_days });
      return response.data;
    },
  });

  const handleGenerateReport = async () => {
    try {
      const response = await generateReportMutation.mutateAsync({ period_days: periodDays });
      // The function returns a PDF blob
      const blob = new Blob([response], { type: 'application/pdf' });
      const filename = `GDS-Executive-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
      await handleDownloadPDF(blob, filename);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const metrics = dashboard?.metrics || {};

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Executive Dashboard" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <TrendingUp className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Executive Dashboard</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Live risk intelligence and security posture overview</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40` }}>
              <Activity className="w-5 h-5" style={{ color: DANGER }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Risk Score</p>
              <p className="text-2xl font-black text-white">{metrics.risk_score || '—'}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Grade: {metrics.risk_grade || 'N/A'}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
              <Target className="w-5 h-5" style={{ color: CYAN }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Open Findings</p>
              <p className="text-2xl font-black text-white">{metrics.open_findings || 0}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>{metrics.critical_findings || 0} critical</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40` }}>
              <FileText className="w-5 h-5" style={{ color: LOW }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Compliance</p>
              <p className="text-2xl font-black text-white">{metrics.compliance_rate || 0}%</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Framework average</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}40` }}>
              <Zap className="w-5 h-5" style={{ color: HIGH }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Incidents</p>
              <p className="text-2xl font-black text-white">{metrics.active_incidents || 0}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Active incidents</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Generate Board Report</h3>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: MUTED }} />
            <span className="text-xs font-semibold" style={{ color: MUTED }}>Period:</span>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map(days => (
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
                {days} days
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={generateReportMutation.isPending}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: generateReportMutation.isPending ? "rgba(255,255,255,0.1)" : `${CYAN}15`,
            border: `1px solid ${CYAN}40`,
            color: generateReportMutation.isPending ? MUTED : CYAN
          }}
        >
          <Download className="w-4 h-4" />
          {generateReportMutation.isPending ? "Generating..." : "Download Board Report PDF"}
        </button>
      </Card>
    </div>
  );
}