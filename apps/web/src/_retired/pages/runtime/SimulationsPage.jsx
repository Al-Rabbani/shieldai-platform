import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, Plus, Loader2, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS_STYLE = { completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", running: "text-amber-400 bg-amber-500/10 border-amber-500/20", queued: "text-blue-400 bg-blue-500/10 border-blue-500/20", failed: "text-red-400 bg-red-500/10 border-red-500/20" };
const SCENARIO_ICONS = { blast_radius: "💥", what_if: "🤔", kill_chain_replay: "🔗", lateral_movement_map: "🗺️", data_exfiltration_path: "📤", persistence_test: "🔒" };

function BlastGauge({ score }) {
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  const r = 36; const circ = 2 * Math.PI * r;
  const dash = score ? (score / 100) * circ : 0;
  return (
    <div className="flex flex-col items-center">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
        <text x="44" y="49" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">{score ?? "—"}</text>
      </svg>
      <p className="text-[10px] text-[#64748b] -mt-1">blast radius</p>
    </div>
  );
}

function SimCard({ sim, onClick }) {
  const prog = sim.steps_total > 0 ? (sim.steps_completed / sim.steps_total) * 100 : 0;
  const sysList = (() => { try { return JSON.parse(sim.affected_systems || "[]"); } catch { return []; } })();
  return (
    <div onClick={onClick} className="bg-[#111827] border border-[#1e293b] hover:border-[#334155] rounded-2xl p-5 cursor-pointer transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{SCENARIO_ICONS[sim.scenario_type] || "🎯"}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${STATUS_STYLE[sim.status]}`}>{sim.status}</span>
            {sim.status === "running" && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
          </div>
          <h3 className="text-sm font-semibold text-[#e2e8f0]">{sim.name}</h3>
          <p className="text-[11px] text-[#64748b] capitalize mt-0.5">{sim.scenario_type.replace(/_/g, " ")}</p>
        </div>
        <BlastGauge score={sim.blast_radius_score} />
      </div>
      {(sim.status === "running" || sim.status === "queued") && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-[#64748b] mb-1"><span>Progress</span><span>{sim.steps_completed}/{sim.steps_total} steps</span></div>
          <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${prog}%` }} /></div>
        </div>
      )}
      {sysList.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">{sysList.slice(0, 4).map(s => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e293b] text-[#64748b]">{s}</span>)}{sysList.length > 4 && <span className="text-[10px] text-[#475569]">+{sysList.length - 4}</span>}</div>
      )}
      {sim.agent_name && <p className="text-[10px] font-mono text-[#64748b]">{sim.agent_name}</p>}
    </div>
  );
}

function SimDetail({ sim, onClose }) {
  const path = (() => { try { return JSON.parse(sim.attack_path || "[]"); } catch { return []; } })();
  const recs = (() => { try { return typeof sim.recommendations === "string" ? sim.recommendations.split("\n").filter(Boolean) : []; } catch { return []; } })();
  return (
    <DialogContent className="bg-[#111827] border-[#1e293b] text-[#e2e8f0] max-w-2xl">
      <DialogHeader><DialogTitle className="text-[#e2e8f0] flex items-center gap-2"><Target className="w-4 h-4 text-red-400" />{sim.name}</DialogTitle></DialogHeader>
      <div className="space-y-4 overflow-y-auto max-h-[70vh]">
        <div className="flex items-center gap-4">
          <BlastGauge score={sim.blast_radius_score} />
          <div>
            <p className="text-xs text-[#64748b] capitalize">{sim.scenario_type.replace(/_/g, " ")}</p>
            <p className="text-xs text-[#94a3b8] mt-1">{sim.target_scope}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded border mt-2 inline-block capitalize ${STATUS_STYLE[sim.status]}`}>{sim.status}</span>
          </div>
        </div>
        {path.length > 0 && (
          <div>
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider mb-3">Attack Path</p>
            <div className="space-y-2">
              {path.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-[10px] font-bold text-red-400 flex-shrink-0">{step.step || i + 1}</div>
                  <p className="text-xs text-[#94a3b8] pt-0.5 leading-relaxed">{step.action}</p>
                  {i < path.length - 1 && <ChevronRight className="w-3 h-3 text-[#334155] mt-1 flex-shrink-0 ml-auto" />}
                </div>
              ))}
            </div>
          </div>
        )}
        {recs.length > 0 && (
          <div>
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider mb-2">Recommendations</p>
            <div className="space-y-1.5">
              {recs.map((r, i) => <div key={i} className="flex gap-2 text-xs text-[#94a3b8]"><span className="text-emerald-400 flex-shrink-0">→</span>{r.replace(/^\d+\.\s*/, "")}</div>)}
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

export default function SimulationsPage() {
  const [selected, setSelected] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ name: "", scenario_type: "blast_radius", target_scope: "", source_finding_id: "" });
  const qc = useQueryClient();

  const { data: sims = [] } = useQuery({ queryKey: ["simulations"], queryFn: () => base44.entities.AttackSimulation.list("-created_date", 20) });

  const createSim = useMutation({
    mutationFn: () => base44.entities.AttackSimulation.create({ ...form, status: "queued", steps_total: 15, steps_completed: 0, agent_name: "RED-002", started_at: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["simulations"] }); setNewOpen(false); setForm({ name: "", scenario_type: "blast_radius", target_scope: "", source_finding_id: "" }); },
  });

  const completed = sims.filter(s => s.status === "completed").length;
  const running = sims.filter(s => s.status === "running").length;
  const avgScore = Math.round(sims.filter(s => s.blast_radius_score).reduce((a, b) => a + b.blast_radius_score, 0) / (sims.filter(s => s.blast_radius_score).length || 1));

  return (
    <div className="bg-[#0a0f1e] min-h-screen -m-6 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] flex items-center gap-2"><Target className="w-6 h-6 text-red-400" /> Attack Simulation Lab</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Blast radius analysis · Kill chain replay · Lateral movement mapping</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 gap-2"><Plus className="w-4 h-4" /> New Simulation</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[["Total Sims", sims.length, "text-[#e2e8f0]"], ["Completed", completed, "text-emerald-400"], ["Running", running, "text-amber-400"], ["Avg Blast Score", isNaN(avgScore) ? "—" : avgScore, "text-red-400"]].map(([l, v, c]) => (
          <div key={l} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{l}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {sims.map(sim => <SimCard key={sim.id} sim={sim} onClick={() => setSelected(sim)} />)}
      </div>

      {selected && <Dialog open={!!selected} onOpenChange={() => setSelected(null)}><SimDetail sim={selected} onClose={() => setSelected(null)} /></Dialog>}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-[#111827] border-[#1e293b] text-[#e2e8f0]">
          <DialogHeader><DialogTitle>New Attack Simulation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1.5 block">Simulation Name</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Payment API Blast Radius" className="bg-[#0a0f1e] border-[#1e293b] text-[#e2e8f0]" /></div>
            <div><label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1.5 block">Scenario Type</label>
              <Select value={form.scenario_type} onValueChange={v => setForm({ ...form, scenario_type: v })}>
                <SelectTrigger className="bg-[#0a0f1e] border-[#1e293b] text-[#e2e8f0]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111827] border-[#1e293b]">{["blast_radius", "what_if", "kill_chain_replay", "lateral_movement_map", "data_exfiltration_path", "persistence_test"].map(t => <SelectItem key={t} value={t} className="text-[#e2e8f0] capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1.5 block">Target Scope</label><Input value={form.target_scope} onChange={e => setForm({ ...form, target_scope: e.target.value })} placeholder="e.g. payment-api, 10.0.0.0/8" className="bg-[#0a0f1e] border-[#1e293b] text-[#e2e8f0]" /></div>
            <div><label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1.5 block">Source Finding ID (optional)</label><Input value={form.source_finding_id} onChange={e => setForm({ ...form, source_finding_id: e.target.value })} placeholder="e.g. threat-001" className="bg-[#0a0f1e] border-[#1e293b] text-[#e2e8f0]" /></div>
            <Button onClick={() => createSim.mutate()} disabled={!form.name || createSim.isPending} className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30">{createSim.isPending ? "Queuing..." : "Queue Simulation"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}