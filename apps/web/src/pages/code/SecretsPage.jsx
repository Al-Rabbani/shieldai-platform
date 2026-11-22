import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AgentHealthCard from "@/components/code/AgentHealthCard";
import SeverityPill from "@/components/code/SeverityPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Key, Lock, FileText, GitCommit, Play, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

const secretTypeIcon = { api_key: "🔑", password: "🔐", token: "🎫", certificate: "📜", private_key: "🗝️", connection_string: "🔗", other: "❓" };
const liveStatusStyle = { live: "bg-red-500/15 text-red-400 border-red-500/30", revoked: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", unknown: "bg-[#64748b]/15 text-[#64748b] border-[#64748b]/30" };

export default function SecretsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const qc = useQueryClient();

  const { data: findings = [] } = useQuery({ queryKey: ["secrets"], queryFn: () => base44.entities.SecretFinding.list("-created_date", 100) });

  const updateFinding = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SecretFinding.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secrets"] }),
  });

  const filtered = findings.filter(f => {
    const matchSearch = !search || f.repo_name?.includes(search) || f.file_path?.includes(search);
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    const matchType = typeFilter === "all" || f.secret_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const liveCount = findings.filter(f => f.is_live).length;
  const revokedCount = findings.filter(f => f.status === "revoked").length;
  const fpCount = findings.filter(f => f.status === "false_positive").length;

  return (
    <div className="space-y-6 bg-[#0A0E1A] min-h-screen -m-6 p-6">
      {/* Header — Canonical: 12 secrets, 3 live, 6 rotated */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Secrets Detection</h1>
          <p className="text-sm text-[#64748b] mt-0.5">12 secrets detected · 3 confirmed live · 6 rotated · Oldest: 8 days ago</p>
        </div>
        <Button className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold gap-2">
          <Play className="w-4 h-4" /> Scan for Secrets
        </Button>
      </div>

      <AgentHealthCard name="SecretsAgent-v1" health={96} status="online" tasksToday={18} type="executor" />

      {/* Live alert — Canonical: 3 live secrets */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-300">3 live secrets detected</p>
          <p className="text-xs text-red-400/70">AWS_ACCESS_KEY_ID in shieldDASTScan.ts — Live — Critical. Found 8 days ago — rotate immediately.</p>
        </div>
      </div>

      {/* Stats — Canonical: 12 total, 3 live, 6 rotated */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Live Secrets", value: "3", color: "text-red-400", icon: AlertTriangle },
          { label: "Rotated", value: "6", color: "text-emerald-400", icon: CheckCircle2 },
          { label: "False Positives", value: "3", color: "text-[#64748b]", icon: XCircle },
          { label: "Total Exposed", value: "12", color: "text-[#e2e8f0]", icon: Key },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
            </div>
            <s.icon className={`w-7 h-7 ${s.color} opacity-40`} />
          </div>
        ))}
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1e293b] flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search secrets..." className="pl-9 bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0] text-sm h-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0] h-9 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent className="bg-[#111827] border-[#1e293b]">
              {["all", "api_key", "password", "token", "certificate", "private_key", "connection_string", "other"].map(t => <SelectItem key={t} value={t} className="text-[#e2e8f0] capitalize">{t.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="bg-[#111827] border-[#1e293b]">
              {["all", "open", "revoked", "false_positive", "suppressed"].map(s => <SelectItem key={s} value={s} className="text-[#e2e8f0] capitalize">{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e293b]">
                {["Type", "Repository", "File Path", "Masked Value", "Entropy", "Live", "Commit", "Severity", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="border-b border-[#1e293b] hover:bg-[#1e293b]/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{secretTypeIcon[f.secret_type] || "❓"}</span>
                      <span className="text-xs text-[#94a3b8] capitalize">{f.secret_type?.replace("_", " ")}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">{f.repo_name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[#64748b] max-w-[180px] truncate">{f.file_path}:{f.line_number}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[#94a3b8] max-w-[200px] truncate">{f.masked_value}</td>
                  <td className="px-4 py-3 text-xs font-mono"><span className={f.entropy_score >= 5 ? "text-red-400 font-bold" : "text-[#94a3b8]"}>{f.entropy_score?.toFixed(1)}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold uppercase ${liveStatusStyle[f.is_live ? "live" : f.status === "revoked" ? "revoked" : "unknown"]}`}>
                      {f.is_live ? "LIVE" : f.status === "revoked" ? "REVOKED" : "UNKNOWN"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[#64748b]">{f.commit_hash || "—"}</td>
                  <td className="px-4 py-3"><SeverityPill severity={f.severity} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {f.status === "open" && (
                        <button onClick={() => updateFinding.mutate({ id: f.id, data: { status: "revoked" } })} className="text-[11px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">Revoke</button>
                      )}
                      {f.status === "open" && (
                        <button onClick={() => updateFinding.mutate({ id: f.id, data: { status: "false_positive" } })} className="text-[11px] px-2 py-1 rounded bg-[#1e293b] text-[#64748b] border border-[#1e293b] hover:text-[#e2e8f0] transition-colors">Suppress</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}