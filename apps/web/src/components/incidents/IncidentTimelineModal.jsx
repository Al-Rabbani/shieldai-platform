import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AbsentStore from "@/components/platform/AbsentStore";

const EVENT_TYPES = ["detection", "triage", "containment", "eradication", "recovery", "notification", "escalation", "other"];
const EVENT_META = {
  detection: { icon: "🔎", color: "#3b82f6" },
  triage: { icon: "⚡", color: "#f59e0b" },
  containment: { icon: "🛡️", color: "#f97316" },
  eradication: { icon: "🧹", color: "#ef4444" },
  recovery: { icon: "🔁", color: "#10b981" },
  notification: { icon: "📧", color: "#8b5cf6" },
  escalation: { icon: "🚨", color: "#ef4444" },
  other: { icon: "📌", color: "#64748b" },
};

export default function IncidentTimelineModal({ incident, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ event_type: "other", title: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!incident) return;
    setLoading(true);
    base44.entities.IncidentTimeline.filter({ incident_id: incident.id }, "timestamp", 200)
      .then(setEvents).catch(() => setEvents([])).finally(() => setLoading(false));
  }, [incident]);

  async function addEvent(e) {
    e.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    const me = await base44.auth.me().catch(() => null);
    const entry = await base44.entities.IncidentTimeline.create({
      incident_id: incident.id, event_type: form.event_type, title: form.title.trim(),
      description: form.description.trim(), timestamp: new Date().toISOString(),
      actor: me?.full_name || "Responder", actor_type: "human",
    }).catch(() => null);
    if (entry) setEvents(prev => [...prev, entry]);
    setForm({ event_type: "other", title: "", description: "" });
    setShowForm(false);
    setSaving(false);
  }

  if (!incident) return null;
  const sorted = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6" style={{ background: "#111827", border: "1px solid #1F2937" }} onClick={e => e.stopPropagation()}>
        <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">Investigation Timeline</p>
        <h3 className="text-lg font-bold text-white mb-4">{incident.title}</h3>

        {loading ? (
          <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-8" />
        ) : sorted.length === 0 ? (
          <AbsentStore entity="IncidentTimeline" what="Incident phases:" />
        ) : (
          <div className="space-y-0">
            {sorted.map((ev, i) => {
              const meta = EVENT_META[ev.event_type] || EVENT_META.other;
              const isOpen = expandedId === ev.id;
              return (
                <div key={ev.id || i} className="flex gap-3 pb-4 relative">
                  <div className="flex flex-col items-center">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}>{meta.icon}</span>
                    {i < sorted.length - 1 && <span className="w-px flex-1 mt-1" style={{ background: "#1F2937" }} />}
                  </div>
                  <button className="flex-1 text-left" onClick={() => setExpandedId(isOpen ? null : ev.id)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-200">{ev.title}</span>
                      <span className="text-[10px] text-slate-500 flex-shrink-0">{new Date(ev.timestamp).toLocaleString()}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold" style={{ color: meta.color }}>{ev.event_type}</span>
                    {ev.actor && <span className="text-[10px] text-slate-600 ml-2">by {ev.actor}</span>}
                    {isOpen && ev.description && <p className="text-xs text-slate-400 mt-2">{ev.description}</p>}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {showForm ? (
          <form onSubmit={addEvent} className="mt-3 space-y-2 rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
            <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-white">
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Milestone title" className="w-full rounded-lg px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-white" />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details (optional)" rows={2} className="w-full rounded-lg px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-white" />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50">{saving ? "Saving..." : "Log Milestone"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Cancel</button>
            </div>
          </form>
        ) : (
          <button disabled title="IncidentTimeline has no store on this platform, so a logged milestone would be discarded rather than recorded." className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed">+ Log Milestone (not stored)</button>
        )}

        <button onClick={onClose} className="mt-6 px-4 py-2 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Close</button>
      </div>
    </div>
  );
}