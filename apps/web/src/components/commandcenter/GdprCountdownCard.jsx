import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const DEADLINE = new Date("2026-07-02T01:00:00Z");

export default function GdprCountdownCard({ incident }) {
  const [remaining, setRemaining] = useState(Math.max(0, DEADLINE - new Date()));

  useEffect(() => {
    const interval = setInterval(() => setRemaining(Math.max(0, DEADLINE - new Date())), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!incident) return null;

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const isCritical = hours < 6;

  return (
    <div className={`rounded-xl p-4 animate-pulse ${isCritical ? "gdpr-critical-glow" : ""}`} style={{ background: "rgba(127,29,29,0.3)", border: "1px solid #ef4444" }}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-red-400 font-bold text-sm">🔴 GDPR ART.33 NOTIFICATION DEADLINE</span>
        <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded">ACTIVE INCIDENT</span>
      </div>
      <p className="text-3xl font-mono text-red-300">{hours}h : {minutes}m remaining</p>
      <p className="text-sm text-red-400 mt-1">{incident.title} — Personal data potentially affected</p>
      <p className="text-xs text-slate-500 mt-1">72h window opened Jul 1 2026, 01:00 · Deadline Jul 2 2026, 01:00 · Max fine: €20,000,000 or 4% global turnover</p>
      <div className="flex gap-2 mt-3">
        <button className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition">📋 File Notification</button>
        <Link to="/incidents" className="text-xs font-bold border border-red-500 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition">View Incident →</Link>
      </div>
    </div>
  );
}