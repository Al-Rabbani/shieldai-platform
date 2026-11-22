import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { loadSlaTargets, slaHours, subscribeSlaHours } from "@/lib/slaTargets";

export function slaDeadline(finding) {
  if (finding.sla_deadline) return new Date(finding.sla_deadline);
  const base = finding.detected_at || finding.created_date;
  if (!base) return null;
  return new Date(new Date(base).getTime() + (slaHours()[finding.severity] || 168) * 3600000);
}

function formatRemaining(ms) {
  const totalMinutes = Math.floor(Math.abs(ms) / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function SlaCountdown({ finding }) {
  const [now, setNow] = useState(Date.now());
  const [, setHoursVersion] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadSlaTargets();
    return subscribeSlaHours(() => setHoursVersion((version) => version + 1));
  }, []);

  const deadline = slaDeadline(finding);
  if (!deadline) return null;

  const remaining = deadline.getTime() - now;
  const overdue = remaining < 0;
  const total = Math.max(1, deadline.getTime() - new Date(finding.detected_at || finding.created_date || deadline).getTime());
  const remainingRatio = Math.max(0, Math.min(1, remaining / total));

  const style = overdue
    ? "bg-red-500/20 text-red-300 border-red-500/50 gdpr-critical-glow"
    : remaining < 6 * 3600000
      ? "bg-red-500/15 text-red-300 border-red-500/40"
      : remaining < 24 * 3600000
        ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
        : remainingRatio < 0.5
          ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30"
          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";

  const label = overdue ? `SLA breached ${formatRemaining(remaining)} ago` : `${formatRemaining(remaining)} left`;

  return (
    <span
      className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${style}`}
      title={`SLA deadline ${deadline.toLocaleString("en-GB")}${finding.sla_deadline ? " (from the finding's SLA)" : " (derived from severity)"}`}
    >
      <Clock size={9} /> {label}
    </span>
  );
}