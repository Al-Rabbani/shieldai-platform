import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Gauge, Plus, Trash2, RefreshCw, ShieldAlert, X, UserCheck } from "lucide-react";

const EMPTY = { department: "", asset_tag: "", asset_types: [], threshold: 70, slack_channel_id: "", slack_channel_name: "", department_head_ids: [], department_head_names: [], is_active: true };
const ASSET_TYPES = ["database", "ai_model", "compute", "storage", "api", "container", "serverless"];
const FIELD = "w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none";

export default function RiskThresholdsPage() {
  const [thresholds, setThresholds] = useState([]);
  const [assets, setAssets] = useState([]);
  const [members, setMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [channelError, setChannelError] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [rows, assetRows, memberRows] = await Promise.all([
      base44.entities.DepartmentRiskThreshold.list("-created_date", 100).catch(() => []),
      base44.entities.Asset.list("-created_date", 300).catch(() => []),
      base44.entities.TeamMember.list("-created_date", 200).catch(() => []),
    ]);
    setThresholds(rows || []);
    setAssets(assetRows || []);
    setMembers(memberRows || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    base44.functions.invoke("gdsVulnEscalation", { action: "channels" })
      .then((response) => setChannels(response.data?.channels || []))
      .catch((error) => setChannelError(error?.response?.data?.error || error.message));
  }, []);

  const tags = [...new Set(assets.flatMap((asset) => asset.tags || []))].sort();

  async function save(e) {
    e.preventDefault();
    if (!form.department.trim() || form.threshold === "" || Number.isNaN(Number(form.threshold))) return;
    setSaving(true);
    setMessage(null);
    const payload = {
      department: form.department.trim(),
      asset_tag: form.asset_tag.trim(),
      asset_types: form.asset_types || [],
      threshold: Number(form.threshold),
      slack_channel_id: form.slack_channel_id,
      slack_channel_name: channels.find((c) => c.id === form.slack_channel_id)?.name || form.slack_channel_name,
      department_head_ids: form.department_head_ids || [],
      department_head_names: form.department_head_names || [],
      is_active: form.is_active,
    };
    try {
      if (editingId) {
        await base44.entities.DepartmentRiskThreshold.update(editingId, payload);
        setThresholds((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...payload } : t)));
      } else {
        const created = await base44.entities.DepartmentRiskThreshold.create(payload);
        setThresholds((prev) => [created, ...prev]);
      }
      setForm(EMPTY);
      setEditingId(null);
      setMessage({ type: "ok", text: "Risk limit saved." });
    } catch (error) {
      setMessage({ type: "err", text: `Could not save: ${error.message}` });
    }
    setSaving(false);
  }

  function edit(threshold) {
    setEditingId(threshold.id);
    setForm({
      department: threshold.department || "",
      asset_tag: threshold.asset_tag || "",
      asset_types: threshold.asset_types || [],
      threshold: threshold.threshold ?? 70,
      slack_channel_id: threshold.slack_channel_id || "",
      slack_channel_name: threshold.slack_channel_name || "",
      department_head_ids: threshold.department_head_ids || [],
      department_head_names: threshold.department_head_names || [],
      is_active: threshold.is_active !== false,
    });
  }

  function addHead(id) {
    if (!id) return;
    const member = members.find((m) => m.id === id);
    if (!member) return;
    setForm((prev) => ({
      ...prev,
      department_head_ids: [...(prev.department_head_ids || []), id],
      department_head_names: [...(prev.department_head_names || []), member.name],
    }));
  }

  function removeHead(index) {
    setForm((prev) => ({
      ...prev,
      department_head_ids: (prev.department_head_ids || []).filter((_, i) => i !== index),
      department_head_names: (prev.department_head_names || []).filter((_, i) => i !== index),
    }));
  }

  async function remove(threshold) {
    if (!window.confirm(`Delete the limit for ${threshold.department}?`)) return;
    await base44.entities.DepartmentRiskThreshold.delete(threshold.id);
    setThresholds((prev) => prev.filter((t) => t.id !== threshold.id));
    if (editingId === threshold.id) { setEditingId(null); setForm(EMPTY); }
  }

  async function toggleActive(threshold) {
    const is_active = !(threshold.is_active !== false);
    await base44.entities.DepartmentRiskThreshold.update(threshold.id, { is_active });
    setThresholds((prev) => prev.map((t) => (t.id === threshold.id ? { ...t, is_active } : t)));
  }

  async function checkNow() {
    setChecking(true);
    setCheckResult(null);
    setMessage(null);
    try {
      const response = await base44.functions.invoke("gdsVulnEscalation", { action: "risk_limits" });
      setCheckResult(response.data);
      await load();
    } catch (error) {
      setMessage({ type: "err", text: error?.response?.data?.error || error.message });
    }
    setChecking(false);
  }

  return (
    <div className="space-y-4" style={{ background: "#0a0f1e", minHeight: "100vh" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Gauge size={22} className="text-blue-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">RSK-012 | RISK LIMITS</span>
            <h1 className="text-xl font-bold text-white mt-1">Department risk thresholds</h1>
            <p className="text-xs text-slate-500">Department risk limits are not recorded on this platform: there is no department threshold store, so a limit cannot be saved or checked, and the Slack-channel alerting this page describes needs a channel list this host cannot read (delivery uses a webhook; enumerating channels needs a bot token).</p>
          </div>
        </div>
        <button onClick={checkNow} disabled={checking} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25 transition disabled:opacity-40">
          <RefreshCw size={13} className={checking ? "animate-spin" : ""} /> {checking ? "Checking…" : "Check limits now"}
        </button>
      </div>

      {message && (
        <div className={`rounded-lg px-3 py-2 text-[11px] border ${message.type === "err" ? "bg-red-500/10 border-red-500/40 text-red-300" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"}`}>
          {message.text}
        </div>
      )}

      {checkResult && (
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-xs font-bold text-white mb-1">Limit check</p>
          <p className="text-[11px] text-slate-400">
            {(checkResult.results || []).length} active limit(s) checked · {(checkResult.breaches || []).length} asset breach(es) · {checkResult.sent || 0} Slack alert(s) sent
          </p>
          {(checkResult.breaches || []).slice(0, 8).map((breach) => (
            <p key={`${breach.department}-${breach.asset}`} className="text-[10px] text-amber-300 mt-0.5">
              {breach.asset} · risk {breach.risk_score} &gt; {breach.department} limit {breach.threshold} · {breach.reason}
            </p>
          ))}
          {(checkResult.results || []).some((r) => r.error) && (
            <p className="text-[10px] text-red-400 mt-1">
              {(checkResult.results || []).filter((r) => r.error).map((r) => `${r.department}: ${r.error}`).join(" · ")}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3">
        <form onSubmit={save} className="rounded-xl p-3 space-y-2 h-fit" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <Plus size={13} className="text-blue-400" /> {editingId ? "Edit limit" : "New limit"}
          </p>
          <label className="block text-[10px] uppercase text-slate-500">
            Department
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Cloud Security" className={`mt-1 ${FIELD}`} required />
          </label>
          <label className="block text-[10px] uppercase text-slate-500">
            Asset tag (empty = all assets)
            <input value={form.asset_tag} onChange={(e) => setForm({ ...form, asset_tag: e.target.value })} list="risk-threshold-tags" placeholder="production" className={`mt-1 ${FIELD}`} />
            <datalist id="risk-threshold-tags">
              {tags.map((tag) => <option key={tag} value={tag} />)}
            </datalist>
          </label>
          <div className="text-[10px] uppercase text-slate-500">
            Asset types (empty = all)
            <div className="mt-1 flex flex-wrap gap-1 normal-case">
              {ASSET_TYPES.map((type) => {
                const on = (form.asset_types || []).includes(type);
                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setForm((prev) => ({
                      ...prev,
                      asset_types: on ? (prev.asset_types || []).filter((t) => t !== type) : [...(prev.asset_types || []), type],
                    }))}
                    className={`px-1.5 py-0.5 rounded border text-[10px] ${on ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200"}`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            <span className="block mt-1 text-[9px] normal-case text-slate-600">Pick database and ai_model to alert only when your crown-jewel data stores or models cross the line.</span>
          </div>
          <div className="text-[10px] uppercase text-slate-500">
            Department head
            <div className="mt-1 flex flex-wrap gap-1">
              {(form.department_head_names || []).map((name, index) => (
                <span key={`${name}-${index}`} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px] border border-blue-500/30 normal-case">
                  {name}
                  <button type="button" onClick={() => removeHead(index)} aria-label={`Remove ${name}`} className="text-blue-300/70 hover:text-blue-200"><X size={9} /></button>
                </span>
              ))}
              {(form.department_head_ids || []).length === 0 && <span className="text-[10px] normal-case text-slate-600">No head selected</span>}
            </div>
            <select value="" onChange={(e) => addHead(e.target.value)} className={`mt-1 ${FIELD}`} aria-label="Add department head">
              <option value="">Mention a team member…</option>
              {members
                .filter((member) => !(form.department_head_ids || []).includes(member.id))
                .map((member) => (
                  <option key={member.id} value={member.id}>{member.name}{member.role ? ` · ${member.role}` : ""}</option>
                ))}
            </select>
            <span className="block mt-1 text-[9px] normal-case text-slate-600">Heads are @-mentioned when the limit fires; add their Slack member ID on the team member record.</span>
          </div>
          <label className="block text-[10px] uppercase text-slate-500">
            Risk limit ({form.threshold})
            <input type="range" min="0" max="100" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} className="mt-2 w-full accent-blue-500" />
          </label>
          <label className="block text-[10px] uppercase text-slate-500">
            Alert channel
            <select value={form.slack_channel_id} onChange={(e) => setForm({ ...form, slack_channel_id: e.target.value })} className={`mt-1 ${FIELD}`}>
              <option value="">No Slack channel</option>
              {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
            </select>
            {channelError && <span className="block mt-1 text-[9px] normal-case text-red-400">{channelError}</span>}
          </label>
          <label className="flex items-center gap-2 text-[11px] text-slate-400">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-blue-500" />
            Active
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 px-3 py-2 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition disabled:opacity-40">
              {saving ? "Saving…" : editingId ? "Update limit" : "Save limit"}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="px-3 py-2 rounded-lg text-[11px] font-bold text-slate-400 border border-slate-700 hover:text-slate-200">
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #1F2937" }}>
            <ShieldAlert size={13} className="text-amber-400" />
            <p className="text-xs font-bold text-white">Configured limits</p>
          </div>
          {loading ? (
            <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-10" />
          ) : thresholds.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-10">No limits yet. Add the first department threshold.</p>
          ) : (
            <div className="divide-y divide-slate-800">
              {thresholds.map((threshold) => {
                const types = Array.isArray(threshold.asset_types) ? threshold.asset_types : [];
                const rows = assets.filter((asset) =>
                  (!threshold.asset_tag || (asset.tags || []).includes(threshold.asset_tag)) &&
                  (types.length === 0 || types.includes(asset.type))
                );
                const breached = rows.filter((asset) => (asset.risk_score || 0) > threshold.threshold).length;
                return (
                  <div key={threshold.id} className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-white flex-1 min-w-0 truncate">{threshold.department}</span>
                      <span className="text-[10px] font-mono text-slate-400">limit {threshold.threshold}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${breached > 0 ? "text-red-300 border-red-500/40 bg-red-500/10" : "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"}`}>
                        {breached} over limit
                      </span>
                      <button onClick={() => toggleActive(threshold)} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${threshold.is_active !== false ? "text-emerald-300 border-emerald-500/40" : "text-slate-500 border-slate-700"}`}>
                        {threshold.is_active !== false ? "active" : "paused"}
                      </button>
                      <button onClick={() => edit(threshold)} className="text-[10px] text-blue-400 hover:text-blue-300">Edit</button>
                      <button onClick={() => remove(threshold)} aria-label="Delete limit" className="text-slate-600 hover:text-red-400"><Trash2 size={12} /></button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {threshold.asset_tag ? `tag: ${threshold.asset_tag}` : "all assets"} · {types.length ? `types: ${types.join(", ")}` : "all types"} · {rows.length} asset(s) in scope · alert to {threshold.slack_channel_name ? `#${threshold.slack_channel_name.replace(/^#/, "")}` : "no channel"}
                      {threshold.last_fired ? ` · last fired ${new Date(threshold.last_fired).toLocaleString("en-GB")}` : ""}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <UserCheck size={9} className="text-blue-400" />
                      {(threshold.department_head_names || []).length > 0 ? threshold.department_head_names.join(", ") : "no department head assigned"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-slate-500 px-3 py-2 border-t border-slate-800">
            The hourly risk-limit check runs this same evaluation, so a breach alerts even when nobody has the page open.
          </p>
        </div>
      </div>
    </div>
  );
}