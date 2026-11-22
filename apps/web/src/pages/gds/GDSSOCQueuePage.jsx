import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";

const BG = "#020817";
const TIER_COLORS = { T1: "#3b82f6", T2: "#8b5cf6", T3: "#a855f7", Management: "#f59e0b" };

export default function GDSSOCQueuePage() {
  const [filterTier, setFilterTier] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const { data: queueItems = [], isLoading } = useQuery({
    queryKey: ["soc-queue"],
    queryFn: () => base44.entities.SOCQueue.list("-queued_at", 200).catch(() => []),
  });

  const filtered = queueItems.filter(q => {
    if (filterTier !== "all" && q.tier !== filterTier) return false;
    if (filterSeverity !== "all" && q.severity !== filterSeverity) return false;
    return true;
  });

  const byTier = { T1: queueItems.filter(q => q.tier === "T1").length, T2: queueItems.filter(q => q.tier === "T2").length, T3: queueItems.filter(q => q.tier === "T3").length, Management: queueItems.filter(q => q.tier === "Management").length };
  const critical = queueItems.filter(q => {
    if (!q.sla_deadline) return false;
    const hoursLeft = (new Date(q.sla_deadline) - new Date()) / (1000 * 60 * 60);
    return hoursLeft < 0.5 && q.status !== "resolved";
  }).length;
  const breached = queueItems.filter(q => q.sla_deadline && new Date(q.sla_deadline) < new Date() && q.status !== "resolved").length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "SOC", path: "/soc" }, { label: "Queue" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">SOC Analyst Queue</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Triage and assignment by tier</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Queued</p>
          <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{queueItems.filter(q => q.status !== "resolved").length}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical (SLA &lt;30m)</p>
          <p className="text-3xl font-black font-mono" style={{ color: DANGER }}>{critical}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>SLA Breached</p>
          <p className="text-3xl font-black font-mono" style={{ color: DANGER }}>{breached}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Queue Age</p>
          <p className="text-3xl font-black font-mono" style={{ color: MEDIUM }}>{Math.round(queueItems.filter(q => q.status !== "resolved").reduce((s, q) => s + ((new Date() - new Date(q.queued_at)) / (1000 * 60 * 60)), 0) / (queueItems.filter(q => q.status !== "resolved").length || 1))}h</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold" style={{ color: MUTED }}>Tier:</span>
        {["all", "T1", "T2", "T3", "Management"].map(tier => (
          <button key={tier} onClick={() => setFilterTier(tier)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterTier === tier ? "" : "hover:opacity-70"}`}
            style={{ background: filterTier === tier ? `${TIER_COLORS[tier] || CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${filterTier === tier ? TIER_COLORS[tier] || CYAN : BORDER}`, color: filterTier === tier ? TIER_COLORS[tier] || CYAN : MUTED }}>{tier}</button>
        ))}
        <span className="text-xs font-bold ml-4" style={{ color: MUTED }}>Severity:</span>
        {["all", "critical", "high", "medium", "low"].map(sev => (
          <button key={sev} onClick={() => setFilterSeverity(sev)} className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${filterSeverity === sev ? "" : "hover:opacity-70"}`}
            style={{ background: filterSeverity === sev ? `${DANGER}15` : "rgba(255,255,255,0.04)", border: `1px solid ${filterSeverity === sev ? DANGER : BORDER}`, color: filterSeverity === sev ? DANGER : MUTED }}>{sev}</button>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {["T1", "T2", "T3", "Management"].map(tier => {
          const tierItems = filtered.filter(q => q.tier === tier && q.status !== "resolved");
          return (
            <div key={tier} className="space-y-3">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: `${TIER_COLORS[tier]}15`, border: `1px solid ${TIER_COLORS[tier]}30` }}>
                <h3 className="text-xs font-bold" style={{ color: TIER_COLORS[tier] }}>{tier}</h3>
                <span className="text-xs font-black" style={{ color: TIER_COLORS[tier] }}>{tierItems.length}</span>
              </div>
              <div className="space-y-2">
                {tierItems.slice(0, 10).map(item => {
                  const slaHours = item.sla_deadline ? (new Date(item.sla_deadline) - new Date()) / (1000 * 60 * 60) : null;
                  const isUrgent = slaHours != null && slaHours < 0.25;
                  return (
                    <Card key={item.id} className="p-3 cursor-pointer hover:scale-105 transition-transform" style={{ borderLeft: `3px solid ${DANGER}` }}>
                      <div className="flex items-start justify-between mb-2">
                        <SevBadge sev={item.severity} />
                        {isUrgent && <Clock className="w-3 h-3 animate-pulse" style={{ color: DANGER }} />}
                      </div>
                      <p className="text-xs font-bold text-white mb-2">{item.title}</p>
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${MUTED}15`, color: MUTED }}>{item.queue_type || "General"}</span>
                      </div>
                      {item.ai_recommended_action && (
                        <p className="text-[9px]" style={{ color: MUTED }}>→ {item.ai_recommended_action.slice(0, 40)}...</p>
                      )}
                      {item.ai_confidence != null && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[8px]" style={{ color: MUTED }}>
                            <span>AI Confidence</span>
                            <span>{item.ai_confidence}%</span>
                          </div>
                          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${item.ai_confidence}%`, background: CYAN }} />
                          </div>
                        </div>
                      )}
                      {slaHours != null && (
                        <div className="mt-2">
                          <p className={`text-[9px] font-bold ${slaHours < 0 ? "text-red-400" : slaHours < 0.5 ? "text-orange-400" : "text-green-400"}`}>
                            {slaHours < 0 ? `Breached ${Math.abs(Math.round(slaHours * 60))}m` : slaHours < 1 ? `${Math.round(slaHours * 60)}m left` : `${Math.round(slaHours)}h left`}
                          </p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}