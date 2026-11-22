import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";

const CATEGORIES = ["PII", "Financial", "Health", "Creds"];
const AUTHORITIES = ["Data Protection Commission (Ireland)", "ICO (UK)", "CNIL (France)", "BfDI (Germany)"];

export default function GdprNotificationModal({ incident, onClose, onSubmitted }) {
  const [authority, setAuthority] = useState(AUTHORITIES[0]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState("");
  const [description, setDescription] = useState(incident.description || "");
  const [drafting, setDrafting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function toggleCategory(c) {
    setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  async function aiDraft() {
    setDrafting(true);
    const result = await invokeAction("gdsAgentOS", {
      action: "command", command_type: "compliance_check",
      input: `Draft a GDPR Article 33 breach notification for incident: ${incident.title}. Description: ${incident.description}. Financial impact: ${incident.business_impact}. Data categories: ${categories.join(", ") || "unspecified"}. Write formal regulatory notification text.`,
      priority: "high",
    }).catch(e => ({ response: `Draft failed: ${e.message}` }));
    setDescription(result.response || description);
    setDrafting(false);
  }

  async function submit() {
    setSubmitting(true);
    await base44.entities.RegulatoryNotification.create({
      incident_id: incident.id,
      regulation: "GDPR",
      authority_name: authority,
      deadline: "2026-07-02T01:00:00Z",
      data_subjects_affected: parseInt(subjects, 10) || 0,
      pii_types: categories,
      notification_content: description,
      status: "pending_submission",
    }).catch(() => {});
    setSubmitting(false);
    onSubmitted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-4" style={{ background: "#111827", border: "1px solid #1F2937" }} onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white">GDPR Article 33 Breach Notification</h3>

        <div>
          <label className="text-[10px] text-slate-500 uppercase">Supervisory Authority</label>
          <select value={authority} onChange={e => setAuthority(e.target.value)} className="w-full mt-1 rounded-lg px-3 py-2 text-sm text-white" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
            {AUTHORITIES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <p className="text-xs text-slate-400">Breach Date: <span className="text-white">{incident.opened_at ? new Date(incident.opened_at).toLocaleDateString() : "—"}</span></p>

        <div>
          <label className="text-[10px] text-slate-500 uppercase">Data Categories Affected</label>
          <div className="flex gap-3 mt-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <label key={c} className="flex items-center gap-1.5 text-xs text-slate-300">
                <input type="checkbox" checked={categories.includes(c)} onChange={() => toggleCategory(c)} />
                {c}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-500 uppercase">Estimated Data Subjects Affected</label>
          <input type="number" value={subjects} onChange={e => setSubjects(e.target.value)} className="w-full mt-1 rounded-lg px-3 py-2 text-sm text-white" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }} />
        </div>

        <div>
          <label className="text-[10px] text-slate-500 uppercase">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} className="w-full mt-1 rounded-lg px-3 py-2 text-xs text-slate-200" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Cancel</button>
          <button onClick={aiDraft} disabled={drafting} className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition disabled:opacity-50">{drafting ? "Drafting..." : "🤖 AI Draft"}</button>
          <button onClick={submit} disabled={submitting} className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50">{submitting ? "Submitting..." : "Submit →"}</button>
        </div>
      </div>
    </div>
  );
}