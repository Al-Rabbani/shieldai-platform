import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Grid3x3 } from "lucide-react";
import ControlFailureDetail from "@/components/compliance/ControlFailureDetail";

const FRAMEWORKS = [
  { key: "soc2", label: "SOC 2" },
  { key: "iso27001", label: "ISO 27001" },
  { key: "nist", label: "NIST CSF" },
];

// Literal class-free colours so the heat scale survives any theme change.
// Depth blends how many controls fail with what share of the family fails.
function cellStyle(failing, total, maxFailing) {
  if (!total) return { background: "#0b1220", border: "1px solid #1F2937", color: "#475569" };
  if (failing === 0) return { background: "rgba(16,185,129,0.16)", border: "1px solid rgba(16,185,129,0.45)", color: "#6ee7b7" };
  const share = maxFailing ? failing / maxFailing : 1;
  const ratio = failing / total;
  const intensity = share * 0.6 + ratio * 0.4;
  if (intensity < 0.45) return { background: "rgba(245,158,11,0.18)", border: "1px solid rgba(245,158,11,0.5)", color: "#fcd34d" };
  if (intensity < 0.75) return { background: "rgba(239,68,68,0.28)", border: "1px solid rgba(239,68,68,0.6)", color: "#fca5a5" };
  return { background: "rgba(153,27,27,0.85)", border: "1px solid #ef4444", color: "#fee2e2" };
}

/* The controls route computes `verdict`; it has no `status` field. Reading status made every control read as not
 * failing, so this heatmap drew an all-clear on a real estate. Measured 25 Nov 2026. */
function isFailing(item) {
  return String(item.verdict || item.status || "").toLowerCase() === "fail" || item.status === "incomplete";
}

export default function ControlFailureHeatmap() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.ComplianceChecklistItem.list("-created_date", 500)
      .then((rows) => setItems(rows || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const rows = FRAMEWORKS.map((framework) => {
    const scoped = items.filter((item) => item.framework === framework.key);
    const cells = [];
    scoped.forEach((item) => {
      const category = item.category || "Uncategorised";
      let cell = cells.find((entry) => entry.category === category);
      if (!cell) {
        cell = { category, failing: 0, total: 0 };
        cells.push(cell);
      }
      cell.total += 1;
      if (isFailing(item)) cell.failing += 1;
    });
    return {
      ...framework,
      cells: cells.sort((a, b) => b.failing / b.total - a.failing / a.total),
      failing: scoped.filter((item) => isFailing(item)).length,
      total: scoped.length,
    };
  });

  const maxFailing = Math.max(1, ...rows.flatMap((row) => row.cells.map((cell) => cell.failing)));

  const weakest = rows
    .flatMap((row) => row.cells.filter((cell) => cell.failing > 0).map((cell) => ({ ...cell, framework: row.key, frameworkLabel: row.label })))
    .sort((a, b) => b.failing / b.total - a.failing / a.total)
    .slice(0, 3);

  function failingFor(selection) {
    return items.filter((item) =>
      item.framework === selection.framework &&
      (item.category || "Uncategorised") === selection.category &&
      isFailing(item)
    );
  }

  if (loading) {
    return <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-10" />;
  }
  if (!rows.some((row) => row.total > 0)) {
    return <p className="text-xs text-slate-500 text-center py-8">No control records yet. Map a framework to populate the heatmap.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
        <Grid3x3 size={11} className="text-blue-400" /> Each cell is a control family; the darker the red, the higher the share of failing controls.
      </p>

      {rows.map((row) => (
        <div key={row.key} className="rounded-lg p-2.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-white flex-1">{row.label}</span>
            <span className={`text-[10px] font-bold ${row.failing > 0 ? "text-red-300" : "text-emerald-300"}`}>
              {row.failing} of {row.total} failing
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {row.cells.map((cell) => {
              const active = selected?.framework === row.key && selected?.category === cell.category;
              return (
                <button
                  key={cell.category}
                  onClick={() => setSelected(active ? null : { framework: row.key, category: cell.category })}
                  className={`rounded-md px-2 py-1.5 text-left transition ${active ? "ring-2 ring-blue-400" : ""}`}
                  style={cellStyle(cell.failing, cell.total, maxFailing)}
                >
                  <span className="block text-[10px] font-semibold leading-tight max-w-[128px] truncate">{cell.category}</span>
                  <span className="block text-[10px] font-mono opacity-90">{cell.failing}/{cell.total}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {weakest.length > 0 && (
        <div className="rounded-lg p-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)" }}>
          <p className="text-[10px] font-bold text-red-300 uppercase tracking-wide mb-1">Weakest areas</p>
          {weakest.map((cell) => (
            <p key={`${cell.framework}-${cell.category}`} className="text-[11px] text-slate-300">
              {cell.frameworkLabel} · {cell.category} · {cell.failing}/{cell.total} failing ({Math.round((cell.failing / cell.total) * 100)}%)
            </p>
          ))}
        </div>
      )}

      {selected && (
        <ControlFailureDetail
          title={`${FRAMEWORKS.find((framework) => framework.key === selected.framework)?.label} · ${selected.category}`}
          controls={failingFor(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}