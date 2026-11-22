import React from "react";

const CONNECTORS = [
  { name: "GitHub", icon: "🐙" }, { name: "Jira", icon: "📋" }, { name: "Slack", icon: "💬" },
  { name: "PagerDuty", icon: "📟" }, { name: "Splunk", icon: "📊" }, { name: "Microsoft Sentinel", icon: "🛰️" },
  { name: "CrowdStrike", icon: "🦅" }, { name: "SentinelOne", icon: "🔵" }, { name: "HaveIBeenPwned", icon: "🕳️" },
  { name: "VirusTotal", icon: "🦠" }, { name: "Shodan", icon: "🌐" }, { name: "GCP", icon: "☁️" },
];

export default function AvailableConnectorsGrid() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {CONNECTORS.map(c => (
        <div key={c.name} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <span className="text-sm text-slate-300"><span className="mr-1.5">{c.icon}</span>{c.name}</span>
          <button disabled className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-500 cursor-not-allowed whitespace-nowrap">+ Connect</button>
        </div>
      ))}
    </div>
  );
}