import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, FileText, Plus, X, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

const DEFAULT_POLICIES = [
  { source_type: "tool_execution", risk_level: "critical", approval_type: "dual", approval_level: "critical", sla_seconds: 3600, escalation_after: 1800, quorum_count: 2, required_roles: ["admin", "security_lead"], emergency_bypass: false },
  { source_type: "tool_execution", risk_level: "high", approval_type: "single", approval_level: "elevated", sla_seconds: 7200, escalation_after: 3600, quorum_count: 1, required_roles: ["admin"], emergency_bypass: false },
  { source_type: "workflow", risk_level: "critical", approval_type: "quorum", approval_level: "critical", sla_seconds: 1800, escalation_after: 900, quorum_count: 3, required_roles: ["admin", "security_lead", "ciso"], emergency_bypass: true },
  { source_type: "workflow", risk_level: "high", approval_type: "dual", approval_level: "elevated", sla_seconds: 3600, escalation_after: 1800, quorum_count: 2, required_roles: ["admin", "security_lead"], emergency_bypass: false },
  { source_type: "manual", risk_level: "medium", approval_type: "single", approval_level: "standard", sla_seconds: 14400, escalation_after: 7200, quorum_count: 1, required_roles: ["analyst"], emergency_bypass: false },
  { source_type: "manual", risk_level: "low", approval_type: "single", approval_level: "standard", sla_seconds: 28800, escalation_after: 14400, quorum_count: 1, required_roles: ["analyst"], emergency_bypass: false },
];

export default function GDSApprovalPoliciesPage() {
  const qc = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [policyData, setPolicyData] = useState({
    policy_name: "", description: "", applies_to_source_type: "manual", applies_to_risk_level: "medium",
    approval_type: "single", approval_level: "standard", required_approver_roles: "", quorum_count: 1,
    sla_seconds: 3600, auto_approve_low_risk: false, emergency_bypass_allowed: false, emergency_bypass_roles: "",
    escalation_after_seconds: 1800, escalation_roles: "", expiry_seconds: 86400
  });

  const { data: customPolicies } = useQuery({
    queryKey: ["approvals-policies"],
    queryFn: () => base44.entities.ApprovalPolicy.list("-created_date", 50).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: delegations } = useQuery({
    queryKey: ["approvals-delegations"],
    queryFn: () => base44.entities.ApprovalDelegation.list("-created_date", 50).catch(() => []),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ApprovalPolicy.create(data),
    onSuccess: () => {
      qc.invalidateQueries(["approvals-policies"]);
      setShowCreateModal(false);
      setPolicyData({ policy_name: "", description: "", applies_to_source_type: "manual", applies_to_risk_level: "medium", approval_type: "single", approval_level: "standard", required_approver_roles: "", quorum_count: 1, sla_seconds: 3600, auto_approve_low_risk: false, emergency_bypass_allowed: false, emergency_bypass_roles: "", escalation_after_seconds: 1800, escalation_roles: "", expiry_seconds: 86400 });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => base44.entities.ApprovalDelegation.update(id, { is_active: false }),
    onSuccess: () => qc.invalidateQueries(["approvals-delegations"]),
  });

  function formatSLA(seconds) {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Policy Manager" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Approval Policy Engine</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-010 v1.0</span>
        </div>
        <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>15 default policies + {customPolicies?.length || 0} custom tenant rules</span>
      </div>

      {/* Default Policies */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Default Policy Catalogue</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Built-in approval policies by risk and source type</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Source", "Risk", "Type", "Level", "SLA", "Escalation", "Quorum", "Required Roles", "Emergency Bypass"].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEFAULT_POLICIES.map((policy, i) => (
                <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20`, background: policy.risk_level === "critical" ? `${DANGER}08` : policy.risk_level === "high" ? `${HIGH}08` : policy.risk_level === "medium" ? `${MEDIUM}08` : `${LOW}08` }}>
                  <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>{policy.source_type}</span></td>
                  <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${policy.risk_level === "critical" ? "text-red-400" : policy.risk_level === "high" ? "text-orange-400" : policy.risk_level === "medium" ? "text-yellow-400" : "text-green-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{policy.risk_level}</span></td>
                  <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{policy.approval_type}</span></td>
                  <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{policy.approval_level}</span></td>
                  <td className="py-2 px-3 font-mono" style={{ color: TEXT }}>{formatSLA(policy.sla_seconds)}</td>
                  <td className="py-2 px-3 font-mono" style={{ color: MUTED }}>{formatSLA(policy.escalation_after)}</td>
                  <td className="py-2 px-3 font-mono" style={{ color: TEXT }}>{policy.quorum_count}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1 flex-wrap">
                      {policy.required_roles.map((role, idx) => (
                        <span key={idx} className="text-[9px] px-1 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>{role}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${policy.emergency_bypass ? "text-amber-400" : "text-slate-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{policy.emergency_bypass ? "YES" : "NO"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Custom Policies */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Custom Policies</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Tenant-specific approval rules</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-3.5 h-3.5" /> Create Policy
          </button>
        </div>
        {(customPolicies || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Policy Name", "Source", "Risk", "Type", "Level", "SLA", "Quorum", "Status", "Active"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(customPolicies || []).map((policy, i) => (
                  <tr key={policy.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-bold text-white">{policy.policy_name || "Untitled"}</td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>{policy.applies_to_source_type || "manual"}</span></td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${policy.applies_to_risk_level === "critical" ? "text-red-400" : policy.applies_to_risk_level === "high" ? "text-orange-400" : policy.applies_to_risk_level === "medium" ? "text-yellow-400" : "text-green-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{policy.applies_to_risk_level || "medium"}</span></td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{policy.approval_type || "single"}</span></td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{policy.approval_level || "standard"}</span></td>
                    <td className="py-2 px-3 font-mono" style={{ color: TEXT }}>{formatSLA(policy.sla_seconds)}</td>
                    <td className="py-2 px-3 font-mono" style={{ color: TEXT }}>{policy.quorum_count || 1}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${policy.is_active ? "text-green-400" : "text-slate-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{policy.is_active ? "active" : "inactive"}</span></td>
                    <td className="py-2 px-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={policy.is_active} onChange={() => base44.entities.ApprovalPolicy.update(policy.id, { is_active: !policy.is_active })} />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={FileText} title="No custom policies" description="Create custom approval policies for your organization" />
        )}
      </Card>

      {/* Delegations Panel */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Active Delegations</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Temporary approval authority delegations</p>
        </div>
        {(delegations || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Delegation ID", "Delegated By", "Delegated To", "Role", "Scope", "Valid From", "Valid Until", "Status", "Action"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(delegations || []).map((del, i) => {
                  const now = new Date();
                  const validUntil = del.valid_until ? new Date(del.valid_until) : null;
                  const isExpired = validUntil && validUntil < now;
                  const isActive = del.is_active && !isExpired;
                  return (
                    <tr key={del.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{del.delegation_id ? del.delegation_id.slice(0, 12) + "..." : "—"}</td>
                      <td className="py-2 px-3 text-white">{del.delegated_by || "—"}</td>
                      <td className="py-2 px-3 text-white">{del.delegated_to || "—"}</td>
                      <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>{del.delegated_to_role || "—"}</span></td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{del.delegation_scope || "approval"}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{del.valid_from ? new Date(del.valid_from).toLocaleDateString() : "—"}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: isExpired ? DANGER : MUTED }}>{validUntil ? validUntil.toLocaleString("en-IE") : "—"}</td>
                      <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${isActive ? "text-green-400" : "text-slate-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{isActive ? "active" : "expired"}</span></td>
                      <td className="py-2 px-3">
                        {isActive && (
                          <button onClick={() => revokeMutation.mutate(del.id)} className="text-[10px] px-2 py-1 rounded font-bold transition-all" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30`, color: DANGER }}>
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Shield} title="No delegations" description="Active delegations will appear here" />
        )}
      </Card>

      {/* Create Policy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-auto" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Custom Policy</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ color: MUTED }}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={policyData.policy_name} onChange={e => setPolicyData({...policyData, policy_name: e.target.value})} placeholder="Policy Name" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <input value={policyData.description} onChange={e => setPolicyData({...policyData, description: e.target.value})} placeholder="Description" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <select value={policyData.applies_to_source_type} onChange={e => setPolicyData({...policyData, applies_to_source_type: e.target.value})} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                <option value="manual">Manual</option>
                <option value="workflow">Workflow</option>
                <option value="tool">Tool</option>
              </select>
              <select value={policyData.applies_to_risk_level} onChange={e => setPolicyData({...policyData, applies_to_risk_level: e.target.value})} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <select value={policyData.approval_type} onChange={e => setPolicyData({...policyData, approval_type: e.target.value})} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                <option value="single">Single</option>
                <option value="dual">Dual</option>
                <option value="quorum">Quorum</option>
              </select>
              <select value={policyData.approval_level} onChange={e => setPolicyData({...policyData, approval_level: e.target.value})} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                <option value="standard">Standard</option>
                <option value="elevated">Elevated</option>
                <option value="critical">Critical</option>
              </select>
              <input type="number" value={policyData.sla_seconds} onChange={e => setPolicyData({...policyData, sla_seconds: parseInt(e.target.value)})} placeholder="SLA (seconds)" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <input type="number" value={policyData.quorum_count} onChange={e => setPolicyData({...policyData, quorum_count: parseInt(e.target.value)})} placeholder="Quorum Count" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            </div>
            <button onClick={() => createMutation.mutate(policyData)} disabled={createMutation.isPending || !policyData.policy_name} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              <Plus className="w-4 h-4" /> {createMutation.isPending ? "Creating..." : "Create Policy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}