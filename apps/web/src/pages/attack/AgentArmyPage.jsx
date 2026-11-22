import React, { useState, useMemo } from "react";
import { generateAllAgents, BATTALION_META, TIER_COLORS, STATUS_COLORS } from "@/utils/agentData";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Crosshair, Zap, Activity } from "lucide-react";

const AGENTS = generateAllAgents();

function TierBadge({ tier }) {
  const c = TIER_COLORS[tier];
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase border ${c.bg} ${c.text} ${c.border}`}>{c.label}</span>;
}

function StatusDot({ status }) {
  const c = STATUS_COLORS[status];
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === "attacking" ? "animate-pulse" : ""}`} />
      <span className={`text-[10px] font-bold ${c.text}`}>{c.label}</span>
    </div>
  );
}

function AgentCard({ agent, onClick }) {
  const bm = BATTALION_META.find(b => agent.codename.startsWith(b.prefix));
  return (
    <div onClick={() => onClick(agent)} className="bg-[#0D1117] border border-[#1e293b] hover:border-[#334155] rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.01]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-bold text-[#e2e8f0]">{agent.codename}</span>
        <TierBadge tier={agent.tier} />
      </div>
      <p className="text-[11px] text-[#64748b] mb-2 line-clamp-1">{agent.specialty}</p>
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#475569]">Health</span>
          <span className="text-[10px] font-mono text-[#94a3b8]">{agent.health_score}%</span>
        </div>
        <div className="h-1 bg-[#1e293b] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${agent.health_score}%`, backgroundColor: agent.health_score >= 90 ? "#22c55e" : agent.health_score >= 75 ? "#f59e0b" : "#ef4444" }} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <StatusDot status={agent.status} />
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-[#64748b]">{agent.tasks_completed.toLocaleString()}</span>
          <span className="text-[10px] text-[#475569]">tasks</span>
        </div>
      </div>
      {agent.current_target && (
        <p className="text-[10px] text-amber-400 mt-1.5 truncate">→ {agent.current_target}</p>
      )}
      <div className="mt-2 pt-2 border-t border-[#1e293b]">
        <div className="w-2 h-2 rounded-full inline-block mr-1.5" style={{ backgroundColor: bm?.color }} />
        <span className="text-[10px]" style={{ color: bm?.color }}>{bm?.prefix}</span>
      </div>
    </div>
  );
}

function AgentDetailPanel({ agent, onClose }) {
  if (!agent) return null;
  const bm = BATTALION_META.find(b => agent.codename.startsWith(b.prefix));
  return (
    <Dialog open={!!agent} onOpenChange={onClose}>
      <DialogContent className="bg-[#0D1117] border-[#1e293b] text-[#e2e8f0] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[#e2e8f0]">
            <Crosshair className="w-5 h-5 text-red-400" />
            <span>{agent.codename}</span>
            <TierBadge tier={agent.tier} />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[["Specialty", agent.specialty], ["Category", agent.category], ["Battalion", bm?.label], ["Campaign", agent.assigned_campaign]].map(([l, v]) => (
              <div key={l} className="bg-[#050810] rounded-lg p-3">
                <p className="text-[11px] text-[#64748b] mb-1">{l}</p>
                <p className="text-xs text-[#e2e8f0] capitalize">{v}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[["Health", `${agent.health_score}%`, "text-emerald-400"], ["Tasks", agent.tasks_completed.toLocaleString(), "text-[#e2e8f0]"], ["Findings", agent.findings_generated, "text-amber-400"], ["Win Rate", `${agent.success_rate}%`, "text-[#C9A84C]"]].map(([l, v, c]) => (
              <div key={l} className="bg-[#050810] rounded-lg p-3">
                <p className="text-[10px] text-[#64748b]">{l}</p>
                <p className={`text-sm font-bold font-mono mt-1 ${c}`}>{v}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Current Status</p>
            <div className="bg-[#050810] border border-[#1e293b] rounded-lg p-3 flex items-center justify-between">
              <StatusDot status={agent.status} />
              {agent.current_target && <span className="text-xs font-mono text-amber-400">{agent.current_target}</span>}
            </div>
          </div>
          {agent.tier === "apex" && (
            <div className="bg-[#C9A84C]/5 border border-[#C9A84C]/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span className="text-xs font-bold text-[#C9A84C]">APEX Agent</span>
              </div>
              <p className="text-[11px] text-[#94a3b8]">Elite specialist with {agent.tasks_completed.toLocaleString()} completed missions. {agent.findings_generated} critical findings generated lifetime. Success rate: {agent.success_rate}%.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentArmyPage() {
  const [search, setSearch] = useState("");
  const [battalion, setBattalion] = useState("all");
  const [tier, setTier] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 200;

  const filtered = useMemo(() => AGENTS.filter(a => {
    const matchSearch = !search || a.codename.toLowerCase().includes(search.toLowerCase()) || a.specialty.toLowerCase().includes(search.toLowerCase());
    const matchBat = battalion === "all" || a.codename.startsWith(battalion);
    const matchTier = tier === "all" || a.tier === tier;
    const matchStatus = status === "all" || a.status === status;
    return matchSearch && matchBat && matchTier && matchStatus;
  }), [search, battalion, tier, status]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const battalionStats = useMemo(() => BATTALION_META.map(b => {
    const agents = AGENTS.filter(a => a.codename.startsWith(b.prefix));
    const attacking = agents.filter(a => a.status === "attacking").length;
    const apex = agents.filter(a => a.tier === "apex").length;
    return { ...b, attacking, apex };
  }), []);

  return (
    <div className="space-y-5 bg-[#050810] min-h-screen -m-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Agent Army</h1>
          <p className="text-sm text-[#64748b] mt-0.5">1,000 Super Agents across 10 specialist battalions</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-sm font-mono font-bold text-amber-400">{AGENTS.filter(a => a.status === "attacking").length} attacking now</span>
        </div>
      </div>

      {/* Battalion overview */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {battalionStats.map(b => (
            <button key={b.prefix} onClick={() => setBattalion(prev => prev === b.prefix ? "all" : b.prefix)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${battalion === b.prefix ? "border-current bg-current/10" : "border-[#1e293b] bg-[#0D1117] hover:border-[#334155]"}`} style={{ color: b.color, borderColor: battalion === b.prefix ? b.color : undefined }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="text-[11px] font-bold font-mono">{b.prefix}</span>
              <span className="text-[11px] text-[#94a3b8]">{b.count}</span>
              {b.attacking > 0 && <span className="text-[10px] text-amber-400">({b.attacking}⚡)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search agents..." className="pl-9 bg-[#0D1117] border-[#1e293b] text-[#e2e8f0] h-9 text-sm" />
        </div>
        {[
          { value: tier, set: (v) => { setTier(v); setPage(0); }, opts: [["all","All Tiers"],["apex","Apex"],["elite","Elite"],["standard","Standard"]], w: "w-32" },
          { value: status, set: (v) => { setStatus(v); setPage(0); }, opts: [["all","All Status"],["attacking","Attacking"],["online","Online"],["idle","Idle"],["cooldown","Cooldown"]], w: "w-36" },
        ].map((f, i) => (
          <Select key={i} value={f.value} onValueChange={f.set}>
            <SelectTrigger className={`${f.w} bg-[#0D1117] border-[#1e293b] text-[#e2e8f0] h-9 text-sm`}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#111827] border-[#1e293b]">
              {f.opts.map(([v, l]) => <SelectItem key={v} value={v} className="text-[#e2e8f0]">{l}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
        <span className="text-sm text-[#64748b] self-center">{filtered.length.toLocaleString()} agents</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
        {paged.map(agent => <AgentCard key={agent.codename} agent={agent} onClick={setSelected} />)}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${page === i ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-[#0D1117] text-[#64748b] border border-[#1e293b] hover:text-[#e2e8f0]"}`}>{i + 1}</button>
          ))}
        </div>
      )}

      <AgentDetailPanel agent={selected} onClose={() => setSelected(null)} />
    </div>
  );
}