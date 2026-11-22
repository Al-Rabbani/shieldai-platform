import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Play, Pause, GitBranch, Clock, CheckCircle2, XCircle, Zap, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/shared/StatusBadge";

const triggerIcons = { manual: "🖱️", scheduled: "⏰", event: "⚡", webhook: "🔗" };

function WorkflowRow({ wf, onSelect, onRun }) {
  return (
    <tr onClick={() => onSelect(wf)} className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{triggerIcons[wf.trigger_type] || "🔧"}</span>
          <div>
            <p className="text-sm font-medium text-foreground">{wf.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{wf.description}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><StatusBadge status={wf.status} /></td>
      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{wf.trigger_type}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{wf.steps_count ?? 0} steps</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{wf.run_count ?? 0} runs</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{wf.success_rate != null ? `${wf.success_rate}%` : "—"}</td>
      <td className="px-4 py-3">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
          onClick={e => { e.stopPropagation(); onRun(wf); }}>
          <Play className="w-3 h-3" /> Run
        </Button>
      </td>
    </tr>
  );
}

export default function WorkflowEngine() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", trigger_type: "manual", steps_count: 0 });

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => base44.entities.Workflow.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Workflow.create({ ...data, status: "draft", run_count: 0 }),
    onSuccess: () => { qc.invalidateQueries(["workflows"]); setShowCreate(false); setForm({ name: "", description: "", trigger_type: "manual", steps_count: 0 }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Workflow.update(id, data),
    onSuccess: () => qc.invalidateQueries(["workflows"]),
  });

  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.status === "active").length,
    running: workflows.filter(w => w.status === "running").length,
    avgSuccess: workflows.length ? Math.round(workflows.reduce((s, w) => s + (w.success_rate || 0), 0) / workflows.length) : 0,
  };

  const handleRun = (wf) => {
    updateMutation.mutate({ id: wf.id, data: { status: "running", last_run: new Date().toISOString(), run_count: (wf.run_count || 0) + 1 } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Workflow Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Orchestrate multi-step AI workflows with branching and human-in-the-loop checkpoints</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> New Workflow</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Workflows", value: stats.total, icon: GitBranch, color: "text-primary" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Running", value: stats.running, icon: Zap, color: "text-blue-400" },
          { label: "Avg Success Rate", value: `${stats.avgSuccess}%`, icon: BarChart2, color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              {["Workflow", "Status", "Trigger", "Steps", "Runs", "Success Rate", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : workflows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">
                <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No workflows yet. Create your first one.</p>
              </td></tr>
            ) : (
              workflows.map(wf => <WorkflowRow key={wf.id} wf={wf} onSelect={setSelected} onRun={handleRun} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>New Workflow</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input placeholder="Workflow name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-muted border-border" />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-muted border-border" rows={2} />
            <Select value={form.trigger_type} onValueChange={v => setForm({ ...form, trigger_type: v })}>
              <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Trigger type" /></SelectTrigger>
              <SelectContent>
                {["manual", "scheduled", "event", "webhook"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Number of steps" value={form.steps_count} onChange={e => setForm({ ...form, steps_count: parseInt(e.target.value) || 0 })} className="bg-muted border-border" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Status", value: selected.status },
                  { label: "Trigger", value: selected.trigger_type },
                  { label: "Steps", value: selected.steps_count ?? 0 },
                  { label: "Run Count", value: selected.run_count ?? 0 },
                  { label: "Success Rate", value: selected.success_rate != null ? `${selected.success_rate}%` : "—" },
                  { label: "Last Run", value: selected.last_run ? new Date(selected.last_run).toLocaleString() : "Never" },
                ].map(r => (
                  <div key={r.label} className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5 capitalize">{r.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                {["active", "paused", "draft"].map(s => (
                  <Button key={s} size="sm" variant={selected.status === s ? "default" : "outline"} className="capitalize text-xs"
                    onClick={() => { updateMutation.mutate({ id: selected.id, data: { status: s } }); setSelected({ ...selected, status: s }); }}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}