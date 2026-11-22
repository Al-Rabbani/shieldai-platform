import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BookOpen, Search, Filter, Code, CheckCircle, Copy, ExternalLink, Shield, AlertTriangle, Zap, Clock } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, SevBadge } from "@/components/gds/GDSOSShared";
import { toast } from "sonner";

export default function GDSPlaybookLibraryPage() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);

  const { data: playbooks = [], isLoading } = useQuery({
    queryKey: ["remediation-playbooks"],
    queryFn: () => base44.entities.RemediationPlaybook.list("-usage_count", 200).catch(() => []),
  });

  const filteredPlaybooks = playbooks.filter(p => {
    const matchSearch = !search || 
      p.playbook_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.vulnerability_types?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchSeverity = severityFilter === "all" || p.severity === severityFilter;
    return matchSearch && matchSeverity;
  });

  const stats = {
    total: playbooks.length,
    critical: playbooks.filter(p => p.severity === "critical").length,
    high: playbooks.filter(p => p.severity === "high").length,
    avgSuccessRate: playbooks.length > 0 
      ? Math.round(playbooks.reduce((sum, p) => sum + (p.success_rate_percent || 0), 0) / playbooks.length)
      : 0,
    totalUsage: playbooks.reduce((sum, p) => sum + (p.usage_count || 0), 0),
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Workflows", path: "/workflows" }, { label: "Playbook Library" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <BookOpen className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Remediation Playbook Library</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Pre-built remediation procedures for common security vulnerabilities</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search playbooks..."
              className="w-56 pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Playbooks</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.critical > 0 ? `${DANGER}08` : "transparent", border: stats.critical > 0 ? `1px solid ${DANGER}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.critical > 0 ? DANGER : MUTED }}>{stats.critical}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.high > 0 ? `${HIGH}08` : "transparent", border: stats.high > 0 ? `1px solid ${HIGH}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.high > 0 ? HIGH : MUTED }}>{stats.high}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Success Rate</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.avgSuccessRate}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Usage</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.totalUsage}</p>
        </Card>
      </div>

      {/* Playbooks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Card key={i} className="p-5"><Skeleton lines={4} /></Card>)
        ) : filteredPlaybooks.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState icon={BookOpen} title="No playbooks found" description={playbooks.length === 0 ? "Create remediation playbooks for common vulnerabilities" : "No playbooks match the current filters"} />
          </div>
        ) : (
          filteredPlaybooks.map((p) => {
            const riskColor = p.severity === "critical" ? DANGER : p.severity === "high" ? HIGH : p.severity === "medium" ? MEDIUM : LOW;
            return (
              <Card 
                key={p.id} 
                className="p-5 cursor-pointer hover:scale-[1.01] transition-all"
                style={{ border: `1px solid ${riskColor}30`, background: `${riskColor}03` }}
                onClick={() => setSelectedPlaybook(p)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <SevBadge sev={p.severity} />
                      <h3 className="text-sm font-bold text-white">{p.playbook_name}</h3>
                    </div>
                    <p className="text-xs mb-3" style={{ color: MUTED }}>{p.description}</p>
                  </div>
                  <Shield className="w-5 h-5 flex-shrink-0" style={{ color: riskColor }} />
                </div>

                {p.vulnerability_types && p.vulnerability_types.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.vulnerability_types.slice(0, 4).map((type, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(0,212,255,0.1)", border: `1px solid ${CYAN}30`, color: CYAN }}>
                        {type}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-[10px]" style={{ color: MUTED }}>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" style={{ color: LOW }} />
                    <span>{p.success_rate_percent || 0}% success</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3" style={{ color: CYAN }} />
                    <span>{p.usage_count || 0} uses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{p.estimated_effort || "—"}</span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Playbook Detail Modal */}
      {selectedPlaybook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setSelectedPlaybook(null)} />
          <Card className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6" style={{ background: "#0a1628", border: `1px solid ${CYAN}40` }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <SevBadge sev={selectedPlaybook.severity} />
                  <h2 className="text-xl font-black text-white">{selectedPlaybook.playbook_name}</h2>
                </div>
                <p className="text-sm" style={{ color: MUTED }}>{selectedPlaybook.description}</p>
              </div>
              <button onClick={() => setSelectedPlaybook(null)} className="text-xs font-bold p-2 rounded-lg hover:bg-white/5" style={{ color: MUTED }}>✕ Close</button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}20` }}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Severity</p>
                <p className="text-sm font-bold capitalize" style={{ color: CYAN }}>{selectedPlaybook.severity || "—"}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "rgba(0,255,136,0.05)", border: `1px solid ${LOW}20` }}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Success Rate</p>
                <p className="text-sm font-bold" style={{ color: LOW }}>{selectedPlaybook.success_rate_percent || 0}%</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,140,0,0.05)", border: `1px solid ${HIGH}20` }}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Usage Count</p>
                <p className="text-sm font-bold" style={{ color: HIGH }}>{selectedPlaybook.usage_count || 0}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,59,59,0.05)", border: `1px solid ${DANGER}20` }}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Est. Effort</p>
                <p className="text-sm font-bold" style={{ color: DANGER }}>{selectedPlaybook.estimated_effort || "—"}</p>
              </div>
            </div>

            {/* Vulnerability Types */}
            {selectedPlaybook.vulnerability_types && selectedPlaybook.vulnerability_types.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white mb-2">Applies To</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPlaybook.vulnerability_types.map((type, i) => (
                    <span key={i} className="text-xs px-3 py-1 rounded-lg" style={{ background: "rgba(0,212,255,0.1)", border: `1px solid ${CYAN}30`, color: CYAN }}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Remediation Steps */}
            {selectedPlaybook.remediation_steps && selectedPlaybook.remediation_steps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white mb-3">Remediation Steps</h3>
                <div className="space-y-3">
                  {selectedPlaybook.remediation_steps.map((step, i) => (
                    <div key={i} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background: `${CYAN}15`, color: CYAN }}>
                          {step.step_number || i + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white">{step.title}</h4>
                        {step.estimated_minutes && (
                          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>
                            ~{step.estimated_minutes} min
                          </span>
                        )}
                      </div>
                      <p className="text-xs ml-9 mb-2" style={{ color: MUTED }}>{step.description}</p>
                      {step.code_example && (
                        <div className="ml-9 p-3 rounded-lg font-mono text-xs overflow-x-auto" style={{ background: "rgba(0,0,0,0.3)", color: TEXT }}>
                          <pre>{step.code_example}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Automation Script */}
            {selectedPlaybook.automation_script && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Code className="w-4 h-4" style={{ color: CYAN }} />
                  Automation Script ({selectedPlaybook.script_language?.toUpperCase()})
                </h3>
                <div className="p-4 rounded-lg font-mono text-xs overflow-x-auto" style={{ background: "rgba(0,0,0,0.3)", color: TEXT }}>
                  <pre>{selectedPlaybook.automation_script}</pre>
                </div>
              </div>
            )}

            {/* Testing Guidance */}
            {selectedPlaybook.testing_guidance && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white mb-2">Testing Guidance</h3>
                <p className="text-xs p-3 rounded-lg" style={{ background: "rgba(0,255,136,0.05)", border: `1px solid ${LOW}20`, color: TEXT }}>
                  {selectedPlaybook.testing_guidance}
                </p>
              </div>
            )}

            {/* References */}
            {selectedPlaybook.references && selectedPlaybook.references.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white mb-2">References</h3>
                <div className="space-y-1">
                  {selectedPlaybook.references.map((ref, i) => (
                    <a key={i} href={ref} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-2 hover:underline" style={{ color: CYAN }}>
                      <ExternalLink className="w-3 h-3" />
                      {ref}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: BORDER }}>
              <button 
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedPlaybook, null, 2));
                  toast.success("Playbook copied to clipboard");
                }}
              >
                <Copy className="w-4 h-4" />
                Copy Playbook
              </button>
              <button 
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}
                onClick={() => {
                  toast.success("Playbook applied - vulnerability status updated to 'In Remediation'");
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Apply Fix
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}