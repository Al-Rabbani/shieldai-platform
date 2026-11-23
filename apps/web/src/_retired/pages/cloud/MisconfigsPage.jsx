import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AgentHealthCard from "@/components/code/AgentHealthCard";
import SeverityPill from "@/components/code/SeverityPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Play, Globe, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";

const providerBadge = { aws: "bg-orange-500/15 text-orange-400 border-orange-500/30", gcp: "bg-blue-500/15 text-blue-400 border-blue-500/30", azure: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" };
const serviceIcons = { iam: "🔑", s3: "🪣", ec2: "🖥️", rds: "🗄️", lambda: "λ", vpc: "🌐", cloudtrail: "📋", kms: "🔐", network: "🔌", kubernetes: "☸️", other: "⚙️" };
const frameworkColors = { cis: "bg-blue-500/15 text-blue-400", nist: "bg-purple-500/15 text-purple-400", soc2: "bg-teal-500/15 text-teal-400", pci: "bg-red-500/15 text-red-400", hipaa: "bg-pink-500/15 text-pink-400", gdpr: "bg-orange-500/15 text-orange-400" };

export default function MisconfigsPage() {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [svcFilter, setSvcFilter] = useState("all");
  const [provFilter, setProvFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: findings = [] } = useQuery({ queryKey: ["misconfigs"], queryFn: () => base44.entities.CloudMisconfiguration.list("-created_date", 100) });

  const updateFinding = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CloudMisconfiguration.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["misconfigs"] }); setSelected(null); },
  });

  const filtered = findings.filter(f => {
    const matchSearch = !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.resource_name?.includes(search);
    const matchSev = sevFilter === "all" || f.severity === sevFilter;
    const matchSvc = svcFilter === "all" || f.service === svcFilter;
    const matchProv = provFilter === "all" || f.provider === provFilter;
    return matchSearch && matchSev && matchSvc && matchProv;
  });

  const stats = {
    total: findings.length, critical: findings.filter(f => f.severity === "critical").length,
    public: findings.filter(f => f.is_public_facing).length, fixable: findings.filter(f => f.autofix_available).length,
  };

  return (
    <div className="space-y-6 bg-[#0A0E1A] min-h-screen -m-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Cloud Misconfigurations (CSPM)</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Powered by CSPMAgent-v1 · CIS, NIST, SOC2, PCI-DSS, HIPAA mapping</p>
        </div>
        <Button className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold gap-2">
          <Play className="w-4 h-4" /> Scan All Accounts
        </Button>
      </div>

      <AgentHealthCard name="CSPMAgent-v1" health={96} status="online" tasksToday={68} type="executor" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Findings", value: stats.total, color: "text-[#e2e8f0]" },
          { label: "Critical", value: stats.critical, color: "text-red-400" },
          { label: "Public-Facing", value: stats.public, color: "text-orange-400" },
          { label: "Auto-Fixable", value: stats.fixable, color: "text-[#C9A84C]" },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1e293b] flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search findings..." className="pl-9 bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0] text-sm h-9" />
          </div>
          {[
            { value: provFilter, set: setProvFilter, opts: ["all", "aws", "gcp", "azure"], w: "w-28" },
            { value: svcFilter, set: setSvcFilter, opts: ["all", "iam", "s3", "ec2", "rds", "lambda", "vpc", "cloudtrail", "kubernetes", "network", "other"], w: "w-32" },
            { value: sevFilter, set: setSevFilter, opts: ["all", "critical", "high", "medium", "low"], w: "w-28" },
          ].map((f, i) => (
            <Select key={i} value={f.value} onValueChange={f.set}>
              <SelectTrigger className={`${f.w} bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0] h-9 text-sm`}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#111827] border-[#1e293b]">
                {f.opts.map(o => <SelectItem key={o} value={o} className="text-[#e2e8f0] capitalize">{o}</SelectItem>)}
              </SelectContent>
            </Select>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e293b]">
                {["Service", "Resource", "Finding", "Provider", "Region", "Severity", "Frameworks", "Public", "AutoFix", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} onClick={() => setSelected(f)} className="border-b border-[#1e293b] hover:bg-[#1e293b]/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-lg">{serviceIcons[f.service] || "⚙️"}</td>
                  <td className="px-4 py-3 max-w-[140px]">
                    <p className="text-xs font-mono text-[#e2e8f0] truncate">{f.resource_name}</p>
                    <p className="text-[10px] text-[#64748b] capitalize">{f.resource_type}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="text-xs font-medium text-[#e2e8f0] line-clamp-2">{f.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded uppercase font-bold border ${providerBadge[f.provider]}`}>{f.provider}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-[#64748b] whitespace-nowrap">{f.region}</td>
                  <td className="px-4 py-3"><SeverityPill severity={f.severity} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(f.compliance_frameworks || []).slice(0, 2).map(fw => (
                        <span key={fw} className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${frameworkColors[fw] || "bg-muted text-muted-foreground"}`}>{fw}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {f.is_public_facing && <Globe className="w-3.5 h-3.5 text-orange-400" />}
                  </td>
                  <td className="px-4 py-3">
                    {f.autofix_available ? <span className="text-[11px] px-2 py-0.5 rounded border text-[#C9A84C] border-[#C9A84C]/30 bg-[#C9A84C]/10">Available</span> : <span className="text-[#64748b] text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded capitalize border ${f.status === "resolved" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : f.status === "open" ? "text-red-400 border-red-500/30 bg-red-500/10" : "text-[#94a3b8] border-[#1e293b]"}`}>{f.status?.replace("_", " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            <div className="space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-[#0A0E1A] rounded-lg p-3"><p className="text-[#64748b] mb-1">Resource</p><p className="text-[#e2e8f0] font-mono">{selected.resource_name}</p></div>
                <div className="bg-[#0A0E1A] rounded-lg p-3"><p className="text-[#64748b] mb-1">Provider</p><span className={`text-[11px] px-2 py-0.5 rounded uppercase font-bold border ${providerBadge[selected.provider]}`}>{selected.provider}</span></div>
                <div className="bg-[#0A0E1A] rounded-lg p-3"><p className="text-[#64748b] mb-1">Region</p><p className="text-[#e2e8f0] font-mono">{selected.region}</p></div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(selected.compliance_frameworks || []).map(fw => (
                  <span key={fw} className={`text-xs px-2.5 py-1 rounded-full uppercase font-bold ${frameworkColors[fw] || "bg-muted text-muted-foreground"}`}>{fw}</span>
                ))}
              </div>
              <div><p className="text-xs text-[#64748b] mb-2 uppercase tracking-wider">Description</p><p className="text-sm text-[#94a3b8] leading-relaxed">{selected.description}</p></div>
              <div><p className="text-xs text-[#64748b] mb-2 uppercase tracking-wider flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-orange-400" />Impact</p><p className="text-sm text-[#94a3b8] leading-relaxed">{selected.impact}</p></div>
              <div>
                <p className="text-xs text-[#64748b] mb-2 uppercase tracking-wider">Step-by-Step Remediation</p>
                <pre className="bg-[#0A0E1A] border border-[#1e293b] rounded-lg p-4 text-xs font-mono text-emerald-300 whitespace-pre-wrap overflow-x-auto">{selected.remediation}</pre>
              </div>
              <div className="flex gap-3 pt-2">
                {selected.autofix_available && (
                  <Button className="flex-1 bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold gap-2">
                    <Zap className="w-4 h-4" /> Auto-Remediate
                  </Button>
                )}
                <Button variant="outline" onClick={() => updateFinding.mutate({ id: selected.id, data: { status: "in_review" } })} className="border-[#1e293b] text-[#94a3b8] hover:text-[#e2e8f0]">
                  Mark In Review
                </Button>
                <Button variant="outline" onClick={() => updateFinding.mutate({ id: selected.id, data: { status: "resolved" } })} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}