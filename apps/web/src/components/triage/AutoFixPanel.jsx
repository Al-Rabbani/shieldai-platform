import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronDown, ChevronUp, ClipboardCheck, Wand2 } from "lucide-react";
import { recommendationFor } from "@/lib/fixRecommendations";
import { loadFixStrategies, matchStrategies, strategySteps } from "@/lib/fixStrategyMatch";

export default function AutoFixPanel({ finding, saving, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [library, setLibrary] = useState([]);
  const { summary, steps, slaHours } = useMemo(() => recommendationFor(finding), [finding]);
  const strategy = useMemo(() => matchStrategies(finding, library)[0] || null, [finding, library]);

  useEffect(() => {
    let live = true;
    loadFixStrategies().then((rows) => { if (live) setLibrary(rows || []); });
    return () => { live = false; };
  }, []);

  async function setNextAction() {
    await onUpdate(finding.id, { next_action_item: summary });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function saveSteps() {
    await onUpdate(finding.id, { remediation_notes: steps.join("\n") });
  }

  async function attachStrategy(selected) {
    await onUpdate(finding.id, {
      remediation_notes: strategySteps(selected).join("\n"),
      next_action_item: selected.summary || summary,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 text-[10px] font-bold text-violet-300 hover:text-violet-200 transition"
        aria-expanded={open}
      >
        <Wand2 size={11} /> Recommended fix
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg p-2.5 space-y-1.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <p className="text-[10px] text-slate-400">
            {summary} · target within {slaHours}h
          </p>
          <ol className="space-y-1">
            {steps.map((step, index) => (
              <li key={step} className="text-[10px] text-slate-300 flex gap-1.5">
                <span className="text-violet-400 font-bold">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {strategy && (
            <div className="rounded-lg p-2 space-y-1" style={{ background: "#0f172e", border: "1px solid #4c1d95" }}>
              <p className="text-[10px] font-bold text-violet-300 flex items-center gap-1">
                <BookOpen size={10} /> Library fix · {strategy.title}
              </p>
              <ol className="space-y-0.5">
                {strategySteps(strategy).slice(0, 3).map((step, index) => (
                  <li key={index} className="text-[10px] text-slate-300 flex gap-1.5">
                    <span className="text-violet-400 font-bold">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => attachStrategy(strategy)}
                  disabled={saving}
                  className="px-2 py-1 rounded text-[10px] font-bold bg-violet-500/20 text-violet-200 border border-violet-500/40 hover:bg-violet-500/30 transition disabled:opacity-40"
                >
                  Attach these steps
                </button>
                <Link to="/fix-library" className="text-[10px] font-bold text-slate-400 hover:text-slate-200">Open library</Link>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              onClick={setNextAction}
              disabled={saving || finding.next_action_item === summary}
              className="px-2 py-1 rounded text-[10px] font-bold bg-violet-500/20 text-violet-200 border border-violet-500/40 hover:bg-violet-500/30 transition disabled:opacity-40"
            >
              {saved ? "Next action set" : "Set as next action"}
            </button>
            <button
              onClick={saveSteps}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-slate-700/40 text-slate-300 border border-slate-700 hover:bg-slate-700/60 transition disabled:opacity-40"
            >
              <ClipboardCheck size={10} /> Save steps to notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}