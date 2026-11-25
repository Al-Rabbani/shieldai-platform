import { useEffect, useState, useCallback } from "react";
import base44 from "@/api/base44Client";
import { ShieldCheck, FileWarning } from "lucide-react";

/**
 * Control verdicts come from the platform's assessment engine (compliance_assessments: 103 pass, 23 fail,
 * 178 not tested, 11 not applicable across 297 catalogued controls). This page reads those verdicts.
 *
 * It used to render a checkbox per control that wrote status "complete"/"incomplete" to a table the platform
 * does not have, over a hardcoded three-framework list (soc2, iso27001, nist) that does not match the platform's
 * own keys (soc2_type2, iso27001, nist_csf, cis_v8, dora, hipaa, nis2, nist_ai_rmf, pci_dss). A tick there
 * claimed to change compliance state; it changed nothing anywhere. The frameworks are now the ones the estate
 * actually holds and the state is the engine's verdict, not a manual flag.
 */

const ACCENTS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#f97316"];

const LABELS = {
  soc2_type2: "SOC 2 Type II",
  soc2: "SOC 2 Type II",
  iso27001: "ISO/IEC 27001:2022",
  nist_csf: "NIST CSF 2.0",
  nist_ai_rmf: "NIST AI RMF",
  nist: "NIST CSF 2.0",
  cis_v8: "CIS Controls v8",
  dora: "DORA (EU) 2022/2554",
  hipaa: "HIPAA Security Rule",
  nis2: "NIS2 Directive",
  pci_dss: "PCI DSS",
};

const STATUS_FILTERS = [
  { key: "all", label: "All controls" },
  { key: "passing", label: "Passing" },
  { key: "needs_evidence", label: "Not tested" },
  { key: "not_implemented", label: "Failing" },
  { key: "not_applicable", label: "Not applicable" },
];

/* The engine's verdict, not a checkbox. */
function controlState(item) {
  /* The route computes `verdict` (pass | fail | not_tested | not_applicable) and has no `status` field at all.
   * Reading item.status here made every one of the 297 real controls fall through to "needs_evidence", so the page
   * reported 0% passing on an estate that has verdicts. Measured 25 Nov 2026. */
  const verdict = String(item.verdict || item.status || "").toLowerCase();
  if (verdict === "pass") return "passing";
  if (verdict === "fail") return "not_implemented";
  if (verdict === "not_applicable") return "not_applicable";
  return "needs_evidence";
}

function frameworkLabel(key) {
  return LABELS[key] || key;
}

export default function FrameworkTrackingPage() {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await base44.entities.ComplianceChecklistItem.list("-created_date", 300).catch(() => []);
    setItems(rows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const frameworks = Array.from(new Set(items.map((i) => i.framework).filter(Boolean))).sort();
  const current = active && frameworks.includes(active) ? active : frameworks[0] || null;

  const progressFor = (key) => {
    const rows = items.filter((i) => i.framework === key);
    const passing = rows.filter((i) => controlState(i) === "passing").length;
    const failing = rows.filter((i) => controlState(i) === "not_implemented").length;
    const untested = rows.filter((i) => controlState(i) === "needs_evidence").length;
    const excluded = rows.filter((i) => controlState(i) === "not_applicable").length;
    const applicable = rows.length - excluded;
    return {
      rows, passing, failing, untested, excluded, applicable, total: rows.length,
      pct: applicable ? Math.round((passing / applicable) * 100) : 0,
    };
  };

  const overall = {
    total: items.length,
    passing: items.filter((i) => controlState(i) === "passing").length,
    needsEvidence: items.filter((i) => controlState(i) === "needs_evidence").length,
    notImplemented: items.filter((i) => controlState(i) === "not_implemented").length,
  };

  const activeProgress = current ? progressFor(current) : { rows: [], total: 0, passing: 0, pct: 0 };
  const activeItems = activeProgress.rows
    .filter((i) => statusFilter === "all" || controlState(i) === statusFilter)
    .slice()
    .sort((a, b) => (a.control_ref || "").localeCompare(b.control_ref || ""));
  const untested = activeProgress.rows.filter((i) => controlState(i) === "needs_evidence");

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
          <p className="text-xs text-slate-500">
            Control verdicts from the assessment engine · {frameworks.length} frameworks catalogued
          </p>
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-400">
          No control verdicts are stored for this estate. An empty page here is an absence, not a pass.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-[10px] uppercase text-slate-500">Controls tracked</p>
          <p className="text-xl font-bold text-white font-mono">{overall.total}</p>
          <p className="text-[10px] text-slate-500">across {frameworks.length} frameworks</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #10b98140" }}>
          <p className="text-[10px] uppercase text-slate-500">Passing</p>
          <p className="text-xl font-bold text-emerald-400 font-mono">{overall.passing}</p>
          <p className="text-[10px] text-slate-500">engine verdict: pass</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #f59e0b40" }}>
          <p className="text-[10px] uppercase text-slate-500">Not tested</p>
          <p className="text-xl font-bold text-amber-400 font-mono">{overall.needsEvidence}</p>
          <p className="text-[10px] text-slate-500">{overall.notImplemented} failing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {frameworks.map((key, index) => {
          const progress = progressFor(key);
          const accent = ACCENTS[index % ACCENTS.length];
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="text-left rounded-xl p-4 transition"
              style={{ background: "#111827", border: `1px solid ${current === key ? accent + "80" : "#1F2937"}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-white">{frameworkLabel(key)}</p>
                <span className="text-lg font-bold font-mono" style={{ color: accent }}>{progress.pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "#1F2937" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress.pct}%`, background: accent }} />
              </div>
              <p className="text-[11px] text-slate-400">
                {progress.passing} of {progress.applicable ?? progress.total} applicable passing · {progress.untested} not tested ·{" "}
                {progress.failing} failing{progress.excluded ? ` · ${progress.excluded} not applicable` : ""}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2 mb-3">
          <FileWarning size={15} className="text-amber-400" />
          <h2 className="text-sm font-bold text-white">Not tested — {frameworkLabel(current)}</h2>
        </div>
        {untested.length === 0 ? (
          <p className="text-xs text-slate-500">
            {activeProgress.rows.length === 0
              ? "This framework holds no catalogued controls."
              : "Every control in this framework has an engine verdict."}
          </p>
        ) : (
          <div className="space-y-1.5">
            {untested.slice(0, 20).map((item) => (
              <div
                key={item.id || item.control_ref}
                className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: "3px solid #f59e0b" }}
              >
                <span className="text-[10px] font-mono font-bold text-amber-400">{item.control_ref}</span>
                <span className="text-xs text-white">{item.title}</span>
                <span className="text-[11px] text-slate-400 ml-auto">
                  {item.severity ? `${item.severity} · ` : ""}no assessment recorded
                </span>
              </div>
            ))}
            {untested.length > 20 && (
              <p className="text-[11px] text-slate-500">and {untested.length - 20} more not tested</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-white">{frameworkLabel(current)} controls</h2>
          <div className="flex flex-wrap gap-1.5 ml-auto">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${statusFilter === filter.key ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200"}`}
              >
                {filter.label} ·{" "}
                {filter.key === "all"
                  ? activeProgress.total
                  : activeProgress.rows.filter((i) => controlState(i) === filter.key).length}
              </button>
            ))}
          </div>
        </div>
        {activeItems.length === 0 ? (
          <p className="text-xs text-slate-500">No control matches this filter.</p>
        ) : (
          <div className="space-y-1.5">
            {activeItems.map((item) => {
              const state = controlState(item);
              const colour = state === "passing" ? "#10b981" : state === "not_implemented" ? "#ef4444" : state === "not_applicable" ? "#64748b" : "#f59e0b";
              return (
                <div
                  key={item.id || item.control_ref}
                  className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: `3px solid ${colour}` }}
                >
                  <span className="text-[10px] font-mono font-bold" style={{ color: colour }}>{item.control_ref}</span>
                  <span className="text-xs text-white">{item.title}</span>
                  {item.severity && <span className="text-[10px] text-slate-500">{item.severity}</span>}
                  <span className="text-[10px] font-bold ml-auto" style={{ color: colour }}>
                    {String(item.status || "not_tested").replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
