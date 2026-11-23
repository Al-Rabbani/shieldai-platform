import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertTriangle, TrendingUp, Database, Clock } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Breadcrumb, Card, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function RuleTypeBadge({ type }) {
  const colors = { completeness: "#3b82f6", accuracy: "#10b981", consistency: "#f59e0b", timeliness: "#f97316", uniqueness: "#a855f7", validity: "#14b8a6" };
  const color = colors[type] || MUTED;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>{type}</span>;
}

function ActionBadge({ action }) {
  const colors = { quarantine: "#ef4444", alert: "#f59e0b", log: "#6b7280", block: "#dc2626" };
  const color = colors[action] || MUTED;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color, background: `${color}15` }}>{action}</span>;
}

function ScoreGauge({ score, threshold }) {
  const isFailing = score < threshold;
  const color = isFailing ? DANGER : score >= 90 ? LOW : score >= 70 ? MEDIUM : HIGH;
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-full" style={{ background: `conic-gradient(${color} ${score}%, ${BORDER} ${score}%)` }}>
        <div className="w-8 h-8 rounded-full bg-[#0a1628] flex items-center justify-center m-0.5">
          <span className={`text-[9px] font-bold ${isFailing ? "animate-pulse" : ""}`} style={{ color }}>{score}%</span>
        </div>
      </div>
    </div>
  );
}

export default function GDSDataQualityPage() {
  const { data: rules = [], isLoading: loadR } = useQuery({
    queryKey: ["data-quality-rules"],
    queryFn: () => base44.entities.DataQualityRule.list("", 100).catch(() => []),
  });
  const { data: sources = [], isLoading: loadS } = useQuery({
    queryKey: ["data-sources-freshness"],
    queryFn: () => base44.entities.DataSource.list("", 50).catch(() => []),
  });

  const totalRules = rules.length;
  const passing = rules.filter(r => r.status === "passing").length;
  const failing = rules.filter(r => r.status === "failing").length;
  const avgScore = totalRules > 0 ? Math.round(rules.reduce((sum, r) => sum + (r.last_score || 0), 0) / totalRules) : 0;

  const now = new Date();
  const staleSources = sources.filter(s => {
    if (!s.last_event_at) return true;
    const lastEvent = new Date(s.last_event_at);
    const hoursSince = (now - lastEvent) / (1000 * 60 * 60);
    return hoursSince > 24; // Stale if > 24 hours
  });

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Data Intelligence", path: "/data-intelligence" }, { label: "Data Quality" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Data Quality Center</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Data quality rules, validation, and freshness monitoring</p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Rules</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{totalRules}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" style={{ color: LOW }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Passing</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{passing}</p>
        </Card>
        <Card className="p-5 border-l-4" style={{ borderColor: DANGER }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Failing</span>
          </div>
          <p className={`text-2xl font-black font-mono ${failing > 0 ? "animate-pulse" : ""}`} style={{ color: DANGER }}>{failing}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Avg Score</span>
          </div>
          <p className={`text-2xl font-black font-mono ${avgScore >= 90 ? "text-green-400" : avgScore >= 70 ? "text-amber-400" : "text-red-400"}`}>{avgScore}%</p>
        </Card>
      </div>

      {/* Rules Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Quality Rules</h3>
        </div>
        {loadR ? <Skeleton lines={8} /> : rules.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No quality rules" description="Create data quality rules to monitor data health" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Dataset</th>
                  <th className="pb-3 font-semibold">Field</th>
                  <th className="pb-3 font-semibold">Condition</th>
                  <th className="pb-3 font-semibold">Threshold</th>
                  <th className="pb-3 font-semibold">Last Score</th>
                  <th className="pb-3 font-semibold">Violations</th>
                  <th className="pb-3 font-semibold">Action</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {rules.map((rule, i) => (
                  <tr key={rule.id || i} className="text-white">
                    <td className="py-3 font-semibold">{rule.name}</td>
                    <td className="py-3"><RuleTypeBadge type={rule.rule_type} /></td>
                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{rule.dataset_id || "Global"}</span>
                    </td>
                    <td className="py-3 font-mono">{rule.field || "—"}</td>
                    <td className="py-3 font-mono text-[10px] max-w-xs truncate">{rule.condition}</td>
                    <td className="py-3 font-mono">{rule.threshold_pct}%</td>
                    <td className="py-3"><ScoreGauge score={rule.last_score || 0} threshold={rule.threshold_pct || 0} /></td>
                    <td className="py-3">
                      <span className={`text-[10px] font-mono font-bold ${rule.violations_found > 0 ? "text-red-400" : "text-green-400"}`}>
                        {rule.violations_found || 0}
                      </span>
                    </td>
                    <td className="py-3"><ActionBadge action={rule.action_on_failure} /></td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rule.status === "passing" ? "text-green-400 bg-green-400/15" : rule.status === "failing" ? "text-red-400 bg-red-400/15 animate-pulse" : rule.status === "warning" ? "text-amber-400 bg-amber-400/15" : "text-slate-400 bg-slate-400/15"}`}>
                        {rule.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* DataSource Freshness */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Source Freshness</h3>
          </div>
          {staleSources.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15` }}>{staleSources.length} stale</span>
          )}
        </div>
        {loadS ? <Skeleton lines={5} /> : sources.length === 0 ? (
          <EmptyState icon={Database} title="No data sources" description="Connect data sources to monitor freshness" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Last Event</th>
                  <th className="pb-3 font-semibold">Hours Ago</th>
                  <th className="pb-3 font-semibold">Expected</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {sources.map((src, i) => {
                  const lastEvent = src.last_event_at ? new Date(src.last_event_at) : null;
                  const hoursAgo = lastEvent ? ((now - lastEvent) / (1000 * 60 * 60)).toFixed(1) : "Never";
                  const isStale = parseFloat(hoursAgo) > 24;
                  return (
                    <tr key={src.id || i} className="text-white">
                      <td className="py-3 font-semibold">{src.name}</td>
                      <td className="py-3"><span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{src.source_type}</span></td>
                      <td className="py-3" style={{ color: MUTED }}>{timeAgo(src.last_event_at)}</td>
                      <td className="py-3 font-mono">{hoursAgo}h</td>
                      <td className="py-3 font-mono">{src.retention_days}d retention</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isStale ? "text-red-400 bg-red-400/15 animate-pulse" : "text-green-400 bg-green-400/15"}`}>
                          {isStale ? "STALE" : "FRESH"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}