import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

export function StatTile({ label, value, subtitle, color = "" }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? "—"}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

export function StatTileSkeleton() {
  return <div className="animate-pulse rounded-xl bg-muted h-20" />;
}

export function StatusBanner({ status }) {
  if (!status) return null;
  const cfg = {
    CRITICAL: { cls: "bg-destructive/10 border-destructive/30 text-destructive", text: "🔴 CRITICAL — Immediate action required" },
    HIGH:     { cls: "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400", text: "🟠 HIGH — Action required within 24h" },
    NORMAL:   { cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400", text: "✅ NORMAL — Posture controlled" },
  }[status] || { cls: "bg-muted border-border text-muted-foreground", text: status };
  return <div className={`rounded-xl border px-4 py-3 text-sm font-semibold mb-5 ${cfg.cls}`}>{cfg.text}</div>;
}

export function AgentLog({ entities_read, duration_ms }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 border rounded-xl">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:bg-accent rounded-xl transition">
        <span>Agent Execution Log</span><span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1">
          <p className="text-xs text-muted-foreground">Entities read: {(entities_read || []).join(", ") || "N/A"}</p>
          <p className="text-xs text-muted-foreground">Duration: {duration_ms}ms</p>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ branch, title, agentName, onRun, running }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${branch === "defensive" ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>
          {branch === "defensive" ? "🛡️ DEFENSIVE" : "⚔️ OFFENSIVE"}
        </span>
        <h1 className="text-2xl font-bold mt-1">{title}</h1>
        <p className="text-sm text-muted-foreground">Powered by {agentName}</p>
      </div>
      <button onClick={onRun} disabled={running}
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition flex items-center gap-2">
        {running
          ? <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60 20" /></svg> Running...</>
          : "▶ Run Now"}
      </button>
    </div>
  );
}

export function RestrictedBanner() {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-5">
      ⚠️ Authorized Operations Only — Human Approval Required
    </div>
  );
}

export function useAgentPage(agentId, task) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [entitiesRead, setEntitiesRead] = useState([]);
  const [durationMs, setDurationMs] = useState(null);
  const [agentName, setAgentName] = useState("AI Agent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const run = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const started = performance.now();
      const d = await base44.platform.agentPage(task, agentId);
      /* A key the route could not measure arrives in _absent. Rendering it as 0 would turn "never measured" into
       * "measured, and none" - the exact fabrication these pages used to commit. An em dash cannot be mistaken for a
       * count, and StatTile prints it as-is. */
      const payload = { ...(d || {}) };
      /* Scalars the route could not measure become an em dash; collections are left out so the page's own
       * `(data?.x || [])` default applies. Putting a dash into a collection made .map() throw and blanked the page. */
      for (const key of payload._absent?.scalar || []) {
        if (payload[key] === undefined) payload[key] = "—";
      }
      /* Collections the route could not measure arrive as empty arrays: omitting them made a page that reads
       * `data?.top_alerts.length` throw and blank itself. The page's headline and basis line say why the list is empty,
       * so an empty list here is not a claim that nothing was found. */
      for (const key of payload._absent?.list || []) {
        if (payload[key] === undefined) payload[key] = [];
      }
      setData(payload);
      setStatus(payload.status ?? null);
      setEntitiesRead(payload._basis ? [payload._basis] : []);
      setDurationMs(Math.round(performance.now() - started));
      setAgentName("Register read");
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [agentId, task]);

  useEffect(() => { run(); }, [run]);

  return { data, status, entitiesRead, durationMs, agentName, loading, error, run };
}