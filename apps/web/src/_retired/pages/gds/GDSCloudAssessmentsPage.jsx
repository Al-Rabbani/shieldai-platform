import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Play, Search } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

function ComplianceGauge({ score, size = 50 }) {
  const r = size / 2 - 5;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = score >= 70 ? LOW : score >= 40 ? MEDIUM : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 3} fill={color} fontSize={size * 0.25} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
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

export default function GDSCloudAssessmentsPage() {
  const [search, setSearch] = useState("");

  const { data: assessments = [] } = useQuery({
    queryKey: ["cloud-assessments"],
    queryFn: () => base44.entities.CloudAssessment?.list("-started_at", 500).catch(() => []),
  });

  const filtered = assessments.filter(a => 
    a.assessment_id?.toLowerCase().includes(search.toLowerCase()) ||
    a.account?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Cloud Security" }, { label: "Assessments" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Cloud Assessments</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>CSPM, CIEM, and CWPP scan history</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Play className="w-4 h-4" />
          Run New Assessment
        </button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assessments..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
      </Card>

      {/* Assessments Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Assessment ID", "Account", "Provider", "Type", "Status", "Resources", "Misconfigs", "Critical", "Compliance", "Duration", "Started", "Completed"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{a.assessment_id || "—"}</td>
                  <td className="px-4 py-3 text-xs font-bold text-white">{a.account || "—"}</td>
                  <td className="px-4 py-3"><ProviderBadge provider={a.provider} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      a.type === "cspm" ? `bg-[${CYAN}15] text-[${CYAN}]` :
                      a.type === "ciem" ? `bg-[${HIGH}15] text-[${HIGH}]` :
                      "bg-gray-700 text-gray-300"
                    }`} style={{
                      background: a.type === "cspm" ? `${CYAN}15` : 
                                 a.type === "ciem" ? `${HIGH}15` : "rgba(100,116,139,0.15)",
                      color: a.type === "cspm" ? CYAN : 
                             a.type === "ciem" ? HIGH : MUTED
                    }}>
                      {a.type?.toUpperCase() || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      a.status === "completed" ? `bg-[${LOW}15] text-[${LOW}]` :
                      a.status === "running" ? `bg-[${CYAN}15] text-[${CYAN}]` :
                      "bg-gray-700 text-gray-300"
                    }`} style={{
                      background: a.status === "completed" ? `${LOW}15` : 
                                 a.status === "running" ? `${CYAN}15` : "rgba(100,116,139,0.15)",
                      color: a.status === "completed" ? LOW : 
                             a.status === "running" ? CYAN : MUTED
                    }}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: TEXT }}>{a.resources_scanned || 0}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: TEXT }}>{a.misconfigs_found || 0}</td>
                  <td className="px-4 py-3">
                    {a.critical_count > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{a.critical_count}</span>
                    ) : (
                      <span className="text-[10px]" style={{ color: MUTED }}>0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ComplianceGauge score={a.compliance_score} size={40} />
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{a.duration_seconds ? `${a.duration_seconds}s` : "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{a.started_at ? new Date(a.started_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{a.completed_at ? new Date(a.completed_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}