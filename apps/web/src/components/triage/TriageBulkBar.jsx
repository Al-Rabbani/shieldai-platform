import React, { useState } from "react";
import { Bot, BookMarked, CheckCheck, Clock, X, CheckCircle2, Wrench, Tag } from "lucide-react";

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_remediation", label: "In remediation" },
  { value: "fixed", label: "Fixed" },
  { value: "accepted_risk", label: "Accepted risk" },
  { value: "false_positive", label: "False positive" },
];

const FIELD = "px-2 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none";

export default function TriageBulkBar({ count, agents, strategies = [], templates = [], labelOptions = [], busy, onAssign, onStatus, onApplyStrategy, onApplyTemplate, onLabel, onResolve, onSnooze, onClear }) {
  const [agentId, setAgentId] = useState("");
  const [status, setStatus] = useState("");
  const [strategyId, setStrategyId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [label, setLabel] = useState("");

  return (
    <div className="rounded-xl p-3 flex flex-wrap items-center gap-2" style={{ background: "#0f1a2e", border: "1px solid #2563eb" }}>
      <span className="text-[11px] font-bold text-white">{count} selected</span>

      <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <Bot size={12} className="text-blue-400" />
        <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={FIELD} aria-label="Assign to agent">
          <option value="">Assign to agent…</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.display_name || agent.name}</option>
          ))}
        </select>
      </label>
      <button
        onClick={() => { onAssign(agentId); setAgentId(""); }}
        disabled={busy || !agentId}
        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-40"
      >
        Assign
      </button>

      <span className="w-px h-5 bg-slate-700 hidden sm:block" />

      <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD} aria-label="Set status">
        <option value="">Set status…</option>
        {STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button
        onClick={() => { onStatus(status); setStatus(""); }}
        disabled={busy || !status}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition disabled:opacity-40"
      >
        <CheckCheck size={11} /> Apply status
      </button>

      <span className="w-px h-5 bg-slate-700 hidden sm:block" />

      <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <Wrench size={12} className="text-purple-400" />
        <select value={strategyId} onChange={(e) => setStrategyId(e.target.value)} className={FIELD} aria-label="Apply fix strategy">
          <option value="">Apply fix strategy…</option>
          {strategies.map((strategy) => (
            <option key={strategy.id} value={strategy.id}>{strategy.title}</option>
          ))}
        </select>
      </label>
      <button
        onClick={() => { onApplyStrategy(strategyId); setStrategyId(""); }}
        disabled={busy || !strategyId}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition disabled:opacity-40"
        title="Send every selected finding into remediation with this fix"
      >
        <Wrench size={11} /> Apply to all
      </button>

      <span className="w-px h-5 bg-slate-700 hidden sm:block" />

      <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <BookMarked size={12} className="text-violet-400" />
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={FIELD} aria-label="Apply remediation template">
          <option value="">Apply template…</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>{template.template_name}</option>
          ))}
        </select>
      </label>
      <button
        onClick={() => { onApplyTemplate(templateId); setTemplateId(""); }}
        disabled={busy || !templateId}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 transition disabled:opacity-40"
        title="Attach this pre-approved remediation template and move every selected finding into remediation"
      >
        <BookMarked size={11} /> Apply template
      </button>

      <span className="w-px h-5 bg-slate-700 hidden sm:block" />

      <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <Tag size={12} className="text-sky-400" />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && label.trim()) { onLabel(label); setLabel(""); } }}
          list="triage-label-options"
          placeholder="Label…"
          aria-label="Label to add to the selected findings"
          className={`${FIELD} w-28`}
        />
        <datalist id="triage-label-options">
          {labelOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
      </label>
      <button
        onClick={() => { onLabel(label); setLabel(""); }}
        disabled={busy || !label.trim()}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 transition disabled:opacity-40"
        title="Add this label to every selected finding"
      >
        <Tag size={11} /> Apply label
      </button>

      <span className="w-px h-5 bg-slate-700 hidden sm:block" />

      <button
        onClick={onResolve}
        disabled={busy}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-40"
        title="Mark every selected finding as fixed"
      >
        <CheckCircle2 size={11} /> Resolve
      </button>
      <button
        onClick={onSnooze}
        disabled={busy}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition disabled:opacity-40"
        title="Hide the selected findings from the queue for 7 days"
      >
        <Clock size={11} /> Snooze 7d
      </button>

      <button onClick={onClear} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-200 ml-auto">
        <X size={11} /> Clear
      </button>
    </div>
  );
}