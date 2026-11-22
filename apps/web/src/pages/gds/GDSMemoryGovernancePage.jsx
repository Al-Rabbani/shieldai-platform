import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Plus, X, CheckCircle, AlertTriangle, Search } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

const ACTION_COLORS = { archive: "#60a5fa", delete: DANGER, review: HIGH, anonymize: "#a855f7" };
const MEMORY_TYPES = ["ThreatMemory", "IncidentMemory", "ComplianceMemory", "WorkingMemory", "LongTermMemory", "AssetMemory", "IdentityMemory", "ExecutiveMemory", "SessionMemory", "WorkflowMemory", "SemanticMemory"];

export default function GDSMemoryGovernancePage() {
  const qc = useQueryClient();
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [accessCheck, setAccessCheck] = useState({ agent_id: "", access_type: "read", classification: "internal" });
  const [accessResult, setAccessResult] = useState(null);
  const [expiryFilter, setExpiryFilter] = useState({ memory_type: "all", older_than_days: 30, min_importance: 0, dry_run: true });

  const { data: govData, isLoading } = useQuery({
    queryKey: ["memory-governance"],
    queryFn: () => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "governance" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const ruleMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "governance", ...payload, create_rule: true }),
    onSuccess: () => { qc.invalidateQueries(["memory-governance"]); setShowRuleModal(false); },
  });

  const grantMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "access_grant", ...payload }),
    onSuccess: () => { qc.invalidateQueries(["memory-governance"]); setShowGrantModal(false); },
  });

  const accessCheckMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "access_check", ...payload }),
    onSuccess: (res) => setAccessResult(res.data),
  });

  const expireMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "expire", ...payload }),
    onSuccess: () => { qc.invalidateQueries(["memory-governance"]); },
  });

  const rules = govData?.rules || [];
  const grants = govData?.grants || [];
  const stats = govData?.stats || {};

  const inputStyle = { background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none" };

  const handleAccessCheck = () => { accessCheckMutation.mutate(accessCheck); };
  const handleExpiry = () => { expireMutation.mutate(expiryFilter); };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Memory Governance Center" }]} />
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Memory Governance Center</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Zero Trust · RBAC · ABAC · Retention · Access Control</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRuleModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-4 h-4" /> Create Retention Rule
          </button>
          <button onClick={() => setShowGrantModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6" }}>
            <Plus className="w-4 h-4" /> Grant Access
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Retention Rules", value: rules.length, color: CYAN },
          { label: "Active Grants", value: grants.length, color: LOW },
          { label: "Flagged Events", value: stats.flagged_events || 0, color: HIGH },
          { label: "Access Denials", value: stats.access_denials || 0, color: DANGER },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Retention Rules</h3>
        </div>
        {isLoading ? <Skeleton lines={5} /> : rules.length === 0 ? (
          <EmptyState icon={Shield} title="No retention rules" description="Create rules to manage memory lifecycle" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Rule Name", "Memory Type", "Classification", "Retention Days", "Action on Expiry", "Active"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, i) => {
                  const actionColor = ACTION_COLORS[rule.action_on_expiry] || MUTED;
                  return (
                    <tr key={rule.rule_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 text-white">{rule.rule_name || "Untitled"}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{rule.memory_type || "—"}</span>
                      </td>
                      <td className="py-2 px-3 text-[10px] capitalize" style={{ color: MUTED }}>{rule.data_classification || "—"}</td>
                      <td className="py-2 px-3 font-mono" style={{ color: MUTED }}>{rule.retention_days || 0}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: actionColor, background: `${actionColor}18`, border: `1px solid ${actionColor}30` }}>
                          {rule.action_on_expiry || "review"}
                        </span>
                      </td>
                      <td className="py-2 px-3">{rule.is_active ? <CheckCircle className="w-4 h-4" style={{ color: LOW }} /> : <X className="w-4 h-4" style={{ color: MUTED }} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Access Grants</h3>
        </div>
        {grants.length === 0 ? (
          <EmptyState icon={Shield} title="No access grants" description="Grant access to agents" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Agent ID", "Max Classification", "Read", "Write", "Search", "Expires"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grants.map((g, i) => (
                  <tr key={g.grant_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono text-white">{g.agent_id || "—"}</td>
                    <td className="py-2 px-3 text-[10px] capitalize" style={{ color: g.max_classification === "restricted" ? DANGER : g.max_classification === "confidential" ? HIGH : MUTED }}>{g.max_classification || "internal"}</td>
                    <td className="py-2 px-3">{g.can_read ? <CheckCircle className="w-4 h-4" style={{ color: LOW }} /> : <X className="w-4 h-4" style={{ color: MUTED }} />}</td>
                    <td className="py-2 px-3">{g.can_write ? <CheckCircle className="w-4 h-4" style={{ color: LOW }} /> : <X className="w-4 h-4" style={{ color: MUTED }} />}</td>
                    <td className="py-2 px-3">{g.can_search ? <CheckCircle className="w-4 h-4" style={{ color: LOW }} /> : <X className="w-4 h-4" style={{ color: MUTED }} />}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{g.expires_at ? new Date(g.expires_at).toLocaleDateString() : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Access Check Tool</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <input value={accessCheck.agent_id} onChange={e => setAccessCheck({ ...accessCheck, agent_id: e.target.value })} placeholder="Agent ID" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          <select value={accessCheck.access_type} onChange={e => setAccessCheck({ ...accessCheck, access_type: e.target.value })} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="read">Read</option><option value="write">Write</option><option value="search">Search</option>
          </select>
          <select value={accessCheck.classification} onChange={e => setAccessCheck({ ...accessCheck, classification: e.target.value })} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="public">Public</option><option value="internal">Internal</option><option value="confidential">Confidential</option><option value="restricted">Restricted</option>
          </select>
          <button onClick={handleAccessCheck} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>Check Access</button>
        </div>
        {accessResult && (
          <div className={`p-4 rounded-lg ${accessResult.verdict === "ALLOW" ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`} style={{ border: `1px solid ${accessResult.verdict === "ALLOW" ? LOW : DANGER}` }}>
            <div className="flex items-center gap-2 mb-2">
              {accessResult.verdict === "ALLOW" ? <CheckCircle className="w-5 h-5" style={{ color: LOW }} /> : <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />}
              <span className="text-sm font-bold" style={{ color: accessResult.verdict === "ALLOW" ? LOW : DANGER }}>{accessResult.verdict || "DENY"}</span>
            </div>
            <p className="text-xs" style={{ color: MUTED }}>{accessResult.reason || "Access check completed"}</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Memory Expiry Tool</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <select value={expiryFilter.memory_type} onChange={e => setExpiryFilter({ ...expiryFilter, memory_type: e.target.value })} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Types</option>
            {MEMORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" value={expiryFilter.older_than_days} onChange={e => setExpiryFilter({ ...expiryFilter, older_than_days: Number(e.target.value) })} placeholder="Days" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          <input type="number" value={expiryFilter.min_importance} onChange={e => setExpiryFilter({ ...expiryFilter, min_importance: Number(e.target.value) })} placeholder="Min Importance" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg text-xs" style={{ background: expiryFilter.dry_run ? `${CYAN}10` : "rgba(255,255,255,0.04)", border: `1px solid ${expiryFilter.dry_run ? CYAN + "40" : BORDER}` }}>
            <input type="checkbox" checked={expiryFilter.dry_run} onChange={e => setExpiryFilter({ ...expiryFilter, dry_run: e.target.checked })} className="w-3.5 h-3.5 rounded accent-cyan-400" />
            <span style={{ color: expiryFilter.dry_run ? CYAN : MUTED }}>Dry Run</span>
          </label>
        </div>
        <button onClick={handleExpiry} disabled={expireMutation.isPending} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30`, color: DANGER }}>
          {expireMutation.isPending ? "Running Expiry..." : "Run Expiry"}
        </button>
        {expireMutation.data && (
          <div className="mt-4 p-4 rounded-lg" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>
            <p className="text-xs" style={{ color: CYAN }}>Found: {expireMutation.data.candidates_found || 0} candidates · Expired: {expireMutation.data.expired_count || 0}</p>
          </div>
        )}
      </Card>
    </div>
  );
}