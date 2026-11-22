import React, { useState } from "react";
import { ArrowUpDown, TrendingUp, AlertTriangle, Target, Shield, Zap, ChevronUp, ChevronDown } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

const PRIORITY_COLORS = {
  P0: { bg: `${DANGER}20`, border: DANGER, text: DANGER, icon: AlertTriangle },
  P1: { bg: `${HIGH}20`, border: HIGH, text: HIGH, icon: Target },
  P2: { bg: `${CYAN}20`, border: CYAN, text: CYAN, icon: Shield },
  P3: { bg: `${MUTED}20`, border: MUTED, text: MUTED, icon: Zap }
};

export default function PriorityRankingSystem({ goals, onReorder }) {
  const [sortBy, setSortBy] = useState("priority");
  const [sortOrder, setSortOrder] = useState("asc");

  const sortedGoals = [...goals].sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const impactA = calculateImpactScore(a);
    const impactB = calculateImpactScore(b);

    if (sortBy === "priority") {
      const cmp = priorityOrder[a.priority || "P3"] - priorityOrder[b.priority || "P3"];
      return sortOrder === "asc" ? cmp : -cmp;
    } else if (sortBy === "impact") {
      const cmp = impactB - impactA;
      return sortOrder === "asc" ? cmp : -cmp;
    } else if (sortBy === "deadline") {
      const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  const handleSort = (criteria) => {
    if (sortBy === criteria) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(criteria);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Sort by:</span>
        <SortButton
          label="Priority"
          active={sortBy === "priority"}
          order={sortOrder}
          onClick={() => handleSort("priority")}
        />
        <SortButton
          label="Impact"
          active={sortBy === "impact"}
          order={sortOrder}
          onClick={() => handleSort("impact")}
        />
        <SortButton
          label="Deadline"
          active={sortBy === "deadline"}
          order={sortOrder}
          onClick={() => handleSort("deadline")}
        />
      </div>

      {/* Priority Distribution */}
      <div className="grid grid-cols-4 gap-3">
        {["P0", "P1", "P2", "P3"].map(priority => {
          const count = goals.filter(g => g.priority === priority).length;
          const config = PRIORITY_COLORS[priority];
          const Icon = config.icon;
          return (
            <div
              key={priority}
              className="p-3 rounded-lg border text-center"
              style={{ background: config.bg, borderColor: config.border }}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color: config.text }} />
                <span className="text-xs font-black" style={{ color: config.text }}>{priority}</span>
              </div>
              <p className="text-2xl font-black" style={{ color: config.text }}>{count}</p>
              <p className="text-[9px]" style={{ color: MUTED }}>goals</p>
            </div>
          );
        })}
      </div>

      {/* Ranked Goals List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold" style={{ color: TEXT }}>Ranked Security Goals</h4>
          <span className="text-[10px]" style={{ color: MUTED }}>
            {sortedGoals.length} goals · Sorted by {sortBy} ({sortOrder})
          </span>
        </div>

        {sortedGoals.map((goal, idx) => {
          const priority = goal.priority || "P3";
          const config = PRIORITY_COLORS[priority];
          const Icon = config.icon;
          const impactScore = calculateImpactScore(goal);

          return (
            <div
              key={goal.goal_id || idx}
              className="p-4 rounded-lg border transition-all hover:scale-[1.01]"
              style={{
                background: idx < 3 ? `${config.bg}60` : "rgba(255,255,255,0.02)",
                borderColor: idx < 3 ? config.border : BORDER
              }}>
              <div className="flex items-start gap-3">
                {/* Rank Number */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: idx === 0 ? `${DANGER}30` : idx === 1 ? `${HIGH}30` : idx === 2 ? `${CYAN}30` : "rgba(255,255,255,0.05)",
                    border: `1px solid ${idx < 3 ? config.border : BORDER}`
                  }}>
                  <span className="text-sm font-black" style={{ color: idx < 3 ? config.text : MUTED }}>
                    {idx + 1}
                  </span>
                </div>

                {/* Priority Badge */}
                <div className="flex items-center gap-2 px-2 py-1 rounded"
                  style={{ background: config.bg, border: `1px solid ${config.border}` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: config.text }} />
                  <span className="text-[9px] font-black" style={{ color: config.text }}>{priority}</span>
                </div>

                {/* Goal Details */}
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-white truncate">{goal.goal_statement || "Untitled Goal"}</h5>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded"
                      style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>
                      {goal.goal_type?.replace('_', ' ') || "General"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" style={{ color: impactScore >= 70 ? LOW : impactScore >= 50 ? MEDIUM : HIGH }} />
                      <span className="text-[10px] font-bold"
                        style={{ color: impactScore >= 70 ? LOW : impactScore >= 50 ? MEDIUM : HIGH }}>
                        Impact: {impactScore}
                      </span>
                    </div>
                    {goal.deadline && (
                      <span className="text-[10px]" style={{ color: MUTED }}>
                        Due: {new Date(goal.deadline).toLocaleDateString()}
                      </span>
                    )}
                    {goal.status && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${
                        goal.status === "completed" ? "text-emerald-400" :
                        goal.status === "in_progress" ? "text-blue-400" : "text-slate-400"
                      }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                        {goal.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Visual Priority Indicator */}
                {idx < 3 && (
                  <div className="flex-shrink-0">
                    <div className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide animate-pulse"
                      style={{
                        background: idx === 0 ? `${DANGER}30` : idx === 1 ? `${HIGH}30` : `${CYAN}30`,
                        color: config.text,
                        border: `1px solid ${config.border}`
                      }}>
                      {idx === 0 ? "🔥 Critical" : idx === 1 ? "⚡ High" : "⭐ Priority"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SortButton({ label, active, order, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
      style={{
        background: active ? `${CYAN}15` : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? CYAN + "40" : BORDER}`,
        color: active ? CYAN : MUTED
      }}>
      {label}
      {active && (
        order === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </button>
  );
}

function calculateImpactScore(goal) {
  const priorityWeights = { P0: 40, P1: 30, P2: 20, P3: 10 };
  const priorityScore = priorityWeights[goal.priority || "P3"] || 10;
  
  const vulnerabilityReduction = goal.vulnerability_reduction || 0;
  const vulnScore = Math.min(30, vulnerabilityReduction / 3);
  
  const sensitivityBonus = goal.sensitivity === "critical" ? 20 : goal.sensitivity === "high" ? 15 : 5;
  
  const approvalBonus = goal.requires_approval ? 10 : 0;
  
  return Math.min(100, priorityScore + vulnScore + sensitivityBonus + approvalBonus);
}