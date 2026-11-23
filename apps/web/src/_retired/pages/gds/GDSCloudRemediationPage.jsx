import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Wrench, Check, Terminal, Code, Shield } from "lucide-react";
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

export default function GDSCloudRemediationPage() {
  const [expandedRow, setExpandedRow] = useState(null);
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: remediations = [] } = useQuery({
    queryKey: ["cloud-remediation"],
    queryFn: () => base44.entities.CloudRemediation?.list("-created_at", 500).catch(() => []),
  });

  const filtered = remediations.filter(r => {
    if (providerFilter !== "all" && r.provider !== providerFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Cloud Security" }, { label: "Remediation Center" }]} />

      <div>
        <h1 className="text-2xl font-black text-white">Cloud Remediation Center</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>CLI commands, Terraform fixes, and autofix approval workflow</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Providers</option>
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="executing">Executing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </Card>

      {/* Remediation Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Title", "Provider", "Type", "Priority", "Effort", "Autofix", "Approved", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <React.Fragment key={r.id || i}>
                  <tr 
                    onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                    style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f", cursor: "pointer" }}
                  >
                    <td className="px-4 py-3 text-xs font-bold text-white max-w-xs truncate">{r.title}</td>
                    <td className="px-4 py-3"><ProviderBadge provider={r.provider} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        r.remediation_type === "cli_command" ? `bg-[${CYAN}15] text-[${CYAN}]` :
                        r.remediation_type === "iac_fix" ? `bg-[${HIGH}15] text-[${HIGH}]` :
                        "bg-gray-700 text-gray-300"
                      }`} style={{
                        background: r.remediation_type === "cli_command" ? `${CYAN}15` : 
                                   r.remediation_type === "iac_fix" ? `${HIGH}15` : "rgba(100,116,139,0.15)",
                        color: r.remediation_type === "cli_command" ? CYAN : 
                               r.remediation_type === "iac_fix" ? HIGH : MUTED
                      }}>
                        {r.remediation_type?.replace("_", " ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        r.priority === "critical" ? `bg-[${DANGER}15] text-[${DANGER}]` :
                        r.priority === "high" ? `bg-[${HIGH}15] text-[${HIGH}]` :
                        "bg-gray-700 text-gray-300"
                      }`} style={{
                        background: r.priority === "critical" ? `${DANGER}15` : 
                                   r.priority === "high" ? `${HIGH}15` : "rgba(100,116,139,0.15)",
                        color: r.priority === "critical" ? DANGER : 
                               r.priority === "high" ? HIGH : MUTED
                      }}>
                        {r.priority || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.1)", color: TEXT }}>
                        {r.effort || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.autofix_available ? (
                        <Wrench className="w-3.5 h-3.5" style={{ color: LOW }} />
                      ) : (
                        <span className="text-[10px]" style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.autofix_approved ? (
                        <Check className="w-3.5 h-3.5" style={{ color: LOW }} />
                      ) : (
                        <span className="text-[10px]" style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        r.status === "completed" ? `bg-[${LOW}15] text-[${LOW}]` :
                        r.status === "executing" ? `bg-[${CYAN}15] text-[${CYAN}]` :
                        r.status === "approved" ? `bg-[${HIGH}15] text-[${HIGH}]` :
                        "bg-gray-700 text-gray-300"
                      }`} style={{
                        background: r.status === "completed" ? `${LOW}15` : 
                                   r.status === "executing" ? `${CYAN}15` :
                                   r.status === "approved" ? `${HIGH}15` : "rgba(100,116,139,0.15)",
                        color: r.status === "completed" ? LOW : 
                               r.status === "executing" ? CYAN :
                               r.status === "approved" ? HIGH : MUTED
                      }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                  {expandedRow === r.id && (
                    <tr>
                      <td colSpan={8} className="px-4 py-3" style={{ background: "#050e1f" }}>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-bold text-white mb-2">Remediation Steps</p>
                            <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: TEXT }}>
                              {(r.steps || []).map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          {r.cli_command && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Terminal className="w-3.5 h-3.5" style={{ color: CYAN }} />
                                <p className="text-xs font-bold text-white">CLI Command</p>
                              </div>
                              <pre className="p-3 rounded-lg text-xs font-mono" style={{ background: "rgba(0,0,0,0.3)", color: LOW }}>
                                {r.cli_command}
                              </pre>
                            </div>
                          )}
                          {r.terraform_snippet && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Code className="w-3.5 h-3.5" style={{ color: HIGH }} />
                                <p className="text-xs font-bold text-white">Terraform Fix</p>
                              </div>
                              <pre className="p-3 rounded-lg text-xs font-mono" style={{ background: "rgba(0,0,0,0.3)", color: LOW }}>
                                {r.terraform_snippet}
                              </pre>
                            </div>
                          )}
                          {!r.autofix_approved && r.autofix_available && (
                            <button 
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                              style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}
                              onClick={() => {
                                // Would call API to approve autofix
                                alert("Autofix approved!");
                              }}
                            >
                              <Shield className="w-3.5 h-3.5" />
                              Approve Autofix
                            </button>
                          )}
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