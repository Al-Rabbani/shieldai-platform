import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, ShieldAlert, FileWarning } from "lucide-react";

const TRACKED = [
  { key: "soc2", label: "SOC 2 Type II", accent: "#3b82f6" },
  { key: "iso27001", label: "ISO/IEC 27001", accent: "#10b981" },
  { key: "nist", label: "NIST CSF 2.0", accent: "#a855f7" },
];

// A control passes only when it is complete and its evidence is on file.
function stateOf(item) {
  if (item.status === "complete" && !item.evidence_missing) return "passing";
  if (item.evidence_missing) return "needs_evidence";
  return "failing";
}

export default function FrameworkProgressTracker() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    base44.entities.ComplianceChecklistItem.list("-created_date", 300)
      .then((rows) => { if (active) { setItems(rows || []); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });

    const unsubscribe = base44.entities.ComplianceChecklistItem.subscribe((event) => {
      const record = event.data || {};
      setItems((prev) => {
        if (event.type === "create") return prev.some((i) => i.id === record.id) ? prev : [record, ...prev];
        if (event.type === "update") return prev.map((i) => (i.id === record.id ? { ...i, ...record } : i));
        if (event.type === "delete") return prev.filter((i) => i.id !== record.id);
        return prev;
      });
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const progress = useMemo(
    () => TRACKED.map((framework) => {
      const rows = items.filter((item) => item.framework === framework.key);
      const passing = rows.filter((item) => stateOf(item) === "passing").length;
      const needsEvidence = rows.filter((item) => stateOf(item) === "needs_evidence").length;
      const failing = rows.length - passing;
      const pct = rows.length ? Math.round((passing / rows.length) * 100) : 0;
      return { ...framework, total: rows.length, passing, failing, needsEvidence, pct, failPct: rows.length ? 100 - pct : 0 };
    }),
    [items]
  );

  if (loading) {
    return <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-8" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {progress.map((framework) => (
        <div key={framework.key} className="rounded-xl p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: `3px solid ${framework.accent}` }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-white">{framework.label}</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: framework.accent, borderColor: `${framework.accent}55`, background: `${framework.accent}15` }}>
              {framework.pct}% passing
            </span>
          </div>

          {framework.total === 0 ? (
            <p className="text-[11px] text-slate-500 mt-2">No controls tracked yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <ShieldCheck size={12} /> {framework.pct}% passing ({framework.passing})
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                  <ShieldAlert size={12} /> {framework.failPct}% failing ({framework.failing})
                </span>
              </div>

              <div className="flex h-2 rounded-full overflow-hidden mt-2" style={{ background: "#1F2937" }}>
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${framework.pct}%` }} />
                <div className="h-full bg-red-500 transition-all" style={{ width: `${framework.failPct}%` }} />
              </div>

              <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                <FileWarning size={10} /> {framework.needsEvidence} of the {framework.failing} failing need evidence · {framework.total} controls
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}