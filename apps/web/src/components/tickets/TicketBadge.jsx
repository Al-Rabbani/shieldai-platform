import React from "react";
import { ExternalLink } from "lucide-react";

const SYSTEM_COLORS = { jira: "#3b82f6", linear: "#6366f1", github: "#9CA3AF", azure: "#0ea5e9" };
const SYSTEM_LABELS = { jira: "JIRA", linear: "Linear", github: "GH", azure: "ADO" };

export default function TicketBadge({ ticketId, ticketUrl, ticketSystem }) {
  if (!ticketId) return null;
  const color = SYSTEM_COLORS[ticketSystem] || "#9CA3AF";
  return (
    <a href={ticketUrl || "#"} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all hover:scale-105"
      style={{ background: color + "20", color, border: `1px solid ${color}44` }}>
      {SYSTEM_LABELS[ticketSystem] || ticketSystem?.toUpperCase()} — {ticketId}
      <ExternalLink className="w-2.5 h-2.5" />
    </a>
  );
}