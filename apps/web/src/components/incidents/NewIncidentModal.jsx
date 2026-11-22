import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function NewIncidentModal({ initialValues, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", incident_type: "", severity: "high", description: "",
    financial_impact_usd: 0, affected_assets: "", ...initialValues,
  });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await base44.entities.Incident.create({
      title: form.title, incident_type: form.incident_type || "other", severity: form.severity,
      status: "investigating", description: form.description,
      financial_impact_usd: Number(form.financial_impact_usd) || 0,
      affected_assets: form.affected_assets ? form.affected_assets.split(",").map(s => s.trim()).filter(Boolean) : [],
      opened_at: new Date().toISOString(),
    }).catch(() => {});
    setSaving(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl p-6 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }} onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white">{initialValues?.severity === "critical" ? "⚡ Declare Major Incident" : "+ New Incident"}</h3>
        <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Incident title" className="w-full rounded-lg px-3 py-2 text-sm bg-slate-900 border border-slate-700 text-white" />
        <input value={form.incident_type} onChange={e => setForm(f => ({ ...f, incident_type: e.target.value }))} placeholder="Incident type (e.g. ransomware)" className="w-full rounded-lg px-3 py-2 text-sm bg-slate-900 border border-slate-700 text-white" />
        <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm bg-slate-900 border border-slate-700 text-white">
          <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={3} className="w-full rounded-lg px-3 py-2 text-sm bg-slate-900 border border-slate-700 text-white" />
        <input type="number" value={form.financial_impact_usd} onChange={e => setForm(f => ({ ...f, financial_impact_usd: e.target.value }))} placeholder="Financial impact (USD)" className="w-full rounded-lg px-3 py-2 text-sm bg-slate-900 border border-slate-700 text-white" />
        <input value={form.affected_assets} onChange={e => setForm(f => ({ ...f, affected_assets: e.target.value }))} placeholder="Affected assets (comma separated)" className="w-full rounded-lg px-3 py-2 text-sm bg-slate-900 border border-slate-700 text-white" />
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50">{saving ? "Creating..." : "Create Incident"}</button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Cancel</button>
        </div>
      </form>
    </div>
  );
}