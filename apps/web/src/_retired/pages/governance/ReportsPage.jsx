import React, { useState } from "react";
import { FileText, TrendingUp, Shield, Package, Clock, Users, Download, Calendar } from "lucide-react";

const REPORT_TYPES = [
  {
    id: "security-audit",
    title: "Security Audit Report",
    description: "A full snapshot of your security posture — all open findings by severity, remediation status, SLA compliance. Suitable for auditors and boards.",
    icon: FileText,
    color: "#3b82f6",
  },
  {
    id: "trends",
    title: "Trends Over Time",
    description: "How your security posture is changing. Open findings over time, MTTR, SLA breach rate, remediation velocity.",
    icon: TrendingUp,
    color: "#10b981",
  },
  {
    id: "malware",
    title: "Malware Monitor Report",
    description: "Track every malicious package detected, blocked, and resolved across your entire supply chain. Includes package name, registry, detection method, and action taken.",
    icon: Shield,
    color: "#ef4444",
  },
  {
    id: "runtimes",
    title: "Runtimes & Frameworks Report",
    description: "Full inventory of every runtime, framework, and library version across all your repos and containers. Highlights EOL software and outdated versions.",
    icon: Package,
    color: "#f97316",
  },
  {
    id: "sla",
    title: "SLA Insights & Issues",
    description: "Which findings have breached SLA. Mean time to remediation by team and severity. SLA compliance rate over time.",
    icon: Clock,
    color: "#8b5cf6",
  },
  {
    id: "team",
    title: "Team Comparison Report",
    description: "Compare security performance across teams. Which team has the most open criticals? Best MTTR? Most AutoFix PRs merged?",
    icon: Users,
    color: "#06b6d4",
  },
];

function ReportCard({ report }) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="rounded-xl p-5" style={{ 
      background: "linear-gradient(145deg, #0f172a, #0a0f1e)",
      border: `1px solid ${report.color}30`,
    }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${report.color}20` }}>
          <report.icon className="w-5 h-5" style={{ color: report.color }} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white mb-1">{report.title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{report.description}</p>
        </div>
      </div>

      {showFilters && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(30,58,95,0.2)" }}>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Date Range</label>
              <select className="w-full px-2 py-1.5 rounded text-xs" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)", color: "#f8fafc" }}>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Custom</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Team</label>
              <select className="w-full px-2 py-1.5 rounded text-xs" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)", color: "#f8fafc" }}>
                <option>All Teams</option>
                <option>Backend</option>
                <option>Frontend</option>
                <option>DevOps</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2" style={{ background: report.color, color: "#fff" }}>
          <Download className="w-3 h-3" /> Generate Report
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: "rgba(30,58,95,0.4)", color: "#94a3b8" }}
        >
          <Calendar className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Security Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Generate audit-ready reports for compliance, boards, and team reviews.</p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORT_TYPES.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>

      {/* Info Banner */}
      <div className="rounded-xl p-4" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)" }}>
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-blue-400">Note:</span> Reports are generated as PDF documents with your organization's branding. 
          All reports include executive summaries and technical appendices suitable for different audiences.
        </p>
      </div>
    </div>
  );
}