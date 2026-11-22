import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

const statusIcon = {
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  running: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
  queued: <Clock className="w-3.5 h-3.5 text-slate-400" />,
  cancelled: <XCircle className="w-3.5 h-3.5 text-slate-400" />,
};

const typeColors = {
  full: "bg-purple-500/15 text-purple-400",
  sast: "bg-blue-500/15 text-blue-400",
  sca: "bg-teal-500/15 text-teal-400",
  secrets: "bg-yellow-500/15 text-yellow-400",
  malware: "bg-red-500/15 text-red-400",
  iac: "bg-indigo-500/15 text-indigo-400",
  sbom: "bg-slate-500/15 text-slate-400",
};

function fmt(secs) {
  if (!secs) return "—";
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function ScanJobRow({ job }) {
  return (
    <tr className="border-b border-[#1e293b] hover:bg-[#1e293b]/40 transition-colors">
      <td className="px-4 py-3 text-sm text-[#e2e8f0] font-medium">{job.repo_name}</td>
      <td className="px-4 py-3">
        <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold uppercase", typeColors[job.scan_type] || "bg-muted text-muted-foreground")}>{job.scan_type}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {statusIcon[job.status]}
          <span className="text-xs text-[#94a3b8] capitalize">{job.status}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-[#64748b] font-mono">{fmt(job.duration_seconds)}</td>
      <td className="px-4 py-3 text-xs text-[#94a3b8]">{job.triggered_by}</td>
      <td className="px-4 py-3 text-xs font-mono text-[#64748b]">{job.commit_hash || "—"}</td>
      <td className="px-4 py-3">
        <span className={cn("text-xs font-mono font-bold", job.findings_new > 0 ? "text-red-400" : "text-[#64748b]")}>
          {job.findings_new > 0 ? `+${job.findings_new}` : "0"} new
        </span>
      </td>
    </tr>
  );
}