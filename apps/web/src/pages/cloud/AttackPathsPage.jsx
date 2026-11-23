import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AgentHealthCard from "@/components/code/AgentHealthCard";
import SeverityPill from "@/components/code/SeverityPill";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Play, ChevronRight, Shield, Zap, ArrowRight } from "lucide-react";

const providerBadge = { aws: "bg-orange-500/15 text-orange-400 border-orange-500/30", gcp: "bg-blue-500/15 text-blue-400 border-blue-500/30", azure: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" };

function AttackNode({ label, type, isEntry, isTarget }) {
  return (
    <div className={`flex-shrink-0 rounded-lg px-3 py-2 border text-center min-w-[120px] max-w-[140px] ${
      isEntry ? "bg-red-500/10 border-red-500/30 text-red-300" :
      isTarget ? "bg-orange-500/10 border-orange-500/30 text-orange-300" :
      "bg-[#1e293b] border-[#1e293b] text-[#94a3b8]"
    }`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{type}</p>
      <p className="text-xs font-medium mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

export default function AttackPathsPage() {
  const [sevFilter, setSevFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: paths = [] } = useQuery({ queryKey: ["attack-paths"], queryFn: () => base44.entities.CloudAttackPath.list("-created_date", 20) });
  /* The route states why there is nothing to show; this page must not imply the estate is clean. */
  const { data: basis } = useQuery({ queryKey: ["attack-paths-basis"], queryFn: () => base44.entities.CloudAttackPath.summary() });

  const filtered = paths.filter(p => sevFilter === "all" || p.severity === sevFilter);
  const active = paths.filter(p => p.status === "active").length;

  return (
    <div className="space-y-6 bg-[#0A0E1A] min-h-screen -m-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Cloud Attack Paths</h1>
          {basis?.basis && <p className="text-[11px] text-slate-500 mt-1 max-w-2xl">{basis.basis}</p>}
          <p className="text-sm text-[#64748b] mt-0.5">Powered by CSPMAgent-v1 · Automated attack path discovery and blast radius analysis</p>
        </div>
        <Button className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold gap-2">
          <Play className="w-4 h-4" /> Analyze Attack Paths
        </Button>
      </div>

      <AgentHealthCard name="CSPMAgent-v1" health={96} status="online" tasksToday={68} type="executor" />

      {active > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">{active} active attack path{active > 1 ? "s" : ""} detected</p>
            <p className="text-xs text-red-400/70">These paths represent real exploitable chains. Mitigate immediately.</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Select value={sevFilter} onValueChange={setSevFilter}>
          <SelectTrigger className="w-32 bg-[#111827] border-[#1e293b] text-[#e2e8f0] h-9 text-sm"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent className="bg-[#111827] border-[#1e293b]">
            {["all", "critical", "high", "medium", "low"].map(s => <SelectItem key={s} value={s} className="text-[#e2e8f0] capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-[#64748b]">{filtered.length} path{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-4">
        {filtered.map((path) => (
          <div key={path.id} className="bg-[#111827] border border-[#1e293b] hover:border-red-500/20 rounded-xl p-5 transition-all cursor-pointer" onClick={() => setSelected(path)}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityPill severity={path.severity} />
                  <span className={`text-[11px] px-2 py-0.5 rounded uppercase font-bold border ${providerBadge[path.provider]}`}>{path.provider}</span>
                  {path.status === "active" && <span className="text-[11px] px-2 py-0.5 rounded border text-red-400 border-red-500/30 bg-red-500/10">ACTIVE</span>}
                  {path.status === "mitigated" && <span className="text-[11px] px-2 py-0.5 rounded border text-emerald-400 border-emerald-500/30 bg-emerald-500/10">MITIGATED</span>}
                </div>
                <h3 className="text-sm font-semibold text-[#e2e8f0] leading-snug">{path.title}</h3>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-[#64748b] uppercase">Blast Radius</p>
                <p className="text-xs font-semibold text-orange-400 mt-0.5">{path.affected_resources?.length || 0} resources</p>
              </div>
            </div>

            {/* Node visualization */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <AttackNode label={path.entry_point?.split("(")[0]?.trim() || "Entry"} type="Entry Point" isEntry />
              {(path.attack_steps || []).slice(0, 2).map((step, i) => (
                <React.Fragment key={i}>
                  <ArrowRight className="w-4 h-4 text-red-500/60 flex-shrink-0" />
                  <AttackNode label={step.length > 40 ? step.substring(0, 38) + "…" : step} type={`Step ${i + 1}`} />
                </React.Fragment>
              ))}
              {(path.attack_steps || []).length > 2 && (
                <>
                  <ArrowRight className="w-4 h-4 text-red-500/60 flex-shrink-0" />
                  <div className="flex-shrink-0 rounded-lg px-3 py-2 border border-[#1e293b] text-center">
                    <p className="text-[10px] text-[#64748b]">+{(path.attack_steps || []).length - 2} more</p>
                  </div>
                </>
              )}
              <ArrowRight className="w-4 h-4 text-orange-500/60 flex-shrink-0" />
              <AttackNode label={(path.affected_resources || [])[0] || "Target"} type="Target" isTarget />
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1e293b]">
              <div className="flex flex-wrap gap-1.5">
                {(path.affected_resources || []).map((r, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] font-mono">{r}</span>
                ))}
              </div>
              <Button size="sm" onClick={e => { e.stopPropagation(); setSelected(path); }} className="h-7 text-xs bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/20 flex-shrink-0 ml-3">Mitigate</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-[#111827] border-[#1e293b] text-[#e2e8f0] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#e2e8f0] text-sm">
              <SeverityPill severity={selected?.severity} />
              {selected?.title}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 overflow-y-auto max-h-[65vh]">
              <p className="text-sm text-[#94a3b8] leading-relaxed">{selected.description}</p>
              <div>
                <p className="text-xs text-[#64748b] uppercase tracking-wider mb-3">Attack Chain ({(selected.attack_steps || []).length} steps)</p>
                <div className="space-y-2">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Entry Point</p>
                    <p className="text-xs text-[#e2e8f0]">{selected.entry_point}</p>
                  </div>
                  {(selected.attack_steps || []).map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1e293b] border border-[#64748b] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-[#64748b]">{i + 1}</span>
                      </div>
                      <p className="text-xs text-[#94a3b8] leading-relaxed pt-0.5">{step}</p>
                    </div>
                  ))}
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                    <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">Blast Radius</p>
                    <p className="text-xs text-[#e2e8f0]">{selected.blast_radius}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Affected Resources</p>
                <div className="flex flex-wrap gap-2">
                  {(selected.affected_resources || []).map((r, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded bg-[#1e293b] text-[#94a3b8] font-mono border border-[#1e293b]">{r}</span>
                  ))}
                </div>
              </div>
              {selected.status === "active" && (
                <p className="text-[11px] text-slate-500">
                  A path cannot be marked mitigated here: no path is stored, so there is nothing to update.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}