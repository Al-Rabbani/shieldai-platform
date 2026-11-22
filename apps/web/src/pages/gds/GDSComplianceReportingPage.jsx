import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Shield, CheckSquare, TrendingUp, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";
import { toast } from "sonner";

export default function GDSComplianceReportingPage() {
  const [framework, setFramework] = useState("soc2");
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeFindings, setIncludeFindings] = useState(true);

  const generateReport = useMutation({
    mutationFn: async (params) => {
      const response = await base44.functions.invoke('gdsExportComplianceReport', params);
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${framework.toUpperCase()}_Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${framework.toUpperCase()} compliance report downloaded`);
    },
    onError: (error) => {
      toast.error(`Failed to generate report: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    generateReport.mutate({
      framework,
      include_evidence: includeEvidence,
      include_findings: includeFindings
    });
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Compliance", path: "/compliance" }, { label: "Reporting" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <FileText className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Compliance Reporting</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Export formatted PDF compliance status snapshots</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Configuration */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: CYAN }} />
            Generate Compliance Report
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color: MUTED }}>Framework</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFramework("soc2")}
                  className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold transition-all ${framework === "soc2" ? "" : "hover:opacity-70"}`}
                  style={{
                    background: framework === "soc2" ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${framework === "soc2" ? CYAN + "40" : BORDER}`,
                    color: framework === "soc2" ? CYAN : MUTED
                  }}
                >
                  SOC 2
                </button>
                <button
                  onClick={() => setFramework("iso27001")}
                  className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold transition-all ${framework === "iso27001" ? "" : "hover:opacity-70"}`}
                  style={{
                    background: framework === "iso27001" ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${framework === "iso27001" ? CYAN + "40" : BORDER}`,
                    color: framework === "iso27001" ? CYAN : MUTED
                  }}
                >
                  ISO 27001
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 text-xs cursor-pointer p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <input
                  type="checkbox"
                  checked={includeEvidence}
                  onChange={(e) => setIncludeEvidence(e.target.checked)}
                  className="w-4 h-4"
                  style={{ accentColor: CYAN }}
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">Include Evidence Summary</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>List all evidence artifacts mapped to controls</p>
                </div>
                <CheckSquare className="w-4 h-4" style={{ color: includeEvidence ? CYAN : MUTED }} />
              </label>

              <label className="flex items-center gap-3 text-xs cursor-pointer p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <input
                  type="checkbox"
                  checked={includeFindings}
                  onChange={(e) => setIncludeFindings(e.target.checked)}
                  className="w-4 h-4"
                  style={{ accentColor: CYAN }}
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">Include Open Findings</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>Show unresolved security findings impacting compliance</p>
                </div>
                <CheckSquare className="w-4 h-4" style={{ color: includeFindings ? CYAN : MUTED }} />
              </label>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generateReport.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
            >
              {generateReport.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-cyan-400 rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate PDF Report
                </>
              )}
            </button>
          </div>
        </Card>

        {/* Report Preview Stats */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
            Report Preview
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}20` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Framework</p>
                <Shield className="w-4 h-4" style={{ color: CYAN }} />
              </div>
              <p className="text-lg font-black text-white">{framework === "soc2" ? "SOC 2 Type II" : "ISO/IEC 27001:2022"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: "rgba(0,255,136,0.05)", border: `1px solid ${LOW}20` }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Sections</p>
                <p className="text-xl font-black" style={{ color: LOW }}>3</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,140,0,0.05)", border: `1px solid ${HIGH}20` }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Format</p>
                <p className="text-xl font-black" style={{ color: HIGH }}>PDF</p>
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <p className="text-xs font-bold text-white mb-2">Report Includes:</p>
              <ul className="space-y-1 text-[10px]" style={{ color: MUTED }}>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" style={{ color: LOW }} />
                  Executive summary with compliance score
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" style={{ color: LOW }} />
                  Control status summary table
                </li>
                {includeEvidence && (
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" style={{ color: CYAN }} />
                    Evidence artifact summary
                  </li>
                )}
                {includeFindings && (
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" style={{ color: CYAN }} />
                    Open security findings list
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" style={{ color: LOW }} />
                  Professional formatting with headers/footers
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: `${DANGER}05`, border: `1px solid ${DANGER}20` }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: DANGER }} />
              <p className="text-[10px]" style={{ color: MUTED }}>
                Reports are generated in real-time from current compliance data. Ensure all control assessments are up to date.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CheckCircle({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}