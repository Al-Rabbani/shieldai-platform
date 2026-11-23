import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Zap, Plus, Trash2, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import SeverityBadge from "@/components/shared/SeverityBadge";

const DEFAULT_RULES = [
  { id: "ar1", team: "platform", owner: "alice@company.com", severity: "critical" },
  { id: "ar2", team: "backend", owner: "bob@company.com", severity: "critical" },
  { id: "ar3", team: "infra", owner: "charlie@company.com", severity: "critical" },
  { id: "ar4", team: "frontend", owner: "dana@company.com", severity: "high" },
];

export default function AutoAssignPage() {
  const [assignRules, setAssignRules] = useState(DEFAULT_RULES);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: vulns = [] } = useQuery({
    queryKey: ["autoassign-vulns"],
    queryFn: () => base44.entities.Vulnerability.filter({ status: "open" }),
    initialData: [],
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["autoassign-assets"],
    queryFn: () => base44.entities.ASPMAsset.list(),
    initialData: [],
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vulnerability.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["autoassign-vulns"] }),
  });

  const addRule = () => {
    setAssignRules(prev => [...prev, { id: "ar_" + Date.now(), team: "", owner: "", severity: "critical" }]);
  };

  const deleteRule = (id) => setAssignRules(prev => prev.filter(r => r.id !== id));
  const updateRule = (id, field, val) => setAssignRules(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));

  const runAssignment = async () => {
    setRunning(true);
    setResults([]);
    const log = [];

    const targets = vulns.filter(v =>
      ["critical", "high"].includes(v.severity) && !v.assignee
    );

    for (const vuln of targets) {
      // Find matching asset
      const asset = assets.find(a =>
        a.name && vuln.asset_name &&
        (a.name.toLowerCase() === vuln.asset_name.toLowerCase() || vuln.asset_name.toLowerCase().includes(a.name.toLowerCase()))
      );

      const team = asset?.team?.toLowerCase() || "";
      const rule = assignRules.find(r =>
        r.severity === vuln.severity &&
        (r.team === "" || team.includes(r.team.toLowerCase()))
      ) || assignRules.find(r => r.severity === vuln.severity);

      if (rule?.owner) {
        await updateMut.mutateAsync({ id: vuln.id, data: { assignee: rule.owner } });
        log.push({ vuln: vuln.title, assignee: rule.owner, team: asset?.team || "unknown", severity: vuln.severity });
      }
    }

    setResults(log);
    setRunning(false);
    toast({ title: `Auto-assigned ${log.length} findings`, description: "Critical & high vulns matched to team owners." });
  };

  const unassigned = vulns.filter(v => ["critical", "high"].includes(v.severity) && !v.assignee);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#6366F1]" /> Auto-Assignment Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">Automatically assign critical findings to the correct team owner</p>
        </div>
        <Button onClick={runAssignment} disabled={running || unassigned.length === 0}
          className="bg-[#6366F1] hover:bg-[#5558e3] text-white">
          <Zap className="w-4 h-4 mr-2" />
          {running ? "Assigning…" : `Run Assignment (${unassigned.length} unassigned)`}
        </Button>
      </div>

      {/* Assignment rules */}
      <div className="rounded-xl border border-[#1F2937] bg-[#111827] overflow-hidden">
        <div className="p-4 border-b border-[#1F2937] flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Team → Owner Rules</span>
          <Button size="sm" variant="outline" className="h-7 text-xs border-[#374151]" onClick={addRule}>
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <div className="divide-y divide-[#1F2937]">
          {assignRules.map(rule => (
            <div key={rule.id} className="p-4 flex items-center gap-4 flex-wrap">
              <div>
                <Label className="text-[10px] text-slate-500 block mb-1">Team (keyword)</Label>
                <Input value={rule.team} onChange={e => updateRule(rule.id, "team", e.target.value)}
                  placeholder="e.g. platform"
                  className="h-8 text-xs w-32 bg-[#1F2937] border-[#374151]" />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500 block mb-1">Assign To</Label>
                <Input value={rule.owner} onChange={e => updateRule(rule.id, "owner", e.target.value)}
                  placeholder="owner@company.com"
                  className="h-8 text-xs w-44 bg-[#1F2937] border-[#374151]" />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500 block mb-1">Min Severity</Label>
                <select value={rule.severity} onChange={e => updateRule(rule.id, "severity", e.target.value)}
                  className="h-8 text-xs rounded-lg px-2 bg-[#1F2937] border border-[#374151] text-white">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                </select>
              </div>
              <button onClick={() => deleteRule(rule.id)} className="mt-4 text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
          <div className="p-4 border-b border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">{results.length} Assignments Made</span>
          </div>
          <div className="divide-y divide-emerald-500/10">
            {results.map((r, i) => (
              <div key={i} className="p-3 flex items-center gap-3 text-xs">
                <SeverityBadge severity={r.severity} />
                <span className="text-white flex-1 truncate">{r.vuln}</span>
                <span className="text-slate-400">{r.team}</span>
                <span className="text-emerald-400 font-mono">{r.assignee}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unassigned preview */}
      <div className="rounded-xl border border-[#1F2937] bg-[#111827] overflow-hidden">
        <div className="p-4 border-b border-[#1F2937] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Unassigned Critical/High Findings</span>
          <span className="ml-auto text-xs font-mono text-amber-400">{unassigned.length}</span>
        </div>
        <div className="divide-y divide-[#1F2937] max-h-64 overflow-y-auto">
          {unassigned.slice(0, 20).map(v => (
            <div key={v.id} className="p-3 flex items-center gap-3 text-xs">
              <SeverityBadge severity={v.severity} />
              <span className="text-white flex-1 truncate">{v.title}</span>
              <span className="text-slate-500">{v.asset_name || "—"}</span>
            </div>
          ))}
          {unassigned.length === 0 && (
            <div className="p-6 text-center text-slate-500">All critical/high findings are assigned!</div>
          )}
        </div>
      </div>
    </div>
  );
}