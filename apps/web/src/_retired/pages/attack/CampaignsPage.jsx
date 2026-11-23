import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SeverityPill from "@/components/code/SeverityPill";
import { Target, Play, Pause, Plus, BarChart3, Shield } from "lucide-react";

const typeBadge = { continuous: "bg-red-500/15 text-red-400 border-red-500/30", scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/30", on_demand: "bg-amber-500/15 text-amber-400 border-amber-500/30", cicd: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
const statusStyle = { active: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", paused: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10", completed: "text-[#64748b] border-[#1e293b]", scheduled: "text-blue-400 border-blue-500/30 bg-blue-500/10" };

export default function CampaignsPage() {
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", type: "on_demand", target_scope: "", agents_deployed: 0 });
  const qc = useQueryClient();

  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: () => base44.entities.PentestCampaign.list("-created_date", 20) });
  const { data: findings = [] } = useQuery({ queryKey: ["attack-findings"], queryFn: () => base44.entities.AttackFinding.list("-created_date", 100) });

  const create = useMutation({
    mutationFn: () => base44.entities.PentestCampaign.create({ ...form, status: "active", start_date: new Date().toISOString(), coverage_percent: 0, total_findings: 0, critical_findings: 0, high_findings: 0, exploits_successful: 0, created_by: "admin" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns"] }); setNewOpen(false); setForm({ name: "", description: "", type: "on_demand", target_scope: "", agents_deployed: 0 }); },
  });

  const toggle = useMutation({
    mutationFn: (c) => base44.entities.PentestCampaign.update(c.id, { status: c.status === "active" ? "paused" : "active" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const campaignFindings = (name) => findings.filter(f => f.campaign_name === name);

  return (
    <div className="space-y-6 bg-[#050810] min-h-screen -m-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Campaign Control Center</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Manage autonomous pentest campaigns across all attack vectors</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 gap-2">
          <Plus className="w-4 h-4" /> New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map(c => {
          const cf = campaignFindings(c.name);
          return (
            <div key={c.id} className="bg-[#0D1117] border border-[#1e293b] hover:border-red-900/40 rounded-2xl p-5 cursor-pointer transition-all" onClick={() => setSelected(c)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded uppercase font-bold border ${typeBadge[c.type]}`}>{c.type}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded border ${statusStyle[c.status]}`}>{c.status}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#e2e8f0]">{c.name}</h3>
                  <p className="text-xs text-[#64748b] mt-1 line-clamp-2">{c.description}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-2xl font-black font-mono text-amber-400">{c.agents_deployed}</p>
                  <p className="text-[10px] text-[#64748b]">agents</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#64748b]">Coverage</span>
                  <span className="font-mono text-[#C9A84C]">{c.coverage_percent}%</span>
                </div>
                <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-amber-400 transition-all" style={{ width: `${c.coverage_percent}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                {[["TOTAL", c.total_findings, "text-[#e2e8f0]"], ["CRITICAL", c.critical_findings, "text-red-400"], ["HIGH", c.high_findings, "text-orange-400"], ["EXPLOITS", c.exploits_successful, "text-amber-400"]].map(([l, v, color]) => (
                  <div key={l} className="bg-[#050810] rounded-lg p-2">
                    <p className="text-[9px] font-bold" style={{ color: color.includes("red") ? "#f87171" : color.includes("orange") ? "#fb923c" : color.includes("amber") ? "#fbbf24" : "#94a3b8" }}>{l}</p>
                    <p className={`text-sm font-mono font-black ${color}`}>{v}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#475569] truncate mr-4">Scope: {c.target_scope}</p>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); toggle.mutate(c); }} className={`text-[11px] px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${c.status === "active" ? "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}>
                    {c.status === "active" ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Resume</>}
                  </button>
                  <button className="text-[11px] px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 flex items-center gap-1.5 transition-all">
                    <BarChart3 className="w-3 h-3" /> Report
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Campaign Modal */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-[#0D1117] border-[#1e293b] text-[#e2e8f0]">
          <DialogHeader><DialogTitle className="text-[#e2e8f0]">New Pentest Campaign</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {[["name","Campaign Name","e.g. API Security Sweep Q3"],["target_scope","Target Scope","e.g. *.acme.corp, api.acme.corp"],["description","Description","Describe the campaign objective..."]].map(([k, l, p]) => (
              <div key={k}>
                <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">{l}</label>
                {k === "description" ? <textarea value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={p} rows={3} className="w-full bg-[#050810] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder:text-[#475569] resize-none focus:outline-none focus:ring-1 focus:ring-red-500/30" /> : <Input value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={p} className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]" />}
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Type</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111827] border-[#1e293b]">
                    {["continuous","scheduled","on_demand","cicd"].map(t => <SelectItem key={t} value={t} className="text-[#e2e8f0] capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Agents to Deploy</label>
                <Input type="number" value={form.agents_deployed} onChange={e => setForm({ ...form, agents_deployed: parseInt(e.target.value) || 0 })} className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]" />
              </div>
            </div>
            <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending} className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold">
              {create.isPending ? "Launching..." : "Launch Campaign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-[#0D1117] border-[#1e293b] text-[#e2e8f0] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#e2e8f0]">
              <Target className="w-5 h-5 text-red-400" />
              {selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 overflow-y-auto max-h-[65vh]">
              <p className="text-sm text-[#94a3b8] leading-relaxed">{selected.description}</p>
              <div className="bg-[#050810] rounded-lg p-3">
                <p className="text-xs text-[#64748b] mb-1">Target Scope</p>
                <p className="text-xs font-mono text-[#94a3b8]">{selected.target_scope}</p>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[["Findings", selected.total_findings, "text-[#e2e8f0]"], ["Critical", selected.critical_findings, "text-red-400"], ["Coverage", `${selected.coverage_percent}%`, "text-[#C9A84C]"], ["Agents", selected.agents_deployed, "text-amber-400"]].map(([l, v, c]) => (
                  <div key={l} className="bg-[#050810] rounded-lg p-3"><p className="text-[10px] text-[#64748b]">{l}</p><p className={`text-lg font-bold font-mono mt-1 ${c}`}>{v}</p></div>
                ))}
              </div>
              <div>
                <p className="text-xs text-[#64748b] uppercase tracking-wider mb-3">Findings in this Campaign</p>
                <div className="space-y-2">
                  {campaignFindings(selected.name).map(f => (
                    <div key={f.id} className="bg-[#050810] border border-[#1e293b] rounded-lg p-3 flex items-center gap-3">
                      <SeverityPill severity={f.severity} />
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium text-[#e2e8f0] truncate">{f.title}</p><p className="text-[11px] text-[#64748b]">{f.agent_codename} · {f.target}</p></div>
                      {f.exploited && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0">EXPLOITED</span>}
                    </div>
                  ))}
                  {campaignFindings(selected.name).length === 0 && <p className="text-xs text-[#64748b]">No findings loaded for this campaign.</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}