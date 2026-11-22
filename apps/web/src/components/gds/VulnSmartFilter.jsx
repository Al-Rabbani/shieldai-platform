import React, { useState, useMemo } from "react";
import { Filter, TrendingUp, Target, Shield } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED } from "@/components/gds/GDSOSShared";

export default function VulnSmartFilter({ value, onChange, findings = [] }) {
  const [expanded, setExpanded] = React.useState(false);

  // Calculate available filter options from findings
  const businessCriticality = React.useMemo(() => {
    const criticalities = new Set();
    findings.forEach(f => {
      if (f.business_criticality) criticalities.add(f.business_criticality);
    });
    return Array.from(criticalities);
  }, [findings]);

  const exploitability = React.useMemo(() => {
    const scores = findings.map(f => f.exploitability_score || 0);
    const min = Math.min(...scores, 0);
    const max = Math.max(...scores, 100);
    return { min, max };
  }, [findings]);

  const handleFilterChange = (key, val) => {
    onChange({ ...value, [key]: val });
  };

  const clearFilters = () => {
    onChange({ business_criticality: [], exploitability_min: 0, exploitability_max: 100 });
  };

  const hasActiveFilters = value.business_criticality?.length > 0 || 
                          value.exploitability_min > 0 || 
                          value.exploitability_max < 100;

  return (
    <div className="rounded-xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: CYAN }} />
          <span className="text-xs font-bold text-white">Smart Filter</span>
          {hasActiveFilters && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] font-bold hover:opacity-80 transition-all"
              style={{ color: MUTED }}
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
            style={{ color: CYAN }}
          >
            <TrendingUp className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {expanded && (
        <div className="p-3 pt-0 space-y-4 border-t" style={{ borderColor: BORDER }}>
          {/* Business Criticality */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-3.5 h-3.5" style={{ color: HIGH }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Business Criticality</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["critical", "high", "medium", "low"].map(level => (
                <button
                  key={level}
                  onClick={() => {
                    const current = value.business_criticality || [];
                    const updated = current.includes(level)
                      ? current.filter(l => l !== level)
                      : [...current, level];
                    handleFilterChange('business_criticality', updated);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    (value.business_criticality || []).includes(level) ? "" : "opacity-50 hover:opacity-100"
                  }`}
                  style={{
                    background: (value.business_criticality || []).includes(level) 
                      ? `${level === 'critical' ? DANGER : level === 'high' ? HIGH : level === 'medium' ? MEDIUM : LOW}15`
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${level === 'critical' ? DANGER : level === 'high' ? HIGH : level === 'medium' ? MEDIUM : LOW}40`,
                    color: level === 'critical' ? DANGER : level === 'high' ? HIGH : level === 'medium' ? MEDIUM : LOW
                  }}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Exploitability Score Range */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5" style={{ color: DANGER }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Exploitability Score</span>
              <span className="text-[10px] font-mono flex-shrink-0" style={{ color: CYAN }}>
                {value.exploitability_min || 0} - {value.exploitability_max || 100}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={value.exploitability_min || 0}
                onChange={(e) => handleFilterChange('exploitability_min', parseInt(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(90deg, ${DANGER} 0%, ${HIGH} 50%, ${LOW} 100%)` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={value.exploitability_max || 100}
                onChange={(e) => handleFilterChange('exploitability_max', parseInt(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(90deg, ${DANGER} 0%, ${HIGH} 50%, ${LOW} 100%)` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px]" style={{ color: MUTED }}>0</span>
              <span className="text-[9px]" style={{ color: MUTED }}>100</span>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-3 border-t" style={{ borderColor: BORDER }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Active Filters</p>
              <div className="flex flex-wrap gap-2">
                {(value.business_criticality || []).map(level => (
                  <span key={level} className="text-[9px] px-2 py-0.5 rounded" style={{
                    background: `${level === 'critical' ? DANGER : level === 'high' ? HIGH : level === 'medium' ? MEDIUM : LOW}15`,
                    color: level === 'critical' ? DANGER : level === 'high' ? HIGH : level === 'medium' ? MEDIUM : LOW,
                    border: `1px solid ${level === 'critical' ? DANGER : level === 'high' ? HIGH : level === 'medium' ? MEDIUM : LOW}30`
                  }}>
                    Criticality: {level}
                  </span>
                ))}
                {(value.exploitability_min > 0 || value.exploitability_max < 100) && (
                  <span className="text-[9px] px-2 py-0.5 rounded" style={{
                    background: `${DANGER}15`,
                    color: DANGER,
                    border: `1px solid ${DANGER}30`
                  }}>
                    Exploitability: {value.exploitability_min}-{value.exploitability_max}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}