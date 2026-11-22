import React, { useState } from "react";
import { X, CheckCheck, UserPlus } from "lucide-react";

const STATUSES = [
  { value: "in_remediation", label: "In remediation" },
  { value: "fixed", label: "Resolved" },
  { value: "accepted_risk", label: "Accepted risk" },
  { value: "false_positive", label: "False positive" },
];

export default function VulnBulkBar({ count, team, busy, onStatus, onAssign, onClear }) {
  const [member, setMember] = useState("");
  const [status, setStatus] = useState("in_remediation");
  const field = "px-2 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none";

  return (
    <div className="rounded-xl px-3 py-2.5 flex flex-wrap items-center gap-2" style={{ background: "#111827", border: "1px solid #3b82f6" }}>
      <span className="text-[11px] font-bold text-white">{count} selected</span>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className={field} aria-label="New status">
        {STATUSES.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <button
        onClick={() => onStatus(status)}
        disabled={busy}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition disabled:opacity-40"
      >
        <CheckCheck size={12} /> Update status
      </button>
      <select value={member} onChange={(e) => setMember(e.target.value)} className={field} aria-label="Assign to team member">
        <option value="">Assign to…</option>
        {team.map((person) => (
          <option key={person.id} value={person.name}>{person.name}</option>
        ))}
      </select>
      <button
        onClick={() => onAssign(member)}
        disabled={busy || !member}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition disabled:opacity-40"
      >
        <UserPlus size={12} /> Assign
      </button>
      <button onClick={onClear} className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-white">
        <X size={12} /> Clear
      </button>
    </div>
  );
}