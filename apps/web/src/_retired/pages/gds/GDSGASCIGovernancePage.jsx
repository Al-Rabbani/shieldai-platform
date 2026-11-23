import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Lock, FileText } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const POLICY_COLORS = {
  safety: "#ef4444", human_approval: "#f97316", data_sovereignty: "#dc2626",
  cost_limit: "#3b82f6", hallucination_threshold: "#f59e0b"
};

const RULE_COLORS = {
  hallucination: "#f97316", prompt_injection: "#ef4444", jailbreak: "#ef4444",
  pii_filter: "#f59e0b", toxic_content: "#ef4444", bias_detection: "#a855f7"
};

export default function GDSGASCIGovernancePage() {
  const { data: policies = [], isLoading: loadP } = useQuery({
    queryKey: ["gasci-policies"],
    queryFn: () => base44.entities.GovernancePolicy.list("-created_at", 100).catch(() => []),
  });

  const { data: rules = [], isLoading: loadR } = useQuery({
    queryKey: ["gasci-rules"],
    queryFn: () => base44.entities.SafetyRule.list("-created_at", 100).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "GASCI", path: "/gasci" }, { label: "Governance" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">AI Governance Center</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Policy and safety rule management</p>
        </div>
      </div>

      {/* TOP: Governance Policies */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Governance Policies</h3>
        </div>
        <Card className="overflow-hidden">
          {loadP ? <Skeleton lines={5} /> : policies.length === 0 ? (
            <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>No policies</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    {["Name", "Type", "Rule", "Threshold", "Action", "Active", "Enforcements", "Violations"].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {policies.map(policy => (
                    <tr key={policy.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-4"><p className="text-xs font-semibold text-white">{policy.name}</p></td>
                      <td className="py-3 px-4"><span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${POLICY_COLORS[policy.policy_type] || MUTED}30`, color: POLICY_COLORS[policy.policy_type] || MUTED }}>{policy.policy_type?.replace(/_/g, " ")}</span></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }} className="max-w-xs truncate">{policy.rule}</p></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{policy.threshold || "—"}</p></td>
                      <td className="py-3 px-4"><span className={`text-[10px] px-2 py-0.5 rounded ${policy.action_on_violation === 'block' ? 'bg-red-400/20 text-red-400' : policy.action_on_violation === 'require_approval' ? 'bg-orange-400/20 text-orange-400' : 'bg-gray-400/20 text-gray-400'}`}>{policy.action_on_violation?.replace(/_/g, " ")}</span></td>
                      <td className="py-3 px-4">{policy.is_active ? <Shield className="w-4 h-4" style={{ color: LOW }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{policy.enforcement_count || 0}</p></td>
                      <td className="py-3 px-4"><p className={`text-xs font-bold ${policy.violation_count > 0 ? 'text-red-400' : 'text-green-400'}`}>{policy.violation_count || 0}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* BOTTOM: Safety Rules */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5" style={{ color: MEDIUM }} />
          <h3 className="text-sm font-bold text-white">Safety Rules</h3>
        </div>
        <Card className="overflow-hidden">
          {loadR ? <Skeleton lines={5} /> : rules.length === 0 ? (
            <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>No safety rules</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    {["Name", "Type", "Pattern", "Confidence", "Action", "Triggers", "False Positives", "Last Triggered"].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr key={rule.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-4"><p className="text-xs font-semibold text-white">{rule.name}</p></td>
                      <td className="py-3 px-4"><span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${RULE_COLORS[rule.rule_type] || MUTED}30`, color: RULE_COLORS[rule.rule_type] || MUTED }}>{rule.rule_type?.replace(/_/g, " ")}</span></td>
                      <td className="py-3 px-4"><p className="text-xs font-mono" style={{ color: TEXT }} className="max-w-xs truncate">{rule.detection_pattern}</p></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{rule.confidence_threshold || 0}%</p></td>
                      <td className="py-3 px-4"><span className={`text-[10px] px-2 py-0.5 rounded ${rule.action === 'block' ? 'bg-red-400/20 text-red-400' : rule.action === 'flag' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-gray-400/20 text-gray-400'}`}>{rule.action}</span></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{rule.trigger_count || 0}</p></td>
                      <td className="py-3 px-4"><p className={`text-xs font-bold ${rule.false_positive_count > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{rule.false_positive_count || 0}</p></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: MUTED }}>{rule.last_triggered ? new Date(rule.last_triggered).toLocaleDateString() : '—'}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}