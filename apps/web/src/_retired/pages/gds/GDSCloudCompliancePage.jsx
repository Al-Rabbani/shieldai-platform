import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

function ComplianceGauge({ score, size = 60 }) {
  const r = size / 2 - 6;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = score >= 70 ? LOW : score >= 40 ? MEDIUM : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 4} fill={color} fontSize={size * 0.25} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

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

export default function GDSCloudCompliancePage() {
  const { data: compliance = [] } = useQuery({
    queryKey: ["cloud-compliance"],
    queryFn: () => base44.entities.CloudCompliance?.list().catch(() => []),
  });

  const getGrade = (score) => {
    if (score >= 90) return "A";
    if (score >= 70) return "B";
    if (score >= 50) return "C";
    if (score >= 30) return "D";
    return "F";
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Cloud Security" }, { label: "Compliance Dashboard" }]} />

      <div>
        <h1 className="text-2xl font-black text-white">Cloud Compliance Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Multi-framework compliance posture across cloud accounts</p>
      </div>

      {/* Compliance Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">Compliance Assessments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Account", "Provider", "Framework", "Version", "Total", "Passing", "Failing", "Not Tested", "Score", "Grade", "Critical Failures", "Last Assessed", "Next"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compliance.map((c, i) => (
                <tr key={c.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                  <td className="px-4 py-3 text-xs font-bold text-white">{c.account_name || c.account || "—"}</td>
                  <td className="px-4 py-3"><ProviderBadge provider={c.provider} /></td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
                      {c.framework || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{c.version || "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: TEXT }}>{c.total_controls || 0}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>{c.passing_controls || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{c.failing_controls || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{c.not_tested || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${c.score || 0}%`, background: (c.score || 0) >= 70 ? LOW : (c.score || 0) >= 40 ? MEDIUM : DANGER }} />
                      </div>
                      <span className="text-xs font-mono" style={{ color: TEXT }}>{c.score || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-lg font-black ${
                      getGrade(c.score) === "A" || getGrade(c.score) === "B" ? "text-[#00ff88]" :
                      getGrade(c.score) === "C" ? "text-[#ffd700]" :
                      "text-[#ff3b3b]"
                    }`}>
                      {getGrade(c.score)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.critical_failures > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{c.critical_failures}</span>
                    ) : (
                      <span className="text-[10px]" style={{ color: MUTED }}>0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{c.last_assessed ? new Date(c.last_assessed).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{c.next_assessment ? new Date(c.next_assessment).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Compliance Trend Chart Placeholder */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Compliance Trend Over Time</h3>
        </div>
        <div className="h-64 flex items-center justify-center" style={{ background: "rgba(0,212,255,0.02)", borderRadius: 12, border: `1px solid ${BORDER}` }}>
          <p className="text-sm" style={{ color: MUTED }}>Compliance trend visualization — integrate with historical compliance data</p>
        </div>
      </Card>
    </div>
  );
}