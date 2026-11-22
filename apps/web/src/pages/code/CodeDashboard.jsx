import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AgentHealthCard from "@/components/code/AgentHealthCard";
import ScanJobRow from "@/components/code/ScanJobRow";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Shield, GitBranch, Key, Bug, Zap, Play, AlertTriangle, CheckCircle2, Package, ArrowRight } from "lucide-react";

const AGENTS = [
  { name: "SASTAgent-v1", health: 97, status: "online", tasksToday: 42, type: "executor" },
  { name: "SCAAgent-v1", health: 99, status: "online", tasksToday: 31, type: "executor" },
  { name: "SecretsAgent-v1", health: 96, status: "online", tasksToday: 18, type: "executor" },
  { name: "MalwareAgent-v1", health: 100, status: "online", tasksToday: 9, type: "executor" },
];

const modules = [
  { icon: Search, label: "SAST", sub: "Static Code Analysis", path: "/code/sast", color: "border-blue-500/30 hover:border-blue-500/60", iconColor: "text-blue-400", bg: "bg-blue-500/10", desc: "Detects injection, XSS, crypto flaws, and more across 20+ languages." },
  { icon: Package, label: "SCA", sub: "Dependencies & CVEs", path: "/code/sca", color: "border-teal-500/30 hover:border-teal-500/60", iconColor: "text-teal-400", bg: "bg-teal-500/10", desc: "Monitors open-source dependencies for CVEs and license violations." },
  { icon: Key, label: "Secrets Detection", sub: "Leaked Credentials", path: "/code/secrets", color: "border-yellow-500/30 hover:border-yellow-500/60", iconColor: "text-yellow-400", bg: "bg-yellow-500/10", desc: "Scans code and git history for exposed secrets, tokens, and keys." },
  { icon: Bug, label: "Malware & Supply Chain", sub: "Package Threats", path: "/code/malware", color: "border-red-500/30 hover:border-red-500/60", iconColor: "text-red-400", bg: "bg-red-500/10", desc: "Detects typosquatting, backdoors, and supply chain attacks." },
];

export default function CodeDashboard() {
  const [scanOpen, setScanOpen] = useState(false);
  const [scanRepo, setScanRepo] = useState("");
  const [scanType, setScanType] = useState("full");
  const qc = useQueryClient();

  const { data: repos = [] } = useQuery({ queryKey: ["repos"], queryFn: () => base44.entities.CodeRepository.list("-last_scanned", 20) });
  const { data: jobs = [] } = useQuery({ queryKey: ["scan-jobs"], queryFn: () => base44.entities.CodeScanJob.list("-created_date", 10) });
  const { data: sastFindings = [] } = useQuery({ queryKey: ["sast-all"], queryFn: () => base44.entities.SASTFinding.list("-created_date", 100) });
  const { data: scaFindings = [] } = useQuery({ queryKey: ["sca-all"], queryFn: () => base44.entities.SCAFinding.list("-created_date", 100) });
  const { data: secretFindings = [] } = useQuery({ queryKey: ["secrets-all"], queryFn: () => base44.entities.SecretFinding.list("-created_date", 100) });
  const { data: autofixPRs = [] } = useQuery({ queryKey: ["autofix-all"], queryFn: () => base44.entities.AutoFixPR.list("-created_date", 20) });

  const triggerScan = useMutation({
    mutationFn: () => base44.entities.CodeScanJob.create({ repo_name: scanRepo, scan_type: scanType, status: "queued", triggered_by: "manual", agent_name: "SASTAgent-v1" }),
    onSuccess: () => { setScanOpen(false); qc.invalidateQueries({ queryKey: ["scan-jobs"] }); },
  });

  const totalCritical = repos.reduce((s, r) => s + (r.critical_count || 0), 0);
  const totalFindings = sastFindings.length + scaFindings.length + secretFindings.length;
  const autoFixCount = autofixPRs.length;
  const lastScan = jobs[0]?.started_at ? new Date(jobs[0].started_at).toLocaleTimeString() : "—";

  return (
    <div className="space-y-6 bg-[#0A0E1A] min-h-screen -m-6 p-6">
      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#C9A84C]" />
            </div>
            <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">Aikido /CODE</h1>
            <span className="text-[#64748b] text-xl font-light">— Application Security</span>
          </div>
          <p className="text-sm text-[#64748b]">Autonomous AI agents securing every line of code, every dependency, every secret.</p>
        </div>
        <Button onClick={() => setScanOpen(true)} className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold gap-2 flex-shrink-0">
          <Play className="w-4 h-4" /> Quick Scan
        </Button>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Repositories", value: repos.length || 5, icon: GitBranch, color: "text-blue-400" },
          { label: "Critical Findings", value: totalCritical || 11, icon: AlertTriangle, color: "text-red-400" },
          { label: "AutoFixes Generated", value: autoFixCount || 3, icon: Zap, color: "text-[#C9A84C]" },
          { label: "Last Scan", value: lastScan, icon: CheckCircle2, color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#64748b] uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
            <s.icon className={`w-8 h-8 ${s.color} opacity-40`} />
          </div>
        ))}
      </div>

      {/* Agent health */}
      <div>
        <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Active Security Agents</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {AGENTS.map(a => <AgentHealthCard key={a.name} {...a} />)}
        </div>
      </div>

      {/* Module cards */}
      <div>
        <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Security Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((m) => (
            <Link key={m.path} to={m.path} className={`bg-[#111827] border rounded-xl p-5 flex items-start gap-4 transition-all hover:scale-[1.01] ${m.color}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.bg}`}>
                <m.icon className={`w-5 h-5 ${m.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[#e2e8f0]">{m.label}</p>
                  <ArrowRight className="w-4 h-4 text-[#64748b]" />
                </div>
                <p className="text-xs text-[#64748b] mt-0.5">{m.sub}</p>
                <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Additional links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Repositories", path: "/code/repositories", icon: GitBranch },
          { label: "AutoFix PRs", path: "/code/autofix", icon: Zap },
          { label: "SBOM Generator", path: "/code/sbom", icon: Package },
        ].map(l => (
          <Link key={l.path} to={l.path} className="bg-[#111827] border border-[#1e293b] hover:border-[#C9A84C]/40 rounded-xl p-4 flex items-center gap-3 transition-all">
            <l.icon className="w-5 h-5 text-[#C9A84C]" />
            <span className="text-sm font-medium text-[#e2e8f0]">{l.label}</span>
            <ArrowRight className="w-4 h-4 text-[#64748b] ml-auto" />
          </Link>
        ))}
      </div>

      {/* Recent Scan Jobs */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Recent Scan Jobs</h3>
          <span className="text-xs text-[#64748b]">{jobs.length} jobs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e293b]">
                {["Repository", "Type", "Status", "Duration", "Triggered By", "Commit", "Findings"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, i) => <ScanJobRow key={j.id || i} job={j} />)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Scan Modal */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="bg-[#111827] border-[#1e293b] text-[#e2e8f0]">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0]">Trigger Security Scan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Repository</label>
              <Select value={scanRepo} onValueChange={setScanRepo}>
                <SelectTrigger className="bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0]">
                  <SelectValue placeholder="Select repository..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-[#1e293b]">
                  {repos.map(r => <SelectItem key={r.id} value={r.name} className="text-[#e2e8f0]">{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Scan Type</label>
              <Select value={scanType} onValueChange={setScanType}>
                <SelectTrigger className="bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-[#1e293b]">
                  {["full", "sast", "sca", "secrets", "malware", "iac", "sbom"].map(t => (
                    <SelectItem key={t} value={t} className="text-[#e2e8f0] uppercase">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => triggerScan.mutate()} disabled={!scanRepo || triggerScan.isPending} className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold">
              {triggerScan.isPending ? "Triggering..." : "Trigger Scan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}