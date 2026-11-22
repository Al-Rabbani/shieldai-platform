import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AssignmentRuleForm, { emptyRule } from "@/components/settings/AssignmentRuleForm";
import { Plus, Trash2, Pencil, PlayCircle, UserCheck } from "lucide-react";

export default function AssignmentRulesPage() {
  const [rules, setRules] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyRule);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    const [ruleRows, teamRows, memberRows] = await Promise.all([
      base44.entities.AssignmentRule.list("-created_date", 100).catch(() => []),
      base44.entities.Team.list("-created_date", 50).catch(() => []),
      base44.entities.TeamMember.list("-created_date", 100).catch(() => []),
    ]);
    setRules(ruleRows || []);
    setTeams(teamRows || []);
    setMembers(memberRows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function startCreate() {
    setForm(emptyRule);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(rule) {
    setForm({
      ...emptyRule,
      ...Object.fromEntries(Object.keys(emptyRule).map((key) => [key, rule[key] ?? emptyRule[key]])),
    });
    setEditingId(rule.id);
    setShowForm(true);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (editingId) {
        await base44.entities.AssignmentRule.update(editingId, form);
      } else {
        await base44.entities.AssignmentRule.create(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyRule);
      setMessage({ type: "ok", text: "Rule saved. New findings matching it are assigned on discovery." });
      await load();
    } catch (error) {
      setMessage({ type: "err", text: error.message });
    }
    setSaving(false);
  }

  async function remove(rule) {
    await base44.entities.AssignmentRule.delete(rule.id);
    setRules((prev) => prev.filter((row) => row.id !== rule.id));
  }

  async function toggleActive(rule) {
    await base44.entities.AssignmentRule.update(rule.id, { is_active: !rule.is_active });
    setRules((prev) => prev.map((row) => (row.id === rule.id ? { ...row, is_active: !row.is_active } : row)));
  }

  async function runEscalation() {
    setRunning(true);
    setMessage(null);
    try {
      const response = await base44.functions.invoke("gdsAutoAssignFindings", { action: "escalate_stale" });
      const data = response.data || {};
      setMessage({
        type: "ok",
        text: `${data.escalated || 0} finding(s) escalated past the 3-day triage limit (checked ${data.checked || 0}).${data.slack_delivered ? " Slack alert delivered." : ""}`,
      });
      await load();
    } catch (error) {
      setMessage({ type: "err", text: error?.response?.data?.error || error.message });
    }
    setRunning(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-3" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <UserCheck size={22} className="text-blue-400 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-white">Finding assignment rules</h1>
            <p className="text-xs text-slate-500">Route findings by asset type and team ownership, and escalate anything left in triage past 3 days.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runEscalation}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 disabled:opacity-40"
          >
            <PlayCircle size={13} /> {running ? "Checking…" : "Escalate stale findings"}
          </button>
          <button onClick={startCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600">
            <Plus size={13} /> New rule
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg px-3 py-2 text-[11px] border ${message.type === "err" ? "bg-red-500/10 border-red-500/40 text-red-300" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <AssignmentRuleForm
          form={form}
          setForm={setForm}
          onSubmit={submit}
          onCancel={() => { setShowForm(false); setEditingId(null); setForm(emptyRule); }}
          saving={saving}
          teams={teams}
          members={members}
        />
      )}

      {loading ? (
        <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-16" />
      ) : rules.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-10">No assignment rules yet. Create one to route findings automatically.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-xl px-3 py-2.5" style={{ background: "#111827", border: "1px solid #1F2937", opacity: rule.is_active ? 1 : 0.55 }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">{rule.rule_name}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">{rule.asset_type === "any" ? "ANY TYPE" : String(rule.asset_type).toUpperCase()}</span>
                <span className="text-[10px] text-slate-500">{rule.owner_team || "every team"}</span>
                <span className="ml-auto text-[10px] text-slate-500">fired {rule.fire_count || 0}×{rule.last_fired ? ` · ${new Date(rule.last_fired).toLocaleDateString("en-GB")}` : ""}</span>
                <button onClick={() => startEdit(rule)} className="text-slate-500 hover:text-blue-300"><Pencil size={13} /></button>
                <button onClick={() => remove(rule)} className="text-slate-500 hover:text-red-400"><Trash2 size={13} /></button>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px]">
                <span className="text-slate-400">→ <span className="text-white font-medium">{rule.assignee_name}</span>{rule.assignee_email ? ` · ${rule.assignee_email}` : ""}</span>
                <span className="text-slate-400">escalates to <span className="text-amber-300 font-medium">{rule.team_lead_name || rule.assignee_name || "—"}</span></span>
                <button onClick={() => toggleActive(rule)} className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border ${rule.is_active ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-slate-700/30 text-slate-400 border-slate-700"}`}>
                  {rule.is_active ? "ACTIVE" : "PAUSED"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}