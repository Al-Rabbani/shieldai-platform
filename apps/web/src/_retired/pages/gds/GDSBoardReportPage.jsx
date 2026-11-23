import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Calendar } from "lucide-react";
import { CARD, BORDER, CYAN, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSBoardReportPage() {
  const [periodDays, setPeriodDays] = useState(30);

  const generateReportMutation = useMutation({
    mutationFn: (params) => base44.functions.invoke("gdsExecutiveIntelligence", { action: 'board_report', ...params }),
  });

  const handleGenerateReport = async () => {
    const response = await generateReportMutation.mutateAsync({ period_days: periodDays });
    console.log('Board report generated:', response.data);
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Board Report" }]} />

      <div className="flex items-start gap-3 mb-6">
        <FileText className="w-6 h-6" style={{ color: CYAN }} />
        <div>
          <h1 className="text-2xl font-black text-white">Board Report Generator</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Generate executive board reports</p>
        </div>
      </div>

      <Card className="p-6 max-w-2xl">
        <h3 className="text-sm font-bold text-white mb-4">Report Configuration</h3>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: MUTED }} />
            <span className="text-xs font-semibold" style={{ color: MUTED }}>Period:</span>
          </div>
          <div className="flex gap-2">
            {[30, 60, 90].map(days => (
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
          className="w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          style={{
            background: generateReportMutation.isPending ? "rgba(255,255,255,0.1)" : `${CYAN}15`,
            border: `1px solid ${CYAN}40`,
            color: generateReportMutation.isPending ? MUTED : CYAN
          }}
        >
          {generateReportMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: CYAN }} />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Generate Board Report PDF
            </>
          )}
        </button>

        <div className="mt-6 p-4 rounded-xl" style={{ background: `${CYAN}05`, border: `1px solid ${CYAN}20` }}>
          <p className="text-xs font-bold text-white mb-2">Report Includes:</p>
          <ul className="text-[10px] space-y-1" style={{ color: MUTED }}>
            <li>• Executive summary with key metrics</li>
            <li>• Findings breakdown by severity</li>
            <li>• Incident response summary</li>
            <li>• Compliance framework status</li>
            <li>• Risk trends and recommendations</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}