import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { History, Loader2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

function StatusBadge({ status }) {
  const map = {
    running: { color: "#58a6ff", bg: "rgba(88,166,255,0.12)", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    complete: { color: "#52c41a", bg: "rgba(82,196,26,0.1)", icon: <CheckCircle2 className="w-3 h-3" /> },
    failed: { color: "#ff4d4f", bg: "rgba(255,77,79,0.12)", icon: <AlertTriangle className="w-3 h-3" /> },
    queued: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: <Clock className="w-3 h-3" /> },
  };
  const s = map[status] || map.queued;
  return (
    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium capitalize"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}40` }}>
      {s.icon} {status}
    </span>
  );
}

function fmtDuration(secs) {
  if (!secs) return "—";
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

const SCAN_TYPES = ["sast", "sca", "secrets", "container", "iac", "dast", "cloud", "k8s", "pentest"];
const STATUSES = ["running", "complete", "failed", "queued"];

export default function ScanHistoryPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["scan-jobs"],
    queryFn: () => base44.entities.ScanJob.list("-started_at", 200),
    initialData: [],
    refetchInterval: 15000,
  });

  const filtered = jobs.filter(j => {
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (typeFilter !== "all" && j.scan_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen -m-6 p-6 space-y-6" style={{ background: "#0d1117" }}>
      <div className="flex items-center gap-3">
        <History className="w-5 h-5 text-slate-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Scan History</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} of {jobs.length} scans shown</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-slate-600 font-mono uppercase">STATUS:</span>
          {["all", ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all capitalize"
              style={{
                background: statusFilter === s ? "#58a6ff" : "rgba(30,58,95,0.2)",
                color: statusFilter === s ? "#0d1117" : "#64748b",
                border: `1px solid ${statusFilter === s ? "#58a6ff" : "#30363d"}`,
              }}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-slate-700 hidden sm:block" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-slate-600 font-mono uppercase">TYPE:</span>
          {["all", ...SCAN_TYPES].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all uppercase"
              style={{
                background: typeFilter === t ? "#a78bfa" : "rgba(30,58,95,0.2)",
                color: typeFilter === t ? "#0d1117" : "#64748b",
                border: `1px solid ${typeFilter === t ? "#a78bfa" : "#30363d"}`,
              }}>
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
              {["Repository", "Scan Type", "Status", "Started", "Duration", "Files Scanned", "Findings", "Triggered By"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <History className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No scans yet</p>
                  <p className="text-slate-700 text-xs mt-1">Connect a repository to start scanning.</p>
                </td>
              </tr>
            ) : filtered.map((job, i) => (
              <tr key={job.id}
                className="transition-colors hover:bg-white/[0.02]"
                style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
                <td className="px-4 py-3">
                  <p className="text-xs font-medium text-white">{job.repo_name}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] text-slate-400 font-mono">{job.scan_type}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3">
                  <p className="text-[11px] text-slate-400">
                    {job.started_at ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true }) : "—"}
                  </p>
                  <p className="text-[10px] text-slate-600 font-mono">
                    {job.started_at ? format(new Date(job.started_at), "MMM d, HH:mm") : ""}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] text-slate-400 font-mono">{fmtDuration(job.duration_seconds)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] text-slate-400 font-mono">{job.files_scanned?.toLocaleString() || "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] font-bold font-mono" style={{ color: job.findings_count > 0 ? "#ff4d4f" : "#52c41a" }}>
                    {job.findings_count ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] px-2 py-0.5 rounded capitalize font-mono"
                    style={{ color: "#94a3b8", background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.15)" }}>
                    {job.triggered_by || "manual"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}