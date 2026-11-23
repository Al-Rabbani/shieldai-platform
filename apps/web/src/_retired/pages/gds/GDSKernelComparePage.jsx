import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft, RefreshCw, Cpu, CheckCircle, XCircle, Clock,
  AlertTriangle, Info, GitCompare, Search, ChevronDown, ChevronRight
} from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const STATUS_COLOR = {
  initializing: MUTED, planning: "#60a5fa", executing: MEDIUM,
  completed: LOW, failed: DANGER, awaiting_approval: HIGH,
};

const EVENT_LABEL = {
  "kernel.started":             { label: "Session Started",     color: "#60a5fa" },
  "kernel.policy.validated":    { label: "Policy Validated",    color: "#8b5cf6" },
  "kernel.execution.completed": { label: "Execution Completed", color: LOW },
  "kernel.execution.failed":    { label: "Execution Failed",    color: DANGER },
  "kernel.approval.requested":  { label: "Approval Requested",  color: HIGH },
  "kernel.approval.granted":    { label: "Approval Granted",    color: LOW },
  "kernel.approval.rejected":   { label: "Approval Rejected",   color: DANGER },
};

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || MUTED;
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {(status || "—").replace(/_/g, " ")}
    </span>
  );
}

// ── Session picker panel ──────────────────────────────────────────────────────
function SessionPicker({ label, selectedId, onSelect, allSessions, otherSelectedId }) {
  const [search, setSearch] = useState("");
  const filtered = allSessions.filter(s => {
    if (s.session_id === otherSelectedId) return false;
    const q = search.toLowerCase();
    return !q || (s.session_id || "").toLowerCase().includes(q) || (s.intent || "").toLowerCase().includes(q);
  });
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>{label}</p>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: MUTED }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sessions…"
          className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
        />
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
        {filtered.length === 0
          ? <p className="text-[10px] text-center py-3" style={{ color: MUTED }}>No sessions found</p>
          : filtered.map(s => {
              const isSelected = s.session_id === selectedId;
              const color = STATUS_COLOR[s.status] || MUTED;
              return (
                <button key={s.session_id} onClick={() => onSelect(s.session_id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all hover:bg-white/[0.04]"
                  style={{ background: isSelected ? `${CYAN}10` : "transparent", border: `1px solid ${isSelected ? CYAN + "40" : BORDER + "40"}` }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-white truncate">{(s.session_id || "").slice(0, 22)}…</p>
                    <p className="text-[10px] truncate" style={{ color: MUTED }}>{s.intent?.slice(0, 50) || "—"}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </button>
              );
            })}
      </div>
    </div>
  );
}

// ── Single session data hook ──────────────────────────────────────────────────
function useSessionData(sessionId) {
  return useQuery({
    queryKey: ["kernel-session-cmp", sessionId],
    queryFn: () => base44.functions.invoke("gdsKernelGateway", { action: "session", session_id: sessionId }).then(r => r.data),
    enabled: !!sessionId,
    staleTime: 30000,
  });
}

// ── Side column: session detail ───────────────────────────────────────────────
function SessionColumn({ sessionId, side }) {
  const { data, isLoading } = useSessionData(sessionId);
  const session = data?.session;
  const events = useMemo(() =>
    (data?.events || []).sort((a, b) =>
      new Date(a.occurred_at || a.created_date) - new Date(b.occurred_at || b.created_date)
    ), [data]);
  const metrics = data?.metrics || [];

  const accentColor = side === "A" ? CYAN : "#8b5cf6";

  if (!sessionId) return (
    <div className="flex flex-col items-center justify-center h-64 rounded-2xl"
      style={{ border: `2px dashed ${BORDER}`, color: MUTED }}>
      <Cpu className="w-8 h-8 mb-2 opacity-30" />
      <p className="text-xs font-bold">Select Session {side}</p>
    </div>
  );
  if (isLoading) return <Skeleton lines={8} />;
  if (!session) return (
    <div className="flex items-center justify-center h-40 rounded-xl" style={{ border: `1px solid ${BORDER}` }}>
      <p className="text-xs" style={{ color: MUTED }}>Session not found</p>
    </div>
  );

  const durationSec = session.duration_ms ? (session.duration_ms / 1000).toFixed(2) : null;
  const statusColor = STATUS_COLOR[session.status] || MUTED;
  const failedEvents = events.filter(e => e.severity === "critical" || e.severity === "error");
  const avgDuration = metrics.length > 0
    ? Math.round(metrics.reduce((a, m) => a + (m.metric_value || 0), 0) / metrics.length)
    : null;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="p-4 rounded-2xl space-y-3"
        style={{ background: `${accentColor}06`, border: `1px solid ${accentColor}30` }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black px-2 py-0.5 rounded-full"
            style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}>
            Session {side}
          </span>
          <StatusBadge status={session.status} />
        </div>
        <p className="text-[11px] font-mono break-all" style={{ color: MUTED }}>{session.session_id}</p>
        <p className="text-sm text-white leading-relaxed">{session.intent || "—"}</p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {[
            { label: "Type",      value: session.intent_type || "—" },
            { label: "Role",      value: session.actor_role || "—" },
            { label: "Stage",     value: `Stage ${session.current_stage || 1}` },
            { label: "Duration",  value: durationSec ? `${durationSec}s` : "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <span style={{ color: MUTED }}>{label}: </span>
              <span className="font-mono font-bold text-white">{value}</span>
            </div>
          ))}
        </div>
        {/* Resource mini-stats */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: "Events",   value: events.length,       color: accentColor },
            { label: "Errors",   value: failedEvents.length, color: failedEvents.length > 0 ? DANGER : MUTED },
            { label: "Avg Metric", value: avgDuration != null ? `${avgDuration}` : "—", color: "#60a5fa" },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-2 rounded-lg text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>{label}</p>
              <p className="text-base font-black font-mono" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
        {session.error_message && (
          <div className="p-3 rounded-lg" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}25` }}>
            <p className="text-[10px] font-bold mb-1" style={{ color: DANGER }}>Error</p>
            <p className="text-[11px] font-mono break-words" style={{ color: DANGER }}>{session.error_message}</p>
          </div>
        )}
        {session.result_summary && (
          <div className="p-3 rounded-lg" style={{ background: `${LOW}08`, border: `1px solid ${LOW}25` }}>
            <p className="text-[10px] font-bold mb-1" style={{ color: LOW }}>Result</p>
            <p className="text-[11px]" style={{ color: TEXT }}>{session.result_summary}</p>
          </div>
        )}
      </div>

      {/* Execution log */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-4 py-2.5 border-b flex items-center justify-between"
          style={{ borderColor: BORDER, background: "rgba(255,255,255,0.02)" }}>
          <h4 className="text-xs font-bold text-white">Execution Log</h4>
          <span className="text-[10px]" style={{ color: MUTED }}>{events.length} events</span>
        </div>
        <div className="divide-y max-h-[520px] overflow-y-auto" style={{ borderColor: BORDER + "30", scrollbarWidth: "none" }}>
          {events.length === 0
            ? <p className="text-[11px] text-center py-6" style={{ color: MUTED }}>No events recorded</p>
            : events.map((e, i) => {
                const meta = EVENT_LABEL[e.event_type] || { label: e.event_type || "Event", color: MUTED };
                const isError = e.severity === "critical" || e.severity === "error";
                return (
                  <div key={e.id || i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all">
                    <div className="flex-shrink-0 mt-0.5">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black"
                        style={{ background: `${meta.color}15`, color: isError ? DANGER : meta.color, border: `1px solid ${meta.color}30` }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-[11px] font-bold" style={{ color: isError ? DANGER : meta.color }}>{meta.label}</span>
                        <SevBadge sev={e.severity} />
                      </div>
                      <p className="text-[10px] font-mono" style={{ color: MUTED }}>{timeAgo(e.occurred_at || e.created_date)}</p>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}

// ── Diff summary bar ──────────────────────────────────────────────────────────
function DiffSummary({ dataA, dataB }) {
  if (!dataA?.session || !dataB?.session) return null;
  const sA = dataA.session, sB = dataB.session;
  const evA = (dataA.events || []).filter(e => e.severity === "critical" || e.severity === "error").length;
  const evB = (dataB.events || []).filter(e => e.severity === "critical" || e.severity === "error").length;
  const diffs = [
    { label: "Duration", a: sA.duration_ms ? `${(sA.duration_ms / 1000).toFixed(2)}s` : "—", b: sB.duration_ms ? `${(sB.duration_ms / 1000).toFixed(2)}s` : "—", different: sA.duration_ms !== sB.duration_ms },
    { label: "Status", a: sA.status, b: sB.status, different: sA.status !== sB.status },
    { label: "Stage", a: `Stage ${sA.current_stage || 1}`, b: `Stage ${sB.current_stage || 1}`, different: sA.current_stage !== sB.current_stage },
    { label: "Errors", a: evA, b: evB, different: evA !== evB },
    { label: "Events", a: (dataA.events || []).length, b: (dataB.events || []).length, different: (dataA.events || []).length !== (dataB.events || []).length },
    { label: "Intent Type", a: sA.intent_type, b: sB.intent_type, different: sA.intent_type !== sB.intent_type },
    { label: "Actor Role", a: sA.actor_role, b: sB.actor_role, different: sA.actor_role !== sB.actor_role },
  ];
  const divergences = diffs.filter(d => d.different).length;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Diff Summary</h3>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: divergences > 0 ? `${HIGH}15` : `${LOW}15`, color: divergences > 0 ? HIGH : LOW, border: `1px solid ${divergences > 0 ? HIGH : LOW}30` }}>
          {divergences === 0 ? "✓ Identical" : `${divergences} divergence${divergences > 1 ? "s" : ""}`}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <th className="py-2 px-3 text-left font-bold uppercase text-[10px]" style={{ color: MUTED }}>Field</th>
              <th className="py-2 px-3 text-left font-bold uppercase text-[10px]" style={{ color: CYAN }}>Session A</th>
              <th className="py-2 px-3 text-left font-bold uppercase text-[10px]" style={{ color: "#8b5cf6" }}>Session B</th>
              <th className="py-2 px-3 text-center font-bold uppercase text-[10px]" style={{ color: MUTED }}>Match</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map(({ label, a, b, different }) => (
              <tr key={label} className="hover:bg-white/[0.02] transition-all"
                style={{ borderBottom: `1px solid ${BORDER}20`, background: different ? `${HIGH}04` : "transparent" }}>
                <td className="py-2 px-3 font-semibold" style={{ color: MUTED }}>{label}</td>
                <td className="py-2 px-3 font-mono" style={{ color: CYAN }}>{String(a)}</td>
                <td className="py-2 px-3 font-mono" style={{ color: "#8b5cf6" }}>{String(b)}</td>
                <td className="py-2 px-3 text-center">
                  {different
                    ? <XCircle className="w-3.5 h-3.5 mx-auto" style={{ color: HIGH }} />
                    : <CheckCircle className="w-3.5 h-3.5 mx-auto" style={{ color: LOW }} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GDSKernelComparePage() {
  const navigate = useNavigate();
  const [sessionIdA, setSessionIdA] = useState("");
  const [sessionIdB, setSessionIdB] = useState("");

  const { data: statusData, isLoading: loadingList } = useQuery({
    queryKey: ["kernel-status-cmp"],
    queryFn: () => base44.functions.invoke("gdsKernelGateway", { action: "status" }).then(r => r.data),
    staleTime: 30000,
  });
  const allSessions = statusData?.recent_sessions || [];

  const { data: dataA, isLoading: loadA } = useSessionData(sessionIdA);
  const { data: dataB, isLoading: loadB } = useSessionData(sessionIdB);

  return (
    <div style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "AI Kernel", path: "/kernel" }, { label: "Compare Sessions" }]} />

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => navigate("/kernel")}
          className="p-2 rounded-xl hover:bg-white/5 transition-all"
          style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <GitCompare className="w-5 h-5" style={{ color: CYAN }} />
        <h1 className="text-xl font-black text-white">Session Comparison</h1>
        <span className="text-[10px] font-black px-2 py-0.5 rounded"
          style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
          Side-by-Side
        </span>
      </div>

      {/* Session selectors */}
      <Card className="p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SessionPicker label="Session A" selectedId={sessionIdA} onSelect={setSessionIdA}
            allSessions={allSessions} otherSelectedId={sessionIdB} />
          <SessionPicker label="Session B" selectedId={sessionIdB} onSelect={setSessionIdB}
            allSessions={allSessions} otherSelectedId={sessionIdA} />
        </div>
        {loadingList && (
          <p className="text-[11px] mt-3 text-center" style={{ color: MUTED }}>Loading sessions…</p>
        )}
      </Card>

      {/* Diff Summary — only when both selected */}
      {sessionIdA && sessionIdB && !loadA && !loadB && (
        <div className="mb-6">
          <DiffSummary dataA={dataA} dataB={dataB} />
        </div>
      )}

      {/* Side-by-side columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SessionColumn sessionId={sessionIdA} side="A" />
        <SessionColumn sessionId={sessionIdB} side="B" />
      </div>
    </div>
  );
}