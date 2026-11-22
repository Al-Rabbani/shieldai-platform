import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Save, X } from "lucide-react";

const SEVERITIES = ["critical", "high", "medium", "low"];
const EFFORT = ["< 1 hour", "1-4 hours", "4-8 hours", "1-2 days", "> 2 days"];

export default function RemediationTemplateForm({ onCancel, onSaved }) {
  const [form, setForm] = useState({
    template_name: "",
    vulnerability_type: "",
    severity: "high",
    description: "",
    remediation_steps: "",
    testing_guidance: "",
    estimated_effort: "1-4 hours",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const field = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function save() {
    if (!form.template_name.trim() || !form.remediation_steps.trim()) {
      setError("A template needs a name and remediation steps.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await base44.entities.RemediationTemplate.create({ ...form, is_active: true, usage_count: 0 });
      await onSaved();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  const inputClass = "w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-violet-500 outline-none";

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #8b5cf6" }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300">New remediation template</p>
        <button onClick={onCancel} className="text-slate-500 hover:text-white"><X size={13} /></button>
      </div>

      {error && <p className="text-[10px] text-red-300">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={form.template_name} onChange={field("template_name")} placeholder="Template name" className={inputClass} />
        <input value={form.vulnerability_type} onChange={field("vulnerability_type")} placeholder="Vulnerability type (e.g. CWE-89, Log4Shell)" className={inputClass} />
        <select value={form.severity} onChange={field("severity")} className={inputClass}>
          {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
        </select>
        <select value={form.estimated_effort} onChange={field("estimated_effort")} className={inputClass}>
          {EFFORT.map((effort) => <option key={effort} value={effort}>{effort}</option>)}
        </select>
      </div>

      <input value={form.description} onChange={field("description")} placeholder="When to use this fix" className={inputClass} />
      <textarea value={form.remediation_steps} onChange={field("remediation_steps")} rows={4} placeholder="Remediation steps, one per line" className={inputClass} />
      <input value={form.testing_guidance} onChange={field("testing_guidance")} placeholder="How to verify the fix worked" className={inputClass} />

      <button onClick={save} disabled={saving} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-violet-500 text-white hover:bg-violet-600 transition disabled:opacity-40">
        <Save size={11} /> {saving ? "Saving…" : "Save template"}
      </button>
    </div>
  );
}