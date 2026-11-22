import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { BellRing, Plus, Trash2, Send, Users, Power, Hourglass, FolderDown, AlertTriangle, ShieldCheck } from "lucide-react";
import EscalationRuleForm from "@/components/settings/EscalationRuleForm";
import EngineerSlackList from "@/components/settings/EngineerSlackList";
import SlackAlertSettingsCard from "@/components/settings/SlackAlertSettingsCard";
import PostureDropAlertCard from "@/components/settings/PostureDropAlertCard";

const SEV_STYLE = {
  critical: "bg-red-500/15 text-red-400 border-red-500/40",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/40",
};

export default function EscalationSettingsPage() {
  const [rules, setRules] = useState([]);
  const [members, setMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [channelError, setChannelError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [testingId, setTestingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ruleRows, teamRows] = await Promise.all([
      base44.entities.VulnEscalationRule.list("-created_date", 100).catch(() => []),
      base44.entities.TeamMember.list("-created_date", 200).catch(() => []),
    ]);
    setRules(ruleRows);
    setMembers(teamRows.filter((member) => !member.is_agent));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    base44.functions.invoke("gdsVulnEscalation", { action: "channels" })
      .then((response) => setChannels(response.data?.channels || []))
      .catch((error) => setChannelError(error?.response?.data?.error || error.message));
  }, []);

  async function saveRule(payload) {
    setSaving(true);
    setNotice(null);
    try {
      if (editing?.id) {
        await base44.entities.VulnEscalationRule.update(editing.id, payload);
      } else {
        await base44.entities.VulnEscalationRule.create(payload);
      }
      setEditing(null);
      await load();
      setNotice({ type: "ok", text: "Escalation rule saved." });
    } catch (error) {
      setNotice({ type: "err", text: error.message });
    }
    setSaving(false);
  }

  async function toggleRule(rule) {
    await base44.entities.VulnEscalationRule.update(rule.id, { is_active: !rule.is_active });
    load();
  }

  async function deleteRule(rule) {
    await base44.entities.VulnEscalationRule.delete(rule.id);
    load();
  }

  async function testRule(rule) {
    setTestingId(rule.id);
    setNotice(null);
    try {
      const response = await base44.functions.invoke("gdsVulnEscalation", { action: "test", rule_id: rule.id });
      setNotice({ type: "ok", text: `Test alert posted to ${response.data.channel}.` });
    } catch (error) {
      setNotice({ type: "err", text: error?.response?.data?.error || error.message });
    }
    setTestingId(null);
  }

  async function saveMember(id, patch) {
    await base44.entities.TeamMember.update(id, patch);
    setMembers((prev) => prev.map((member) => (member.id === id ? { ...member, ...patch } : member)));
  }

  const withSlack = members.filter((member) => member.slack_user_id).length;

  return (
    <div className="space-y-4 p-1" style={{ background: "#0a0f1e", minHeight: "100vh" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <BellRing size={22} className="text-blue-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">SEP-008 | ESCALATION</span>
            <h1 className="text-xl font-bold text-white mt-1">Escalation Settings</h1>
            <p className="text-xs text-slate-500">Notify named security engineers in Slack whenever a new critical vulnerability lands.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/reports/drive" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition">
            <FolderDown size={13} /> Drive reports
          </Link>
          <button
            onClick={() => setEditing({})}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            <Plus size={14} /> New rule
          </button>
        </div>
      </div>

      {notice && (
        <div className={`rounded-lg px-3 py-2 text-[11px] border ${notice.type === "err" ? "bg-red-500/10 border-red-500/40 text-red-300" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"}`}>
          {notice.text}
        </div>
      )}

      {channelError && (
        <div className="rounded-lg px-3 py-2 text-[11px] border bg-amber-500/10 border-amber-500/40 text-amber-300 flex items-start gap-2">
          <AlertTriangle size={13} className="mt-0.5" />
          <span>Could not read the Slack channel list ({channelError}). You can still paste a channel ID into a rule.</span>
        </div>
      )}

      <SlackAlertSettingsCard />

      <PostureDropAlertCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-slate-400" />
              <h2 className="text-sm font-bold text-white">Security engineers</h2>
            </div>
            <span className="text-[10px] text-slate-500">{withSlack} of {members.length} with a Slack ID</span>
          </div>
          <EngineerSlackList members={members} onSave={saveMember} />
          <p className="text-[10px] text-slate-500 mt-2">
            Slack member IDs start with U. Find one in Slack under the person&apos;s profile, then paste it here so alerts @-mention them.
          </p>
        </section>

        <section className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={15} className="text-slate-400" />
            <h2 className="text-sm font-bold text-white">Per-team routing</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(rules.flatMap((rule) => rule.team_names || []))].length === 0 ? (
              <p className="text-[11px] text-slate-500">No team-specific routes yet. Add a rule with owning teams to split alerts per security team.</p>
            ) : (
              [...new Set(rules.flatMap((rule) => rule.team_names || []))].map((team) => (
                <span key={team} className="px-2 py-1 rounded-full text-[11px] bg-purple-500/15 text-purple-300 border border-purple-500/30">{team}</span>
              ))
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-3">
            A rule with owning teams only fires for findings whose owning team matches; leave the team list blank to catch every critical finding.
          </p>
        </section>
      </div>

      {editing && (
        <EscalationRuleForm
          initial={editing}
          members={members}
          channels={channels}
          channelError={channelError}
          saving={saving}
          onSave={saveRule}
          onCancel={() => setEditing(null)}
        />
      )}

      <section className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2 mb-3">
          <Hourglass size={15} className="text-slate-400" />
          <h2 className="text-sm font-bold text-white">Escalation rules</h2>
          <span className="text-[10px] text-slate-500">Fired from the Critical Vuln Engineer Escalation workflow</span>
        </div>

        {loading ? (
          <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-6" />
        ) : rules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-slate-500 mb-2">No rules yet — create one to start notifying engineers.</p>
            <button onClick={() => setEditing({})} className="text-[11px] font-bold text-blue-400 hover:text-blue-300">Create the first rule</button>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: `3px solid ${rule.is_active ? "#3b82f6" : "#334155"}` }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{rule.rule_name}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${SEV_STYLE[rule.severity_threshold] || SEV_STYLE.critical}`}>
                        {rule.severity_threshold}+
                      </span>
                      {Number(rule.min_risk_score || 0) > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
                          CVSS ≥ {rule.min_risk_score}
                        </span>
                      )}
                      {!rule.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400">paused</span>}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {rule.slack_channel_name || rule.slack_channel_id || "No channel"} · {(rule.engineer_ids || []).length} engineer(s)
                      {rule.team_names?.length ? ` · ${rule.team_names.join(", ")}` : " · all teams"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {rule.fire_count || 0} alert(s) sent{rule.last_fired ? ` · last ${new Date(rule.last_fired).toLocaleString("en-GB")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => testRule(rule)}
                      disabled={testingId === rule.id}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 transition disabled:opacity-40"
                    >
                      <Send size={11} /> {testingId === rule.id ? "Sending…" : "Test"}
                    </button>
                    <button onClick={() => setEditing(rule)} className="px-2 py-1 rounded text-[10px] font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">Edit</button>
                    <button onClick={() => toggleRule(rule)} className="flex items-center justify-center w-7 h-7 rounded border border-slate-700 text-slate-400 hover:text-blue-300" title="Pause or resume">
                      <Power size={11} />
                    </button>
                    <button onClick={() => deleteRule(rule)} className="flex items-center justify-center w-7 h-7 rounded border border-slate-700 text-slate-500 hover:text-red-400" title="Delete rule">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}