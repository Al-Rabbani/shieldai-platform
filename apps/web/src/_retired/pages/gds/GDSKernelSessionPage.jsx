import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft, RefreshCw, Cpu, CheckCircle, XCircle, Clock,
  AlertTriangle, Info, ChevronDown, ChevronRight, Copy, Check,
  Terminal, FileText, ShieldAlert, Download
} from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const STATUS_COLOR = {
  initializing: MUTED, planning: "#60a5fa", executing: MEDIUM,
  completed: LOW, failed: DANGER, awaiting_approval: HIGH,
};

const SEV_ICON = {
  info:     <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#60a5fa" }} />,
  warning:  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MEDIUM }} />,
  error:    <XCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: HIGH }} />,
  critical: <XCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: DANGER }} />,
};

const EVENT_LABEL = {
  "kernel.started":              { label: "Session Started",        color: "#60a5fa" },
  "kernel.policy.validated":     { label: "Policy Validated",       color: "#8b5cf6" },
  "kernel.execution.completed":  { label: "Execution Completed",    color: LOW },
  "kernel.execution.failed":     { label: "Execution Failed",       color: DANGER },
  "kernel.approval.requested":   { label: "Approval Requested",     color: HIGH },
  "kernel.approval.granted":     { label: "Approval Granted",       color: LOW },
  "kernel.approval.rejected":    { label: "Approval Rejected",      color: DANGER },
};

// Known error code patterns to extract from payloads/messages
const ERROR_CODE_PATTERNS = [
  { regex: /ERR[_-]?\d{3,}/gi, label: "ERR Code" },
  { regex: /E\d{4,}/g, label: "Error Code" },
  { regex: /HTTP\s*[45]\d{2}/gi, label: "HTTP Error" },
  { regex: /timeout/gi, label: "TIMEOUT" },
  { regex: /permission denied/gi, label: "PERM_DENIED" },
  { regex: /policy violation/gi, label: "POLICY_VIOLATION" },
  { regex: /unauthorized/gi, label: "UNAUTHORIZED" },
  { regex: /rate limit/gi, label: "RATE_LIMIT" },
];

function extractErrorCodes(text) {
  if (!text) return [];
  const found = [];
  ERROR_CODE_PATTERNS.forEach(({ regex, label }) => {
    const matches = text.match(regex);
    if (matches) matches.forEach(m => found.push({ code: m.toUpperCase(), label }));
  });
  return [...new Map(found.map(f => [f.code, f])).values()];
}

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || MUTED;
  return (
    <span className="text-[11px] font-black px-2.5 py-1 rounded-lg capitalize"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {(status || "—").replace(/_/g, " ")}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-white/10 transition-all" style={{ color: MUTED }}>
      {copied ? <Check className="w-3.5 h-3.5" style={{ color: LOW }} /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function EventRow({ event, index }) {
  const [expanded, setExpanded] = useState(false);
  const meta = EVENT_LABEL[event.event_type] || { label: event.event_type?.replace(/\./g, " ") || "Event", color: MUTED };
  const icon = SEV_ICON[event.severity] || SEV_ICON.info;
  let parsedPayload = null;
  try { parsedPayload = event.payload ? JSON.parse(event.payload) : null; } catch {}
  const isError = event.severity === "critical" || event.severity === "error";

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-10 bottom-0 w-px" style={{ background: BORDER }} />
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 mt-0.5"
          style={{ background: `${meta.color}15`, border: `2px solid ${isError ? DANGER : meta.color}40` }}>
          <span className="text-[10px] font-black font-mono" style={{ color: isError ? DANGER : meta.color }}>
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1 mb-3 rounded-xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${isError ? DANGER + "40" : meta.color + "25"}` }}>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-all"
            onClick={() => setExpanded(e => !e)}>
            {icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold" style={{ color: isError ? DANGER : meta.color }}>{meta.label}</span>
                <SevBadge sev={event.severity} />
              </div>
              <p className="text-[10px] mt-0.5 font-mono truncate" style={{ color: MUTED }}>{event.event_type}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px]" style={{ color: MUTED }}>{timeAgo(event.occurred_at || event.created_date)}</span>
              {parsedPayload && (expanded
                ? <ChevronDown className="w-3.5 h-3.5" style={{ color: MUTED }} />
                : <ChevronRight className="w-3.5 h-3.5" style={{ color: MUTED }} />)}
            </div>
          </button>

          {expanded && parsedPayload && (
            <div className="border-t px-4 py-3" style={{ borderColor: `${meta.color}20` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Payload</span>
                <CopyButton text={JSON.stringify(parsedPayload, null, 2)} />
              </div>
              <pre className="text-[11px] font-mono overflow-x-auto rounded-lg p-3"
                style={{ background: "#020817", color: CYAN, maxHeight: 200 }}>
                {JSON.stringify(parsedPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalCard({ approval }) {
  const statusColor = { approved: LOW, rejected: DANGER, partial: MEDIUM, pending: HIGH }[approval.status] || MUTED;
  return (
    <div className="p-4 rounded-xl" style={{ background: `${statusColor}08`, border: `1px solid ${statusColor}30` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: statusColor }}>
          {approval.approval_type} approval · {approval.status}
        </span>
        <SevBadge sev={approval.risk_level} />
      </div>
      <p className="text-sm text-white mb-2">{approval.requested_action || "Action pending approval"}</p>
      <div className="flex items-center gap-4 text-[10px]" style={{ color: MUTED }}>
        <span>Tool: <span style={{ color: CYAN }}>{approval.tool_name || "—"}</span></span>
        <span>Required: <span style={{ color: TEXT }}>{approval.approvers_required ?? 1}</span></span>
        <span>Received: <span style={{ color: statusColor }}>{approval.approvals_received ?? 0}</span></span>
      </div>
      {approval.expires_at && (
        <p className="text-[10px] mt-1.5" style={{ color: MUTED }}>Expires: {timeAgo(approval.expires_at)}</p>
      )}
    </div>
  );
}

// ── Raw Execution Data Tab ────────────────────────────────────────────────────
function RawDataTab({ session, events, approvals }) {
  const raw = {
    session: {
      session_id: session.session_id,
      intent: session.intent,
      intent_type: session.intent_type,
      actor_role: session.actor_role,
      actor_id: session.actor_id,
      status: session.status,
      current_stage: session.current_stage,
      duration_ms: session.duration_ms,
      context_summary: session.context_summary,
      next_step: session.next_step,
      result_summary: session.result_summary,
      error_message: session.error_message,
      started_at: session.started_at,
      completed_at: session.completed_at,
    },
    events: events.map(e => ({
      event_type: e.event_type,
      severity: e.severity,
      occurred_at: e.occurred_at || e.created_date,
      payload: (() => { try { return JSON.parse(e.payload); } catch { return e.payload; } })(),
    })),
    approvals: approvals.map(a => ({
      approval_type: a.approval_type,
      risk_level: a.risk_level,
      requested_action: a.requested_action,
      tool_name: a.tool_name,
      status: a.status,
      approvals_received: a.approvals_received,
      approvers_required: a.approvers_required,
    })),
  };
  const text = JSON.stringify(raw, null, 2);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>
          Full execution snapshot — {events.length} events · {approvals.length} approvals
        </p>
        <CopyButton text={text} />
      </div>
      <pre className="text-[11px] font-mono overflow-auto rounded-xl p-4 leading-relaxed"
        style={{ background: "#020817", color: CYAN, maxHeight: 500, border: `1px solid ${BORDER}` }}>
        {text}
      </pre>
    </div>
  );
}

// ── Error Codes Tab ───────────────────────────────────────────────────────────
function ErrorCodesTab({ session, events }) {
  // Collect all text to scan
  const sources = [
    { source: "Session error_message", text: session.error_message },
    { source: "Session context_summary", text: session.context_summary },
    ...events.map((e, i) => ({ source: `Event ${i + 1}: ${e.event_type}`, text: e.payload })),
  ].filter(s => s.text);

  const allCodes = [];
  sources.forEach(({ source, text }) => {
    const codes = extractErrorCodes(text);
    codes.forEach(c => allCodes.push({ ...c, source }));
  });

  // Dedup by code keeping first occurrence
  const unique = [...new Map(allCodes.map(c => [c.code, c])).values()];

  // Also list all error/critical events explicitly
  const errorEvents = events.filter(e => e.severity === "error" || e.severity === "critical");

  if (unique.length === 0 && errorEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ShieldAlert className="w-10 h-10 mb-3" style={{ color: LOW }} />
        <p className="text-sm font-bold" style={{ color: LOW }}>No error codes detected</p>
        <p className="text-[10px] mt-1" style={{ color: MUTED }}>Session logs contain no known error patterns</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unique.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>
            Detected Error Codes ({unique.length})
          </p>
          <div className="space-y-2">
            {unique.map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}25` }}>
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded"
                  style={{ color: DANGER, background: `${DANGER}18`, border: `1px solid ${DANGER}30` }}>
                  {c.code}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white">{c.label}</p>
                  <p className="text-[10px] truncate" style={{ color: MUTED }}>{c.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorEvents.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>
            Critical / Error Events ({errorEvents.length})
          </p>
          <div className="space-y-2">
            {errorEvents.map((e, i) => {
              let parsed = null;
              try { parsed = e.payload ? JSON.parse(e.payload) : null; } catch {}
              return (
                <div key={i} className="px-4 py-3 rounded-xl"
                  style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}25` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <SevBadge sev={e.severity} />
                    <span className="text-xs font-bold text-white">{e.event_type}</span>
                  </div>
                  <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(e.occurred_at || e.created_date)}</p>
                  {parsed && (
                    <pre className="text-[10px] font-mono mt-2 overflow-x-auto rounded p-2"
                      style={{ background: "#020817", color: HIGH, maxHeight: 80 }}>
                      {JSON.stringify(parsed, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Export this single session as a text log ──────────────────────────────────
function exportSessionLog(session, events, approvals) {
  const lines = [];
  const line = (s = "") => lines.push(s);
  const hr = () => line("─".repeat(60));

  line("GDS OS — AI KERNEL SESSION LOG");
  hr();
  line(`Session ID  : ${session.session_id}`);
  line(`Status      : ${session.status}`);
  line(`Intent      : ${session.intent}`);
  line(`Type        : ${session.intent_type}`);
  line(`Actor       : ${session.actor_id} (${session.actor_role})`);
  line(`Stage       : ${session.current_stage}`);
  line(`Duration    : ${session.duration_ms || 0}ms`);
  line(`Started     : ${session.started_at || session.created_date}`);
  line(`Completed   : ${session.completed_at || "—"}`);
  if (session.context_summary) { line(); line(`Context: ${session.context_summary}`); }
  if (session.error_message) { line(); line(`ERROR: ${session.error_message}`); }
  if (session.result_summary) { line(); line(`Result: ${session.result_summary}`); }

  if (events.length > 0) {
    line(); hr(); line("EXECUTION LOG");  hr();
    events.forEach((e, i) => {
      line(`[${String(i + 1).padStart(2, "0")}] ${e.event_type} | ${e.severity?.toUpperCase()} | ${e.occurred_at || e.created_date}`);
      if (e.payload) { try { line(`     ${e.payload}`); } catch {} }
    });
  }

  if (approvals.length > 0) {
    line(); hr(); line("APPROVAL REQUESTS"); hr();
    approvals.forEach((a, i) => {
      line(`[${i + 1}] ${a.approval_type} | ${a.status} | Tool: ${a.tool_name || "—"} | Risk: ${a.risk_level}`);
    });
  }

  hr();
  line(`Exported: ${new Date().toISOString()}`);

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kernel-session-${session.session_id?.slice(0, 20) || "log"}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

const TABS = [
  { id: "log",    label: "Execution Log", icon: Terminal },
  { id: "raw",    label: "Raw Data",      icon: FileText },
  { id: "errors", label: "Error Codes",   icon: ShieldAlert },
];

export default function GDSKernelSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("log");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["kernel-session", sessionId],
    queryFn: () => base44.functions.invoke("gdsKernelGateway", {
      action: "session", session_id: sessionId
    }).then(r => r.data),
    refetchInterval: 15000,
    enabled: !!sessionId,
  });

  const session = data?.session;
  const events = (data?.events || []).sort((a, b) =>
    new Date(a.occurred_at || a.created_date) - new Date(b.occurred_at || b.created_date)
  );
  const approvals = data?.approvals || [];
  const failedEvents = events.filter(e => e.severity === "critical" || e.severity === "error");
  const durationSec = session?.duration_ms ? (session.duration_ms / 1000).toFixed(2) : null;
  const allErrorCodes = events.reduce((acc, e) => {
    acc.push(...extractErrorCodes(e.payload || ""));
    return acc;
  }, [...extractErrorCodes(session?.error_message || "")]);
  const uniqueErrorCount = [...new Map(allErrorCodes.map(c => [c.code, c])).values()].length;

  return (
    <div style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "AI Kernel", path: "/kernel" }, { label: sessionId?.slice(0, 20) + "…" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate("/kernel")}
            className="p-2 rounded-xl hover:bg-white/5 transition-all mt-0.5"
            style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Cpu className="w-5 h-5" style={{ color: CYAN }} />
              <h1 className="text-xl font-black text-white">Session Detail</h1>
              {session && <StatusBadge status={session.status} />}
            </div>
            <p className="text-[11px] font-mono mt-1" style={{ color: MUTED }}>{sessionId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <button
              onClick={() => exportSessionLog(session, events, approvals)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
              style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.35)", color: "#8b5cf6" }}>
              <Download className="w-3.5 h-3.5" />
              Export Log
            </button>
          )}
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {isLoading ? <Skeleton lines={8} /> : !session ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Cpu className="w-12 h-12 mb-3" style={{ color: MUTED }} />
          <p className="text-base font-bold text-white">Session not found</p>
          <p className="text-sm mt-1" style={{ color: MUTED }}>{sessionId}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Session summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>Session Overview</h3>
              <div>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Intent</p>
                <p className="text-sm text-white leading-relaxed">{session.intent || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Type", value: session.intent_type || "—" },
                  { label: "Actor Role", value: session.actor_role || "—" },
                  { label: "Actor ID", value: session.actor_id || "—" },
                  { label: "Stage", value: `Stage ${session.current_stage || 1}` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold" style={{ color: MUTED }}>{label}</p>
                    <p className="text-xs text-white font-mono mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {session.context_summary && (
                <div>
                  <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Context</p>
                  <p className="text-xs" style={{ color: TEXT }}>{session.context_summary}</p>
                </div>
              )}
              {session.next_step && (
                <div className="px-3 py-2 rounded-lg" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}20` }}>
                  <p className="text-[10px] font-bold mb-0.5" style={{ color: CYAN }}>Next Step</p>
                  <p className="text-xs" style={{ color: TEXT }}>{session.next_step}</p>
                </div>
              )}
            </Card>

            <div className="space-y-3">
              <Card className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Timing</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Started", value: timeAgo(session.started_at || session.created_date), color: CYAN },
                    { label: "Duration", value: durationSec ? `${durationSec}s` : "—", color: "#60a5fa" },
                    { label: "Completed", value: session.completed_at ? timeAgo(session.completed_at) : "—", color: LOW },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>{label}</p>
                      <p className="text-xs font-black font-mono" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {(session.status === "failed" || session.error_message) && (
                <Card className="p-4" style={{ border: `1px solid ${DANGER}30` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4" style={{ color: DANGER }} />
                    <h3 className="text-xs font-bold" style={{ color: DANGER }}>Failure Details</h3>
                  </div>
                  <pre className="text-[11px] font-mono overflow-x-auto rounded-lg p-3 whitespace-pre-wrap"
                    style={{ background: "#020817", color: DANGER, maxHeight: 120 }}>
                    {session.error_message || "Unknown error — check the Error Codes tab for details."}
                  </pre>
                  {failedEvents.length > 0 && (
                    <p className="text-[10px] mt-2" style={{ color: MUTED }}>
                      {failedEvents.length} critical/error event{failedEvents.length > 1 ? "s" : ""} — see Error Codes tab ↓
                    </p>
                  )}
                </Card>
              )}

              {session.result_summary && (
                <Card className="p-4" style={{ border: `1px solid ${LOW}30` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
                    <h3 className="text-xs font-bold" style={{ color: LOW }}>Result Summary</h3>
                  </div>
                  <p className="text-xs" style={{ color: TEXT }}>{session.result_summary}</p>
                </Card>
              )}

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Events", value: events.length, color: CYAN },
                  { label: "Errors", value: failedEvents.length, color: failedEvents.length > 0 ? DANGER : MUTED },
                  { label: "Error Codes", value: uniqueErrorCount, color: uniqueErrorCount > 0 ? HIGH : MUTED },
                ].map(({ label, value, color }) => (
                  <Card key={label} className="p-3 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>{label}</p>
                    <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Approvals */}
          {approvals.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3">Approval Requests</h3>
              <div className="space-y-3">
                {approvals.map((a, i) => <ApprovalCard key={a.id || i} approval={a} />)}
              </div>
            </Card>
          )}

          {/* Tabbed detail section */}
          <Card className="overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b" style={{ borderColor: BORDER }}>
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                const hasBadge = id === "errors" && (failedEvents.length > 0 || uniqueErrorCount > 0);
                return (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className="flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2"
                    style={{
                      color: active ? CYAN : MUTED,
                      borderBottomColor: active ? CYAN : "transparent",
                      background: active ? `${CYAN}08` : "transparent",
                    }}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    {hasBadge && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: `${DANGER}20`, color: DANGER }}>
                        {failedEvents.length + uniqueErrorCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              {activeTab === "log" && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-bold text-white">Execution Log</h3>
                      <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                        Chronological · {events.length} event{events.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {failedEvents.length > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                        style={{ background: `${DANGER}12`, border: `1px solid ${DANGER}30` }}>
                        <AlertTriangle className="w-3.5 h-3.5" style={{ color: DANGER }} />
                        <span className="text-[11px] font-bold" style={{ color: DANGER }}>{failedEvents.length} error{failedEvents.length > 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>
                  {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <Clock className="w-8 h-8 mb-2" style={{ color: MUTED }} />
                      <p className="text-sm font-bold" style={{ color: MUTED }}>No events recorded yet</p>
                    </div>
                  ) : (
                    <div className="pl-1">
                      {events.map((e, i) => <EventRow key={e.id || i} event={e} index={i} />)}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: session.status === "completed" ? `${LOW}15` : session.status === "failed" ? `${DANGER}15` : `${MUTED}15`,
                            border: `2px solid ${session.status === "completed" ? LOW : session.status === "failed" ? DANGER : MUTED}40`
                          }}>
                          {session.status === "completed"
                            ? <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
                            : session.status === "failed"
                              ? <XCircle className="w-4 h-4" style={{ color: DANGER }} />
                              : <Clock className="w-4 h-4" style={{ color: MUTED }} />}
                        </div>
                        <span className="text-xs font-bold capitalize"
                          style={{ color: session.status === "completed" ? LOW : session.status === "failed" ? DANGER : MUTED }}>
                          {(session.status || "in progress").replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "raw" && <RawDataTab session={session} events={events} approvals={approvals} />}
              {activeTab === "errors" && <ErrorCodesTab session={session} events={events} />}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}