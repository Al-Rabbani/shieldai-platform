import React from "react";
import { Ticket, Loader2 } from "lucide-react";

const SEV = { critical: "text-red-400", high: "text-orange-400", medium: "text-yellow-400", low: "text-blue-400" };

export default function LinearFindingTickets({ findings, existingFindingIds, onCreate, onCreateAll, creating, disabled }) {
  const pending = findings.filter((finding) => !existingFindingIds.includes(finding.id));

  if (findings.length === 0) {
    return <p className="text-xs text-slate-500 py-6 text-center">No open critical findings to ticket.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">{pending.length} critical finding{pending.length === 1 ? "" : "s"} without a Linear ticket</p>
        <button
          onClick={onCreateAll}
          disabled={disabled || pending.length === 0 || creating === "all"}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 disabled:opacity-40"
        >
          {creating === "all" ? <Loader2 size={12} className="animate-spin" /> : <Ticket size={12} />} Create all tickets
        </button>
      </div>

      {findings.map((finding) => {
        const linked = existingFindingIds.includes(finding.id);
        const severity = finding.normalized_severity || finding.severity;
        return (
          <div key={finding.id} className="flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
            <span className={`text-[9px] font-bold uppercase ${SEV[severity] || "text-slate-400"}`}>{severity}</span>
            <span className="text-[11px] text-white flex-1 min-w-0 truncate">{finding.title}</span>
            <span className="text-[10px] text-slate-500">{finding.asset_name}</span>
            {linked ? (
              <span className="text-[10px] font-bold text-emerald-300">TICKETED</span>
            ) : (
              <button
                onClick={() => onCreate(finding.id)}
                disabled={disabled || creating === finding.id}
                className="px-2 py-1 rounded text-[10px] font-bold bg-slate-700/50 text-slate-200 border border-slate-600 hover:bg-slate-700 disabled:opacity-40"
              >
                {creating === finding.id ? "Creating…" : "Create ticket"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}