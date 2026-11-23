import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Wrench, ChevronDown, Filter } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge, timeAgo } from "@/components/gds/GDSOSShared";

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

export default function GDSCloudCSPMPage() {
  const [providerFilter, setProviderFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: misconfigs = [] } = useQuery({
    queryKey: ["cloud-misconfigs"],
    queryFn: () => base44.entities.CloudMisconfiguration.list("-risk_score", 500).catch(() => []),
  });

  const filtered = misconfigs.filter(m => {
    if (providerFilter !== "all" && m.provider !== providerFilter) return false;
    if (severityFilter !== "all" && m.severity !== severityFilter) return false;
    return true;
  });

  const stats = {
    total: misconfigs.length,
    critical: misconfigs.filter(m => m.severity === "critical").length,
    high: misconfigs.filter(m => m.severity === "high").length,
    autofix: misconfigs.filter(m => m.autofix_available).length,
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Cloud Security", path: "/cloud" }, { label: "CSPM Dashboard" }]} />

      <div>
        <h1 className="text-2xl font-black text-white">CSPM Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Cloud Security Posture Management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Checks Run</p>
          <p className="text-2xl font-black text-white mt-2">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Critical</p>
          <p className="text-2xl font-black mt-2" style={{ color: DANGER }}>{stats.critical}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>High</p>
          <p className="text-2xl font-black mt-2" style={{ color: HIGH }}>{stats.high}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Autofix</p>
          <div className="flex items-center gap-2 mt-2">
            <Wrench className="w-4 h-4" style={{ color: LOW }} />
            <p className="text-2xl font-black" style={{ color: LOW }}>{stats.autofix}</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Compliance</p>
          <p className="text-2xl font-black text-white mt-2">72%</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4" style={{ color: MUTED }} />
          <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Providers</option>
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
          </select>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </Card>

      {/* Misconfigurations Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Check ID", "Title", "Provider", "Service", "Severity", "Category", "CIS Control", "Autofix", "Effort", "Status", "Detected"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((m, i) => (
                <React.Fragment key={m.id || i}>
                  <tr 
                    onClick={() => setExpandedRow(expandedRow === m.id ? null : m.id)}
                    style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f", cursor: "pointer" }}>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{m.cis_control || m.check_id || "—"}</td>
                    <td className="px-4 py-3 text-xs text-white max-w-xs">{m.title}</td>
                    <td className="px-4 py-3"><ProviderBadge provider={m.provider} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: TEXT }}>{m.service || "—"}</td>
                    <td className="px-4 py-3"><SevBadge sev={m.severity} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{m.category || "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{m.cis_control || "—"}</td>
                    <td className="px-4 py-3">
                      {m.autofix_available ? <Wrench className="w-3.5 h-3.5" style={{ color: LOW }} /> : <span className="text-[10px]" style={{ color: MUTED }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(100,116,139,0.15)", color: MUTED }}>
                        {m.effort || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        m.status === "open" ? `bg-[${DANGER}15] text-[${DANGER}]` :
                        m.status === "resolved" ? `bg-[${LOW}15] text-[${LOW}]` :
                        "bg-gray-700 text-gray-300"
                      }`} style={{ 
                        background: m.status === "open" ? `${DANGER}15` : m.status === "resolved" ? `${LOW}15` : "rgba(100,116,139,0.15)",
                        color: m.status === "open" ? DANGER : m.status === "resolved" ? LOW : MUTED 
                      }}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{timeAgo(m.detected_at)}</td>
                  </tr>
                  {expandedRow === m.id && (
                    <tr>
                      <td colSpan={11} className="px-4 py-3" style={{ background: "#050e1f" }}>
                        <div className="flex items-start gap-2">
                          <ChevronDown className="w-4 h-4" style={{ color: CYAN }} />
                          <div>
                            <p className="text-xs font-bold text-white mb-1">Remediation</p>
                            <p className="text-xs" style={{ color: MUTED }}>{m.remediation || "No remediation steps available"}</p>
                            {m.remediation_command && (
                              <pre className="mt-2 p-2 rounded text-[10px] font-mono" style={{ background: "rgba(0,0,0,0.3)", color: CYAN }}>
                                {m.remediation_command}
                              </pre>
                            )}
                          </div>
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