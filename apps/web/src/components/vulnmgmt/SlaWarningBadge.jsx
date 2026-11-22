import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { slaDeadline } from "@/components/triage/SlaCountdown";
import { loadSlaTargets, subscribeSlaHours } from "@/lib/slaTargets";

const HOUR = 3600000;

function remainingLabel(ms) {
  const minutes = Math.floor(Math.abs(ms) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

// Turns the SLA cell red as soon as the finding is inside its final 24 hours.
export default function SlaWarningBadge({ finding }) {
  const [now, setNow] = useState(Date.now());
  const [, setVersion] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadSlaTargets();
    return subscribeSlaHours(() => setVersion((version) => version + 1));
  }, []);

  const deadline = slaDeadline(finding);
  if (!deadline) return <span className="text-slate-600 text-xs">—</span>;

  const remaining = deadline.getTime() - now;
  const label = remainingLabel(remaining);

  if (remaining < 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-red-500/25 border-red-500/60 text-red-300 whitespace-nowrap"
        title={`SLA deadline ${deadline.toLocaleString("en-GB")}`}
      >
        <AlertTriangle size={9} /> {label} overdue
      </span>
    );
  }

  if (remaining <= 24 * HOUR) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-red-500/20 border-red-500/60 text-red-300 whitespace-nowrap animate-pulse"
        title={`SLA deadline ${deadline.toLocaleString("en-GB")} — inside 24 hours`}
      >
        <AlertTriangle size={9} /> {label} left
      </span>
    );
  }

  return <span className="text-[10px] text-slate-400 whitespace-nowrap">{label} left</span>;
}