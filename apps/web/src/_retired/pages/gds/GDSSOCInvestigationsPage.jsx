import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, Search, FileText, Crosshair } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";

const BG = "#020817";

function ConfidenceGauge({ value, size = 50 }) {
  const radius = size / 2 - 5;
  const circumference = Math.PI * radius;
  const pct = (value / 100) * circumference;
  const color = value >= 80 ? LOW : value >= 60 ? MEDIUM : value >= 40 ? HIGH : DANGER;
  return (
    <div className="relative" style={{ width: size, height: size * 0.6 }}>
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
        <path d={`M ${5} ${size * 0.5} A ${radius} ${radius} 0 1 1 ${size - 5} ${size * 0.5}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" strokeLinecap="round" />
        <path d={`M ${5} ${size * 0.5} A ${radius} ${radius} 0 1 1 ${size - 5} ${size * 0.5}`} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${pct} ${circumference - pct}`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-black" style={{ color, paddingTop: size * 0.28 }}>{value}%</div>
    </div>
  );
}

export default function GDSSOCInvestigationsPage() {
  const { data: investigations = [], isLoading } = useQuery({
    queryKey: ["soc-investigations"],
    queryFn: () => base44.entities.Investigation.list("-started_at", 100).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "SOC", path: "/soc" }, { label: "Investigations" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Investigation Workspace</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Automated and manual security investigations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Investigations</p>
          <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{investigations.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active</p>
          <p className="text-3xl font-black font-mono" style={{ color: HIGH }}>{investigations.filter(i => i.status === "active").length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Completed</p>
          <p className="text-3xl font-black font-mono" style={{ color: LOW }}>{investigations.filter(i => i.status === "completed").length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Confidence</p>
          <p className="text-3xl font-black font-mono" style={{ color: MEDIUM }}>{investigations.length > 0 ? Math.round(investigations.reduce((s, i) => s + (i.confidence || 0), 0) / investigations.length) : 0}%</p>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Investigation History</h3>
        </div>
        {isLoading ? <Skeleton lines={6} /> : investigations.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm" style={{ color: MUTED }}>No investigations yet</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Title", "Type", "Incident", "Status", "Findings", "IOCs", "Confidence", "Started", "Completed"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investigations.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-xs font-bold text-white">{inv.title}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{inv.investigation_type || "UNKNOWN"}</span>
                    </td>
                    <td className="py-3 px-4">
                      {inv.incident_id ? <span className="text-[10px] font-mono" style={{ color: DANGER }}>INC-{inv.incident_id.slice(-6).toUpperCase()}</span> : <span className="text-[10px]" style={{ color: MUTED }}>—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${inv.status === "completed" ? "bg-green-400/15 text-green-400" : inv.status === "active" ? "bg-blue-400/15 text-blue-400" : "bg-gray-400/15 text-gray-400"}`}>{inv.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs" style={{ color: TEXT }}>{inv.findings_count || 0}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs" style={{ color: TEXT }}>{inv.iocs_found || 0}</p>
                    </td>
                    <td className="py-3 px-4">
                      <ConfidenceGauge value={inv.confidence || 0} size={40} />
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(inv.started_at)}</p>
                    </td>
                    <td className="py-3 px-4">
                      {inv.completed_at ? <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(inv.completed_at)}</p> : <span className="text-[10px]" style={{ color: MUTED }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}