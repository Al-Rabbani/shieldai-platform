import React, { useState } from "react";
import { X } from "lucide-react";

const EMPTY = {
  title: "",
  vulnerability_type: "",
  severity: "high",
  tags: "",
  summary: "",
  remediation_steps: "",
  validation_steps: "",
  is_published: true,
};

const inputClass =
  "px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none";

export default function FixStrategyForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(() =>
    initial
      ? { ...EMPTY, ...initial, tags: (initial.tags || []).join(", ") }
      : EMPTY
  );

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.vulnerability_type.trim()) return;
    await onSave({
      title: form.title.trim(),
      vulnerability_type: form.vulnerability_type.trim(),
      severity: form.severity,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      summary: form.summary,
      remediation_steps: form.remediation_steps,
      validation_steps: form.validation_steps,
      is_published: form.is_published,
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">{initial ? "Edit strategy" : "New fix strategy"}</p>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Fix name *" className={inputClass} required />
        <input value={form.vulnerability_type} onChange={(e) => set("vulnerability_type", e.target.value)} placeholder="Vulnerability type / CWE / CVE *" className={inputClass} required />
        <select value={form.severity} onChange={(e) => set("severity", e.target.value)} className={inputClass}>
          {["critical", "high", "medium", "low"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Tags, comma separated" className={inputClass} />
        <input value={form.summary} onChange={(e) => set("summary", e.target.value)} placeholder="One-line summary" className={`${inputClass} md:col-span-2`} />
        <textarea value={form.remediation_steps} onChange={(e) => set("remediation_steps", e.target.value)} rows={4} placeholder="Remediation steps, one per line" className={`${inputClass} md:col-span-2`} />
        <textarea value={form.validation_steps} onChange={(e) => set("validation_steps", e.target.value)} rows={2} placeholder="How to verify the fix worked, one per line" className={`${inputClass} md:col-span-2`} />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold bg-violet-500 text-white hover:bg-violet-600 transition disabled:opacity-50">
          {initial ? "Save changes" : "Add to library"}
        </button>
        <label className="flex items-center gap-2 text-[11px] text-slate-400">
          <input type="checkbox" checked={form.is_published} onChange={(e) => set("is_published", e.target.checked)} />
          Recommend in the triage fix panel
        </label>
      </div>
    </form>
  );
}