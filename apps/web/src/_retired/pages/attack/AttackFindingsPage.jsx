import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SeverityPill from "@/components/code/SeverityPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Download, AlertTriangle, CheckCircle2, Zap } from "lucide-react";

const targetTypeBadge = { web_app: "bg-blue-500/15 text-blue-400", api: "bg-cyan-500/15 text-cyan-400", network: "bg-orange-500/15 text-orange-400", cloud: "bg-purple-500/15 text-purple-400", container: "bg-teal-500/15 text-teal-400", llm: "bg-[#C9A84C]/15 text-[#C9A84C]", mobile: "bg-pink-500/15 text-pink-400" };
const complexityBadge = { low: "text-red-400 bg-red-500/10 border-red-500/20", medium: "text-orange-400 bg-orange-500/10 border-orange-500/20", high: "text-green-400 bg-green-500/10 border-green-500/20" };
const statusStyle = { open: "text-red-400 bg-red-500/10 border-red-500/20", in_review: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", accepted_risk: "text-[#64748b] bg-[#1e293b] border-[#1e293b]", fixed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };

export default function AttackFindingsPage() {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [campFilter, setCampFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [exploitedFilter, setExploitedFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: findings = [] } = useQuery({ queryKey: ["attack-findings"], queryFn: () => base44.entities.AttackFinding.list("-created_date", 100) });
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: () => base44.entities.PentestCampaign.list("-created_date", 10) });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AttackFinding.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attack-findings"] }); },
  });

  const filtered = findings.filter(f => {
    const matchSearch = !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.agent_codename?.includes(search) || f.target?.includes(search);
    const matchSev = sevFilter === "all" || f.severity === sevFilter;
    const matchCamp = campFilter === "all" || f.campaign_name === campFilter;
    const matchType = typeFilter === "all" || f.target_type === typeFilter;
    const matchExpl = exploitedFilter === "all" || (exploitedFilter === "yes" ? f.exploited : !f.exploited);
    return matchSearch && matchSev && matchCamp && matchType && matchExpl;
  });

  const stats = {
    total: findings.length, critical: findings.filter(f => f.severity === "critical").length,
    exploited: findings.filter(f => f.exploited).length, open: findings.filter(f => f.status === "open").length,
  };

  return (
    <div className="space-y-6 bg-[#050810] min-h-screen -m-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Attack Findings</h1>
          <p className="text-sm text-[#64748b] mt-0.5">All vulnerabilities discovered by Super Agents across all campaigns</p>
        </div>
        <Button variant="outline" className="border-[#1e293b] text-[#94a3b8] hover:text-[#e2e8f0] gap-2">
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[["Total", stats.total, "text-[#e2e8f0]"], ["Critical", stats.critical, "text-red-400"], ["Exploited", stats.exploited, "text-amber-400"], ["Open", stats.open, "text-orange-400"]].map(([l, v, c]) => (
          <div key={l} className="bg-[#0D1117] border border-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{l}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0D1117] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1e293b] flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search findings, agents, targets..." className="pl-9 bg-[#050810] border-[#1e293b] text-[#e2e8f0] text-sm h-9" />
          </div>
          <Select value={sevFilter} onValueChange={setSevFilter}>
            <SelectTrigger className="w-28 bg-[#050810] border-[#1e293b] text-[#e2e8f0] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#111827] border-[#1e293b]">{["all","critical","high","medium","low","info"].map(s => <SelectItem key={s} value={s} className="text-[#e2e8f0] capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={campFilter} onValueChange={setCampFilter}>
            <SelectTrigger className="w-44 bg-[#050810] border-[#1e293b] text-[#e2e8f0] h-9 text-sm"><SelectValue placeholder="Campaign" /></SelectTrigger>
            <SelectContent className="bg-[#111827] border-[#1e293b]">
              <SelectItem value="all" className="text-[#e2e8f0]">All Campaigns</SelectItem>
              {campaigns.map(c => <SelectItem key={c.id} value={c.name} className="text-[#e2e8f0]">{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-28 bg-[#050810] border-[#1e293b] text-[#e2e8f0] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#111827] border-[#1e293b]">{["all","web_app","api","cloud","llm","container","network","mobile"].map(s => <SelectItem key={s} value={s} className="text-[#e2e8f0]">{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={exploitedFilter} onValueChange={setExploitedFilter}>
            <SelectTrigger className="w-28 bg-[#050810] border-[#1e293b] text-[#e2e8f0] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#111827] border-[#1e293b]">
              <SelectItem value="all" className="text-[#e2e8f0]">All</SelectItem>
              <SelectItem value="yes" className="text-amber-400">Exploited</SelectItem>
              <SelectItem value="no" className="text-[#e2e8f0]">Not Exploited</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#1e293b]">{["Sev","Agent","Campaign","Target","Type","Finding","CVSS","Exploited","Complexity","Status"].map(h => <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} onClick={() => setSelected(f)} className="border-b border-[#1e293b] hover:bg-[#1e293b]/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3"><SeverityPill severity={f.severity} /></td>
                  <td className="px-4 py-3 text-xs font-mono text-[#94a3b8] whitespace-nowrap">{f.agent_codename}</td>
                  <td className="px-4 py-3 text-xs text-[#64748b] whitespace-nowrap max-w-[120px] truncate">{f.campaign_name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[#94a3b8] max-w-[120px] truncate">{f.target}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${targetTypeBadge[f.target_type]}`}>{f.target_type}</span></td>
                  <td className="px-4 py-3 max-w-[200px]"><p className="text-xs font-medium text-[#e2e8f0] line-clamp-2">{f.title}</p></td>
                  <td className="px-4 py-3"><span className={`text-xs font-mono font-bold ${f.cvss_score >= 9 ? "text-red-400" : f.cvss_score >= 7 ? "text-orange-400" : "text-yellow-400"}`}>{f.cvss_score?.toFixed(1)}</span></td>
                  <td className="px-4 py-3">{f.exploited ? <span className="text-[11px] px-2 py-0.5 rounded border text-amber-400 border-amber-500/30 bg-amber-500/10">✓ YES</span> : <span className="text-[#475569] text-xs">—</span>}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${complexityBadge[f.exploit_complexity]}`}>{f.exploit_complexity}</span></td>
                  <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded border capitalize ${statusStyle[f.status]}`}>{f.status?.replace("_", " ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-[#0D1117] border-[#1e293b] text-[#e2e8f0] max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#e2e8f0] text-sm">
              <SeverityPill severity={selected?.severity} />
              {selected?.title}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-4 gap-3 text-xs">
                {[["Agent", selected.agent_codename], ["Campaign", selected.campaign_name], ["Target", selected.target], ["CVSS", selected.cvss_score?.toFixed(1)]].map(([l, v]) => (
                  <div key={l} className="bg-[#050810] rounded-lg p-3"><p className="text-[#64748b] mb-1">{l}</p><p className="text-[#e2e8f0] font-mono">{v}</p></div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.cwe_id && <span className="text-xs px-2.5 py-1 rounded bg-[#1e293b] text-[#94a3b8] font-mono">{selected.cwe_id}</span>}
                {selected.owasp_category && <span className="text-xs px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{selected.owasp_category}</span>}
                {selected.exploited && <span className="text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">EXPLOITED</span>}
              </div>
              {selected.description && <div><p className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Description</p><p className="text-sm text-[#94a3b8] leading-relaxed">{selected.description}</p></div>}
              {selected.proof_of_concept && <div><p className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Proof of Concept</p><pre className="bg-[#050810] border border-[#1e293b] rounded-lg p-4 text-xs font-mono text-emerald-300 whitespace-pre-wrap overflow-x-auto">{selected.proof_of_concept}</pre></div>}
              {selected.impact && <div><p className="text-xs text-[#64748b] uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-orange-400" />Impact</p><p className="text-sm text-orange-300 leading-relaxed">{selected.impact}</p></div>}
              {selected.reproduction_steps && <div><p className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Reproduction Steps</p><pre className="bg-[#050810] border border-[#1e293b] rounded-lg p-4 text-xs font-mono text-[#94a3b8] whitespace-pre-wrap overflow-x-auto">{selected.reproduction_steps}</pre></div>}
              {selected.remediation && <div><p className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Remediation</p><pre className="bg-emerald-950/30 border border-emerald-900/30 rounded-lg p-4 text-xs font-mono text-emerald-300 whitespace-pre-wrap overflow-x-auto">{selected.remediation}</pre></div>}
              <div className="flex gap-3 pt-1">
                <Button onClick={() => update.mutate({ id: selected.id, data: { status: "in_review" } })} variant="outline" className="border-[#1e293b] text-[#94a3b8]">Mark In Review</Button>
                <Button onClick={() => update.mutate({ id: selected.id, data: { status: "fixed" } })} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"><CheckCircle2 className="w-4 h-4 mr-1" />Mark Fixed</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}