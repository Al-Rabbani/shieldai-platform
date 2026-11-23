import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, CheckCircle2, XCircle, Clock, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const outcomeConfig = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failure: "bg-red-500/15 text-red-400 border-red-500/30",
  blocked: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

const eventIcons = {
  agent_action: "🤖", tool_call: "🔧", workflow_step: "⚙️", approval: "✅",
  auth: "🔐", data_access: "📊", config_change: "⚙️", artifact_created: "📦",
};

const riskColors = [
  "text-slate-400", "text-yellow-400", "text-orange-400", "text-red-400"
];

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [filterEvent, setFilterEvent] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditlogs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 200),
  });

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.actor?.toLowerCase().includes(search.toLowerCase()) || l.action?.toLowerCase().includes(search.toLowerCase()) || l.resource?.toLowerCase().includes(search.toLowerCase());
    const matchOutcome = filterOutcome === "all" || l.outcome === filterOutcome;
    const matchEvent = filterEvent === "all" || l.event_type === filterEvent;
    return matchSearch && matchOutcome && matchEvent;
  });

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.outcome === "success").length,
    failures: logs.filter(l => l.outcome === "failure").length,
    blocked: logs.filter(l => l.outcome === "blocked").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Immutable audit trail for every agent decision, tool call, and system action</p>
        </div>
        <Button variant="outline" className="gap-2 text-xs">
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: stats.total, icon: Shield, color: "text-primary" },
          { label: "Successful", value: stats.success, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Failures", value: stats.failures, icon: XCircle, color: "text-red-400" },
          { label: "Blocked", value: stats.blocked, icon: AlertTriangle, color: "text-orange-400" },
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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search actor, action, resource..." value={search} onChange={e => setSearch(e.target.value)} className="bg-card border-border max-w-xs h-9 text-sm" />
        <Select value={filterOutcome} onValueChange={setFilterOutcome}>
          <SelectTrigger className="bg-card border-border w-36 h-9 text-sm"><SelectValue placeholder="Outcome" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            {["success", "failure", "blocked", "pending"].map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEvent} onValueChange={setFilterEvent}>
          <SelectTrigger className="bg-card border-border w-40 h-9 text-sm"><SelectValue placeholder="Event Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {["agent_action", "tool_call", "workflow_step", "approval", "auth", "data_access", "config_change", "artifact_created"].map(e => (
              <SelectItem key={e} value={e}>{e.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              {["Event", "Actor", "Resource", "Action", "Outcome", "Risk", "Time"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-2.5"><div className="h-3.5 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No audit events found</p>
              </td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span>{eventIcons[l.event_type] || "📋"}</span>
                    <span className="text-muted-foreground capitalize">{l.event_type?.replace(/_/g, " ")}</span>
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs font-medium text-foreground">{l.actor}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{l.resource || "—"}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">{l.action}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${outcomeConfig[l.outcome]}`}>{l.outcome}</span>
                </td>
                <td className="px-4 py-2.5">
                  {l.risk_score != null ? (
                    <span className={`text-xs font-bold ${riskColors[Math.min(Math.floor(l.risk_score / 25), 3)]}`}>{l.risk_score}</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(l.created_date).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}