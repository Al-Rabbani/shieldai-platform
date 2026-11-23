import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Shield, AlertTriangle, Lock, FileText, CheckCircle, X, Search, Filter } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

const AUDIT_TYPE_COLORS = {
  cross_tenant_access: DANGER,
  configuration_drift: HIGH,
  policy_violation: "#a855f7",
  boundary_breach: DANGER,
  privilege_escalation: "#f59e0b"
};

const SEVERITY_COLORS = {
  critical: DANGER,
  high: HIGH,
  medium: MEDIUM,
  low: LOW,
  info: "#3b82f6"
};

const STATUS_COLORS = {
  pending: HIGH,
  investigating: "#a855f7",
  resolved: LOW,
  false_positive: MUTED,
  accepted_risk: "#f59e0b"
};

export default function GDSTenantAuditLogPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchTenant, setSearchTenant] = useState("");
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [investigationStatus, setInvestigationStatus] = useState("");
  const [investigationNotes, setInvestigationNotes] = useState("");

  const { data: auditData, isLoading } = useQuery({
    queryKey: ["tenant-audit-logs"],
    queryFn: () => base44.functions.invoke("gdsTenantAuditEngine", { action: "audit_logs" }).then(r => r.data.result),
    refetchInterval: 10000,
  });

  const updateInvestigationMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsTenantAuditEngine", { action: "update_investigation", ...data }),
    onSuccess: () => {
      qc.invalidateQueries(["tenant-audit-logs"]);
      setSelectedAudit(null);
      setInvestigationStatus("");
      setInvestigationNotes("");
    },
  });

  const logs = auditData?.logs || [];
  const summary = auditData?.summary || {};

  const filteredLogs = logs.filter(log => {
    if (filterType !== "all" && log.audit_type !== filterType) return false;
    if (filterSeverity !== "all" && log.severity !== filterSeverity) return false;
    if (searchTenant && !log.tenant_id?.toLowerCase().includes(searchTenant.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tenant Audit Log" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Automated Audit Log</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Cross-tenant access attempts, configuration drift, and isolation violations</p>
          </div>
          {summary.pending > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${HIGH}10`, border: `1px solid ${HIGH}30` }}>
              <AlertTriangle className="w-3 h-3" style={{ color: HIGH }} />
              <span className="text-[10px] font-black" style={{ color: HIGH }}>{summary.pending} Pending</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Events</p>
          <p className="text-xl font-black font-mono" style={{ color: TEXT }}>{summary.total || 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Cross-Tenant Access</p>
          <p className="text-xl font-black font-mono" style={{ color: DANGER }}>{summary.cross_tenant_access || 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Config Drift</p>
          <p className="text-xl font-black font-mono" style={{ color: HIGH }}>{summary.configuration_drift || 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Boundary Breach</p>
          <p className="text-xl font-black font-mono" style={{ color: DANGER }}>{summary.boundary_breach || 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical</p>
          <p className="text-xl font-black font-mono" style={{ color: summary.critical > 0 ? DANGER : MUTED }}>{summary.critical || 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High Severity</p>
          <p className="text-xl font-black font-mono" style={{ color: summary.high > 0 ? HIGH : MUTED }}>{summary.high || 0}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
            <input
              value={searchTenant}
              onChange={(e) => setSearchTenant(e.target.value)}
              placeholder="Search by tenant ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Types</option>
            <option value="cross_tenant_access">Cross-Tenant Access</option>
            <option value="configuration_drift">Configuration Drift</option>
            <option value="boundary_breach">Boundary Breach</option>
            <option value="policy_violation">Policy Violation</option>
          </select>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Audit Events</h3>
        {isLoading ? <Skeleton lines={8} /> : filteredLogs.length === 0 ? (
          <EmptyState icon={Shield} title="No audit events" description="Audit events will appear here when isolation violations or configuration drift are detected" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Audit ID", "Type", "Severity", "Tenant", "Actor", "Target", "Action", "Blocked", "Risk Score", "Status", "Created", "Actions"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.audit_id} className="hover:bg-white/[0.02] cursor-pointer" onClick={() => setSelectedAudit(log)} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{log.audit_id}</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ color: AUDIT_TYPE_COLORS[log.audit_type], background: `${AUDIT_TYPE_COLORS[log.audit_type]}18`, border: `1px solid ${AUDIT_TYPE_COLORS[log.audit_type]}30` }}>
                        {log.audit_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${log.severity === 'critical' ? 'bg-red-400/15 text-red-400' : log.severity === 'high' ? 'bg-orange-400/15 text-orange-400' : log.severity === 'medium' ? 'bg-yellow-400/15 text-yellow-400' : 'bg-blue-400/15 text-blue-400'}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: CYAN }}>{log.tenant_id}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{log.actor_id}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: log.actor_tenant_id !== log.target_tenant_id ? DANGER : MUTED }}>{log.target_tenant_id}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{log.action_attempted}</td>
                    <td className="py-2 px-3">{log.was_blocked ? <Lock className="w-3.5 h-3.5 text-green-400" /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                    <td className="py-2 px-3">
                      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${log.risk_score}%`, background: log.risk_score > 70 ? DANGER : log.risk_score > 40 ? HIGH : MEDIUM }} />
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${log.investigation_status === 'resolved' ? 'bg-green-400/15 text-green-400' : log.investigation_status === 'pending' ? 'bg-orange-400/15 text-orange-400' : 'bg-gray-400/15 text-gray-400'}`}>
                        {log.investigation_status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(log.created_date)}</td>
                    <td className="py-2 px-3">
                      <button className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflow: "auto" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Audit Event Details</h2>
              <button onClick={() => setSelectedAudit(null)} className="hover:text-white transition-colors" style={{ color: MUTED }}><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Audit ID</p>
                <p className="text-xs font-mono" style={{ color: TEXT }}>{selectedAudit.audit_id}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Type</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ color: AUDIT_TYPE_COLORS[selectedAudit.audit_type], background: `${AUDIT_TYPE_COLORS[selectedAudit.audit_type]}18` }}>
                  {selectedAudit.audit_type.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Severity</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${selectedAudit.severity === 'critical' ? 'bg-red-400/15 text-red-400' : 'bg-orange-400/15 text-orange-400'}`}>
                  {selectedAudit.severity}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Risk Score</p>
                <p className="text-sm font-black" style={{ color: selectedAudit.risk_score > 70 ? DANGER : HIGH }}>{selectedAudit.risk_score}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Actor Tenant</p>
                <p className="text-xs font-mono" style={{ color: TEXT }}>{selectedAudit.actor_tenant_id}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Target Tenant</p>
                <p className="text-xs font-mono" style={{ color: selectedAudit.actor_tenant_id !== selectedAudit.target_tenant_id ? DANGER : TEXT }}>{selectedAudit.target_tenant_id}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Blocked</p>
                <p className="text-sm font-bold" style={{ color: selectedAudit.was_blocked ? LOW : MUTED }}>{selectedAudit.was_blocked ? 'YES' : 'NO'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Status</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${STATUS_COLORS[selectedAudit.investigation_status] ? `bg-${STATUS_COLORS[selectedAudit.investigation_status]}15` : ''}`} style={{ color: STATUS_COLORS[selectedAudit.investigation_status] || MUTED }}>
                  {selectedAudit.investigation_status}
                </span>
              </div>
            </div>

            {selectedAudit.drift_detected && (
              <div className="p-4 rounded-xl" style={{ background: `${HIGH}10`, border: `1px solid ${HIGH}30` }}>
                <p className="text-xs font-bold mb-2" style={{ color: HIGH }}>Configuration Drift Detected</p>
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: MUTED }}>Fields:</span>
                  <div className="flex flex-wrap gap-1">
                    {(selectedAudit.drift_fields || []).map(field => (
                      <span key={field} className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: TEXT, background: "rgba(255,255,255,0.1)" }}>{field}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t" style={{ borderColor: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-3">Update Investigation</h3>
              <div className="space-y-3">
                <select value={investigationStatus} onChange={(e) => setInvestigationStatus(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="">Select status...</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="false_positive">False Positive</option>
                  <option value="accepted_risk">Accepted Risk</option>
                </select>
                <textarea value={investigationNotes} onChange={(e) => setInvestigationNotes(e.target.value)} placeholder="Investigation notes..." className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} rows={3} />
                <button onClick={() => updateInvestigationMutation.mutate({ audit_id: selectedAudit.audit_id, status: investigationStatus, notes: investigationNotes, investigator: user?.email })} disabled={!investigationStatus} className="w-full py-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                  Update Investigation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}