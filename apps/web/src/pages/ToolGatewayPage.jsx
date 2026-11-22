import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Shield, CheckCircle2, XCircle, Clock, AlertTriangle, BarChart2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const policyColors = {
  allow_all: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  require_approval: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  deny_all: "bg-red-500/15 text-red-400 border-red-500/30",
  rate_limited: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const categoryIcons = {
  api: "🌐", database: "🗄️", file_system: "📁", cloud: "☁️",
  communication: "💬", code_execution: "⚙️", search: "🔍", custom: "🔧",
};

function ToolCard({ tool, onSelect, onToggle }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-base">
            {categoryIcons[tool.category] || "🔧"}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{tool.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">{tool.category?.replace(/_/g, " ")}</p>
          </div>
        </div>
        <Switch checked={tool.status === "active"} onCheckedChange={(v) => onToggle(tool, v)} />
      </div>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{tool.description || "No description"}</p>
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${policyColors[tool.policy] || "bg-muted text-muted-foreground border-border"}`}>
          {tool.policy?.replace(/_/g, " ")}
        </span>
        <div className="text-right">
          <p className="text-xs font-bold text-foreground">{tool.calls_today ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">calls today</p>
        </div>
      </div>
    </div>
  );
}

export default function ToolGatewayPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", category: "api", description: "", policy: "require_approval", quota_limit: 1000, requires_approval: false });

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: () => base44.entities.ToolGateway.list(),
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => base44.entities.ApprovalRequest.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ToolGateway.create({ ...data, calls_today: 0, calls_total: 0 }),
    onSuccess: () => { qc.invalidateQueries(["tools"]); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ToolGateway.update(id, data),
    onSuccess: () => qc.invalidateQueries(["tools"]),
  });

  const approvalMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ApprovalRequest.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(["approvals"]),
  });

  const pendingApprovals = approvals.filter(a => a.status === "pending");

  const stats = {
    total: tools.length,
    active: tools.filter(t => t.status === "active").length,
    blocked: tools.filter(t => t.status === "blocked").length,
    callsToday: tools.reduce((s, t) => s + (t.calls_today || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Tool Gateway</h1>
          <p className="text-sm text-muted-foreground mt-1">Policy-bound tool access with approval gates and quota management</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> Register Tool</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Tools", value: stats.total, icon: Shield, color: "text-primary" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Blocked", value: stats.blocked, icon: XCircle, color: "text-red-400" },
          { label: "Calls Today", value: stats.callsToday, icon: BarChart2, color: "text-blue-400" },
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

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-yellow-400">Pending Approvals ({pendingApprovals.length})</h2>
          </div>
          <div className="space-y-2">
            {pendingApprovals.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.tool_name}: {a.action}</p>
                  <p className="text-xs text-muted-foreground">Agent: {a.agent_name || "—"} · Risk: <span className="capitalize">{a.risk_level}</span></p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => approvalMutation.mutate({ id: a.id, status: "approved" })}>Approve</Button>
                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs text-red-400 border-red-500/30" onClick={() => approvalMutation.mutate({ id: a.id, status: "rejected" })}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tool Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="bg-card border border-border rounded-xl p-5 h-40 animate-pulse" />)}
        </div>
      ) : tools.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tools registered</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(t => (
            <ToolCard key={t.id} tool={t}
              onToggle={(tool, active) => updateMutation.mutate({ id: tool.id, data: { status: active ? "active" : "inactive" } })} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Register Tool</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input placeholder="Tool name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-muted border-border" />
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["api", "database", "file_system", "cloud", "communication", "code_execution", "search", "custom"].map(c => (
                  <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.policy} onValueChange={v => setForm({ ...form, policy: v })}>
              <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["allow_all", "require_approval", "deny_all", "rate_limited"].map(p => (
                  <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Daily quota limit" value={form.quota_limit} onChange={e => setForm({ ...form, quota_limit: parseInt(e.target.value) || 0 })} className="bg-muted border-border" />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-muted border-border" rows={2} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>
                {createMutation.isPending ? "Registering..." : "Register"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}