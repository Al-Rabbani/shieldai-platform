import React from "react";
import { Link2, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";

/* Linear on this platform is one workspace authenticated by a server-side API key. There is no per-user OAuth, so this
 * card reports the connection instead of offering Connect/Disconnect buttons that had nothing behind them. */
export default function LinearConnectionCard({ connected, configured, reason, viewer, teams, teamId, onTeamChange, onRecheck, busy }) {
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center gap-2">
        {connected ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Link2 size={15} className="text-slate-500" />}
        <p className="text-xs font-bold text-white">Linear workspace</p>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${connected ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-slate-700/30 text-slate-400 border-slate-700"}`}>
          {connected ? "REACHABLE" : configured ? "KEY REJECTED" : "NO KEY"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={onRecheck} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-700/40 text-slate-300 border border-slate-700 hover:bg-slate-700/60 disabled:opacity-40">
            <RefreshCw size={12} /> Recheck
          </button>
        </div>
      </div>

      {connected ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] text-slate-400">
            Authenticated as <span className="text-white font-medium">{viewer?.name || viewer?.email || "the configured Linear account"}</span>
          </p>
          <label className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
            Ticket team
            <select
              value={teamId}
              onChange={(event) => onTeamChange(event.target.value)}
              className="px-2 py-1 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none"
            >
              {teams.length === 0 && <option value="">No teams found</option>}
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name} ({team.key})</option>)}
            </select>
          </label>
        </div>
      ) : (
        <div className="flex items-start gap-1.5">
          <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-500">
            {reason || "The server-side Linear API key is not configured on this host, so no ticket can be raised."}
            {" "}Linear here is a single workspace key held on the server, not a per-engineer sign-in.
          </p>
        </div>
      )}
    </div>
  );
}
