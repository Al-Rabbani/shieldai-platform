import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function QuickActionsBar({ onRefresh }) {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);

  async function runCloudScan() {
    setRunning(true);
    try {
      await base44.entities.ScanJob.create({ repo_name: "cloud-environment", scan_type: "cloud_scan", status: "queued", triggered_by: "manual" });
      toast.success("Cloud scan queued");
      onRefresh();
    } finally { setRunning(false); }
  }

  function boardReport() {
    sessionStorage.setItem("gds_copilot_prefill", "Generate a board-level security report");
    navigate("/copilot");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={runCloudScan} disabled={running} className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition disabled:opacity-50">
        🔍 Run Cloud Scan
      </button>
      <button onClick={() => navigate("/executive-dashboard")} className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition">
        🏛️ Executive Dashboard
      </button>
      <button onClick={() => navigate("/copilot")} className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 transition">
        🛡️ Go to Co-Pilot
      </button>
      <button onClick={boardReport} className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition">
        📊 Board Report
      </button>
      <button onClick={onRefresh} className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-500/15 text-slate-300 border border-slate-500/30 hover:bg-slate-500/25 transition">
        🔄 Refresh Data
      </button>
    </div>
  );
}