import React from "react";
import { Link } from "react-router-dom";

export default function CriticalAlertBanner({ incident }) {
  if (!incident) return null;
  const exposure = incident.financial_impact_usd ? `$${Number(incident.financial_impact_usd).toLocaleString()} exposure` : null;
  return (
    <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/40 animate-pulse-red">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <span className="text-sm font-bold text-red-400 truncate">
          🚨 ACTIVE INCIDENT: {incident.title}{exposure ? ` — ${exposure}` : ""}
        </span>
      </div>
      <Link to="/incidents" className="flex-shrink-0 ml-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition">
        Respond Now
      </Link>
    </div>
  );
}