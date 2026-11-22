import React, { useState } from "react";
import { CheckSquare, X, ChevronDown } from "lucide-react";
import { BORDER, CYAN, DANGER, MUTED, TEXT } from "@/components/gds/GDSOSShared";

const STATUSES = ["open", "in_remediation", "resolved", "accepted_risk"];
const ASSIGNEES = ["security-team", "dev-team", "infra-team", "unassigned"];

export default function BulkActionBar({ selectedIds, onApply, onClear }) {
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");

  if (selectedIds.length === 0) return null;

  const canApply = status || assignee;

  const handleApply = () => {
    if (!canApply) return;
    const update = {};
    if (status) update.status = status;
    if (assignee) update.assignee = assignee;
    onApply(update);
    setStatus("");
    setAssignee("");
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl flex-wrap"
      style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}30` }}>
      <div className="flex items-center gap-2">
        <CheckSquare className="w-4 h-4" style={{ color: CYAN }} />
        <span className="text-sm font-bold" style={{ color: CYAN }}>{selectedIds.length} selected</span>
      </div>

      <div className="h-4 w-px" style={{ background: BORDER }} />

      <select value={status} onChange={e => setStatus(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
        style={{ background: "#0a1628", border: `1px solid ${BORDER}`, color: status ? TEXT : MUTED }}>
        <option value="">Set status…</option>
        {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
      </select>

      <select value={assignee} onChange={e => setAssignee(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
        style={{ background: "#0a1628", border: `1px solid ${BORDER}`, color: assignee ? TEXT : MUTED }}>
        <option value="">Assign to…</option>
        {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
      </select>

      <button onClick={handleApply} disabled={!canApply}
        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-40"
        style={{ background: `${CYAN}20`, border: `1px solid ${CYAN}50`, color: CYAN }}>
        Apply
      </button>

      <button onClick={onClear}
        className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
        style={{ color: MUTED }}>
        <X className="w-3.5 h-3.5" /> Clear
      </button>
    </div>
  );
}