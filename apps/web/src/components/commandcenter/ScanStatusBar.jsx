import React from "react";
import { formatDistanceToNow } from "date-fns";

export default function ScanStatusBar({ scanJobs }) {
  if (!scanJobs?.length) return null;

  return (
    <div className="rounded-xl p-3 flex items-center gap-2 overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <span className="text-[10px] text-slate-500 uppercase tracking-widest flex-shrink-0 mr-1">Active Scans</span>
      {scanJobs.slice(0, 10).map(job => {
        if (job.status === "running") {
          return (
            <span key={job.id} className="flex-shrink-0 text-[11px] font-medium px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse">
              ⟳ {job.scan_type} — {job.repo_name}
            </span>
          );
        }
        if (job.status === "complete") {
          return (
            <span key={job.id} className="flex-shrink-0 text-[11px] font-medium px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              ✓ {job.scan_type} — {job.findings_count ?? 0} findings — {job.completed_at ? formatDistanceToNow(new Date(job.completed_at), { addSuffix: true }) : "—"}
            </span>
          );
        }
        if (job.status === "failed") {
          return (
            <span key={job.id} className="flex-shrink-0 text-[11px] font-medium px-3 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              ✗ {job.scan_type} — Failed
            </span>
          );
        }
        return (
          <span key={job.id} className="flex-shrink-0 text-[11px] font-medium px-3 py-1 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">
            ⏳ {job.scan_type} — Queued
          </span>
        );
      })}
    </div>
  );
}