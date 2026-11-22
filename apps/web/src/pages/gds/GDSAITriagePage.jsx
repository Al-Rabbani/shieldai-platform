import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Flame, Filter, Copy, Shield, Zap, AlertTriangle, CheckCircle, Layers, Users, ChevronDown, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from "recharts";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, KpiCard, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const PRIORITY_COLORS = { P0: DANGER, P1: HIGH, P2: MEDIUM, P3: LOW, P4: MUTED };

const SCORING_FACTORS = [
  { label: "Severity",            weight: 40, color: DANGER },
  { label: "EPSS Score",          weight: 20, color: HIGH },
  { label: "KEV Status",          weight: 15, color: "#f97316" },
  { label: "CVSS Score",          weight: 15, color: MEDIUM },
  { label: "Reachability",        weight: 5,  color: CYAN },
  { label: "Business Criticality",weight: 5,  color: LOW },
];

function PriorityBadge({ p }) {
  const color = PRIORITY_COLORS[p] || MUTED;
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>{p}</span>
  );
}

function ScoreBar({ score, max = 100 }) {
  const color = score >= 70 ? DANGER : score >= 40 ? MEDIUM : LOW;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${(score / max) * 100}%`, background: color }} />
      </div>
      <span className="text-[11px] font-black font-mono w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

function NoiseBadge({ level }) {
  const map = { HIGH_NOISE: [MUTED, "High Noise"], MEDIUM_NOISE: [MEDIUM, "Med Noise"], SIGNAL: [LOW, "Signal"] };
  const [color, label] = map[level] || [MUTED, level];
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>{label}</span>
  );
}

const TEAMS = ["AppSec", "CloudSec", "DevOps", "Platform", "Backend", "Frontend"];
const STATUSES = ["open", "in_remediation", "accepted_risk", "false_positive"];

function QuickActionBar({ selected, onClear, onApply, applying }) {
  const [assignTo, setAssignTo] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const canApply = selected.size > 0 && (assignTo || newStatus);

  return (
    <div className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl mb-3"
      style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}30` }}>
      <span className="text-xs font-black" style={{ color: CYAN }}>{selected.size} selected</span>
      <div className="flex items-center gap-2">
        <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
        <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: assignTo ? TEXT : MUTED }}>
          <option value="">Assign to team…</option>
          {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
        <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: newStatus ? TEXT : MUTED }}>
          <option value="">Change status…</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
        </select>
      </div>
      <button onClick={() => onApply({ assignTo, newStatus })} disabled={!canApply || applying}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-40"
        style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
        {applying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
        Apply
      </button>
      <button onClick={onClear} className="ml-auto p-1 rounded hover:bg-white/5 transition-all" style={{ color: MUTED }}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function GDSAITriagePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState({});
  const [scenarioResult, setScenarioResult] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [applying, setApplying] = useState(false);

  const { data: triageData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["gds-ai-triage"],
    queryFn: () => base44.functions.invoke("shieldAutoTriage", { action: "triage" })
      .then(r => r.data).catch(() => null),
  });

  const loadTab = async (tab) => {
    if (tabData[tab]) return;
    setTabLoading(p => ({ ...p, [tab]: true }));
    try {
      const actionMap = { prioritize: "prioritize", noise: "noise_filter", dedup: "deduplicate" };
      const res = await base44.functions.invoke("shieldAutoTriage", { action: actionMap[tab] });
      setTabData(p => ({ ...p, [tab]: res.data }));
    } catch (e) { console.error(e); }
    finally { setTabLoading(p => ({ ...p, [tab]: false })); }
  };

  useEffect(() => {
    if (activeTab !== "overview") loadTab(activeTab);
  }, [activeTab]);

  const handleApply = async ({ assignTo, newStatus }) => {
    if (selected.size === 0) return;
    setApplying(true);
    try {
      const updates = [...selected].map(id => ({
        id,
        ...(newStatus ? { status: newStatus } : {}),
        ...(assignTo ? { owner_team: assignTo } : {}),
      }));
      await base44.entities.TriagedFinding.bulkUpdate(updates);
      setSelected(new Set());
    } catch (e) { console.error(e); }
    finally { setApplying(false); }
  };

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = (rows) => {
    const ids = rows.map(f => f.id).filter(Boolean);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(ids));
  };

  const d = triageData || {};
  const summary = d.summary || {};
  const topP0 = d.top_p0 || d.top_findings?.filter(f => f.priority === "P0") || [];
  const allFindings = d.top_findings || [];
  const byTeam = d.by_team || {};

  const teamSlices = Object.entries(byTeam).map(([name, count]) => ({ name, value: count }));
  const SLICE_COLORS = [CYAN, DANGER, LOW, HIGH, MEDIUM, "#8b5cf6", "#f97316"];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "AI Auto-Triage" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">AI Auto-Triage Engine</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>EPSS + KEV + CVSS + Reachability composite scoring</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Re-Triage Now
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Triaged",    value: summary.total_triaged ?? allFindings.length,                    color: CYAN },
          { label: "P0 Critical",      value: summary.p0_count ?? topP0.length,                               color: DANGER },
          { label: "Signal Findings",  value: summary.signal_count ?? allFindings.filter(f => f.noise_level === "SIGNAL").length, color: LOW },
          { label: "Noise Reduced",    value: summary.noise_reduced ?? d.noise_reduced ?? 0,                  color: MEDIUM },
          { label: "Noise Reduction",  value: `${summary.noise_reduction_pct ?? d.noise_reduction_pct ?? 0}%`, color: CYAN },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value ?? "—"}</p>
          </Card>
        ))}
      </div>

      {/* Scoring Model + Team Donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Composite Scoring Model</h3>
          <div className="space-y-3">
            {SCORING_FACTORS.map(({ label, weight, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: TEXT }}>{label}</span>
                  <span className="text-xs font-black font-mono" style={{ color }}>{weight}pts</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="h-full rounded-full" style={{ width: `${weight}%`, background: color, boxShadow: `0 0 6px ${color}55` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-2">Team Distribution</h3>
          {teamSlices.length === 0
            ? <EmptyState icon={Layers} title="No team data" description="Team assignments will appear here" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={teamSlices} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                    {teamSlices.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </Card>
      </div>

      {/* P0 Finding Cards */}
      {topP0.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4" style={{ color: DANGER }} />
            <h3 className="text-sm font-bold text-white">P0 Critical Findings</h3>
            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: `${DANGER}15`, color: DANGER }}>{topP0.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topP0.slice(0, 6).map((f, i) => (
              <Card key={f.id || i} className="p-4" style={{ border: `1px solid ${DANGER}30`, borderLeft: `3px solid ${DANGER}` }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{f.title || f.finding}</p>
                    {f.cve_id && <p className="text-[11px] font-mono mt-0.5" style={{ color: HIGH }}>{f.cve_id}</p>}
                    {f.package && <p className="text-[10px] mt-0.5 truncate" style={{ color: MUTED }}>{f.package}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {f.kev && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}20`, border: `1px solid ${DANGER}40` }}>KEV</span>}
                    {f.autofix && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ color: LOW, background: `${LOW}15`, border: `1px solid ${LOW}30` }}>AutoFix</span>}
                  </div>
                </div>

                {/* Score gauge */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: MUTED }}>Composite Risk Score</span>
                    <span className="text-lg font-black font-mono" style={{ color: DANGER }}>{f.composite_risk_score ?? f.score ?? "—"}</span>
                  </div>
                  <ScoreBar score={f.composite_risk_score ?? f.score ?? 0} />
                </div>

                {/* Scoring factors */}
                {f.scoring_factors && (
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {Object.entries(f.scoring_factors).map(([k, v]) => (
                      <div key={k} className="text-center p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-[9px] capitalize" style={{ color: MUTED }}>{k.replace(/_/g, " ")}</p>
                        <p className="text-xs font-black font-mono text-white">{typeof v === "boolean" ? (v ? "Yes" : "No") : v}</p>
                      </div>
                    ))}
                  </div>
                )}

                {f.assigned_team && (
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3" style={{ color: MUTED }} />
                    <span className="text-[10px]" style={{ color: MUTED }}>{f.assigned_team}</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Card className="overflow-hidden">
        <div className="flex border-b" style={{ borderColor: BORDER }}>
          {[["overview", "All Findings"], ["prioritize", "Prioritize"], ["noise", "Noise Filter"], ["dedup", "Deduplicate"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className="px-5 py-3 text-xs font-bold transition-all"
              style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Overview / Prioritize tabs share the same table layout */}
          {(activeTab === "overview" || activeTab === "prioritize") && (() => {
            const loading = activeTab === "prioritize" ? tabLoading.prioritize : isLoading;
            const rows = activeTab === "prioritize"
              ? (tabData.prioritize?.prioritized_findings || tabData.prioritize?.findings || [])
              : allFindings;
            if (loading) return <Skeleton lines={5} />;
            if (rows.length === 0) return <EmptyState icon={Shield} title="No findings" description="Run triage to populate findings" />;
            const visibleRows = rows.slice(0, 20);
            return (
              <div>
                {selected.size > 0 && (
                  <QuickActionBar
                    selected={selected}
                    onClear={() => setSelected(new Set())}
                    onApply={handleApply}
                    applying={applying}
                  />
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <th className="py-2 px-3 w-8">
                          <input type="checkbox"
                            checked={visibleRows.filter(f=>f.id).every(f => selected.has(f.id)) && visibleRows.some(f=>f.id)}
                            onChange={() => toggleAll(visibleRows)}
                            className="w-3.5 h-3.5 rounded cursor-pointer accent-cyan-400" />
                        </th>
                        {["Priority", "Title", "Severity", "Score", "Noise", "CVE", "Package", "Team"].map(h => (
                          <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((f, i) => (
                        <tr key={f.id || i}
                          className="hover:bg-white/[0.02] transition-all cursor-pointer"
                          style={{ borderBottom: `1px solid ${BORDER}20`, background: f.id && selected.has(f.id) ? `${CYAN}08` : undefined }}
                          onClick={() => f.id && toggleSelect(f.id)}>
                          <td className="py-2 px-3">
                            <input type="checkbox" readOnly checked={!!(f.id && selected.has(f.id))}
                              className="w-3.5 h-3.5 rounded cursor-pointer accent-cyan-400"
                              onClick={e => e.stopPropagation()} onChange={() => f.id && toggleSelect(f.id)} />
                          </td>
                          <td className="py-2 px-3"><PriorityBadge p={f.priority || "P4"} /></td>
                          <td className="py-2 px-3 max-w-[160px]"><p className="truncate text-white font-medium">{f.title || f.finding}</p></td>
                          <td className="py-2 px-3"><SevBadge sev={f.severity} /></td>
                          <td className="py-2 px-3 w-28"><ScoreBar score={f.composite_risk_score ?? f.score ?? 0} /></td>
                          <td className="py-2 px-3"><NoiseBadge level={f.noise_level} /></td>
                          <td className="py-2 px-3 font-mono" style={{ color: HIGH }}>{f.cve_id || "—"}</td>
                          <td className="py-2 px-3 max-w-[100px]"><p className="truncate" style={{ color: MUTED }}>{f.package || "—"}</p></td>
                          <td className="py-2 px-3" style={{ color: MUTED }}>{f.assigned_team || f.owner_team || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Noise Filter tab */}
          {activeTab === "noise" && (() => {
            if (tabLoading.noise) return <Skeleton lines={4} />;
            const nd = tabData.noise;
            if (!nd) return <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>Loading noise filter…</p></div>;
            const highNoise = nd.high_noise_findings || nd.findings?.filter(f => f.noise_level === "HIGH_NOISE") || [];
            const signal = nd.signal_findings || nd.findings?.filter(f => f.noise_level === "SIGNAL") || [];
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}25` }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>HIGH NOISE</p>
                    <p className="text-3xl font-black font-mono" style={{ color: DANGER }}>{highNoise.length ?? nd.high_noise_count ?? 0}</p>
                    <p className="text-[10px] mt-1" style={{ color: MUTED }}>findings suppressed</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: `${LOW}08`, border: `1px solid ${LOW}25` }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>SIGNAL</p>
                    <p className="text-3xl font-black font-mono" style={{ color: LOW }}>{signal.length ?? nd.signal_count ?? 0}</p>
                    <p className="text-[10px] mt-1" style={{ color: MUTED }}>actionable findings</p>
                  </div>
                </div>
                {signal.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-white mb-2">Signal Findings</p>
                    <div className="space-y-1.5">
                      {signal.slice(0, 8).map((f, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                          <SevBadge sev={f.severity} />
                          <span className="flex-1 text-xs text-white truncate">{f.title || f.finding}</span>
                          <NoiseBadge level="SIGNAL" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Dedup tab */}
          {activeTab === "dedup" && (() => {
            if (tabLoading.dedup) return <Skeleton lines={4} />;
            const dd = tabData.dedup;
            if (!dd) return <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>Loading deduplication data…</p></div>;
            const topDups = dd.top_duplicates || dd.duplicate_groups || [];
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Deduplication Rate", value: `${dd.deduplication_rate_pct ?? 0}%`, color: LOW },
                    { label: "Duplicate Groups", value: dd.duplicate_groups_count ?? topDups.length, color: CYAN },
                    { label: "Originals Kept", value: dd.originals_kept ?? "—", color: MEDIUM },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-4 rounded-xl text-center" style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
                      <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
                      <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>
                {topDups.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                          {["Title / Key", "Duplicates", "Sources", "Severity"].map(h => (
                            <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {topDups.map((g, i) => (
                          <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                            <td className="py-2 px-3 text-white">{g.title || g.dedup_key || g.key}</td>
                            <td className="py-2 px-3 font-mono" style={{ color: CYAN }}>{g.count ?? g.duplicates ?? "—"}</td>
                            <td className="py-2 px-3" style={{ color: MUTED }}>{Array.isArray(g.sources) ? g.sources.join(", ") : g.sources || "—"}</td>
                            <td className="py-2 px-3"><SevBadge sev={g.severity} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </Card>
    </div>
  );
}