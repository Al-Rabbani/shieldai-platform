import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Plus, X, CheckCircle, AlertTriangle, Settings, Search } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG
} from "@/components/gds/GDSOSShared";

const POLICY_TYPE_COLORS = { zero_trust: "#a855f7", rbac: "#60a5fa", abac: "#14b8a6", isolation: MUTED, compliance: LOW, approval_gate: HIGH };
const ACTION_COLORS = { deny: DANGER, require_approval: HIGH, warn: "#eab308", log_only: MUTED };

function PolicyTypeBadge({ type }) {
  const color = POLICY_TYPE_COLORS[type] || MUTED;
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {type?.replace(/_/g, " ") || "—"}
    </span>
  );
}

function ActionBadge({ action }) {
  const color = ACTION_COLORS[action] || MUTED;
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {action?.replace(/_/g, " ") || "—"}
    </span>
  );
}

function NewPolicyModal({ agents, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    super_agent_id: "", policy_name: "", policy_type: "zero_trust",
    action_on_violation: "deny", applies_to: "", rule: "{}"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none"
  };

  const handleSubmit = async () => {
    if (!formData.super_agent_id || !formData.policy_name.trim()) {
      setError("Agent and policy name are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await base44.functions.invoke("gdsSuperAgentFramework", {
        action: "governance",
        create_policy: true,
        ...formData,
        rule: JSON.parse(formData.rule || "{}")
      });
      onSuccess && onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">Create Policy</h2>
          <button onClick={onClose} className="hover:text-white transition-colors" style={{ color: MUTED }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Super Agent</label>
            <select value={formData.super_agent_id} onChange={e => setFormData({ ...formData, super_agent_id: e.target.value })} style={inputStyle}>
              <option value="">Select agent…</option>
              {agents.map(a => <option key={a.super_agent_id} value={a.super_agent_id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Policy Name</label>
            <input value={formData.policy_name} onChange={e => setFormData({ ...formData, policy_name: e.target.value })}
              placeholder="e.g., Production Access Control" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Policy Type</label>
              <select value={formData.policy_type} onChange={e => setFormData({ ...formData, policy_type: e.target.value })} style={inputStyle}>
                {Object.keys(POLICY_TYPE_COLORS).map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Action on Violation</label>
              <select value={formData.action_on_violation} onChange={e => setFormData({ ...formData, action_on_violation: e.target.value })} style={inputStyle}>
                {Object.keys(ACTION_COLORS).map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Applies To</label>
            <input value={formData.applies_to} onChange={e => setFormData({ ...formData, applies_to: e.target.value })}
              placeholder="e.g., production, critical" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Rule (JSON)</label>
            <textarea value={formData.rule} onChange={e => setFormData({ ...formData, rule: e.target.value })}
              rows={4} placeholder='{"condition": "...", "constraints": []}'
              style={{ ...inputStyle, resize: "none", fontFamily: "monospace" }} />
          </div>
        </div>
        {error && <p className="text-xs" style={{ color: DANGER }}>{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {loading ? "Creating…" : "Create Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GDSSuperAgentsGovernancePage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["super-agents-governance"],
    queryFn: () => base44.functions.invoke("gdsSuperAgentFramework", { action: "governance" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: listData } = useQuery({
    queryKey: ["super-agents-list"],
    queryFn: () => base44.functions.invoke("gdsSuperAgentFramework", { action: "list" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const d = data || {};
  const policies = d.policies || [];
  const agents = listData?.agents || [];

  const filteredPolicies = policies.filter(p =>
    !search.trim() || (p.policy_name || "").toLowerCase().includes(search.toLowerCase()) || (p.agent || "").toLowerCase().includes(search.toLowerCase())
  );

  const zeroTrustCount = policies.filter(p => p.policy_type === "zero_trust" && p.active).length;
  const approvalGateCount = policies.filter(p => p.policy_type === "approval_gate" && p.active).length;

  return (
    <div style={{ ...PAGE_BG }}>
      {showModal && <NewPolicyModal agents={agents} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); qc.invalidateQueries(); }} />}
      <Breadcrumb items={[{ label: "Super Agents", path: "/super-agents" }, { label: "Governance" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Super Agent Governance Center</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
            {policies.length} Policies
          </span>
          {policies.filter(p => p.active).length > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded"
              style={{ color: LOW, background: `${LOW}15`, border: `1px solid ${LOW}30` }}>
              {policies.filter(p => p.active).length} Active
            </span>
          )}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4" />
          Create Policy
        </button>
      </div>

      {/* Global policy banner */}
      {(zeroTrustCount > 0 || approvalGateCount > 0) && (
        <Card className="p-4 mb-6" style={{ border: `1px solid ${CYAN}30`, background: `${CYAN}06` }}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
            <p className="text-sm font-semibold text-white">
              Zero Trust: enforced on {zeroTrustCount} agent{zeroTrustCount !== 1 ? "s" : ""}
              {approvalGateCount > 0 && ` · Approval gates: ${approvalGateCount}`}
            </p>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: MUTED }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search policies…"
            className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
      </div>

      {/* Policy table */}
      {isLoading ? <Skeleton lines={5} /> : filteredPolicies.length === 0 ? (
        <EmptyState icon={Shield} title={search ? "No matching policies" : "No policies yet"} description={search ? "Try adjusting your search" : "Create your first governance policy"} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Agent", "Policy Name", "Type", "Action", "Applies To", "Violations", "Active"].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.map((p, i) => (
                <tr key={p.policy_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td className="py-2 px-3">
                    <span className="text-[11px] font-semibold text-white">{p.agent || "—"}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-[11px] font-semibold text-white">{p.policy_name || "Unnamed"}</span>
                  </td>
                  <td className="py-2 px-3"><PolicyTypeBadge type={p.policy_type} /></td>
                  <td className="py-2 px-3"><ActionBadge action={p.action_on_violation} /></td>
                  <td className="py-2 px-3 text-[11px]" style={{ color: MUTED }}>{p.applies_to || "—"}</td>
                  <td className="py-2 px-3 font-mono" style={{ color: (p.violations || 0) > 0 ? DANGER : MUTED }}>{p.violations || 0}</td>
                  <td className="py-2 px-3">
                    <button
                      className={`w-8 h-5 rounded-full transition-all ${p.active ? "bg-green-500/20" : "bg-gray-500/20"}`}
                      style={{ border: `1px solid ${p.active ? LOW : MUTED}` }}
                      onClick={async () => {
                        try {
                          await base44.functions.invoke("gdsSuperAgentFramework", {
                            action: "governance",
                            toggle_policy: true,
                            policy_id: p.policy_id,
                            active: !p.active
                          });
                          refetch();
                        } catch (e) { console.error(e); }
                      }}
                    >
                      <div className={`w-4 h-4 rounded-full transition-all ${p.active ? "translate-x-3 bg-green-500" : "translate-x-0 bg-gray-500"}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}