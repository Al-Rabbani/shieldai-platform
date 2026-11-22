import React, { useMemo } from "react";
import { Bot } from "lucide-react";

export default function AgentFixLeaderboard({ fixedFindings = [], agents = [] }) {
  const rows = useMemo(() => {
    const names = new Map();
    agents.forEach((a) => {
      if (a.agent_id) names.set(a.agent_id, a.display_name || a.name);
      if (a.name) names.set(a.name, a.display_name || a.name);
    });
    const counts = new Map();
    fixedFindings.forEach((f) => {
      const key = f.fixed_by_agent_id || "unattributed";
      const entry = counts.get(key) || { id: key, count: 0, last: null };
      entry.count += 1;
      if (f.fixed_at && (!entry.last || new Date(f.fixed_at) > new Date(entry.last))) entry.last = f.fixed_at;
      counts.set(key, entry);
    });
    const list = [...counts.values()].sort((a, b) => b.count - a.count);
    return list.map((r) => ({ ...r, name: r.id === "unattributed" ? "Unattributed" : names.get(r.id) || r.id }));
  }, [fixedFindings, agents]);

  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);

  if (total === 0) {
    return (
      <div className="text-center py-8">
        <Bot size={22} className="mx-auto text-slate-600 mb-2" />
        <p className="text-sm text-slate-400">No agent-attributed fixes recorded yet.</p>
        <p className="text-[11px] text-slate-500 mt-1">
          Use the patch simulator to record a fix against an agent; counts appear here from the stored finding records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-500 mb-1">{total} fixed finding(s) with attribution</p>
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3">
          <span className="w-40 truncate text-xs text-slate-300" title={r.name}>{r.name}</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#1F2937" }}>
            <div className="h-full rounded-full" style={{ width: `${max ? (r.count / max) * 100 : 0}%`, background: r.id === "unattributed" ? "#64748b" : "#10b981" }} />
          </div>
          <span className="w-8 text-right text-xs font-mono font-bold text-white">{r.count}</span>
          <span className="w-20 text-right text-[10px] text-slate-500">
            {r.last ? new Date(r.last).toLocaleDateString() : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}