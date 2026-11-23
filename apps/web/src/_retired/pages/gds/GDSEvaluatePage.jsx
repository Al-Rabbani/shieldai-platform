import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Play, FlaskConical, CheckCircle, XCircle, Lock, AlertTriangle, User, Key, Layers, Database, GitBranch, Cpu, Plug, Cloud, Eye, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { toast } from "sonner";

const RESOURCE_TYPES = ['finding', 'scan', 'workflow', 'agent', 'tool', 'connector', 'data', 'api', 'iam', 'cloud_account'];
const ACTIONS = ['read', 'write', 'create', 'delete', 'execute', 'approve', 'admin'];
const ACTOR_TYPES = ['user', 'agent', 'service', 'api_key'];

export default function GDSEvaluatePage() {
  const [activeTab, setActiveTab] = useState("evaluate");
  const [form, setForm] = useState({
    actor_id: '', actor_type: 'user', actor_role: 'analyst',
    resource_type: 'finding', resource_id: '', action: 'read',
    zero_trust_score: 75,
    actor_attributes: { mfa_verified: true, department: 'security', country: 'US', clearance_level: '3' },
    resource_attributes: { sensitivity: 'confidential', classification: 'internal', owner: 'security-team' }
  });
  const [simulateForm, setSimulateForm] = useState({
    simulate_role: 'analyst', resource_type: 'finding', action: 'read', zero_trust_score: 75
  });
  const [result, setResult] = useState(null);
  const [simulateResult, setSimulateResult] = useState(null);

  const evaluateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsRBACEngine", { action: "evaluate", ...data }),
    onSuccess: (res) => {
      setResult(res.data);
      toast.success(`Access ${res.data.decision}`);
    }
  });

  const simulateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsRBACEngine", { action: "evaluate", ...data, simulate: true }),
    onSuccess: (res) => {
      setSimulateResult(res.data);
      toast.info("Simulation complete");
    }
  });

  const handleEvaluate = () => {
    evaluateMutation.mutate(form);
  };

  const handleSimulate = () => {
    simulateMutation.mutate({
      actor_id: 'simulated_user',
      actor_type: 'user',
      actor_role: simulateForm.simulate_role,
      resource_type: simulateForm.resource_type,
      resource_id: 'simulated_resource',
      action: simulateForm.action,
      zero_trust_score: simulateForm.zero_trust_score
    });
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Access Evaluator" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Access Decision Console</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>RBAC + ABAC + Zero Trust + Policy — 16 stages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["evaluate", "simulate"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'ring-2' : ''}`}
              style={{ 
                background: activeTab === tab ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                color: activeTab === tab ? CYAN : MUTED,
                borderColor: activeTab === tab ? CYAN : BORDER
              }}>
              {tab === 'evaluate' ? <><Play className="w-3.5 h-3.5 inline mr-1.5" />Evaluate</> : <><FlaskConical className="w-3.5 h-3.5 inline mr-1.5" />Simulate</>}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'evaluate' ? (
        <>
          {/* Evaluate Form */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-4">Access Request</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Actor ID</label>
                <input
                  value={form.actor_id}
                  onChange={e => setForm({ ...form, actor_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Actor Type</label>
                <select
                  value={form.actor_type}
                  onChange={e => setForm({ ...form, actor_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  {ACTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Actor Role</label>
                <input
                  value={form.actor_role}
                  onChange={e => setForm({ ...form, actor_role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                  placeholder="analyst"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Resource Type</label>
                <select
                  value={form.resource_type}
                  onChange={e => setForm({ ...form, resource_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Resource ID</label>
                <input
                  value={form.resource_id}
                  onChange={e => setForm({ ...form, resource_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                  placeholder="finding-123"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Requested Action</label>
                <select
                  value={form.action}
                  onChange={e => setForm({ ...form, action: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Zero Trust Score: {form.zero_trust_score}</label>
              <input
                type="range"
                min="0"
                max="100"
                value={form.zero_trust_score}
                onChange={e => setForm({ ...form, zero_trust_score: parseInt(e.target.value) })}
                className="w-full"
                style={{ accentColor: CYAN }}
              />
              <div className="flex justify-between text-[9px] mt-1" style={{ color: MUTED }}>
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            <button
              onClick={handleEvaluate}
              disabled={evaluateMutation.isPending}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              {evaluateMutation.isPending ? 'Evaluating...' : 'Evaluate Access'}
            </button>
          </Card>

          {/* Result */}
          {result && (
            <Card className="p-5">
              <div className={`p-4 rounded-xl mb-4 text-center ${result.decision === 'allow' ? 'bg-green-400/15' : result.decision === 'deny' ? 'bg-red-400/15' : 'bg-yellow-400/15'}`}>
                <h3 className={`text-lg font-black ${result.decision === 'allow' ? 'text-green-400' : result.decision === 'deny' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {result.decision === 'allow' ? '✓ ACCESS ALLOWED' : result.decision === 'deny' ? '✗ ACCESS DENIED' : '⚠ APPROVAL REQUIRED'}
                </h3>
                <p className="text-[10px] mt-1" style={{ color: MUTED }}>{result.reason}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-xl" style={{ background: result.rbac_result === 'pass' ? 'rgba(0,255,136,0.1)' : 'rgba(255,59,59,0.1)', border: `1px solid ${result.rbac_result === 'pass' ? LOW : DANGER}30` }}>
                  <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>RBAC Result</p>
                  <p className={`text-sm font-black ${result.rbac_result === 'pass' ? 'text-green-400' : 'text-red-400'}`}>{result.rbac_result}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: result.abac_result === 'pass' ? 'rgba(0,255,136,0.1)' : 'rgba(255,59,59,0.1)', border: `1px solid ${result.abac_result === 'pass' ? LOW : DANGER}30` }}>
                  <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>ABAC Result</p>
                  <p className={`text-sm font-black ${result.abac_result === 'pass' ? 'text-green-400' : 'text-red-400'}`}>{result.abac_result}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}30` }}>
                  <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Zero Trust Score</p>
                  <p className="text-sm font-black" style={{ color: CYAN }}>{result.zero_trust_score}/100</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Evaluation Time</p>
                  <p className="text-sm font-black" style={{ color: TEXT }}>{result.evaluation_ms}ms</p>
                </div>
              </div>

              {result.denial_reasons?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Denial Reasons</p>
                  <div className="space-y-1">
                    {result.denial_reasons.map((reason, i) => (
                      <div key={i} className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,59,59,0.1)", border: `1px solid ${DANGER}30`, color: DANGER }}>
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      ) : (
        <>
          {/* Simulate Form */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="w-4 h-4" style={{ color: "#a855f7" }} />
              <h3 className="text-sm font-bold text-white">Simulation Mode</h3>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.15)", border: `1px solid rgba(168,85,247,0.3)`, color: "#a855f7" }}>Dry-run only</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Simulate Role</label>
                <select
                  value={simulateForm.simulate_role}
                  onChange={e => setSimulateForm({ ...simulateForm, simulate_role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  {['admin', 'analyst', 'operator', 'viewer'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Resource Type</label>
                <select
                  value={simulateForm.resource_type}
                  onChange={e => setSimulateForm({ ...simulateForm, resource_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Action</label>
                <select
                  value={simulateForm.action}
                  onChange={e => setSimulateForm({ ...simulateForm, action: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Zero Trust Score: {simulateForm.zero_trust_score}</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simulateForm.zero_trust_score}
                  onChange={e => setSimulateForm({ ...simulateForm, zero_trust_score: parseInt(e.target.value) })}
                  className="w-full"
                  style={{ accentColor: "#a855f7" }}
                />
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulateMutation.isPending}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: "rgba(168,85,247,0.15)", border: `1px solid rgba(168,85,247,0.3)`, color: "#a855f7" }}>
              {simulateMutation.isPending ? 'Simulating...' : 'Run Simulation'}
            </button>
          </Card>

          {/* Simulation Result */}
          {simulateResult && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(168,85,247,0.15)", border: `1px solid rgba(168,85,247,0.3)`, color: "#a855f7" }}>
                  Simulation only — no decision recorded
                </span>
                <span className={`text-sm font-black px-2 py-1 rounded ${simulateResult.decision === 'allow' ? 'bg-green-400/15 text-green-400' : simulateResult.decision === 'deny' ? 'bg-red-400/15 text-red-400' : 'bg-yellow-400/15 text-yellow-400'}`}>
                  Would {simulateResult.decision?.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>RBAC Would Allow</p>
                  <p className="text-sm font-black" style={{ color: TEXT }}>{simulateResult.rbac_result === 'pass' ? 'Yes' : 'No'}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>ZT Passes</p>
                  <p className="text-sm font-black" style={{ color: TEXT }}>{simulateResult.zero_trust_score >= 50 ? 'Yes' : 'No'}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Approval Required</p>
                  <p className="text-sm font-black" style={{ color: TEXT }}>{simulateResult.approval_required ? 'Yes' : 'No'}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Risk Level</p>
                  <p className="text-sm font-black" style={{ color: simulateResult.risk_level === 'critical' ? DANGER : simulateResult.risk_level === 'high' ? HIGH : MEDIUM }}>{simulateResult.risk_level}</p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}