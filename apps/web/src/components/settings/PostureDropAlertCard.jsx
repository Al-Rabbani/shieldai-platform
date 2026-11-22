import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BellRing, Radio } from "lucide-react";

const FIELD = "w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none";

export default function PostureDropAlertCard() {
  const [config, setConfig] = useState(null);
  const [channels, setChannels] = useState([]);
  const [form, setForm] = useState({ is_enabled: true, threshold_score: 75, max_drop_points: 5, slack_channel_id: "", slack_channel_name: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [rows, channelResponse] = await Promise.all([
        base44.entities.PostureAlertConfig.list("-updated_date", 1).catch(() => []),
        base44.functions.invoke("gdsVulnEscalation", { action: "channels" }).catch(() => null),
      ]);
      if (!active) return;
      setChannels(channelResponse?.data?.channels || []);
      const existing = rows?.[0];
      if (existing) {
        setConfig(existing);
        setForm({
          is_enabled: existing.is_enabled !== false,
          threshold_score: existing.threshold_score ?? 75,
          max_drop_points: existing.max_drop_points ?? 5,
          slack_channel_id: existing.slack_channel_id || "",
          slack_channel_name: existing.slack_channel_name || "",
        });
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  function update(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    const me = await base44.auth.me().catch(() => null);
    const payload = {
      ...form,
      threshold_score: Number(form.threshold_score) || 75,
      max_drop_points: Number(form.max_drop_points) || 5,
      slack_channel_name: channels.find((channel) => channel.id === form.slack_channel_id)?.name
        ? `#${channels.find((channel) => channel.id === form.slack_channel_id).name}`
        : form.slack_channel_name,
      updated_by: me?.full_name || "GDS OS",
    };
    try {
      if (config?.id) {
        await base44.entities.PostureAlertConfig.update(config.id, payload);
        setConfig({ ...config, ...payload });
      } else {
        const created = await base44.entities.PostureAlertConfig.create(payload);
        setConfig(created);
      }
      setMessage({ type: "ok", text: "Posture alert threshold saved." });
    } catch (error) {
      setMessage({ type: "err", text: error.message });
    }
    setBusy(false);
  }

  async function checkNow() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await base44.functions.invoke("gdsPostureAlert", {});
      const data = response.data || {};
      if (data.error) {
        setMessage({ type: "err", text: data.error });
      } else if (data.alerted) {
        setMessage({ type: "ok", text: `Alert raised at ${data.score} (Slack: ${data.slack}).` });
      } else {
        setMessage({ type: "ok", text: data.checked ? `Posture ${data.score} is within limits — no alert needed.` : data.reason });
      }
    } catch (error) {
      setMessage({ type: "err", text: error?.response?.data?.error || error.message });
    }
    setBusy(false);
  }

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-start gap-2 mb-3">
        <BellRing size={15} className="text-amber-400 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-white">Posture drop alert</p>
          <p className="text-[11px] text-slate-500">Notify the team when the overall score drops below the limit or falls sharply against the score 24 hours earlier.</p>
        </div>
        <label className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <input
            type="checkbox"
            checked={form.is_enabled}
            onChange={(event) => update({ is_enabled: event.target.checked })}
            className="accent-blue-500"
          />
          Enabled
        </label>
      </div>

      {loading ? (
        <div className="h-16 rounded-lg animate-pulse" style={{ background: "#0a0f1e" }} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label className="block">
            <span className="text-[10px] text-slate-500">Alert below score</span>
            <input
              type="number"
              min="0"
              max="100"
              value={form.threshold_score}
              onChange={(event) => update({ threshold_score: event.target.value })}
              className={FIELD}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-slate-500">24h drop of points</span>
            <input
              type="number"
              min="1"
              max="50"
              value={form.max_drop_points}
              onChange={(event) => update({ max_drop_points: event.target.value })}
              className={FIELD}
            />
          </label>
          <label className="block col-span-2">
            <span className="text-[10px] text-slate-500 flex items-center gap-1"><Radio size={9} /> Slack channel</span>
            <select
              value={form.slack_channel_id}
              onChange={(event) => update({ slack_channel_id: event.target.value })}
              className={FIELD}
            >
              <option value="">No Slack channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>#{channel.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {message && (
        <p className={`text-[11px] mt-2 ${message.type === "err" ? "text-red-300" : "text-emerald-300"}`}>{message.text}</p>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={save}
          disabled={busy || loading}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save threshold"}
        </button>
        <button
          onClick={checkNow}
          disabled={busy || loading}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition disabled:opacity-40"
        >
          Check now
        </button>
      </div>
    </div>
  );
}