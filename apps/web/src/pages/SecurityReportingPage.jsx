import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  FileText, TrendingUp, Shield, CheckCircle, AlertTriangle, 
  Download, Calendar, BarChart3, PieChart, Activity, ArrowUpRight,
  ArrowDownRight, Clock, Target, Layers, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const GOLD = "#C9A84C";
const COLORS = ["#C9A84C", "#6366F1", "#10B981", "#EF4444", "#F97316", "#3B82F6"];

const COMPLIANCE_FRAMEWORKS = [
  { id: "soc2", name: "SOC 2", controls: 85, color: "#6366F1" },
  { id: "iso27001", name: "ISO 27001", controls: 114, color: "#10B981" },
  { id: "gdpr", name: "GDPR", controls: 99, color: "#3B82F6" },
  { id: "hipaa", name: "HIPAA", controls: 78, color: "#F97316" },
  { id: "pci", name: "PCI DSS", controls: 142, color: "#EF4444" },
];

export default function SecurityReportingPage() {
  const [exporting, setExporting] = useState(false);
  const [reportType, setReportType] = useState("executive");

  const { data: vulnerabilities = [] } = useQuery({
    queryKey: ["report-vulns"],
    queryFn: () => base44.entities.Vulnerability.list("-created_date", 500),
    initialData: [],
  });

  const { data: weeklyReports = [] } = useQuery({
    queryKey: ["weekly-reports"],
    queryFn: () => base44.entities.WeeklySecurityReport.list("-generated_at", 12),
    initialData: [],
  });

  const { data: complianceControls = [] } = useQuery({
    queryKey: ["compliance-controls"],
    queryFn: () => base44.entities.ComplianceControl.list("", 200),
    initialData: [],
  });

  const { data: triagedFindings = [] } = useQuery({
    queryKey: ["triaged-findings"],
    queryFn: () => base44.entities.TriagedFinding.list("-detected_at", 300),
    initialData: [],
  });

  const { data: cloudFindings = [] } = useQuery({
    queryKey: ["cloud-findings"],
    queryFn: () => base44.entities.CloudFinding.list("-detected_at", 200),
    initialData: [],
  });

  const severityDist = {
    critical: vulnerabilities.filter(v => v.severity === "critical").length,
    high: vulnerabilities.filter(v => v.severity === "high").length,
    medium: vulnerabilities.filter(v => v.severity === "medium").length,
    low: vulnerabilities.filter(v => v.severity === "low").length,
  };

  const complianceProgress = COMPLIANCE_FRAMEWORKS.map(fw => {
    const fwControls = complianceControls.filter(c => c.framework === fw.id);
    const passed = fwControls.filter(c => c.status === "passing").length;
    const total = fw.controls;
    const pct = Math.round((passed / total) * 100);
    return { ...fw, passed, total, pct };
  });

  const overallComplianceScore = Math.round(
    complianceProgress.reduce((sum, f) => sum + f.pct, 0) / complianceProgress.length
  );

  const trendData = weeklyReports.slice(-8).map(r => ({
    week: new Date(r.week_start).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
    risk_score: r.risk_score,
    findings: r.total_findings,
    compliance: r.compliance_score,
  }));

  const postureData = [
    { name: "Code Security", score: Math.round(100 - (vulnerabilities.length > 0 ? (severityDist.critical * 10 + severityDist.high * 5) / Math.max(vulnerabilities.length, 1) * 10 : 0)), color: "#6366F1" },
    { name: "Cloud Security", score: Math.round(100 - (cloudFindings.length * 2)), color: "#10B981" },
    { name: "Compliance", score: overallComplianceScore, color: GOLD },
    { name: "Threat Intel", score: Math.min(100, 70 + triagedFindings.length), color: "#F97316" },
  ];

  const exportPDF = async () => {
    setExporting(true);
    try {
      const element = document.getElementById("report-content");
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ShieldAI-${reportType}-report-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const kpis = {
    totalFindings: vulnerabilities.length,
    criticalFindings: severityDist.critical,
    avgRemediationDays: Math.round(vulnerabilities.filter(v => v.resolved_at).length > 0 ? 
      vulnerabilities.filter(v => v.resolved_at).reduce((sum, v) => {
        const start = new Date(v.created_date);
        const end = new Date(v.resolved_at);
        return sum + (end - start) / (1000 * 60 * 60 * 24);
      }, 0) / vulnerabilities.filter(v => v.resolved_at).length : 0),
    complianceScore: overallComplianceScore,
  };

  return (
    <div className="p-6 space-y-6 bg-[#0A0E1A] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-6 h-6" style={{ color: GOLD }} />
            Security Reporting Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">Executive-ready security posture & compliance trends</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#111827] border border-[#1F2937] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
          >
            <option value="executive">Executive Summary</option>
            <option value="technical">Technical Deep Dive</option>
            <option value="board">Board Report</option>
            <option value="compliance">Compliance Status</option>
          </select>
          <Button onClick={exportPDF} disabled={exporting} className="text-white" style={{ background: GOLD }}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Generating PDF..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div id="report-content" className="space-y-6">
        {/* Executive Summary Header */}
        <div className="rounded-2xl p-8 bg-gradient-to-r from-[#111827] to-[#1F2937] border border-[#1F2937]">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs font-bold tracking-widest mb-2" style={{ color: GOLD }}>
                {reportType.toUpperCase()} REPORT
              </div>
              <h2 className="text-3xl font-black text-white mb-2">
                Security Posture & Compliance Readiness
              </h2>
              <p className="text-slate-400 text-sm">
                Generated on {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black mb-1" style={{ color: overallComplianceScore >= 80 ? "#10B981" : overallComplianceScore >= 60 ? "#F97316" : "#EF4444" }}>
                {overallComplianceScore}
              </div>
              <div className="text-xs font-bold text-slate-400">OVERALL COMPLIANCE SCORE</div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-5 bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle className="w-5 h-5" style={{ color: "#EF4444" }} />
              {kpis.criticalFindings > 0 ? (
                <ArrowUpRight className="w-4 h-4 text-red-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <div className="text-3xl font-black text-white mb-1">{kpis.criticalFindings}</div>
            <div className="text-xs text-slate-400">Critical Findings</div>
          </Card>

          <Card className="p-5 bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-5 h-5" style={{ color: "#6366F1" }} />
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-white mb-1">{kpis.totalFindings}</div>
            <div className="text-xs text-slate-400">Total Findings</div>
          </Card>

          <Card className="p-5 bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-5 h-5" style={{ color: "#F97316" }} />
              {kpis.avgRemediationDays <= 7 ? (
                <ArrowDownRight className="w-4 h-4 text-emerald-500" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="text-3xl font-black text-white mb-1">{kpis.avgRemediationDays}</div>
            <div className="text-xs text-slate-400">Avg Remediation (Days)</div>
          </Card>

          <Card className="p-5 bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center justify-between mb-3">
              <Shield className="w-5 h-5" style={{ color: GOLD }} />
              <Target className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-white mb-1">{kpis.complianceScore}%</div>
            <div className="text-xs text-slate-400">Compliance Score</div>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-2 gap-6">
          {/* Risk Trend */}
          <Card className="p-6 bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" style={{ color: "#6366F1" }} />
              <h3 className="text-sm font-semibold text-white">Risk Score Trend</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="week" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #1F2937", borderRadius: "8px" }}
                  labelStyle={{ color: "#F9FAFB" }}
                />
                <Area type="monotone" dataKey="risk_score" stroke="#6366F1" fill="url(#riskGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Compliance Progress */}
          <Card className="p-6 bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5" style={{ color: "#10B981" }} />
              <h3 className="text-sm font-semibold text-white">Compliance by Framework</h3>
            </div>
            <div className="space-y-3">
              {complianceProgress.map((fw) => (
                <div key={fw.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">{fw.name}</span>
                    <span className="text-slate-400">{fw.passed}/{fw.total} controls ({fw.pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1F2937] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${fw.pct}%`, background: fw.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-2 gap-6">
          {/* Severity Distribution */}
          <Card className="p-6 bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5" style={{ color: "#F97316" }} />
              <h3 className="text-sm font-semibold text-white">Finding Severity Distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPie>
                <Pie
                  data={[
                    { name: "Critical", value: severityDist.critical },
                    { name: "High", value: severityDist.high },
                    { name: "Medium", value: severityDist.medium },
                    { name: "Low", value: severityDist.low },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => value > 0 ? `${name} (${value})` : null}
                  labelLine={false}
                >
                  {[
                    { name: "Critical", fill: "#EF4444" },
                    { name: "High", fill: "#F97316" },
                    { name: "Medium", fill: "#EAB308" },
                    { name: "Low", fill: "#3B82F6" },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #1F2937", borderRadius: "8px" }}
                  labelStyle={{ color: "#F9FAFB" }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </Card>

          {/* Security Posture Pillars */}
          <Card className="p-6 bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5" style={{ color: GOLD }} />
              <h3 className="text-sm font-semibold text-white">Security Posture Pillars</h3>
            </div>
            <div className="space-y-4">
              {postureData.map((pillar) => (
                <div key={pillar.name}>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-300 font-medium">{pillar.name}</span>
                    <span className="font-bold" style={{ color: pillar.color }}>{pillar.score}/100</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#1F2937] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pillar.score}%`, background: pillar.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Findings Table */}
        <Card className="p-6 bg-[#111827] border border-[#1F2937]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5" style={{ color: "#6366F1" }} />
            <h3 className="text-sm font-semibold text-white">Top Critical Findings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F2937]">
                  <th className="text-left text-xs font-semibold text-slate-400 pb-3">Finding</th>
                  <th className="text-left text-xs font-semibold text-slate-400 pb-3">Asset</th>
                  <th className="text-left text-xs font-semibold text-slate-400 pb-3">CVE</th>
                  <th className="text-left text-xs font-semibold text-slate-400 pb-3">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-400 pb-3">Age</th>
                </tr>
              </thead>
              <tbody>
                {vulnerabilities.filter(v => v.severity === "critical" || v.severity === "high").slice(0, 10).map((v) => (
                  <tr key={v.id} className="border-b border-[#1F2937] last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${v.severity === "critical" ? "border-red-500 text-red-400" : "border-orange-500 text-orange-400"}`}>
                          {v.severity}
                        </Badge>
                        <span className="text-sm text-white font-medium">{v.title}</span>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-slate-400">{v.asset_name || "—"}</td>
                    <td className="py-3 text-sm font-mono text-slate-400">{v.cve_id || "—"}</td>
                    <td className="py-3">
                      <Badge variant="outline" className="text-[10px] border-[#374151] text-slate-400 capitalize">
                        {v.status?.replace("_", " ") || "open"}
                      </Badge>
                    </td>
                    <td className="py-3 text-sm text-slate-400">
                      {v.created_date ? Math.floor((Date.now() - new Date(v.created_date).getTime()) / (1000 * 60 * 60 * 24)) : 0} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vulnerabilities.filter(v => v.severity === "critical" || v.severity === "high").length === 0 && (
              <div className="text-center text-slate-500 text-sm py-8">No critical or high findings</div>
            )}
          </div>
        </Card>

        {/* Footer */}
        <div className="rounded-xl p-6 bg-[#111827] border border-[#1F2937]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white mb-1">Report Metadata</div>
              <div className="text-xs text-slate-400">
                {vulnerabilities.length} total findings • {complianceControls.length} controls assessed • {COMPLIANCE_FRAMEWORKS.length} frameworks tracked
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-400 mb-1">POWERED BY</div>
              <div className="text-sm font-black" style={{ color: GOLD }}>ShieldAI</div>
              <div className="text-[10px] text-slate-500">SOVEREIGN SECURITY</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}