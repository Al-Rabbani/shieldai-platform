import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Network, Zap, TrendingUp, Plus, ToggleLeft } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const BG = "#020817";

const RULE_TYPE_COLORS = { sequence: CYAN, threshold: HIGH, statistical: "#a855f7", ml_based: "#10b981" };

export default function GDSSOCCorrelationPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading: loadR } = useQuery({
    queryKey: ["correlation-rules"],
    queryFn: () => base44.entities.CorrelationRule.list("-created_at", 100).catch(() => []),
  });

  const { data: results = [], isLoading: loadRes } = useQuery({
    queryKey: ["correlation-results"],
    queryFn: () => base44.entities.CorrelationResult.list("-correlated_at", 100).catch(() => []),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.CorrelationRule.update(id, { is_active: active }),
    onSuccess: () => queryClient.invalidateQueries(["correlation-rules"]),
  });

  const filteredRules = activeFilter === "all" ? rules : rules.filter(r => r.is_active === (activeFilter === "active"));

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "AI-SOC", path: "/soc" }, { label: "Correlation Engine" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Network className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Alert Correlation Engine</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Intelligent alert grouping and noise reduction</p>
          </div>
        </div>
        <Button className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Rules</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{rules.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{rules.filter(r => r.is_active).length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Correlations</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{results.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Noise Reduced</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{results.reduce((s, r) => s + (r.alerts_suppressed || 0), 0)}</p>
        </Card>
      </div>

      {/* Rules Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Correlation Rules</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveFilter("all")} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold ${activeFilter === "all" ? "" : "hover:opacity-70"}`} style={{ background: activeFilter === "all" ? `${CYAN}15` : "rgba(255,255,255,0.04)", color: activeFilter === "all" ? CYAN : MUTED }}>All</button>
            <button onClick={() => setActiveFilter("active")} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold ${activeFilter === "active" ? "" : "hover:opacity-70"}`} style={{ background: activeFilter === "active" ? `${LOW}15` : "rgba(255,255,255,0.04)", color: activeFilter === "active" ? LOW : MUTED }}>Active</button>
            <button onClick={() => setActiveFilter("inactive")} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold ${activeFilter === "inactive" ? "" : "hover:opacity-70"}`} style={{ background: activeFilter === "inactive" ? `${MUTED}15` : "rgba(255,255,255,0.04)", color: activeFilter === "inactive" ? MUTED : MUTED }}>Inactive</button>
          </div>
        </div>
        {loadR ? <Skeleton lines={6} /> : filteredRules.length === 0 ? (
          <EmptyState icon={Network} title="No correlation rules" description="Create rules to automatically correlate related alerts" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Name", "Type", "Severity", "MITRE", "Active", "Time Window", "Threshold", "Fired", "FP Rate", "Last Fired"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => {
                  const typeColor = RULE_TYPE_COLORS[rule.rule_type] || MUTED;
                  return (
                    <tr key={rule.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-4">
                        <p className="text-xs font-bold text-white">{rule.name}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{rule.description?.slice(0, 50)}...</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${typeColor}15`, color: typeColor }}>{rule.rule_type || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4"><SevBadge sev={rule.severity} /></td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono" style={{ color: CYAN }}>{rule.mitre_technique || "—"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Switch checked={rule.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, active: v })} />
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{rule.time_window_minutes || 0}m</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{rule.threshold || 0}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-bold" style={{ color: HIGH }}>{rule.fire_count || 0}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: MUTED }}>{rule.false_positive_count || 0}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(rule.last_fired_at)}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Results Feed */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Latest Correlation Results</h3>
        </div>
        {loadRes ? <Skeleton lines={6} /> : results.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm" style={{ color: MUTED }}>No correlation results yet</p></div>
        ) : (
          <div className="space-y-3">
            {results.slice(0, 10).map((res) => (
              <div key={res.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold text-white">{res.rule_name}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{res.matched_alerts?.length || 0} alerts correlated</p>
                  </div>
                  <div className="text-right">
                    <SevBadge sev={res.severity} />
                    <p className="text-[10px] mt-1" style={{ color: MUTED }}>{timeAgo(res.correlated_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px]">
                  <span className="flex items-center gap-1" style={{ color: CYAN }}>
                    <TrendingUp className="w-3 h-3" /> Confidence: {res.confidence_pct || 0}%
                  </span>
                  {res.incident_created && <span className="flex items-center gap-1" style={{ color: LOW }}><Zap className="w-3 h-3" /> Incident Created</span>}
                  <span className="flex items-center gap-1" style={{ color: MEDIUM }}>
                    <Network className="w-3 h-3" /> Suppressed: {res.alerts_suppressed || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}