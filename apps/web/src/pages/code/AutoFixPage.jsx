import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AgentHealthCard from "@/components/code/AgentHealthCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, GitPullRequest, ExternalLink, CheckCircle2, Clock, GitMerge, AlertCircle } from "lucide-react";

const statusStyle = {
  merged: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  draft: "bg-[#64748b]/15 text-[#64748b] border-[#64748b]/30",
  closed: "bg-[#64748b]/15 text-[#64748b] border-[#64748b]/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};
const statusIcon = {
  merged: <GitMerge className="w-3.5 h-3.5 text-emerald-400" />,
  open: <GitPullRequest className="w-3.5 h-3.5 text-blue-400" />,
  draft: <Clock className="w-3.5 h-3.5 text-[#64748b]" />,
  failed: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
};

export default function AutoFixPage() {
  const [selected, setSelected] = useState(null);

  const { data: prs = [] } = useQuery({ queryKey: ["autofix"], queryFn: () => base44.entities.AutoFixPR.list("-created_at", 50) });

  const merged = prs.filter(p => p.status === "merged").length;
  const open = prs.filter(p => p.status === "open").length;
  const draft = prs.filter(p => p.status === "draft").length;
  const successRate = prs.length > 0 ? Math.round((merged / prs.length) * 100) : 0;

  return (
    <div className="space-y-6 bg-[#0A0E1A] min-h-screen -m-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">AutoFix PRs</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Powered by AutoFixAgent-v1 · AI-generated pull requests for security findings</p>
        </div>
        <Button className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold gap-2">
          <Zap className="w-4 h-4" /> Generate Bulk Fix
        </Button>
      </div>

      <AgentHealthCard name="AutoFixAgent-v1" health={98} status="online" tasksToday={14} type="executor" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "PRs Generated", value: prs.length, color: "text-[#e2e8f0]" },
          { label: "Merged", value: merged, color: "text-emerald-400" },
          { label: "Pending Review", value: open + draft, color: "text-blue-400" },
          { label: "Success Rate", value: `${successRate}%`, color: "text-[#C9A84C]" },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Generated Pull Requests</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e293b]">
              {["Status", "Title", "Repository", "Finding Type", "Lines Changed", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prs.map(pr => (
              <tr key={pr.id} className="border-b border-[#1e293b] hover:bg-[#1e293b]/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {statusIcon[pr.status]}
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold capitalize ${statusStyle[pr.status]}`}>{pr.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 max-w-[280px]">
                  <p className="text-xs font-medium text-[#e2e8f0] line-clamp-2">{pr.title}</p>
                  <p className="text-[10px] text-[#64748b] mt-0.5 font-mono">{pr.branch_name}</p>
                </td>
                <td className="px-4 py-3 text-xs text-[#94a3b8]">{pr.repo_name}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded uppercase font-semibold ${pr.finding_type === "sast" ? "bg-blue-500/15 text-blue-400" : pr.finding_type === "sca" ? "bg-teal-500/15 text-teal-400" : "bg-yellow-500/15 text-yellow-400"}`}>{pr.finding_type}</span>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-[#94a3b8]">{pr.lines_changed ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelected(pr)} className="text-[11px] px-2 py-1 rounded bg-[#1e293b] text-[#94a3b8] border border-[#1e293b] hover:text-[#e2e8f0] transition-colors">Preview Diff</button>
                    {pr.pr_url && (
                      <a href={pr.pr_url} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1 rounded bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/20 transition-colors flex items-center gap-1">Open PR <ExternalLink className="w-3 h-3" /></a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Diff preview modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-[#111827] border-[#1e293b] text-[#e2e8f0] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#e2e8f0]">
              <GitPullRequest className="w-5 h-5 text-blue-400" />
              <span className="text-sm">{selected?.title}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-[#94a3b8] leading-relaxed">{selected.description}</p>
              <div>
                <p className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Diff Preview</p>
                <pre className="bg-[#0A0E1A] border border-[#1e293b] rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {selected.diff_preview?.split("\n").map((line, i) => (
                    <div key={i} className={line.startsWith("+") ? "text-emerald-400" : line.startsWith("-") ? "text-red-400" : "text-[#94a3b8]"}>{line}</div>
                  ))}
                </pre>
              </div>
              <div className="flex gap-3">
                {selected.pr_url && (
                  <Button asChild className="flex-1 bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold gap-2">
                    <a href={selected.pr_url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /> Open Pull Request</a>
                  </Button>
                )}
                {selected.status === "draft" && (
                  <Button variant="outline" className="border-[#1e293b] text-[#94a3b8] hover:text-[#e2e8f0]">Mark as Ready</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}