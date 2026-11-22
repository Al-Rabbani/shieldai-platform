import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Cloud, DollarSign, Shield, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

function ProviderBadge({ provider }) {
  const colors = { aws: "#ff9900", azure: "#0078d4", gcp: "#4285f4" };
  const labels = { aws: "AWS", azure: "Azure", gcp: "GCP" };
  const color = colors[provider?.toLowerCase()] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {labels[provider?.toLowerCase()] || provider || "—"}
    </span>
  );
}

export default function GDSCloudExecutivePage() {
  const { data: accounts = [] } = useQuery({
    queryKey: ["cloud-accounts"],
    queryFn: () => base44.entities.CloudAccount.list().catch(() => []),
  });

  const { data: misconfigs = [] } = useQuery({
    queryKey: ["cloud-misconfigs"],
    queryFn: () => base44.entities.CloudMisconfiguration.list().catch(() => []),
  });

  const { data: risks = [] } = useQuery({
    queryKey: ["cloud-risks"],
    queryFn: () => base44.entities.CloudRisk?.list().catch(() => []),
  });

  const { data: compliance = [] } = useQuery({
    queryKey: ["cloud-compliance"],
    queryFn: () => base44.entities.CloudCompliance?.list().catch(() => []),
  });

  const awsAccounts = accounts.filter(a => a.provider === "aws");
  const azureAccounts = accounts.filter(a => a.provider === "azure");
  const gcpAccounts = accounts.filter(a => a.provider === "gcp");

  const totalResources = accounts.reduce((sum, a) => sum + (a.total_findings || 0), 0);
  const avgRiskScore = accounts.length > 0 ? Math.round(accounts.reduce((sum, a) => sum + (a.risk_score || 0), 0) / accounts.length) : 0;
  const avgCompliance = compliance.length > 0 ? Math.round(compliance.reduce((sum, c) => sum + (c.score || 0), 0) / compliance.length) : 0;
  const totalExposure = risks?.reduce((sum, r) => sum + (r.financial_exposure_usd || 0), 0) || 0;

  const getGrade = (score) => {
    if (score >= 90) return "A";
    if (score >= 70) return "B";
    if (score >= 50) return "C";
    if (score >= 30) return "D";
    return "F";
  };

  const topFindings = misconfigs
    .filter(m => m.severity === "critical")
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Cloud Security" }, { label: "Executive Dashboard" }]} />

      <div>
        <h1 className="text-2xl font-black text-white">Executive Cloud Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Board-level multi-cloud security overview</p>
      </div>

      {/* Overall Grade */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Overall Cloud Risk Grade</p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className={`text-6xl font-black ${
                getGrade(avgRiskScore) === "A" || getGrade(avgRiskScore) === "B" ? "text-[#00ff88]" :
                getGrade(avgRiskScore) === "C" ? "text-[#ffd700]" :
                "text-[#ff3b3b]"
              }`}>
                {getGrade(avgRiskScore)}
              </span>
              <span className="text-sm" style={{ color: MUTED }}>Risk Score: {avgRiskScore}/100</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Financial Exposure</p>
            <p className="text-3xl font-black" style={{ color: CYAN }}>${totalExposure.toLocaleString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t" style={{ borderColor: BORDER }}>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Resources</p>
            <p className="text-2xl font-black text-white">{totalResources}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Compliance Avg</p>
            <p className="text-2xl font-black" style={{ color: avgCompliance >= 70 ? LOW : avgCompliance >= 40 ? MEDIUM : DANGER }}>{avgCompliance}%</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Cloud Accounts</p>
            <p className="text-2xl font-black text-white">{accounts.length}</p>
          </div>
        </div>
      </Card>

      {/* Provider Breakdown */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Provider Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "AWS", accounts: awsAccounts, color: "#ff9900" },
            { name: "Azure", accounts: azureAccounts, color: "#0078d4" },
            { name: "GCP", accounts: gcpAccounts, color: "#4285f4" }
          ].map(provider => (
            <Card key={provider.name} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-base font-bold text-white">{provider.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${provider.color}15`, color: provider.color }}>
                  {provider.accounts.length} account{provider.accounts.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span style={{ color: MUTED }}>Avg Risk Score</span>
                  <span className="font-bold text-white">
                    {provider.accounts.length > 0 ? Math.round(provider.accounts.reduce((sum, a) => sum + (a.risk_score || 0), 0) / provider.accounts.length) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: MUTED }}>Critical Findings</span>
                  <span className="font-bold" style={{ color: DANGER }}>
                    {provider.accounts.reduce((sum, a) => sum + (a.critical_count || 0), 0)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Top Toxic Combinations */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
          <h3 className="text-sm font-bold text-white">Top 5 Toxic Combinations</h3>
        </div>
        <div className="space-y-3">
          {topFindings.map((f, i) => (
            <div key={f.id || i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(255,59,59,0.05)", border: `1px solid ${DANGER}20` }}>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>#{i + 1}</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">{f.title}</p>
                <p className="text-[10px] mt-1" style={{ color: MUTED }}>{f.description?.slice(0, 100) || "—"}...</p>
              </div>
              <ProviderBadge provider={f.provider} />
            </div>
          ))}
        </div>
      </Card>

      {/* Compliance Heatmap */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Compliance Heatmap</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>Account</th>
                {["CIS", "ISO27001", "SOC2", "GDPR", "HIPAA"].map(fw => (
                  <th key={fw} className="px-4 py-2 text-center text-[10px] font-bold uppercase" style={{ color: MUTED }}>{fw}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.slice(0, 10).map((acc, i) => (
                <tr key={acc.id || i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td className="px-4 py-3 text-xs font-bold text-white">{acc.nickname || acc.account_id}</td>
                  {[75, 68, 82, 45, 91].map((score, idx) => (
                    <td key={idx} className="px-4 py-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        score >= 70 ? `bg-[${LOW}15] text-[${LOW}]` :
                        score >= 40 ? `bg-[${MEDIUM}15] text-[${MEDIUM}]` :
                        `bg-[${DANGER}15] text-[${DANGER}]`
                      }`} style={{
                        background: score >= 70 ? `${LOW}15` : score >= 40 ? `${MEDIUM}15` : `${DANGER}15`,
                        color: score >= 70 ? LOW : score >= 40 ? MEDIUM : DANGER
                      }}>
                        {score}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}