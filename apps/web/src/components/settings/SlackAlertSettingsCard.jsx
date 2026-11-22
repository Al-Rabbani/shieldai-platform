import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Power, Save, SlidersHorizontal } from "lucide-react";

const SEVERITIES = [
  { value: "critical", label: "Critical only", hint: "Only critical findings reach the channel" },
  { value: "high", label: "High and critical", hint: "Recommended — cuts medium and low noise" },
  { value: "medium", label: "Medium and above", hint: "Includes medium findings" },
  { value: "low", label: "All severities", hint: "Every alert, including low and info" },
];

const DEFAULTS = {
  is_enabled: true,
  min_severity: "high",
  notify_findings: true,
  notify_incidents: true,
  notify_risk_limits: true,
};

const CHANNELS = [
  { key: "notify_findings", label: "Vulnerability findings" },
  { key: "notify_incidents", label: "Security incidents" },
  { key: "notify_risk_limits", label: "Department risk limits" },
];

export default function SlackAlertSettingsCard() {
  const [settings, setSettings] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;
    base44.entities.SlackAlertSetting.list("-updated_date", 1)
      .then((rows) => {
        if (!active) return;
        const row = rows[0];
        if (row) {
          setRecordId(row.id);
          setSettings({ ...DEFAULTS, ...row });
        } else {
          setSettings({ ...DEFAULTS });
        }
      })
      .catch(() => { if (active) setSettings({ ...DEFAULTS }); });
    return () => { active = false; };
  }, []);

  function patch(next) {
    setSettings((current) => ({ ...current, ...next }));
    setNotice(null);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setNotice(null);
    const payload = {
      is_enabled: settings.is_enabled,
      min_severity: settings.min_severity,
      notify_findings: settings.notify_findings,
      notify_incidents: settings.notify_incidents,
      notify_risk_limits: settings.notify_risk_limits,
    };
    try {
      if (recordId) {
        await base44.entities.SlackAlertSetting.update(recordId, payload);
      } else {
        const me = await base44.auth.me().catch(() => null);
        const created = await base44.entities.SlackAlertSetting.create({
          ...payload,
          updated_by: me?.full_name || me?.email || undefined,
        });
        setRecordId(created.id);
      }
      setNotice({ type: "ok", text: "Slack alert filter saved — new alerts use it immediately." });
    } catch (error) {
      setNotice({ type: "err", text: error.message });
    }
    setSaving(false);
  }

  if (!settings) {
    return (
      <section className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="w-5 h-5 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </section>
    );
  }

  return (
    <section className="rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={15} className="text-slate-400" />
        <h2 className="text-sm font-bold text-white">Slack alert settings</h2>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${settings.is_enabled ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-slate-700/30 text-slate-400 border-slate-700"}`}>
          {settings.is_enabled ? "alerts on" : "muted"}
        </span>
        <button
          onClick={() => patch({ is_enabled: !settings.is_enabled })}
          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition"
        >
          <Power size={12} /> {settings.is_enabled ? "Pause all alerts" : "Resume alerts"}
        </button>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-300 mb-1.5">Minimum severity for a Slack ping</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SEVERITIES.map((option) => {
            const active = settings.min_severity === option.value;
            return (
              <button
                key={option.value}
                onClick={() => patch({ min_severity: option.value })}
                className={`rounded-lg px-2.5 py-2 text-left border transition ${active ? "bg-blue-500/15 border-blue-500/50" : "bg-[#0a0f1e] border-slate-700 hover:border-slate-600"}`}
              >
                <span className={`flex items-center gap-1 text-[11px] font-bold ${active ? "text-blue-300" : "text-slate-300"}`}>
                  {active && <Check size={11} />} {option.label}
                </span>
                <span className="block text-[9px] text-slate-500 mt-0.5">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {CHANNELS.map((channel) => (
          <label key={channel.key} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <input
              type="checkbox"
              checked={Boolean(settings[channel.key])}
              onChange={(event) => patch({ [channel.key]: event.target.checked })}
              className="accent-blue-500"
            />
            {channel.label}
          </label>
        ))}
        <button
          onClick={save}
          disabled={saving}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-40"
        >
          <Save size={12} /> {saving ? "Saving…" : "Save filter"}
        </button>
      </div>

      {notice && (
        <p className={`text-[11px] ${notice.type === "err" ? "text-red-400" : "text-emerald-400"}`}>{notice.text}</p>
      )}
      <p className="text-[10px] text-slate-600">
        The filter applies to every Slack route: alert rules, Linear-style escalation and department risk-limit digests.
      </p>
    </section>
  );
}