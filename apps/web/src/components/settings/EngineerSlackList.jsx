import React, { useState } from "react";
import { UserCheck, Save } from "lucide-react";

export default function EngineerSlackList({ members, onSave }) {
  const [draft, setDraft] = useState({});
  const [savedId, setSavedId] = useState(null);

  /* Every save here goes to TeamMember.update, which refuses: there is no team member store, so a Slack ID has nowhere
   * to live. The note below says so rather than letting a green Save suggest otherwise. */

  function valueFor(member, field) {
    return draft[member.id]?.[field] ?? member[field] ?? "";
  }

  function change(member, field, value) {
    setDraft((prev) => ({ ...prev, [member.id]: { ...prev[member.id], [field]: value } }));
  }

  async function save(member) {
    const patch = draft[member.id];
    if (!patch) return;
    await onSave(member.id, patch);
    setSavedId(member.id);
    setTimeout(() => setSavedId(null), 2000);
  }

  if (members.length === 0) {
    return (
      <p className="text-xs text-slate-500 py-4">
        No team members yet. Add your security engineers in Organization settings first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div key={member.id} className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <UserCheck size={14} className="text-slate-500" />
          <div className="min-w-[140px] flex-1">
            <p className="text-xs font-semibold text-white">{member.name}</p>
            <p className="text-[10px] text-slate-500">{member.role}{member.email ? ` · ${member.email}` : ""}</p>
          </div>
          <input
            value={valueFor(member, "slack_user_id")}
            onChange={(e) => change(member, "slack_user_id", e.target.value)}
            placeholder="Slack member ID (U0123ABC)" title="Not saved: this platform holds no team member store"
            className="w-48 px-2 py-1 rounded text-[11px] bg-[#050e1f] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
          />
          <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <input
              type="checkbox"
              checked={Boolean(valueFor(member, "notify_critical"))}
              onChange={(e) => change(member, "notify_critical", e.target.checked)}
              className="accent-blue-500"
            />
            Alert on critical
          </label>
          <button
            onClick={() => save(member)}
            disabled={!draft[member.id]}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition disabled:opacity-30"
          >
            <Save size={11} /> {savedId === member.id ? "Saved" : "Save"}
          </button>
        </div>
      ))}
    </div>
  );
}