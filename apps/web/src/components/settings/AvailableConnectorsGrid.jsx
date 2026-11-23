import React from "react";

/* These are the integrations this platform is designed to speak to. None can be connected from here: there is no
 * connector registry, no OAuth broker and no per-tenant credential store, so the button is not offered at all rather
 * than shown disabled over a promise nothing keeps. Jira is deliberately absent - it is permanently removed from this
 * platform and must never be offered again. */
const PLANNED = [
  { name: "Slack", icon: "\u{1F4AC}" },
  { name: "PagerDuty", icon: "\u{1F4DF}" },
  { name: "Splunk", icon: "\u{1F4CA}" },
  { name: "Microsoft Sentinel", icon: "\u{1F6F0}\u{FE0F}" },
  { name: "CrowdStrike", icon: "\u{1F985}" },
  { name: "SentinelOne", icon: "\u{1F535}" },
  { name: "VirusTotal", icon: "\u{1F9A0}" },
  { name: "Shodan", icon: "\u{1F310}" },
];

export default function AvailableConnectorsGrid() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        Nothing on this list can be connected from this page: this platform has no connector registry and no per-tenant
        credential store, so a connection cannot be created, stored or verified here. The list is what the platform is
        designed to speak to, not what it currently can.
      </p>
      <div className="grid grid-cols-4 gap-3">
        {PLANNED.map(c => (
          <div key={c.name} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <span className="text-sm text-slate-400"><span className="mr-1.5">{c.icon}</span>{c.name}</span>
            <span className="text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">not available</span>
          </div>
        ))}
      </div>
    </div>
  );
}
