import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, FileWarning } from "lucide-react";

const FRAMEWORKS = [
  { key: "soc2", label: "SOC 2 Type II", accent: "#3b82f6" },
  { key: "iso27001", label: "ISO/IEC 27001:2022", accent: "#10b981" },
  { key: "nist", label: "NIST CSF 2.0", accent: "#8b5cf6" },
];

const STATUS_FILTERS = [
  { key: "all", label: "All controls" },
  { key: "passing", label: "Passing" },
  { key: "needs_evidence", label: "Needs evidence" },
  { key: "not_implemented", label: "Not implemented" },
];

function controlState(item) {
  if (item.status === "complete" && !item.evidence_missing) return "passing";
  if (item.evidence_missing) return "needs_evidence";
  return "not_implemented";
}

export default function FrameworkTrackingPage() {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState("soc2");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  const load = useCallback(async () => {
    const rows = await base44.entities.ComplianceChecklistItem.list("-created_date", 300).catch(() => []);
    setItems(rows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { base44.auth.me().then((u) => setUserEmail(u?.email || null)).catch(() => null); }, []);

  async function toggleStatus(item) {
    const next = item.status === "complete" ? "incomplete" : "complete";
    setSavingId(item.id);
    setError(null);
    try {
      await base44.entities.ComplianceChecklistItem.update(item.id, {
        status: next,
        completed_at: next === "complete" ? new Date().toISOString() : null,
        completed_by: next === "complete" ? userEmail : null,
      });
      setItems((prev) => prev.map((row) => (row.id === item.id
        ? { ...row, status: next, completed_at: next === "complete" ? new Date().toISOString() : null, completed_by: next === "complete" ? userEmail : null }
        : row)));
    } catch (e) {
      setError(e.message);
    }
    setSavingId(null);
  }

  async function toggleEvidence(item) {
    const next = !item.evidence_missing;
    setSavingId(item.id);
    setError(null);
    try {
      await base44.entities.ComplianceChecklistItem.update(item.id, { evidence_missing: next });
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, evidence_missing: next } : row)));
    } catch (e) {
      setError(e.message);
    }
    setSavingId(null);
  }

  const progressFor = (key) => {
    const rows = items.filter((i) => i.framework === key);
    const done = rows.filter((i) => i.status === "complete").length;
    const passing = rows.filter((i) => controlState(i) === "passing").length;
    return { rows, done, passing, total: rows.length, pct: rows.length ? Math.round((passing / rows.length) * 100) : 0 };
  };

  const overall = {
    total: items.length,
    passing: items.filter((i) => controlState(i) === "passing").length,
    needsEvidence: items.filter((i) => controlState(i) === "needs_evidence").length,
    notImplemented: items.filter((i) => controlState(i) === "not_implemented").length,
  };

  const activeItems = progressFor(active).rows
    .filter((i) => statusFilter === "all" || controlState(i) === statusFilter)
    .slice()
    .sort((a, b) => (a.control_ref || "").localeCompare(b.control_ref || ""));
  const missingEvidence = progressFor(active).rows.filter((i) => i.evidence_missing);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3">
        <ShieldCheck size={24} className="text-blue-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Framework Compliance Tracking</h1>
          <p className="text-xs text-slate-500">SOC 2 and ISO 27001 control progress, missing evidence and checklists</p>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-[10px] uppercase text-slate-500">Controls tracked</p>
          <p className="text-xl font-bold text-white font-mono">{overall.total}</p>
          <p className="text-[10px] text-slate-500">across 3 frameworks</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #10b98140" }}>
          <p className="text-[10px] uppercase text-slate-500">Passing</p>
          <p className="text-xl font-bold text-emerald-400 font-mono">{overall.passing}</p>
          <p className="text-[10px] text-slate-500">complete with evidence on file</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #f59e0b40" }}>
          <p className="text-[10px] uppercase text-slate-500">Needs evidence</p>
          <p className="text-xl font-bold text-amber-400 font-mono">{overall.needsEvidence}</p>
          <p className="text-[10px] text-slate-500">{overall.notImplemented} not yet implemented</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FRAMEWORKS.map((fw) => {
          const progress = progressFor(fw.key);
          return (
            <button
              key={fw.key}
              onClick={() => setActive(fw.key)}
              className="text-left rounded-xl p-4 transition"
              style={{ background: "#111827", border: `1px solid ${active === fw.key ? fw.accent + "80" : "#1F2937"}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-white">{fw.label}</p>
                <span className="text-lg font-bold font-mono" style={{ color: fw.accent }}>{progress.pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "#1F2937" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress.pct}%`, background: fw.accent }} />
              </div>
              <p className="text-[11px] text-slate-400">
                {progress.passing} of {progress.total} passing · {progress.rows.filter((i) => i.evidence_missing).length} need evidence
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2 mb-3">
          <FileWarning size={15} className="text-amber-400" />
          <h2 className="text-sm font-bold text-white">Missing evidence — {FRAMEWORKS.find((f) => f.key === active)?.label}</h2>
        </div>
        {missingEvidence.length === 0 ? (
          <p className="text-xs text-slate-500">Every control in this framework has its evidence on file.</p>
        ) : (
          <div className="space-y-1.5">
            {missingEvidence.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: "3px solid #f59e0b" }}>
                <span className="text-[10px] font-mono font-bold text-amber-400">{item.control_ref}</span>
                <span className="text-xs text-white">{item.title}</span>
                <span className="text-[11px] text-slate-400 ml-auto">{item.missing_evidence || "Evidence artifact not yet collected"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm font-bold text-white">Controls — {FRAMEWORKS.find((f) => f.key === active)?.label}</h2>
          <span className="text-[10px] text-slate-500">Ticking a control records who completed it and when</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${statusFilter === filter.key ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200"}`}
            >
              {filter.label} · {filter.key === "all" ? progressFor(active).total : progressFor(active).rows.filter((i) => controlState(i) === filter.key).length}
            </button>
          ))}
        </div>
        {activeItems.length === 0 ? (
          <p className="text-xs text-slate-500">No controls defined for this framework yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {activeItems.map((item) => (
              <div key={item.id} className="py-2 flex items-start gap-3">
                <div className="pt-0.5">
                  <Checkbox
                    checked={item.status === "complete"}
                    onCheckedChange={() => toggleStatus(item)}
                    disabled={savingId === item.id}
                    aria-label={`Mark ${item.control_ref} complete`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{item.control_ref}</span>
                    <span className={`text-xs font-medium ${item.status === "complete" ? "text-slate-400 line-through" : "text-white"}`}>{item.title}</span>
                    {item.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400">{item.category}</span>}
                  </div>
                  {item.requirement && <p className="text-[11px] text-slate-500 mt-0.5">{item.requirement}</p>}
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {item.status === "complete"
                      ? `Completed${item.completed_by ? ` by ${item.completed_by}` : ""}${item.completed_at ? ` · ${new Date(item.completed_at).toLocaleDateString()}` : ""}`
                      : "Not complete"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${controlState(item) === "passing" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : controlState(item) === "needs_evidence" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-slate-500/15 text-slate-300 border-slate-500/30"}`}>
                    {controlState(item) === "passing" ? "Passing" : controlState(item) === "needs_evidence" ? "Needs evidence" : "Not implemented"}
                  </span>
                  <button
                    onClick={() => toggleEvidence(item)}
                    disabled={savingId === item.id}
                    className={`text-[10px] font-bold px-2 py-1 rounded-full border ${item.evidence_missing ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"}`}
                  >
                    {item.evidence_missing ? "Evidence missing" : "Evidence on file"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}