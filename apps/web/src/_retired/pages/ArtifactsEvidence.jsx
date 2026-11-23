import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Package, CheckCircle2, XCircle, Clock, Tag, FileCode, Database, FileText, Archive, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const typeIcons = { code: FileCode, config: FileText, report: FileText, dataset: Database, model: Star, log: FileText, evidence_pack: Package, other: Archive };

const statusConfig = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  verified: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  archived: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

function QualityBar({ score }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score || 0}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-7 text-right">{score ?? "—"}</span>
    </div>
  );
}

export default function ArtifactsEvidence() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState({ name: "", type: "code", description: "", workflow_name: "", agent_name: "", version: "1.0.0" });

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: ["artifacts"],
    queryFn: () => base44.entities.Artifact.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Artifact.create({ ...data, status: "pending" }),
    onSuccess: () => { qc.invalidateQueries(["artifacts"]); setShowCreate(false); setForm({ name: "", type: "code", description: "", workflow_name: "", agent_name: "", version: "1.0.0" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Artifact.update(id, data),
    onSuccess: () => { qc.invalidateQueries(["artifacts"]); if (selected) setSelected(prev => ({ ...prev, ...arguments[0]?.data })); },
  });

  const filtered = filterType === "all" ? artifacts : artifacts.filter(a => a.type === filterType);

  const stats = {
    total: artifacts.length,
    verified: artifacts.filter(a => a.status === "verified").length,
    pending: artifacts.filter(a => a.status === "pending").length,
    avgQuality: artifacts.length ? Math.round(artifacts.reduce((s, a) => s + (a.quality_score || 0), 0) / artifacts.length) : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Artifacts & Evidence</h1>
          <p className="text-sm text-muted-foreground mt-1">Version-controlled artifact storage with lineage, quality scoring, and evidence packs</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> New Artifact</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Artifacts", value: stats.total, icon: Package, color: "text-primary" },
          { label: "Verified", value: stats.verified, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-yellow-400" },
          { label: "Avg Quality", value: `${stats.avgQuality}%`, icon: Star, color: "text-blue-400" },
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

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "code", "config", "report", "dataset", "model", "log", "evidence_pack", "other"].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filterType === t ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:border-primary/40"}`}>
            {t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              {["Artifact", "Type", "Status", "Version", "Workflow", "Quality", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No artifacts found</p>
              </td></tr>
            ) : filtered.map(a => {
              const Icon = typeIcons[a.type] || Archive;
              return (
                <tr key={a.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setSelected(a)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{a.type?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${statusConfig[a.status]}`}>{a.status}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{a.version || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{a.workflow_name || "—"}</td>
                  <td className="px-4 py-3 w-32"><QualityBar score={a.quality_score} /></td>
                  <td className="px-4 py-3">
                    {a.status === "pending" && (
                      <Button size="sm" className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={e => { e.stopPropagation(); updateMutation.mutate({ id: a.id, data: { status: "verified", quality_score: 85 } }); }}>
                        Verify
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>New Artifact</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input placeholder="Artifact name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-muted border-border" />
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["code", "config", "report", "dataset", "model", "log", "evidence_pack", "other"].map(t => (
                  <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Version" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} className="bg-muted border-border" />
            <Input placeholder="Workflow name (optional)" value={form.workflow_name} onChange={e => setForm({ ...form, workflow_name: e.target.value })} className="bg-muted border-border" />
            <Input placeholder="Agent name (optional)" value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} className="bg-muted border-border" />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-muted border-border" rows={2} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Type", value: selected.type },
                  { label: "Status", value: selected.status },
                  { label: "Version", value: selected.version || "—" },
                  { label: "Quality Score", value: selected.quality_score ?? "—" },
                  { label: "Size", value: selected.size_kb ? `${selected.size_kb} KB` : "—" },
                  { label: "Checksum", value: selected.checksum || "—" },
                ].map(r => (
                  <div key={r.label} className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5 capitalize font-mono">{r.value}</p>
                  </div>
                ))}
              </div>
              {selected.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map(t => <span key={t} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">{t}</span>)}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}