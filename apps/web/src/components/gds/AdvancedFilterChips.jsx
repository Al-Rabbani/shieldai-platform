import React from "react";
import { X, TrendingUp, Target, User } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED } from "@/components/gds/GDSOSShared";

const CRIT_COLOR = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

export default function AdvancedFilterChips({
  criticalityFilter,
  setCriticalityFilter,
  riskScoreFilter,
  setRiskScoreFilter,
  ownerFilter,
  setOwnerFilter,
  owners = [],
}) {
  const clearAll = () => {
    setCriticalityFilter("all");
    setRiskScoreFilter("all");
    setOwnerFilter("all");
  };

  const hasFilters = criticalityFilter !== "all" || riskScoreFilter !== "all" || ownerFilter !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Business Criticality */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}25` }}>
        <Target className="w-3.5 h-3.5 flex-shrink-0" style={{ color: CYAN }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Criticality</span>
        <div className="flex items-center gap-1 ml-1">
          {["all", "critical", "high", "medium", "low"].map(level => (
            <button
              key={level}
              onClick={() => setCriticalityFilter(level)}
              className={`text-[9px] font-bold px-2 py-0.5 rounded transition-all ${
                criticalityFilter === level ? "text-white" : "hover:opacity-70"
              }`}
              style={{
                background: criticalityFilter === level ? (CRIT_COLOR[level] || CYAN) : "transparent",
                border: `1px solid ${criticalityFilter === level ? (CRIT_COLOR[level] || CYAN) : BORDER}`,
                color: criticalityFilter === level ? "#fff" : MUTED,
              }}
            >
              {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Score Range */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}25` }}>
        <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: HIGH }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Risk Score</span>
        <div className="flex items-center gap-1 ml-1">
          {[
            { label: "All", value: "all" },
            { label: "90+", value: "90+" },
            { label: "70-89", value: "70-89" },
            { label: "40-69", value: "40-69" },
            { label: "<40", value: "<40" },
          ].map(range => (
            <button
              key={range.value}
              onClick={() => setRiskScoreFilter(range.value)}
              className={`text-[9px] font-bold px-2 py-0.5 rounded transition-all ${
                riskScoreFilter === range.value ? "text-white" : "hover:opacity-70"
              }`}
              style={{
                background: riskScoreFilter === range.value ? HIGH : "transparent",
                border: `1px solid ${riskScoreFilter === range.value ? HIGH : BORDER}`,
                color: riskScoreFilter === range.value ? "#fff" : MUTED,
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assigned Owner */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: `${LOW}08`, border: `1px solid ${LOW}25` }}>
        <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: LOW }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Owner</span>
        <select
          value={ownerFilter}
          onChange={e => setOwnerFilter(e.target.value)}
          className="text-[9px] font-bold px-2 py-0.5 rounded bg-transparent outline-none cursor-pointer"
          style={{ color: ownerFilter !== "all" ? LOW : MUTED, border: `1px solid ${BORDER}` }}
        >
          <option value="all">All</option>
          {owners.map(owner => (
            <option key={owner} value={owner} style={{ background: CARD }}>
              {owner}
            </option>
          ))}
        </select>
      </div>

      {/* Clear All */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-bold transition-all hover:opacity-80"
          style={{ background: `${MUTED}10`, border: `1px solid ${MUTED}25`, color: MUTED }}
        >
          <X className="w-3 h-3" />
          Clear All
        </button>
      )}
    </div>
  );
}