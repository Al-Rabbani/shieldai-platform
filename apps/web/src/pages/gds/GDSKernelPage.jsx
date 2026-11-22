import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Plus, X, Cpu, ChevronRight, CheckCircle, XCircle, CheckSquare, Download, Search, Filter, BookTemplate, Save, Trash2, Activity, Zap, Clock3, Archive, ArchiveRestore, Inbox } from "lucide-react";
import KernelResourceWidget from "@/components/gds/KernelResourceWidget";
import KernelCapacityHeatmap from "@/components/gds/KernelCapacityHeatmap";
import KernelAgentBreakdown from "@/components/gds/KernelAgentBreakdown";
import KernelBudgetAlerts from "@/components/gds/KernelBudgetAlerts";
import KernelAgentComparison from "@/components/gds/KernelAgentComparison";
import KernelBudgetNotifications from "@/components/gds/KernelBudgetNotifications";
import KernelDependencyGraph from "@/components/gds/KernelDependencyGraph";

// ── Archive helpers (localStorage) ───────────────────────────────────────────
const ARCHIVE_KEY = "gds_kernel_session_archive";
function loadArchive() {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || "[]"); } catch { return []; }
}
function saveArchive(items) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(items));
}
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, AreaChart, Area
} from "recharts";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const STATUS_COLOR = {
  initializing: MUTED,
  planning: "#60a5fa",
  executing: MEDIUM,
  completed: LOW,
  failed: DANGER,
  awaiting_approval: HIGH,
};

const EVENT_COLOR = {
  "kernel.started": "#60a5fa",
  "kernel.policy.validated": "#8b5cf6",
  "kernel.execution.completed": LOW,
  "kernel.execution.failed": DANGER,
  "kernel.approval.requested": HIGH,
  "kernel.approval.granted": LOW,
  "kernel.approval.rejected": DANGER,
};

const INTENT_TYPES = ["scan","remediate","investigate","report","approve","configure","query","orchestrate"];
const ACTOR_ROLES = ["admin","analyst","viewer"];

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || MUTED;
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {(status || "—").replace(/_/g, " ")}
    </span>
  );
}

function StageBadge({ stage }) {
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded font-mono"
      style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
      Stage {stage}
    </span>
  );
}

function EventTag({ type }) {
  const color = EVENT_COLOR[type] || MUTED;
  const label = type ? type.replace("kernel.", "").replace(/_/g, " ") : "—";
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

// ── Build 30-day trend data from sessions ─────────────────────────────────────
function buildTrend(sessions) {
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const daySessions = sessions.filter(s => {
      const t = new Date(s.created_date || s.started_at || 0).getTime();
      return t >= d.getTime() && t < nextD.getTime();
    });
    days.push({
      date: label,
      completed: daySessions.filter(s => s.status === "completed").length,
      failed: daySessions.filter(s => s.status === "failed").length,
      pending: daySessions.filter(s => s.status === "awaiting_approval").length,
      total: daySessions.length,
    });
  }
  // Sample every 3 days for readability
  return days.filter((_, i) => i % 3 === 0 || i === 29);
}

// ── Build failure type breakdown ──────────────────────────────────────────────
function buildFailureBreakdown(sessions) {
  const failed = sessions.filter(s => s.status === "failed");
  const buckets = {
    "Policy Violation": 0,
    "Timeout": 0,
    "Tool Error": 0,
    "Auth Denied": 0,
    "Unknown": 0,
  };
  failed.forEach(s => {
    const msg = (s.error_message || "").toLowerCase();
    if (msg.includes("policy")) buckets["Policy Violation"]++;
    else if (msg.includes("timeout")) buckets["Timeout"]++;
    else if (msg.includes("tool") || msg.includes("executor")) buckets["Tool Error"]++;
    else if (msg.includes("auth") || msg.includes("permission") || msg.includes("denied")) buckets["Auth Denied"]++;
    else buckets["Unknown"]++;
  });
  return Object.entries(buckets)
    .map(([name, count]) => ({ name, count }))
    .filter(b => b.count > 0)
    .sort((a, b) => b.count - a.count);
}

const FAILURE_COLORS = [DANGER, HIGH, MEDIUM, "#8b5cf6", MUTED];

// ── PDF export — multi-session audit report ───────────────────────────────────
async function exportAuditPDF(selectedSessions) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  const W = 210, M = 16;

  // Header
  doc.setFillColor(2, 8, 23);
  doc.rect(0, 0, W, 42, "F");
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(17); doc.setFont("helvetica", "bold");
  doc.text("GDS OS — AI Kernel Audit Report", M, 15);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`${selectedSessions.length} sessions selected  ·  EDP-002 v1.0  ·  Generated ${now.toISOString().slice(0,16).replace("T"," ")} UTC`, M, 25);
  doc.setDrawColor(0, 212, 255); doc.setLineWidth(0.4);
  doc.line(M, 35, W - M, 35);

  // Aggregate metrics
  const total = selectedSessions.length;
  const completed = selectedSessions.filter(s => s.status === "completed").length;
  const failed = selectedSessions.filter(s => s.status === "failed").length;
  const durations = selectedSessions.filter(s => s.duration_ms > 0).map(s => s.duration_ms);
  const avgMs = durations.length ? Math.round(durations.reduce((a,b) => a+b,0) / durations.length) : 0;
  const maxMs = durations.length ? Math.max(...durations) : 0;
  const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0";

  let y = 48;
  const section = (title) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFillColor(10, 22, 40);
    doc.rect(M, y - 5, W - M * 2, 10, "F");
    doc.setTextColor(0, 212, 255); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(title, M + 3, y + 1); y += 12;
  };
  const kv = (label, value, vc = [226, 232, 240]) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setTextColor(100, 116, 139); doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
    doc.text(label, M + 3, y);
    doc.setTextColor(...vc); doc.setFont("helvetica", "bold");
    doc.text(String(value), M + 65, y); y += 7;
  };

  section("AGGREGATE PERFORMANCE METRICS");
  kv("Sessions Selected", total);
  kv("Completed", completed, [0, 255, 136]);
  kv("Failed", failed, [255, 59, 59]);
  kv("Success Rate", `${successRate}%`, parseFloat(successRate) >= 80 ? [0, 255, 136] : [255, 59, 59]);
  kv("Avg Duration", `${avgMs}ms`);
  kv("Max Duration", `${maxMs}ms`);
  y += 4;

  // Agent breakdown
  const agentMap = {};
  selectedSessions.forEach(s => {
    const k = s.intent_type || "unknown";
    if (!agentMap[k]) agentMap[k] = { runs: 0, total_ms: 0, failed: 0 };
    agentMap[k].runs++;
    agentMap[k].total_ms += s.duration_ms || 0;
    if (s.status === "failed") agentMap[k].failed++;
  });
  section("RESOURCE CONSUMPTION BY AGENT");
  const agentCols = ["Agent Type", "Runs", "Avg ms", "Failure %"];
  const agentColW = [50, 25, 30, 30];
  let cx = M + 3;
  doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  agentCols.forEach((h, i) => { doc.text(h, cx, y); cx += agentColW[i]; }); y += 2;
  doc.setDrawColor(30, 58, 95); doc.line(M, y, W - M, y); y += 4;
  Object.entries(agentMap).sort((a,b) => (b[1].total_ms/b[1].runs||0) - (a[1].total_ms/a[1].runs||0)).forEach(([agent, d]) => {
    if (y > 270) { doc.addPage(); y = 20; }
    const avg = d.runs > 0 ? Math.round(d.total_ms / d.runs) : 0;
    const fr = d.runs > 0 ? Math.round((d.failed / d.runs) * 100) : 0;
    cx = M + 3;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(226, 232, 240);
    doc.text(agent, cx, y); cx += agentColW[0];
    doc.text(String(d.runs), cx, y); cx += agentColW[1];
    doc.text(`${avg}ms`, cx, y); cx += agentColW[2];
    doc.setTextColor(fr >= 20 ? 255 : 226, fr >= 20 ? 59 : 232, fr >= 20 ? 59 : 240);
    doc.text(`${fr}%`, cx, y); y += 6;
  });
  y += 4;

  // Per-session detail
  section("SESSION DETAIL LOG");
  const hdrs = ["Session ID", "Status", "Type", "Actor", "Duration", "Started"];
  const hColW = [44, 24, 22, 30, 20, 30];
  cx = M + 3;
  doc.setTextColor(100, 116, 139); doc.setFontSize(7); doc.setFont("helvetica", "bold");
  hdrs.forEach((h, i) => { doc.text(h, cx, y); cx += hColW[i]; }); y += 2;
  doc.setDrawColor(30, 58, 95); doc.line(M, y, W - M, y); y += 4;

  selectedSessions.forEach(s => {
    if (y > 270) { doc.addPage(); y = 20; }
    const sc = s.status === "completed" ? [0,255,136] : s.status === "failed" ? [255,59,59] : [255,215,0];
    cx = M + 3;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.setTextColor(226, 232, 240); doc.text((s.session_id||"").slice(0,18), cx, y); cx += hColW[0];
    doc.setTextColor(...sc); doc.text(s.status||"—", cx, y); cx += hColW[1];
    doc.setTextColor(226, 232, 240); doc.text(s.intent_type||"—", cx, y); cx += hColW[2];
    doc.text((s.actor_id||"—").slice(0,14), cx, y); cx += hColW[3];
    doc.text(`${s.duration_ms||0}ms`, cx, y); cx += hColW[4];
    doc.setTextColor(100,116,139); doc.text((s.created_date||s.started_at||"").slice(0,16), cx, y);
    y += 5;

    // Intent / result summary
    if (s.intent) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setTextColor(100,116,139); doc.setFontSize(6.5);
      const wrapped = doc.splitTextToSize(`Intent: ${s.intent}`, W - M * 2 - 6);
      doc.text(wrapped.slice(0,2), M + 6, y); y += wrapped.slice(0,2).length * 4.5;
    }
    if (s.result_summary) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setTextColor(0, 180, 100); doc.setFontSize(6.5);
      const rw = doc.splitTextToSize(`Result: ${s.result_summary}`, W - M * 2 - 6);
      doc.text(rw.slice(0,1), M + 6, y); y += 5;
    }
    if (s.error_message) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setTextColor(220, 60, 60); doc.setFontSize(6.5);
      doc.text(`Error: ${s.error_message.slice(0,80)}`, M + 6, y); y += 5;
    }
    y += 1;
  });

  // Footer
  const pc = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5); doc.setTextColor(50,80,120);
    doc.text(`GDS OS · AI Kernel Audit Report · ${total} sessions · ${now.toISOString().slice(0,10)} · Page ${i}/${pc}`, M, 292);
  }

  doc.save(`kernel-audit-${now.toISOString().slice(0,10)}-${total}sessions.pdf`);
}

// ── PDF export — monthly summary ──────────────────────────────────────────────
async function exportKernelPDF(sessions, failureData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const W = 210, M = 16;

  // Header band
  doc.setFillColor(2, 8, 23);
  doc.rect(0, 0, W, 40, "F");
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.text("GDS OS — AI Kernel Monthly Report", M, 16);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`${monthName}  ·  EDP-002 v1.0  ·  Generated ${now.toISOString().slice(0, 16).replace("T", " ")} UTC`, M, 26);
  doc.setDrawColor(0, 212, 255);
  doc.setLineWidth(0.4);
  doc.line(M, 36, W - M, 36);

  let y = 50;
  const section = (title) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFillColor(10, 22, 40);
    doc.rect(M, y - 5, W - M * 2, 10, "F");
    doc.setTextColor(0, 212, 255); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(title, M + 3, y + 1);
    y += 12;
  };

  const row = (label, value, valueColor = [226, 232, 240]) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setTextColor(100, 116, 139); doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(label, M + 3, y);
    doc.setTextColor(...valueColor); doc.setFont("helvetica", "bold");
    doc.text(String(value), M + 70, y);
    y += 7;
  };

  // Summary stats
  const total = sessions.length;
  const completed = sessions.filter(s => s.status === "completed").length;
  const failed = sessions.filter(s => s.status === "failed").length;
  const pending = sessions.filter(s => s.status === "awaiting_approval").length;
  const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0";
  const durations = sessions.filter(s => s.duration_ms > 0).map(s => s.duration_ms);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  section("PERFORMANCE SUMMARY");
  row("Total Sessions", total);
  row("Completed", completed, [0, 255, 136]);
  row("Failed", failed, [255, 59, 59]);
  row("Pending Approval", pending, [255, 215, 0]);
  row("Success Rate", `${successRate}%`, parseFloat(successRate) >= 80 ? [0, 255, 136] : [255, 59, 59]);
  row("Avg Duration", `${avgDuration}ms`);
  y += 4;

  // Failure breakdown
  if (failureData.length > 0) {
    section("FAILURE TYPE BREAKDOWN");
    failureData.forEach(f => row(f.name, f.count, [255, 140, 0]));
    y += 4;
  }

  // Session log table
  section("SESSION LOG (last 30)");
  const headers = ["Session ID", "Status", "Intent Type", "Duration", "Started"];
  const colW = [54, 28, 30, 22, 36];
  let cx = M + 3;
  doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => { doc.text(h, cx, y); cx += colW[i]; });
  y += 2;
  doc.setDrawColor(30, 58, 95); doc.line(M, y, W - M, y); y += 4;

  const recent = sessions.slice(0, 30);
  recent.forEach(s => {
    if (y > 270) { doc.addPage(); y = 20; }
    const sc = s.status === "completed" ? [0, 255, 136] : s.status === "failed" ? [255, 59, 59] : [255, 215, 0];
    cx = M + 3;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.setTextColor(226, 232, 240); doc.text((s.session_id || "").slice(0, 18), cx, y); cx += colW[0];
    doc.setTextColor(...sc); doc.text(s.status || "—", cx, y); cx += colW[1];
    doc.setTextColor(226, 232, 240); doc.text(s.intent_type || "—", cx, y); cx += colW[2];
    doc.text(`${s.duration_ms || 0}ms`, cx, y); cx += colW[3];
    doc.setTextColor(100, 116, 139); doc.text((s.created_date || "").slice(0, 16), cx, y);
    y += 6;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(50, 80, 120);
    doc.text(`GDS OS · AI Kernel Monthly Report · ${monthName} · Page ${i}/${pageCount}`, M, 292);
  }

  doc.save(`kernel-monthly-report-${now.toISOString().slice(0, 7)}.pdf`);
}

// ── Floating bulk action bar ──────────────────────────────────────────────────
function BulkActionBar({ selected, onApprove, onReject, onClear, busy }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
      style={{ background: "#0a1628", border: `1px solid ${CYAN}50`, boxShadow: `0 0 30px rgba(0,212,255,0.15)` }}>
      <CheckSquare className="w-4 h-4" style={{ color: CYAN }} />
      <span className="text-sm font-bold text-white">{selected.size} selected</span>
      <div className="w-px h-5 mx-1" style={{ background: BORDER }} />
      <button
        onClick={onApprove} disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: `${LOW}20`, border: `1px solid ${LOW}40`, color: LOW }}>
        <CheckCircle className="w-3.5 h-3.5" />
        Approve All
      </button>
      <button
        onClick={onReject} disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}35`, color: DANGER }}>
        <XCircle className="w-3.5 h-3.5" />
        Reject All
      </button>
      <button onClick={onClear} className="ml-1 p-1 rounded-lg hover:bg-white/10 transition-all" style={{ color: MUTED }}>
        <X className="w-3.5 h-3.5" />
      </button>
      {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: CYAN }} />}
    </div>
  );
}

// ── Template helpers (localStorage) ──────────────────────────────────────────
const TEMPLATES_KEY = "gds_kernel_session_templates";
function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "[]"); } catch { return []; }
}
function saveTemplates(tpls) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(tpls));
}

// ── New Session Modal (with template save/load) ───────────────────────────────
function NewSessionModal({ onClose, onSuccess }) {
  const [intent, setIntent]       = useState("");
  const [intentType, setIntentType] = useState("query");
  const [actorRole, setActorRole]   = useState("analyst");
  const [actorId, setActorId]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState("");
  const [templates, setTemplates]   = useState(loadTemplates);
  const [templateName, setTemplateName] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");

  const inputStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none"
  };

  const applyTemplate = (tpl) => {
    setIntent(tpl.intent);
    setIntentType(tpl.intent_type);
    setActorRole(tpl.actor_role);
    setActorId(tpl.actor_id || "");
    setShowTemplates(false);
  };

  const saveTemplate = () => {
    if (!intent.trim() || !templateName.trim()) { setSaveMsg("Give the template a name and fill in an intent."); return; }
    const tpl = { id: Date.now(), name: templateName.trim(), intent, intent_type: intentType, actor_role: actorRole, actor_id: actorId };
    const updated = [...templates, tpl];
    saveTemplates(updated);
    setTemplates(updated);
    setTemplateName("");
    setSaveMsg(`"${tpl.name}" saved!`);
    setTimeout(() => setSaveMsg(""), 2500);
  };

  const deleteTemplate = (id) => {
    const updated = templates.filter(t => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
  };

  const handleSubmit = async () => {
    if (!intent.trim()) { setError("Intent is required"); return; }
    setLoading(true); setError("");
    try {
      const res = await base44.functions.invoke("gdsKernelGateway", {
        action: "start", intent, intent_type: intentType, actor_role: actorRole, actor_id: actorId
      });
      setResult(res.data);
      onSuccess && onSuccess();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">Start New Kernel Session</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
              style={{ background: showTemplates ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${showTemplates ? CYAN + "40" : BORDER}`, color: showTemplates ? CYAN : MUTED }}>
              <BookTemplate className="w-3.5 h-3.5" />
              Templates {templates.length > 0 && <span className="font-black" style={{ color: CYAN }}>({templates.length})</span>}
            </button>
            <button onClick={onClose} className="hover:text-white transition-colors" style={{ color: MUTED }}><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Templates panel */}
        {showTemplates && (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${CYAN}25` }}>
            {templates.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: MUTED }}>No saved templates yet — fill in the form below and save one.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: BORDER }}>
                {templates.map(tpl => (
                  <div key={tpl.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{tpl.name}</p>
                      <p className="text-[10px] truncate" style={{ color: MUTED }}>{tpl.intent_type} · {tpl.actor_role} · {tpl.intent.slice(0, 50)}</p>
                    </div>
                    <button onClick={() => applyTemplate(tpl)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0 hover:opacity-80"
                      style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
                      Use
                    </button>
                    <button onClick={() => deleteTemplate(tpl.id)}
                      className="p-1 rounded-lg hover:bg-white/10 flex-shrink-0" style={{ color: MUTED }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {result ? (
          <div className="space-y-3">
            <div className="p-4 rounded-xl" style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}>
              <p className="text-xs font-bold mb-2" style={{ color: LOW }}>Session Created</p>
              <p className="text-sm font-mono text-white">{result.session_id}</p>
              <p className="text-xs mt-1" style={{ color: MUTED }}>{result.context_summary}</p>
              <p className="text-xs mt-1" style={{ color: CYAN }}>{result.next_step}</p>
            </div>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>Close</button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Intent</label>
                <textarea value={intent} onChange={e => setIntent(e.target.value)} rows={3}
                  placeholder="Describe what you want the kernel to do…"
                  style={{ ...inputStyle, resize: "none" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Intent Type</label>
                  <select value={intentType} onChange={e => setIntentType(e.target.value)} style={inputStyle}>
                    {INTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Actor Role</label>
                  <select value={actorRole} onChange={e => setActorRole(e.target.value)} style={inputStyle}>
                    {ACTOR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Actor ID</label>
                <input value={actorId} onChange={e => setActorId(e.target.value)}
                  placeholder="user@example.com" style={inputStyle} />
              </div>
              {/* Save as template row */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="Template name (optional)…"
                  className="flex-1 py-1.5 px-3 rounded-lg text-[11px] outline-none"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
                <button onClick={saveTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 hover:opacity-80 transition-all"
                  style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6" }}>
                  <Save className="w-3 h-3" /> Save Template
                </button>
              </div>
              {saveMsg && <p className="text-[11px]" style={{ color: LOW }}>{saveMsg}</p>}
            </div>
            {error && <p className="text-xs" style={{ color: DANGER }}>{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                {loading ? "Starting…" : "Start Session"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GDSKernelPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [user, setUser] = useState(null);
  const [sessionTab, setSessionTab] = useState("active"); // "active" | "archive"
  const [archive, setArchive] = useState(loadArchive);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveSelected, setArchiveSelected] = useState(new Set());
  const [auditExporting, setAuditExporting] = useState(false);

  // Search & filter state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDuration, setFilterDuration] = useState("all"); // all | fast | medium | slow

  const archiveSessions = (toArchive) => {
    const updated = [...archive, ...toArchive.map(s => ({ ...s, archived_at: new Date().toISOString() }))];
    saveArchive(updated);
    setArchive(updated);
  };

  const restoreFromArchive = (sessionId) => {
    const updated = archive.filter(s => s.session_id !== sessionId);
    saveArchive(updated);
    setArchive(updated);
  };

  const archiveCompleted = () => {
    const completed = sessions.filter(s => s.status === "completed" || s.status === "failed");
    if (completed.length === 0) return;
    archiveSessions(completed);
  };

  const filteredArchive = useMemo(() => {
    if (!archiveSearch.trim()) return archive;
    const q = archiveSearch.toLowerCase();
    return archive.filter(s =>
      (s.session_id || "").toLowerCase().includes(q) ||
      (s.intent || "").toLowerCase().includes(q) ||
      (s.actor_id || "").toLowerCase().includes(q)
    );
  }, [archive, archiveSearch]);

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["kernel-status"],
    queryFn: () => base44.functions.invoke("gdsKernelGateway", { action: "status" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const d = data || {};
  const sessions = d.recent_sessions || [];
  const events = d.recent_events || [];

  // Only awaiting_approval sessions are selectable
  const selectableSessions = sessions.filter(s => s.status === "awaiting_approval");
  const allSelected = selectableSessions.length > 0 && selectableSessions.every(s => selected.has(s.session_id));

  const toggleRow = (sessionId, isSelectable) => {
    if (!isSelectable) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(sessionId) ? next.delete(sessionId) : next.add(sessionId);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableSessions.map(s => s.session_id)));
    }
  };

  const bulkAction = async (approval_action) => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map(session_id =>
        base44.functions.invoke("gdsKernelGateway", {
          action: "approve", session_id, approval_action, approver_id: user?.email || "bulk-action"
        })
      ));
      setSelected(new Set());
      refetch();
    } catch (e) { console.error(e); }
    finally { setBulkBusy(false); }
  };

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        (s.session_id || "").toLowerCase().includes(q) ||
        (s.intent || "").toLowerCase().includes(q) ||
        (s.actor_id || "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      result = result.filter(s => s.status === filterStatus);
    }
    if (filterDuration !== "all") {
      result = result.filter(s => {
        const ms = s.duration_ms || 0;
        if (filterDuration === "fast")   return ms < 1000;
        if (filterDuration === "medium") return ms >= 1000 && ms < 10000;
        if (filterDuration === "slow")   return ms >= 10000;
        return true;
      });
    }
    return result;
  }, [sessions, search, filterStatus, filterDuration]);

  const hasActiveFilter = search || filterStatus !== "all" || filterDuration !== "all";

  // Charts
  const trendData = useMemo(() => buildTrend(sessions), [sessions]);
  const failureData = useMemo(() => buildFailureBreakdown(sessions), [sessions]);

  const tooltipStyle = {
    background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: "#e2e8f0"
  };

  return (
    <div style={{ ...PAGE_BG }}>
      {showModal && <NewSessionModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); refetch(); }} />}
      {selected.size > 0 && (
        <BulkActionBar
          selected={selected}
          onApprove={() => bulkAction("approve")}
          onReject={() => bulkAction("reject")}
          onClear={() => setSelected(new Set())}
          busy={bulkBusy}
        />
      )}

      <Breadcrumb items={[{ label: "AI Kernel" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Cpu className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">AI Kernel — Cognitive Engine</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded"
            style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
            EDP-002 v1.0
          </span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={async () => {
              setExporting(true);
              try { await exportKernelPDF(sessions, failureData); }
              catch (e) { console.error(e); }
              finally { setExporting(false); }
            }}
            disabled={exporting || sessions.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.35)", color: "#8b5cf6" }}>
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? "Generating…" : "Export PDF"}
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-4 h-4" />
            Start New Session
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Sessions", value: d.total_sessions ?? 0, color: CYAN },
          { label: "Completed", value: d.completed ?? 0, color: LOW },
          { label: "Failed", value: d.failed ?? 0, color: DANGER },
          { label: "Pending Approval", value: d.pending_approval ?? 0, color: (d.pending_approval ?? 0) > 0 ? MEDIUM : MUTED },
          { label: "Avg Duration ms", value: d.avg_duration_ms ?? 0, color: "#60a5fa" },
          { label: "Pipeline Stages", value: d.pipeline_stages ?? 15, color: "#8b5cf6" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* ── Resource Consumption & Queue Widget ──────────────────────────────── */}
      <KernelResourceWidget sessions={sessions} events={events} isLoading={isLoading} />

      {/* ── Capacity Heatmap ─────────────────────────────────────────────────── */}
      <KernelCapacityHeatmap sessions={sessions} />

      {/* ── Monthly Budget Notifications ───────────────────────────────────────── */}
      <KernelBudgetNotifications sessions={sessions} />

      {/* ── Budget Alert System ───────────────────────────────────────────────── */}
      <KernelBudgetAlerts sessions={sessions} />

      {/* ── Agent Resource Breakdown ─────────────────────────────────────────── */}
      <KernelAgentBreakdown sessions={sessions} isLoading={isLoading} />

      {/* ── Agent Comparison Tool ─────────────────────────────────────────────── */}
      <KernelAgentComparison sessions={sessions} />

      {/* ── Task Dependency Graph ─────────────────────────────────────────────── */}
      <KernelDependencyGraph sessions={sessions} />

      {/* ── Agent Workload Summary ───────────────────────────────────────────── */}
      {(() => {
        const active = sessions.filter(s => ["initializing","planning","executing"].includes(s.status));
        const byType = INTENT_TYPES.reduce((acc, t) => {
          acc[t] = active.filter(s => s.intent_type === t).length;
          return acc;
        }, {});
        const MAX_CONCURRENT = 10;
        const load = Math.min((active.length / MAX_CONCURRENT) * 100, 100);
        const loadColor = load >= 80 ? DANGER : load >= 50 ? MEDIUM : LOW;
        return (
          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: CYAN }} />
                <h3 className="text-sm font-bold text-white">Agent Workload</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: `${loadColor}15`, color: loadColor, border: `1px solid ${loadColor}30` }}>
                  {load >= 80 ? "HIGH LOAD" : load >= 50 ? "MODERATE" : "HEALTHY"}
                </span>
              </div>
              <p className="text-[10px]" style={{ color: MUTED }}>
                {active.length} active · {sessions.filter(s => s.status === "awaiting_approval").length} pending · {sessions.filter(s => s.status === "completed").length} done
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Concurrency gauge */}
              <div className="md:col-span-1 flex flex-col items-center justify-center p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${loadColor}25` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Concurrent Sessions</p>
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke={loadColor} strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 32 * load / 100} ${2 * Math.PI * 32 * (1 - load / 100)}`}
                      style={{ transition: "stroke-dasharray 1s ease", filter: `drop-shadow(0 0 4px ${loadColor}88)` }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black font-mono" style={{ color: loadColor }}>{active.length}</span>
                    <span className="text-[9px]" style={{ color: MUTED }}>/ {MAX_CONCURRENT}</span>
                  </div>
                </div>
                <p className="text-[10px] mt-2 font-bold" style={{ color: loadColor }}>{load.toFixed(0)}% capacity</p>
              </div>

              {/* Status breakdown */}
              <div className="md:col-span-1 p-4 rounded-xl space-y-2"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>By Status</p>
                {[
                  { label: "Initializing", status: "initializing", color: MUTED },
                  { label: "Planning",     status: "planning",     color: "#60a5fa" },
                  { label: "Executing",    status: "executing",    color: MEDIUM },
                  { label: "Awaiting OK",  status: "awaiting_approval", color: HIGH },
                ].map(({ label, status, color }) => {
                  const count = sessions.filter(s => s.status === status).length;
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-[11px]" style={{ color: MUTED }}>{label}</span>
                      </div>
                      <span className="text-[11px] font-black font-mono" style={{ color: count > 0 ? color : MUTED }}>{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Intent type breakdown */}
              <div className="md:col-span-2 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Active Sessions by Intent</p>
                {INTENT_TYPES.filter(t => (byType[t] || 0) > 0).length === 0 ? (
                  <div className="flex items-center gap-2 py-4">
                    <Zap className="w-4 h-4" style={{ color: LOW }} />
                    <span className="text-xs font-bold" style={{ color: LOW }}>No active sessions — kernel idle</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {INTENT_TYPES.filter(t => (byType[t] || 0) > 0).map(t => (
                      <div key={t} className="flex items-center justify-between">
                        <span className="text-[11px] capitalize" style={{ color: MUTED }}>{t}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${(byType[t] / Math.max(...Object.values(byType), 1)) * 100}%`, background: CYAN }} />
                          </div>
                          <span className="text-[11px] font-black font-mono w-4 text-right" style={{ color: CYAN }}>{byType[t]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Sessions table + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Sessions table with checkboxes */}
        <Card className="lg:col-span-2 overflow-hidden">
          {/* Tab bar: Active | Archive */}
          <div className="flex items-center border-b" style={{ borderColor: BORDER }}>
            {[
              { id: "active",  label: "Active Sessions", icon: Inbox,   count: sessions.length },
              { id: "archive", label: "Archive",         icon: Archive, count: archive.length },
            ].map(({ id, label, icon: Icon, count }) => {
              const active = sessionTab === id;
              return (
                <button key={id} onClick={() => setSessionTab(id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2"
                  style={{
                    color: active ? CYAN : MUTED,
                    borderBottomColor: active ? CYAN : "transparent",
                    background: active ? `${CYAN}06` : "transparent",
                  }}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: active ? `${CYAN}20` : "rgba(255,255,255,0.06)", color: active ? CYAN : MUTED }}>
                    {count}
                  </span>
                </button>
              );
            })}
            {/* Archive completed button */}
            {sessionTab === "active" && sessions.filter(s => s.status === "completed" || s.status === "failed").length > 0 && (
              <button onClick={archiveCompleted}
                className="ml-auto mr-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:opacity-80 transition-all"
                style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6" }}>
                <Archive className="w-3 h-3" />
                Archive Completed
              </button>
            )}
          </div>

          {sessionTab === "active" ? (
            <>
              {/* Search + Filters */}
              <div className="px-4 pt-2.5 pb-2 border-b space-y-2" style={{ borderColor: BORDER }}>
                <div className="flex items-center justify-between">
                  {selectableSessions.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ color: HIGH, background: `${HIGH}15`, border: `1px solid ${HIGH}30` }}>
                      {selectableSessions.length} awaiting approval
                    </span>
                  )}
                  <span className="text-[10px] ml-auto" style={{ color: MUTED }}>
                    {filteredSessions.length}{hasActiveFilter ? ` of ${sessions.length}` : ""} sessions
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[140px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: MUTED }} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search ID, intent, actor…"
                      className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none"
                      style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
                  </div>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-2 py-1.5 rounded-lg text-[11px] outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: filterStatus !== "all" ? CYAN : MUTED }}>
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="awaiting_approval">Awaiting Approval</option>
                    <option value="executing">Executing</option>
                    <option value="planning">Planning</option>
                    <option value="initializing">Initializing</option>
                  </select>
                  <select value={filterDuration} onChange={e => setFilterDuration(e.target.value)}
                    className="px-2 py-1.5 rounded-lg text-[11px] outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: filterDuration !== "all" ? CYAN : MUTED }}>
                    <option value="all">Any Duration</option>
                    <option value="fast">Fast (&lt;1s)</option>
                    <option value="medium">Medium (1–10s)</option>
                    <option value="slow">Slow (&gt;10s)</option>
                  </select>
                  {hasActiveFilter && (
                    <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterDuration("all"); }}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
                      style={{ color: DANGER, background: `${DANGER}10`, border: `1px solid ${DANGER}25` }}>
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {isLoading ? <Skeleton lines={5} /> : filteredSessions.length === 0
                ? <EmptyState icon={Cpu} title={hasActiveFilter ? "No matching sessions" : "No sessions yet"} description={hasActiveFilter ? "Try adjusting your filters" : "Start a new kernel session"} />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <th className="py-2 px-3 w-8">
                            <input type="checkbox" checked={allSelected} onChange={toggleAll}
                              disabled={selectableSessions.length === 0}
                              className="w-3.5 h-3.5 rounded cursor-pointer accent-cyan-400 disabled:opacity-30" />
                          </th>
                          {["Session ID","Intent","Status","Stage","Duration","Time"].map(h => (
                            <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSessions.map((s, i) => {
                          const isSelectable = s.status === "awaiting_approval";
                          const isChecked = selected.has(s.session_id);
                          return (
                            <tr key={s.id || i} className="hover:bg-white/[0.02] transition-all"
                              style={{ borderBottom: `1px solid ${BORDER}20`, background: isChecked ? `${CYAN}06` : undefined }}>
                              <td className="py-2 px-3">
                                <input type="checkbox" checked={isChecked} disabled={!isSelectable}
                                  onChange={() => toggleRow(s.session_id, isSelectable)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-3.5 h-3.5 rounded cursor-pointer accent-cyan-400 disabled:opacity-20" />
                              </td>
                              <td className="py-2 px-3 cursor-pointer" onClick={() => navigate(`/kernel/session/${s.session_id}`)}>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[11px] text-white">{(s.session_id || "").slice(0, 16)}…</span>
                                  <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />
                                </div>
                              </td>
                              <td className="py-2 px-3 max-w-[160px]">
                                <p className="truncate" style={{ color: TEXT }}>{(s.intent || "").slice(0, 60)}</p>
                              </td>
                              <td className="py-2 px-3"><StatusBadge status={s.status} /></td>
                              <td className="py-2 px-3"><StageBadge stage={s.current_stage || 1} /></td>
                              <td className="py-2 px-3 font-mono text-[11px]" style={{ color: CYAN }}>{s.duration_ms || 0}ms</td>
                              <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(s.created_date)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              {selectableSessions.length > 0 && (
                <div className="px-4 py-2 border-t" style={{ borderColor: BORDER }}>
                  <p className="text-[10px]" style={{ color: MUTED }}>
                    ☑ Check rows with <span style={{ color: HIGH }}>awaiting approval</span> status to bulk approve or reject via the floating action bar.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Archive tab */
            <>
              <div className="px-4 pt-2.5 pb-2 border-b space-y-2" style={{ borderColor: BORDER }}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: MUTED }} />
                    <input value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)}
                      placeholder="Search archived sessions…"
                      className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none"
                      style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
                  </div>
                  {archiveSelected.size > 0 && (
                    <button
                      disabled={auditExporting}
                      onClick={async () => {
                        setAuditExporting(true);
                        try {
                          const toExport = filteredArchive.filter(s => archiveSelected.has(s.session_id));
                          await exportAuditPDF(toExport);
                        } catch(e) { console.error(e); }
                        finally { setAuditExporting(false); }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 hover:opacity-80 transition-all disabled:opacity-50"
                      style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", color: "#8b5cf6" }}>
                      {auditExporting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      {auditExporting ? "Generating…" : `Export Audit PDF (${archiveSelected.size})`}
                    </button>
                  )}
                  {archiveSelected.size > 0 && (
                    <button onClick={() => setArchiveSelected(new Set())}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: MUTED }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {filteredArchive.length > 0 && (
                  <p className="text-[10px]" style={{ color: MUTED }}>
                    {archiveSelected.size > 0
                      ? <><span style={{ color: "#8b5cf6" }}>{archiveSelected.size} selected</span> — click "Export Audit PDF" to generate a comprehensive report</>
                      : "Check rows to select sessions for audit PDF export"}
                  </p>
                )}
              </div>
              {filteredArchive.length === 0
                ? <EmptyState icon={Archive} title="Archive is empty" description="Use 'Archive Completed' to move finished sessions here" />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <th className="py-2 px-3 w-8">
                            <input type="checkbox"
                              checked={filteredArchive.length > 0 && filteredArchive.every(s => archiveSelected.has(s.session_id))}
                              onChange={() => {
                                const allChecked = filteredArchive.every(s => archiveSelected.has(s.session_id));
                                if (allChecked) setArchiveSelected(new Set());
                                else setArchiveSelected(new Set(filteredArchive.map(s => s.session_id)));
                              }}
                              className="w-3.5 h-3.5 rounded cursor-pointer accent-purple-400" />
                          </th>
                          {["Session ID","Intent","Status","Duration","Archived",""].map(h => (
                            <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredArchive.map((s, i) => {
                          const checked = archiveSelected.has(s.session_id);
                          return (
                            <tr key={s.id || i} className="hover:bg-white/[0.02] transition-all"
                              style={{ borderBottom: `1px solid ${BORDER}20`, background: checked ? "rgba(139,92,246,0.05)" : undefined }}>
                              <td className="py-2 px-3">
                                <input type="checkbox" checked={checked}
                                  onChange={() => setArchiveSelected(prev => {
                                    const next = new Set(prev);
                                    next.has(s.session_id) ? next.delete(s.session_id) : next.add(s.session_id);
                                    return next;
                                  })}
                                  className="w-3.5 h-3.5 rounded cursor-pointer accent-purple-400" />
                              </td>
                              <td className="py-2 px-3 cursor-pointer" onClick={() => navigate(`/kernel/session/${s.session_id}`)}>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[11px]" style={{ color: MUTED }}>{(s.session_id || "").slice(0, 16)}…</span>
                                  <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />
                                </div>
                              </td>
                              <td className="py-2 px-3 max-w-[160px]">
                                <p className="truncate" style={{ color: MUTED }}>{(s.intent || "").slice(0, 60)}</p>
                              </td>
                              <td className="py-2 px-3"><StatusBadge status={s.status} /></td>
                              <td className="py-2 px-3 font-mono text-[11px]" style={{ color: MUTED }}>{s.duration_ms || 0}ms</td>
                              <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(s.archived_at)}</td>
                              <td className="py-2 px-3">
                                <button onClick={() => restoreFromArchive(s.session_id)}
                                  title="Restore"
                                  className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: CYAN }}>
                                  <ArchiveRestore className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </>
          )}
        </Card>

        {/* Events timeline */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <h3 className="text-sm font-bold text-white">Recent Events</h3>
          </div>
          {isLoading ? <Skeleton lines={6} /> : events.length === 0
            ? <EmptyState icon={Cpu} title="No events" description="Events will appear here" />
            : (
              <div className="p-3 space-y-2 overflow-y-auto max-h-96">
                {events.map((e, i) => (
                  <div key={e.id || i} className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}20` }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <EventTag type={e.event_type} />
                      <SevBadge sev={e.severity} />
                    </div>
                    <p className="text-[10px] font-mono truncate" style={{ color: MUTED }}>{(e.session_id || "").slice(0, 20)}…</p>
                    <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{timeAgo(e.occurred_at || e.created_date)}</p>
                  </div>
                ))}
              </div>
            )}
        </Card>
      </div>

      {/* ── Historical Trends — Successful vs Failed (30 days) ─────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Historical Trends — Last 30 Days</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Successful vs failed sessions per day with cumulative area overlay</p>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            {[["Completed", LOW], ["Failed", DANGER], ["Awaiting Approval", HIGH]].map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ background: color }} />
                <span style={{ color: MUTED }}>{label}</span>
              </span>
            ))}
          </div>
        </div>
        {isLoading ? <Skeleton lines={5} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LOW} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={LOW} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={DANGER} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={DANGER} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke={LOW} strokeWidth={2}
                fill="url(#gradCompleted)" dot={{ fill: LOW, r: 2 }} />
              <Area type="monotone" dataKey="failed" name="Failed" stroke={DANGER} strokeWidth={2}
                fill="url(#gradFailed)" dot={{ fill: DANGER, r: 2 }} />
              <Line type="monotone" dataKey="pending" name="Awaiting Approval" stroke={HIGH}
                strokeWidth={1.5} dot={{ fill: HIGH, r: 2 }} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Performance Breakdown ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Success rate by day-of-week */}
        <Card className="lg:col-span-2 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Daily Session Volume</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Total sessions initiated per sampled day</p>
          </div>
          {isLoading ? <Skeleton lines={4} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trendData} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" name="Total" fill={CYAN} opacity={0.7} radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Failure type breakdown */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Failure Type Breakdown</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Recurring failure patterns</p>
          </div>
          {isLoading ? <Skeleton lines={4} /> : failureData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="w-8 h-8 mb-2" style={{ color: LOW }} />
              <p className="text-xs font-bold" style={{ color: LOW }}>No failures detected</p>
              <p className="text-[10px] mt-1" style={{ color: MUTED }}>All sessions healthy</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {failureData.map((f, i) => {
                const color = FAILURE_COLORS[i % FAILURE_COLORS.length];
                const maxCount = failureData[0].count;
                return (
                  <div key={f.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold" style={{ color }}>{f.name}</span>
                      <span className="text-[11px] font-black font-mono" style={{ color }}>{f.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(f.count / maxCount) * 100}%`, background: color, boxShadow: `0 0 4px ${color}55` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}