import React, { useState } from "react";
import { X } from "lucide-react";

const FIELD = "w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none";

export default function EscalationRuleForm({ initial, members, channels, channelError, saving, onSave, onCancel }) {
  const [form, setForm] = useState({
    rule_name: initial?.rule_name || "",
    severity_threshold: initial?.severity_threshold || "critical",
    min_risk_score: initial?.min_risk_score ?? 0,
    slack_channel_id: initial?.slack_channel_id || "",
    slack_channel_name: initial?.slack_channel_name || "",
    engineer_ids: initial?.engineer_ids || [],
    team_names: (initial?.team_names || []).join(", "),
    message_template: initial?.message_template || "",
    is_active: initial?.is_active !== false,
  });

  function toggleEngineer(id) {
    setForm((prev) => ({
      ...prev,
      engineer_ids: prev.engineer_ids.includes(id)
        ? prev.engineer_ids.filter((x) => x !== id)
        : [...prev.engineer_ids, id],
    }));
  }

  function pickChannel(id) {
    const channel = channels.find((c) => c.id === id);
    setForm((prev) => ({
      ...prev,
      slack_channel_id: id,
      slack_channel_name: channel ? `#${channel.name}` : prev.slack_channel_name,
    }));
  }

  function submit(e) {
    e.preventDefault();
    onSave({
      ...form,
      team_names: form.team_names.split(",").map((t) => t.trim()).filter(Boolean),
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #3b82f6" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">{initial?.id ? "Edit escalation rule" : "New escalation rule"}</p>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-[10px] uppercase text-slate-500">
          Rule name
          <input required value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} placeholder="Critical cloud vulns → Cloud Sec" className={`mt-1 ${FIELD}`} />
        </label>
        <label className="text-[10px] uppercase text-slate-500">
          Fires at severity
          <select value={form.severity_threshold} onChange={(e) => setForm({ ...form, severity_threshold: e.target.value })} className={`mt-1 ${FIELD}`}>
            <option value="critical">Critical only</option>
            <option value="high">High and critical</option>
          </select>
        </label>
        <label className="text-[10px] uppercase text-slate-500">
          Minimum CVSS score (0 = any)
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={form.min_risk_score}
            onChange={(e) => setForm({ ...form, min_risk_score: Number(e.target.value) || 0 })}
            className={`mt-1 ${FIELD}`}
          />
        </label>
        <label className="text-[10px] uppercase text-slate-500">
          Slack channel
          <select value={form.slack_channel_id} onChange={(e) => pickChannel(e.target.value)} className={`mt-1 ${FIELD}`}>
            <option value="">Select a channel…</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>#{channel.name}{channel.is_private ? " (private)" : ""}</option>
            ))}
            {form.slack_channel_id && !channels.some((c) => c.id === form.slack_channel_id) && (
              <option value={form.slack_channel_id}>{form.slack_channel_name || form.slack_channel_id}</option>
            )}
          </select>
          {channelError && (
            <input
              value={form.slack_channel_id}
              onChange={(e) => setForm({ ...form, slack_channel_id: e.target.value })}
              placeholder="Channel ID (C0123ABC)"
              className={`mt-1 ${FIELD}`}
            />
          )}
          <span className="block mt-1 text-[9px] normal-case text-slate-500">
            Private channel? Paste its ID (C0…) into the field above after picking any channel.
          </span>
        </label>
        <label className="text-[10px] uppercase text-slate-500">
          Owning teams (comma separated, blank = all)
          <input value={form.team_names} onChange={(e) => setForm({ ...form, team_names: e.target.value })} placeholder="Cloud Security, Platform" className={`mt-1 ${FIELD}`} />
        </label>
      </div>

      <div>
        <p className="text-[10px] uppercase text-slate-500 mb-1">Notify these engineers</p>
        <div className="flex flex-wrap gap-1.5">
          {members.length === 0 && <p className="text-[11px] text-slate-500">No team members found.</p>}
          {members.map((member) => {
            const active = form.engineer_ids.includes(member.id);
            return (
              <button
                type="button"
                key={member.id}
                onClick={() => toggleEngineer(member.id)}
                className={`px-2 py-1 rounded-full text-[11px] border transition ${
                  active
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                    : "bg-transparent text-slate-400 border-slate-700 hover:border-slate-500"
                }`}
              >
                {member.name}{member.slack_user_id ? "" : " (no Slack ID)"}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block text-[10px] uppercase text-slate-500">
        Intro line for the Slack message (optional)
        <textarea
          value={form.message_template}
          onChange={(e) => setForm({ ...form, message_template: e.target.value })}
          rows={2}
          placeholder="Internet-facing critical — patch within 24h."
          className={`mt-1 ${FIELD}`}
        />
      </label>

      <label className="flex items-center gap-2 text-[11px] text-slate-400">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-blue-500" />
        Rule is active
      </label>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={saving || !form.rule_name || !form.slack_channel_id}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-40">
          {saving ? "Saving…" : "Save rule"}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200">Cancel</button>
      </div>
    </form>
  );
}