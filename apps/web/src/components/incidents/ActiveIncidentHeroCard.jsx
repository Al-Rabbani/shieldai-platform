import React, { useState, useEffect } from "react";

const DEADLINE = new Date("2026-07-02T01:00:00Z");

function extractImpact(incident) {
  if (incident.financial_impact_usd) return incident.financial_impact_usd;
  const m = /\$([\d.]+)\s*M/i.exec(incident.business_impact || "");
  return m ? Math.round(parseFloat(m[1]) * 1000000) : 0;
}

export default function ActiveIncidentHeroCard({ incident, onBrief, onFileGdpr }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function tick() {
      const diff = DEADLINE - new Date();
      if (diff <= 0) { setTimeLeft("DEADLINE PASSED"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m remaining`);
    }
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!incident) return null;
  const impact = extractImpact(incident);
  const opened = incident.opened_at ? new Date(incident.opened_at) : null;

  return (
    <div className="rounded-xl p-5 border-2 border-red-500 bg-red-500/10 animate-pulse-red space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-lg font-bold text-red-400">🔴 {incident.title} — Active Encryption Detected</p>
        <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded bg-red-500/30 text-red-300">{incident.status}</span>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-slate-300">
        <p>Opened: <span className="text-white font-medium">{opened ? opened.toLocaleString() : "—"}</span></p>
        <p>Severity: <span className="text-red-400 font-bold uppercase">{incident.severity}</span></p>
        <p>Financial Impact: <span className="text-red-400 font-bold">${impact.toLocaleString()}</span></p>
        <p>Affected: <span className="text-white">{(incident.affected_assets || []).join(", ") || "—"}</span></p>
      </div>

      <div className="rounded-lg px-3 py-2 bg-amber-500/15 border border-amber-500/40">
        <p className="text-xs font-bold text-amber-300">⏰ GDPR ART.33 DEADLINE: {timeLeft}</p>
        <p className="text-[11px] text-amber-400/80 mt-0.5">72h window opened Jul 1 01:00 → Deadline Jul 2 01:00 UTC · Max fine: €20,000,000 or 4% global turnover</p>
      </div>

      <p className="text-xs text-slate-400">Incident Commander: <span className="text-white font-medium">{incident.assigned_to || "Unassigned"}</span></p>

      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={() => onBrief(incident)} className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition">🤖 AI Incident Commander Brief</button>
        <button onClick={() => onFileGdpr(incident)} className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition">📋 File GDPR Notification</button>
      </div>
    </div>
  );
}