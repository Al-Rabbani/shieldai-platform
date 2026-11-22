import React, { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, Wrench } from "lucide-react";
import { strategySteps } from "@/lib/fixStrategyMatch";

const SEV = {
  critical: "bg-red-500/15 text-red-300 border-red-500/40",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  low: "bg-blue-500/15 text-blue-300 border-blue-500/40",
};

export default function FixStrategyCard({ strategy, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const steps = strategySteps(strategy);
  const validation = String(strategy.validation_steps || "")
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);

  return (
    <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-start gap-2">
        <Wrench size={14} className="text-violet-400 mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">{strategy.title}</p>
            {strategy.severity && (
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${SEV[strategy.severity] || ""}`}>
                {strategy.severity}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">{strategy.vulnerability_type}</p>
        </div>
        <button onClick={() => onEdit(strategy)} className="text-slate-500 hover:text-blue-300 transition" aria-label="Edit strategy">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(strategy)} className="text-slate-500 hover:text-red-400 transition" aria-label="Delete strategy">
          <Trash2 size={13} />
        </button>
      </div>

      {strategy.summary && <p className="text-xs text-slate-300 mt-2">{strategy.summary}</p>}

      <div className="flex flex-wrap items-center gap-1 mt-2">
        {(strategy.tags || []).map((tag) => (
          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{tag}</span>
        ))}
        <span className="ml-auto text-[10px] text-slate-500">reused {strategy.times_reused || 0}×</span>
      </div>

      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-[10px] font-bold text-violet-300 hover:text-violet-200 transition mt-2">
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />} {steps.length} remediation steps
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <ol className="space-y-1">
            {steps.map((step, i) => (
              <li key={i} className="text-[11px] text-slate-300 flex gap-1.5">
                <span className="text-violet-400 font-bold">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {validation.length > 0 && (
            <div>
              <p className="text-[9px] uppercase font-bold text-emerald-400">Verify the fix</p>
              <ul className="space-y-0.5">
                {validation.map((step, i) => (
                  <li key={i} className="text-[11px] text-slate-400">· {step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}