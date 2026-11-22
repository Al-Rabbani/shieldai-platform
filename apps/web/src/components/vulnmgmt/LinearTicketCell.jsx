import React from "react";
import { ExternalLink } from "lucide-react";

const STATE_COLOR = {
  completed: "#22c55e",
  canceled: "#94a3b8",
  started: "#3b82f6",
  unstarted: "#a78bfa",
  backlog: "#94a3b8",
  triage: "#f59e0b",
};

export default function LinearTicketCell({ link }) {
  if (!link) return <span className="text-slate-600 text-xs">—</span>;
  const color = STATE_COLOR[link.state_type] || "#94a3b8";
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${link.state_name || "Linear ticket"} — opens the ticket in Linear`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border whitespace-nowrap transition hover:brightness-125"
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}
    >
      {link.identifier}
      <ExternalLink size={9} />
    </a>
  );
}