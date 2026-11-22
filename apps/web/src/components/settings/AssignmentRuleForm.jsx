import React from "react";

const ASSET_TYPES = ["any", "compute", "storage", "database", "ai_model", "api", "container", "serverless", "repository", "vm", "cloud", "domain"];

export const emptyRule = {
  rule_name: "",
  asset_type: "any",
  owner_team: "",
  assignee_name: "",
  assignee_email: "",
  assignee_slack_user_id: "",
  team_lead_name: "",
  team_lead_email: "",
  team_lead_slack_user_id: "",
  is_active: true,
};

const field = "w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none";

export default function AssignmentRuleForm({ form, setForm, onSubmit, onCancel, saving, teams, members }) {
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={onSubmit} className="rounded-xl p-3 space-y-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-xs font-bold text-white">Assignment rule</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input value={form.rule_name} onChange={(e) => set("rule_name", e.target.value)} placeholder="Rule name *" className={field} required />
        <select value={form.asset_type} onChange={(e) => set("asset_type", e.target.value)} className={field}>
          {ASSET_TYPES.map((type) => <option key={type} value={type}>{type === "any" ? "Any asset type" : type}</option>)}
        </select>
        <input
          value={form.owner_team}
          onChange={(e) => set("owner_team", e.target.value)}
          placeholder="Owner team (empty = every team)"
          list="owner-team-options"
          className={field}
        />
        <datalist id="owner-team-options">
          {(teams || []).map((team) => <option key={team.id} value={team.name} />)}
        </datalist>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input value={form.assignee_name} onChange={(e) => set("assignee_name", e.target.value)} placeholder="Assignee name *" list="member-options" className={field} required />
        <input value={form.assignee_email} onChange={(e) => set("assignee_email", e.target.value)} placeholder="Assignee email" className={field} />
        <input value={form.assignee_slack_user_id} onChange={(e) => set("assignee_slack_user_id", e.target.value)} placeholder="Assignee Slack ID (U0123ABC)" className={field} />
        <datalist id="member-options">
          {(members || []).map((member) => <option key={member.id} value={member.name} />)}
        </datalist>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input value={form.team_lead_name} onChange={(e) => set("team_lead_name", e.target.value)} placeholder="Team lead name (escalation)" className={field} />
        <input value={form.team_lead_email} onChange={(e) => set("team_lead_email", e.target.value)} placeholder="Team lead email" className={field} />
        <input value={form.team_lead_slack_user_id} onChange={(e) => set("team_lead_slack_user_id", e.target.value)} placeholder="Team lead Slack ID" className={field} />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="accent-blue-500" />
          Active
        </label>
        <div className="flex items-center gap-2">
          {onCancel && <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-700/40 text-slate-300 border border-slate-700">Cancel</button>}
          <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 disabled:opacity-40">
            {saving ? "Saving…" : "Save rule"}
          </button>
        </div>
      </div>
    </form>
  );
}