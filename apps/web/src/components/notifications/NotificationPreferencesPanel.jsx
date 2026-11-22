import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";

const FREQUENCIES = ["Real-time", "Hourly", "Daily"];

export default function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState({ email: true, slack: false, inApp: true, criticalOnly: false });
  const [frequency, setFrequency] = useState("Real-time");

  function toggle(key) { setPrefs(p => ({ ...p, [key]: !p[key] })); }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Notification Preferences</p>

      {[
        { key: "email", label: "Email alerts" },
        { key: "slack", label: "Slack (not connected)", disabled: true },
        { key: "inApp", label: "In-app" },
        { key: "criticalOnly", label: "Critical only mode" },
      ].map(item => (
        <div key={item.key} className="flex items-center justify-between">
          <span className="text-xs text-slate-300">{item.label}</span>
          <Switch checked={prefs[item.key]} onCheckedChange={() => toggle(item.key)} disabled={item.disabled} />
        </div>
      ))}

      <div className="pt-2 border-t border-slate-800">
        <p className="text-[10px] text-slate-500 uppercase mb-1.5">Digest Frequency</p>
        <div className="flex gap-1.5">
          {FREQUENCIES.map(f => (
            <button key={f} onClick={() => setFrequency(f)} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${frequency === f ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400"}`}>{f}</button>
          ))}
        </div>
      </div>
    </div>
  );
}