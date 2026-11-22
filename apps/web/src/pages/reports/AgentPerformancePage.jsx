import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Gauge, RefreshCw } from "lucide-react";
import ResolutionTrendChart from "@/components/reports/ResolutionTrendChart";
import AgentPerformanceTable from "@/components/reports/AgentPerformanceTable";
import { DEFAULT_SLA_HOURS } from "@/lib/fixRecommendations";

const HOUR = 3600000;
const WEEKS = 8;

function hoursBetween(start, end) {
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return null;
  return (to - from) / HOUR;
}

function slaHoursFor(finding) {
  if (finding.detected_at && finding.sla_deadline) {
    const limit = hoursBetween(finding.detected_at, finding.sla_deadline);
    if (limit && limit > 0) return limit;
  }
  return DEFAULT_SLA_HOURS[finding.severity] || 168;
}

function weekStart(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function average(values) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function AgentPerformancePage() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState("all");
  const [team, setTeam] = useState("all");
  const [vulnType, setVulnType] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await base44.entities.TriagedFinding.list("-detected_at", 500).catch(() => []);
    setFindings(rows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const agentOptions = useMemo(
    () => [...new Set(findings.map((f) => f.assigned_to).filter(Boolean))].sort(),
    [findings]
  );
  const teamOptions = useMemo(
    () => [...new Set(findings.map((f) => f.owner_team).filter(Boolean))].sort(),
    [findings]
  );
  const typeOptions = useMemo(
    () => [...new Set(findings.map((f) => f.asset_type).filter(Boolean))].sort(),
    [findings]
  );

  const filtered = useMemo(() => findings.filter((finding) => {
    if (agent !== "all" && finding.assigned_to !== agent) return false;
    if (team !== "all" && finding.owner_team !== team) return false;
    if (vulnType !== "all" && finding.asset_type !== vulnType) return false;
    return true;
  }), [findings, agent, team, vulnType]);

  const resolved = useMemo(() => filtered
    .map((finding) => ({ finding, hours: hoursBetween(finding.detected_at, finding.fixed_at), sla: slaHoursFor(finding) }))
    .filter((row) => row.hours != null), [filtered]);

  const hours = resolved.map((row) => row.hours);
  const withinSla = resolved.filter((row) => row.hours <= row.sla).length;
  const openFindings = filtered.filter((finding) => ["open", "in_remediation"].includes(finding.status));

  const trend = useMemo(() => {
    const buckets = [];
    const current = weekStart(new Date());
    for (let index = WEEKS - 1; index >= 0; index -= 1) {
      const start = new Date(current);
      start.setDate(start.getDate() - index * 7);
      buckets.push({ start, label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), hours: [], sla: [] });
    }
    resolved.forEach((row) => {
      const fixed = weekStart(row.finding.fixed_at);
      const bucket = buckets.find((item, index) => {
        const next = buckets[index + 1];
        return fixed.getTime() === item.start.getTime() || (fixed.getTime() >= item.start.getTime() && (!next || fixed.getTime() < next.start.getTime()));
      });
      if (bucket) {
        bucket.hours.push(row.hours);
        bucket.sla.push(row.sla);
      }
    });
    return buckets
      .filter((bucket) => bucket.hours.length > 0)
      .map((bucket) => ({
        label: bucket.label,
        avgHours: average(bucket.hours),
        slaHours: average(bucket.sla),
      }));
  }, [resolved]);

  const agentRows = useMemo(() => {
    const map = new Map();
    filtered.forEach((finding) => {
      const name = finding.assigned_to || "Unassigned";
      if (!map.has(name)) map.set(name, { name, hours: [], slaOk: 0, breaches: 0, open: 0 });
      const entry = map.get(name);
      if (["open", "in_remediation"].includes(finding.status)) entry.open += 1;
      const resolution = hoursBetween(finding.detected_at, finding.fixed_at);
      if (resolution != null) {
        const sla = slaHoursFor(finding);
        entry.hours.push(resolution);
        if (resolution <= sla) entry.slaOk += 1;
        else entry.breaches += 1;
      }
    });
    return [...map.values()]
      .map((entry) => ({
        name: entry.name,
        resolved: entry.hours.length,
        open: entry.open,
        avgHours: average(entry.hours),
        slaPct: entry.hours.length ? Math.round((entry.slaOk / entry.hours.length) * 100) : null,
        breaches: entry.breaches,
      }))
      .sort((a, b) => b.resolved - a.resolved);
  }, [filtered]);

  const tiles = [
    { label: "Resolved findings", value: resolved.length, color: "#3b82f6" },
    { label: "Avg resolution", value: average(hours) == null ? "—" : `${average(hours)}h`, color: "#8b5cf6" },
    { label: "Median resolution", value: median(hours) == null ? "—" : `${Math.round(median(hours))}h`, color: "#06b6d4" },
    {
      label: "Within SLA",
      value: resolved.length ? `${Math.round((withinSla / resolved.length) * 100)}%` : "—",
      color: withinSla / Math.max(resolved.length, 1) >= 0.8 ? "#22c55e" : "#ef4444",
    },
    { label: "Open now", value: openFindings.length, color: "#f59e0b" },
  ];

  const FIELD = "px-2 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none";

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Gauge size={22} className="text-blue-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">PERF-001 | AGENT SLA</span>
            <h1 className="text-xl font-bold text-white mt-1">Agent resolution performance</h1>
            <p className="text-xs text-slate-500">How fast agents close assigned findings against the SLA target for each severity.</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="rounded-xl p-3 flex flex-wrap items-center gap-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <select value={agent} onChange={(e) => setAgent(e.target.value)} className={FIELD} aria-label="Filter by agent">
          <option value="all">All agents</option>
          {agentOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className={FIELD} aria-label="Filter by team">
          <option value="all">All teams</option>
          {teamOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select value={vulnType} onChange={(e) => setVulnType(e.target.value)} className={FIELD} aria-label="Filter by vulnerability type">
          <option value="all">All vulnerability types</option>
          {typeOptions.map((name) => <option key={name} value={name}>{name.replace(/_/g, " ")}</option>)}
        </select>
        <span className="text-[10px] text-slate-500 ml-auto">
          {filtered.length} finding(s) · SLA {DEFAULT_SLA_HOURS.critical}h / {DEFAULT_SLA_HOURS.high}h / {DEFAULT_SLA_HOURS.medium}h by severity
        </span>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-16" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {tiles.map((tile) => (
              <div key={tile.label} className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${tile.color}` }}>
                <p className="text-xl font-bold text-white">{tile.value}</p>
                <p className="text-[10px] text-slate-500">{tile.label}</p>
              </div>
            ))}
          </div>

          <ResolutionTrendChart data={trend} />
          <AgentPerformanceTable rows={agentRows} />

          <p className="text-[10px] text-slate-600">
            Resolution time runs from a finding's detection to its fixed date. The SLA line uses the finding's own deadline when one was set, otherwise the severity target.
          </p>
        </>
      )}
    </div>
  );
}