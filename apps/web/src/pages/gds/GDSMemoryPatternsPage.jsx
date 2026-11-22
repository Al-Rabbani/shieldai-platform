import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Network, Search, CheckCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, EmptyState, Skeleton, PAGE_BG
} from "@/components/gds/GDSOSShared";
import GDSPageShell from "@/components/gds/GDSPageShell";

const PATTERN_TYPE_COLORS = {
  attack_pattern: DANGER,
  compliance_pattern: MEDIUM,
  failure_pattern: HIGH,
  success_pattern: LOW,
  remediation_pattern: "#0ea5e9",
  anomaly_pattern: "#a855f7",
};

function PatternTypeBadge({ type }) {
  const color = PATTERN_TYPE_COLORS[type] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {type?.replace(/_/g, " ")}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const map = {
    critical: [DANGER, "Critical"],
    high: [HIGH, "High"],
    medium: [MEDIUM, "Medium"],
    low: [LOW, "Low"],
    info: [MUTED, "Info"],
  };
  const [color, label] = map[severity?.toLowerCase()] || [MUTED, severity];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

export default function GDSMemoryPatternsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["memory-patterns"],
    queryFn: () => Promise.all([
      base44.functions.invoke("gdsMemoryEngine", { action: "pattern_match" }).then(r => r.data),
      base44.entities.PatternLibrary?.list('-occurrence_count', 100).catch(() => []),
    ]).then(([detection, entities]) => ({ detection, entities })),
    refetchInterval: 120000,
  });

  const detection = data?.detection || {};
  const patterns = data?.entities || [];

  const filteredPatterns = useMemo(() => {
    let result = patterns;
    if (filter !== "all") result = result.filter(p => p.pattern_type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.pattern_name || "").toLowerCase().includes(q) ||
        (p.mitre_technique || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [patterns, filter, search]);

  return (
    <GDSPageShell
      title="Security Pattern Library"
      breadcrumbs={[{ label: "Memory", path: "/memory" }, { label: "Patterns" }]}
      version="EDP-004 v1.0"
      live
    >
      {/* Detection Results Banner */}
      <div className="mb-6 p-4 rounded-2xl border" style={{ background: `${CYAN}08`, borderColor: `${CYAN}25` }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Network className="w-5 h-5" style={{ color: CYAN }} />
            <div>
              <p className="text-sm font-bold text-white">Pattern Detection Results</p>
              <p className="text-xs" style={{ color: MUTED }}>Latest scan completed</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: `${LOW}10`, border: `1px solid ${LOW}25` }}>
              <span className="text-[10px] font-bold" style={{ color: MUTED }}>New:</span>
              <span className="text-sm font-black" style={{ color: LOW }}>{detection.patterns_new ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}25` }}>
              <span className="text-[10px] font-bold" style={{ color: MUTED }}>Reinforced:</span>
              <span className="text-sm font-black" style={{ color: CYAN }}>{detection.patterns_reinforced ?? 0}</span>
            </div>
            <button onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              <Search className="w-3.5 h-3.5" />
              Run Detection
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b" style={{ borderColor: BORDER }}>
        {[
          { key: "all", label: "All" },
          { key: "attack_pattern", label: "Attack" },
          { key: "compliance_pattern", label: "Compliance" },
          { key: "anomaly_pattern", label: "Anomaly" },
          { key: "failure_pattern", label: "Failure" },
          { key: "success_pattern", label: "Success" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-2 text-xs font-bold transition-all border-b-2 ${filter === key ? "text-cyan-400" : "text-gray-500 hover:text-white"}`}
            style={{ borderBottomColor: filter === key ? CYAN : "transparent" }}>
            {label}
          </button>
        ))}
        <div className="ml-auto relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patterns…"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
      </div>

      {/* Patterns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
          ))
        ) : filteredPatterns.length === 0 ? (
          <div className="col-span-full">
            <EmptyState icon={Network} title="No patterns found" description="Try a different filter or run detection" />
          </div>
        ) : (
          filteredPatterns.map(p => {
            const color = PATTERN_TYPE_COLORS[p.pattern_type] || MUTED;
            return (
              <Card key={p.pattern_id} className="p-5 flex flex-col h-full" glow>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex-1">{p.pattern_name}</h3>
                  {p.is_validated && <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: LOW }} />}
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <PatternTypeBadge type={p.pattern_type} />
                  <SeverityBadge severity={p.severity} />
                </div>

                <div className="mb-3 flex-1">
                  <p className="text-[10px] italic" style={{ color: MUTED }}>{p.recommended_action}</p>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-2 py-0.5 rounded font-mono"
                      style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>
                      {p.mitre_technique || "—"}
                    </span>
                    <span className="text-[10px]" style={{ color: MUTED }}>{p.occurrence_count || 0}x</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(p.source_agents || []).slice(0, 2).map((a, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>
                        {a.slice(0, 10)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between text-[9px]" style={{ borderColor: BORDER }}>
                  <span style={{ color: MUTED }}>
                    {p.first_seen ? new Date(p.first_seen).toLocaleDateString() : "—"} → {p.last_seen ? new Date(p.last_seen).toLocaleDateString() : "—"}
                  </span>
                  <span className="font-bold" style={{ color: color }}>{p.confidence || 0}% confidence</span>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </GDSPageShell>
  );
}