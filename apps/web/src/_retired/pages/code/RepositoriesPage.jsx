import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, FolderGit2, AlertTriangle, Scale, Activity, Star, Search, RefreshCw, Gitlab } from "lucide-react";
import { toast } from "sonner";
import RepoCard from "@/components/code/RepoCard";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-xl border border-slate-800/60 p-4" style={{ background: "rgba(99,102,241,0.05)" }}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function RepositoriesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showConnect, setShowConnect] = useState(false);
  const [providerFilter, setProviderFilter] = useState("all");
  const [form, setForm] = useState({ name: "", full_name: "", provider: "github", language: "TypeScript", team: "", repo_url: "" });
  const qc = useQueryClient();

  const { data: repos = [], isLoading } = useQuery({
    queryKey: ["code-repos"],
    queryFn: () => base44.entities.CodeRepository.list("-last_scanned"),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.CodeRepository.create({ ...data, status: "connected", last_scanned: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["code-repos"] }); toast.success("Repository connected"); setShowConnect(false); },
  });

  const rescanMut = useMutation({
    mutationFn: (repo) => base44.entities.CodeRepository.update(repo.id, { status: "scanning" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["code-repos"] }); toast.success("Scan triggered"); },
  });

  const totalFindings     = repos.reduce((s, r) => s + (r.total_findings ?? 0), 0);
  const totalEol          = repos.reduce((s, r) => s + (r.eol_packages ?? 0), 0);
  const totalLicenseViol  = repos.reduce((s, r) => s + (r.license_violations ?? 0), 0);
  const avgQuality        = repos.length ? Math.round(repos.reduce((s, r) => s + (r.code_quality_score ?? 0), 0) / repos.length) : 0;

  const filtered = repos.filter((r) => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || r.status === filter || (filter === "risk" && (r.risk_score ?? 0) >= 70);
    const matchProvider = providerFilter === "all" || r.provider === providerFilter;
    return matchSearch && matchFilter && matchProvider;
  });

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "connected", label: "Connected" },
    { key: "scanning", label: "Scanning" },
    { key: "error", label: "Error" },
    { key: "risk", label: "High Risk" },
  ];

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#030712" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Repositories</h1>
          <p className="text-slate-400 text-sm mt-1">Connected repos — code quality, dependencies, and risk in one view</p>
        </div>
        <button onClick={() => setShowConnect(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          <Plus className="w-4 h-4" /> Connect Repository
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Repos Connected" value={repos.length} color="#6366f1" />
        <StatCard label="Total Findings" value={totalFindings} color="#ef4444" />
        <StatCard label="EOL Packages" value={totalEol} color="#f59e0b" />
        <StatCard label="License Violations" value={totalLicenseViol} color="#ef4444" />
        <StatCard label="Avg Code Quality" value={`${avgQuality}/100`} color="#10b981" />
      </div>

      {/* Provider Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setProviderFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${providerFilter === "all" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40" : "bg-slate-800/50 text-slate-400 border border-slate-700"}`}>
          <FolderGit2 className="w-3.5 h-3.5" /> All
        </button>
        <button onClick={() => setProviderFilter("github")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${providerFilter === "github" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40" : "bg-slate-800/50 text-slate-400 border border-slate-700"}`}>
          <FolderGit2 className="w-3.5 h-3.5" /> GitHub
        </button>
        <button onClick={() => setProviderFilter("gitlab")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${providerFilter === "gitlab" ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" : "bg-slate-800/50 text-slate-400 border border-slate-700"}`}>
          <Gitlab className="w-3.5 h-3.5" /> GitLab
        </button>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={filter === f.key
                ? { background: "rgba(99,102,241,0.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.4)" }
                : { background: "rgba(30,41,59,0.5)", color: "#64748b", border: "1px solid rgba(30,41,59,0.8)" }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search repositories…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-slate-800/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <FolderGit2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-semibold">No repositories found</p>
          <p className="text-sm mt-1">Connect a repository to start scanning</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(repo => (
            <RepoCard key={repo.id} repo={repo} onRescan={(r) => rescanMut.mutate(r)} />
          ))}
        </div>
      )}

      {/* Data Sources Footer */}
      <div className="text-center pt-6 border-t border-[#1e293b]">
        <p className="text-xs text-[#64748b]">Findings powered by: GitHub API · OSV.dev · NVD NIST · CISA KEV · endoflife.date</p>
      </div>

      {/* Connect Modal */}
      <Dialog open={showConnect} onOpenChange={setShowConnect}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Connect Repository</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { key: "name", label: "Repo Name", placeholder: "api-gateway" },
              { key: "full_name", label: "Full Name", placeholder: "org/api-gateway" },
              { key: "team", label: "Team (optional)", placeholder: "Platform" },
              { key: "repo_url", label: "Repository URL", placeholder: "https://github.com/…" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
                <Input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} className="bg-slate-800 border-slate-700 text-white" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Provider</label>
                <select value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm">
                  {["github", "gitlab", "bitbucket", "azure_devops"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Language</label>
                <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm">
                  {["TypeScript", "JavaScript", "Python", "Java", "Go", "HCL", "Ruby", "C#"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => createMut.mutate(form)} disabled={!form.name || !form.full_name || createMut.isPending}
                className="flex-1" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                Connect
              </Button>
              <Button variant="outline" onClick={() => setShowConnect(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}