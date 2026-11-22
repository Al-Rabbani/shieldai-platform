import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, CheckCircle, XCircle, Lock, Key, RotateCcw, Activity, Eye, FileCheck } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function GDSToolRiskPage() {
  const [expandedTier, setExpandedTier] = useState(null);

  const { data: metrics } = useQuery({
    queryKey: ["tool-metrics"],
    queryFn: () => base44.functions.invoke("gdsToolExecutionEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: riskProfiles } = useQuery({
    queryKey: ["tool-risk-profiles"],
    queryFn: () => base44.entities.ToolRiskProfile.list("-last_reviewed_at", 50).catch(() => []),
  });

  const { data: outputStats } = useQuery({
    queryKey: ["tool-output-stats"],
    queryFn: () => base44.entities.ToolOutput.list("-validated_at", 100).catch(() => []),
  });

  const m = metrics || {};
  const registry = m.registry || {};
  const byRisk = registry.by_risk || {};

  const tierTools = {
    critical: riskProfiles?.filter(p => p.risk_level === "critical") || [],
    high: riskProfiles?.filter(p => p.risk_level === "high") || [],
    medium: riskProfiles?.filter(p => p.risk_level === "medium") || [],
    low: riskProfiles?.filter(p => p.risk_level === "low") || [],
  };

  const outputValidated = outputStats?.filter(o => o.validated === true).length || 0;
  const outputFlagged = outputStats?.filter(o => o.flagged === true).length || 0;
  const outputQuarantined = outputStats?.filter(o => o.quarantined === true).length || 0;
  const secretLeaks = outputStats?.reduce((sum, o) => sum + (o.secret_leaks || 0), 0) || 0;
  const totalOutput = outputStats?.length || 0;
  const validPct = totalOutput > 0 ? Math.round((outputValidated / totalOutput) * 100) : 0;

  const tierInfo = {
    critical: {
      color: DANGER,
      desc: "Tools requiring admin approval, touch production IAM, circuit breaker mandatory",
      icon: AlertTriangle
    },
    high: {
      color: HIGH,
      desc: "Mutating tools, touch production resources, approval required",
      icon: Lock
    },
    medium: {
      color: MEDIUM,
      desc: "Read/write tools, limited blast radius, RBAC enforced",
      icon: Key
    },
    low: {
      color: LOW,
      desc: "Read-only tools, isolated execution, auto-approved",
      icon: CheckCircle
    }
  };

  const riskDistribution = Object.entries(byRisk).map(([risk, count]) => ({
    name: risk.charAt(0).toUpperCase() + risk.slice(1),
    value: count,
    color: RISK_COLORS[risk] || MUTED
  }));

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tool Risk Intelligence" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Tool Risk Intelligence</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-009 v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>Risk profiling · Circuit breaker · Blast radius · Output validation</span>
        </div>
      </div>

      {/* Risk Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(tierInfo).map(([tier, info]) => {
          const Icon = info.icon;
          const tools = tierTools[tier] || [];
          const expanded = expandedTier === tier;
          return (
            <Card key={tier} className="p-4" style={{ border: `1px solid ${info.color}40` }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-5 h-5" style={{ color: info.color }} />
                <h3 className="text-sm font-bold text-white uppercase">{tier}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ color: info.color, background: `${info.color}15` }}>{tools.length}</span>
              </div>
              <p className="text-[9px] mb-3" style={{ color: MUTED }}>{info.desc}</p>
              <button
                onClick={() => setExpandedTier(expanded ? null : tier)}
                className="text-[10px] font-bold transition-all"
                style={{ color: CYAN }}>
                {expanded ? "Hide Tools" : `Show ${tools.length} Tools`}
              </button>
              {expanded && tools.length > 0 && (
                <div className="mt-3 space-y-1 max-h-48 overflow-auto">
                  {tools.map(tool => (
                    <div key={tool.profile_id} className="flex items-center justify-between text-[9px] p-1.5 rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <span className="font-mono text-white truncate flex-1">{tool.tool_id}</span>
                      <span className="text-[8px] px-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{tool.category || "general"}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Risk Distribution Chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Risk Distribution</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Tools by risk tier</p>
        </div>
        {riskDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riskDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis type="category" dataKey="name" stroke={MUTED} fontSize={10} />
              <YAxis stroke={MUTED} fontSize={10} />
              <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {riskDistribution.map((entry, i) => (
                  <rect key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={Shield} title="No risk data" description="Risk profiles will appear here after tool registration" />
        )}
      </Card>

      {/* Risk Profile Table */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Risk Profiles</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Detailed risk assessments for registered tools</p>
        </div>
        {riskProfiles && riskProfiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Profile ID", "Tool ID", "Risk", "Blast Radius", "Mutating", "Destructive", "Irreversible", "Touches IAM", "Touches Prod", "Approval", "Rollback", "Last Reviewed"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskProfiles.map(profile => (
                  <tr key={profile.profile_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{profile.profile_id}</td>
                    <td className="py-2 px-3 font-mono text-white">{profile.tool_id}</td>
                    <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded capitalize" style={{ color: RISK_COLORS[profile.risk_level] || MUTED, background: "rgba(255,255,255,0.04)" }}>{profile.risk_level}</span></td>
                    <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded capitalize" style={{ color: profile.blast_radius === "platform_wide" ? DANGER : profile.blast_radius === "broad" ? HIGH : profile.blast_radius === "limited" ? MEDIUM : LOW, background: "rgba(255,255,255,0.04)" }}>{profile.blast_radius || "isolated"}</span></td>
                    <td className="py-2 px-3">{profile.is_mutating ? <CheckCircle className="w-3.5 h-3.5" style={{ color: HIGH }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: MUTED }} />}</td>
                    <td className="py-2 px-3">{profile.is_destructive ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: DANGER }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: MUTED }} />}</td>
                    <td className="py-2 px-3">{profile.is_irreversible ? <Lock className="w-3.5 h-3.5" style={{ color: DANGER }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: MUTED }} />}</td>
                    <td className="py-2 px-3">{profile.touches_iam ? <Key className="w-3.5 h-3.5" style={{ color: HIGH }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: MUTED }} />}</td>
                    <td className="py-2 px-3">{profile.touches_production ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: HIGH }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: MUTED }} />}</td>
                    <td className="py-2 px-3">{profile.requires_approval ? <Shield className="w-3.5 h-3.5" style={{ color: HIGH }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: MUTED }} />}</td>
                    <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded capitalize" style={{ color: profile.rollback_complexity === "complex" ? DANGER : profile.rollback_complexity === "moderate" ? HIGH : LOW, background: "rgba(255,255,255,0.04)" }}>{profile.rollback_complexity || "simple"}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{profile.last_reviewed_at ? new Date(profile.last_reviewed_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Shield} title="No risk profiles" description="Risk profiles will appear here after tool execution" />
        )}
      </Card>

      {/* Output Validation Stats */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Output Validation Statistics</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Tool output validation and security scanning</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Total Validated</p>
            <p className="text-xl font-black font-mono" style={{ color: TEXT }}>{outputValidated}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Valid %</p>
            <p className="text-xl font-black font-mono" style={{ color: validPct >= 90 ? LOW : validPct >= 70 ? MEDIUM : DANGER }}>{validPct}%</p>
            <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${validPct}%`, background: validPct >= 90 ? LOW : validPct >= 70 ? MEDIUM : DANGER }} />
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Flagged</p>
            <p className="text-xl font-black font-mono" style={{ color: HIGH }}>{outputFlagged}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Quarantined</p>
            <p className="text-xl font-black font-mono" style={{ color: DANGER }}>{outputQuarantined}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${secretLeaks > 0 ? DANGER : BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Secret Leaks</p>
            <p className="text-xl font-black font-mono" style={{ color: secretLeaks > 0 ? DANGER : MUTED }}>{secretLeaks}</p>
            {secretLeaks > 0 && <AlertTriangle className="w-4 h-4 mt-1" style={{ color: DANGER }} />}
          </div>
        </div>
      </Card>
    </div>
  );
}

const RISK_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };