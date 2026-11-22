import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG, SevBadge, Card, KpiCard, Breadcrumb } from "@/components/gds/GDSOSShared";

function usd(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const GRADE_COLOR = { A: LOW, B: LOW, C: MEDIUM, D: HIGH, F: DANGER };

// Pre-computed FAIR priorities (Part 2 spec)
const TOP_PRIORITIES = [
  { rank: 1, title: "axios: NO_PROXY SSRF (CVE-2025-62718)",               severity: "critical", ale: 2500000, fix_cost: 5000,  roi: "500x"  },
  { rank: 2, title: "axios: Full MITM via Prototype Pollution (CVE-2026-44494)", severity: "high", ale: 2100000, fix_cost: 5000, roi: "420x"  },
  { rank: 3, title: "GuardDuty not enabled",                                severity: "critical", ale: 1500000, fix_cost: 0,     roi: "∞"     },
  { rank: 4, title: "CloudTrail not enabled",                               severity: "critical", ale: 1500000, fix_cost: 0,     roi: "∞"     },
  { rank: 5, title: "lodash: Code Injection via _.template",                severity: "high",     ale: 1300000, fix_cost: 2000,  roi: "662x"  },
  { rank: 6, title: "axios: SSRF (CVE-2024-39338)",                         severity: "high",     ale: 1200000, fix_cost: 5000,  roi: "240x"  },
  { rank: 7, title: "ws: Memory Exhaustion DoS",                            severity: "high",     ale: 890000,  fix_cost: 2000,  roi: "445x"  },
  { rank: 8, title: "axios: Credential Theft (CVE-2026-44495)",             severity: "high",     ale: 760000,  fix_cost: 5000,  roi: "152x"  },
];

const STATIC_RESULT = {
  total_annual_risk_usd: 14600000,
  daily_burn: 40000,
  risk_grade: "D",
  findings_analyzed: 54,
  critical_ale: 5500000,
  highest_single_risk: TOP_PRIORITIES[0],
  regulatory_exposure: ["GDPR €20M", "NIS2 2% revenue", "DORA operational risk", "UK Cyber Essentials"],
  top_findings: TOP_PRIORITIES,
};

export default function GDSFAIRRiskPage() {
  const [result, setResult] = useState(STATIC_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { data: triaged = [] } = useQuery({ queryKey: ["fair-triaged"], queryFn: () => base44.entities.TriagedFinding.filter({ status: "open" }).catch(() => []) });
  const { data: cloudFindings = [] } = useQuery({ queryKey: ["fair-cloud"], queryFn: () => base44.entities.CloudFinding.list("-detected_at", 100).catch(() => []) });

  const recalculate = async () => {
    setLoading(true); setError(null);
    const findings = [...triaged, ...cloudFindings].map(f => ({
      id: f.id, title: f.title, severity: f.severity || f.normalized_severity || "low",
    }));
    try {
      const res = await base44.functions.invoke("gdsFAIRRisk", {
        action: "quantify_all",
        findings,
        org_config: { industry: "technology", size: "smb", annual_revenue_usd: 5000000, gdpr_applicable: true },
      });
      if (res.data?.total_annual_risk_usd) setResult(res.data);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const gradeColor = GRADE_COLOR[result?.risk_grade] || DANGER;
  const topFindings = result?.top_findings || TOP_PRIORITIES;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">💰</span>
        <div>
          <h1 className="text-2xl font-black text-white">Financial Risk (FAIR)</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>Translate security findings into dollar-value business risk for CISO/Board reporting</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={recalculate} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? "Recalculating…" : "Recalculate"}
        </button>
        {error && <p className="text-sm" style={{ color: DANGER }}>{error}</p>}
      </div>

      {/* Hero KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5" style={{ border: `1px solid ${DANGER}30` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>💰 Annual Loss Exposure</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{usd(result.total_annual_risk_usd)}</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>/ year</p>
        </Card>
        <Card className="p-5" style={{ border: `1px solid ${HIGH}30` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>📅 Daily Risk Burn</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>${(result.daily_burn || 40000).toLocaleString()}</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>/ day</p>
        </Card>
        <Card className="p-5" style={{ border: `1px solid ${gradeColor}30` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>🏆 Risk Grade</p>
          <p className="text-4xl font-black font-mono" style={{ color: gradeColor }}>{result.risk_grade || "—"}</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Above median</p>
        </Card>
        <Card className="p-5" style={{ border: `1px solid ${CYAN}20` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>📊 Findings Analyzed</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{result.findings_analyzed || 54}</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Across all pillars</p>
        </Card>
      </div>

      {/* Regulatory Exposure */}
      <Card className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Regulatory Exposure</p>
        <div className="flex gap-2 flex-wrap">
          {(result.regulatory_exposure || []).map(r => (
            <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: HIGH, background: `${HIGH}15`, border: `1px solid ${HIGH}30` }}>{r}</span>
          ))}
        </div>
      </Card>

      {/* Top findings table */}
      {topFindings.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="font-bold text-white">Top Financial Risks</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["#", "Finding", "Severity", "ALE / yr", "Fix Cost", "ROI"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topFindings.map((f, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <td className="px-4 py-2 text-xs font-black font-mono" style={{ color: MUTED }}>{f.rank || i + 1}</td>
                    <td className="px-4 py-2 text-xs text-white max-w-[240px]">{f.title}</td>
                    <td className="px-4 py-2"><SevBadge sev={f.severity} /></td>
                    <td className="px-4 py-2 text-sm font-black font-mono" style={{ color: DANGER }}>{usd(f.ale)}</td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: MUTED }}>{f.fix_cost === 0 ? "$0" : usd(f.fix_cost)}</td>
                    <td className="px-4 py-2 text-sm font-black font-mono" style={{ color: LOW }}>{f.roi || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="p-4 flex items-center gap-3" style={{ border: `1px solid ${CYAN}20` }}>
        <span className="text-xl">📊</span>
        <p className="text-xs" style={{ color: MUTED }}>Based on <span className="font-bold text-white">FAIR methodology (ISO/IEC 27005)</span>. Org profile: SMB technology company, $5M ARR, GDPR applicable. Industry breach median: $4.45M.</p>
      </Card>
    </div>
  );
}