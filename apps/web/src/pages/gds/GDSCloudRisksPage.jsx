import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Skull, TrendingUp, DollarSign, Shield } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge } from "@/components/gds/GDSOSShared";

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

export default function GDSCloudRisksPage() {
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: risks = [] } = useQuery({
    queryKey: ["cloud-risks"],
    queryFn: () => base44.entities.CloudRisk?.list("-created_at", 500).catch(() => []),
  });

  const toxicCount = risks.filter(r => r.risk_type === "toxic_combination").length;
  const attackPaths = risks.filter(r => r.risk_type === "attack_path").length;
  const totalExposure = risks.reduce((sum, r) => sum + (r.financial_exposure_usd || 0), 0);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Cloud Security" }, { label: "Risk Explorer" }]} />

      <div>
        <h1 className="text-2xl font-black text-white">Cloud Risk Explorer</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Toxic combinations, attack paths, and financial exposure</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Risks</p>
          <p className="text-2xl font-black text-white mt-2">{risks.length}</p>
        </Card>

        <Card className="p-4" glow>
          <div className="flex items-center gap-2 mb-2">
            <Skull className="w-4 h-4" style={{ color: DANGER }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Toxic Combos</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: DANGER }} />
            <p className="text-2xl font-black" style={{ color: DANGER }}>{toxicCount}</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" style={{ color: HIGH }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Attack Paths</p>
          </div>
          <p className="text-2xl font-black" style={{ color: HIGH }}>{attackPaths}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" style={{ color: CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Financial Exposure</p>
          </div>
          <p className="text-2xl font-black" style={{ color: CYAN }}>${totalExposure.toLocaleString()}</p>
        </Card>
      </div>

      {/* Risks Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">Cloud Risks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Title", "Type", "Severity", "Provider", "Financial Exposure", "Auto-Remediable", "Priority", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {risks.map((r, i) => (
                <React.Fragment key={r.id || i}>
                  <tr 
                    onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                    style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f", cursor: "pointer" }}
                  >
                    <td className="px-4 py-3 text-xs font-bold text-white max-w-xs truncate">{r.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {r.risk_type === "toxic_combination" && <Skull className="w-3.5 h-3.5" style={{ color: DANGER }} />}
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          r.risk_type === "toxic_combination" ? `bg-[${DANGER}15] text-[${DANGER}]` :
                          r.risk_type === "attack_path" ? `bg-[${HIGH}15] text-[${HIGH}]` :
                          "bg-gray-700 text-gray-300"
                        }`} style={{
                          background: r.risk_type === "toxic_combination" ? `${DANGER}15` : 
                                     r.risk_type === "attack_path" ? `${HIGH}15` : "rgba(100,116,139,0.15)",
                          color: r.risk_type === "toxic_combination" ? DANGER : 
                                 r.risk_type === "attack_path" ? HIGH : MUTED
                        }}>
                          {r.risk_type || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><SevBadge sev={r.severity} /></td>
                    <td className="px-4 py-3"><ProviderBadge provider={r.provider} /></td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>${(r.financial_exposure_usd || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {r.auto_remediable ? (
                        <Shield className="w-3.5 h-3.5" style={{ color: LOW }} />
                      ) : (
                        <span className="text-[10px]" style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        r.remediation_priority <= 3 ? `bg-[${DANGER}15] text-[${DANGER}]` :
                        r.remediation_priority <= 7 ? `bg-[${HIGH}15] text-[${HIGH}]` :
                        "bg-gray-700 text-gray-300"
                      }`} style={{
                        background: r.remediation_priority <= 3 ? `${DANGER}15` : 
                                   r.remediation_priority <= 7 ? `${HIGH}15` : "rgba(100,116,139,0.15)",
                        color: r.remediation_priority <= 3 ? DANGER : 
                               r.remediation_priority <= 7 ? HIGH : MUTED
                      }}>
                        P{r.remediation_priority || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        r.status === "open" ? `bg-[${DANGER}15] text-[${DANGER}]` :
                        r.status === "in_progress" ? `bg-[${HIGH}15] text-[${HIGH}]` :
                        "bg-gray-700 text-gray-300"
                      }`} style={{
                        background: r.status === "open" ? `${DANGER}15` : 
                                   r.status === "in_progress" ? `${HIGH}15` : "rgba(100,116,139,0.15)",
                        color: r.status === "open" ? DANGER : 
                               r.status === "in_progress" ? HIGH : MUTED
                      }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                  {expandedRow === r.id && r.attack_path && (
                    <tr>
                      <td colSpan={8} className="px-4 py-3" style={{ background: "#050e1f" }}>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-white mb-2">Attack Path Steps</p>
                          {r.attack_path.split("→").map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: CYAN, color: "#020817" }}>{idx + 1}</span>
                              <span className="text-white">{step.trim()}</span>
                              {idx < r.attack_path.split("→").length - 1 && (
                                <span className="text-[10px]" style={{ color: MUTED }}>→</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}