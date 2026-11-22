import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/* "Run Cloud Scan" used to call base44.entities.ScanJob.create({ repo_name: "cloud-environment", ... }). ScanJob was
 * mapped at the missions table, so the button wrote an agent-mission row carrying fields missions do not have, then
 * toasted "Cloud scan queued" - a queue this platform does not have. There was no catch, so when the write failed the
 * button failed silently instead of saying anything.
 *
 * It now starts the operation the platform really has: POST /cloud/discovery-jobs against a real, registered
 * environment. The environment is chosen from what the API returns, its provider and name are named in the toast, and
 * a refusal is shown as a refusal rather than swallowed. AWS is preferred because it is the estate with assets; the
 * choice is stated on the button's result, never hidden.
 */
export default function QuickActionsBar({ onRefresh }) {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);

  async function runCloudScan() {
    setRunning(true);
    try {
      const environments = await base44.cloud.environments();
      const usable = (environments || []).filter((e) => e && e.id && e.status !== "disabled");
      if (usable.length === 0) {
        toast.error("No cloud environment is registered, so there is nothing to discover.");
        return;
      }
      const target = usable.find((e) => e.provider === "aws") || usable[0];
      const job = await base44.cloud.startDiscovery(target.id);
      const jobId = job && (job.id || job.discovery_job_id);
      toast.success(`Discovery started on ${target.name} (${target.provider})${jobId ? ` — job ${String(jobId).slice(0, 8)}` : ""}`);
      onRefresh();
    } catch (error) {
      /* The API's own words, because "something went wrong" tells an operator nothing. */
      toast.error(error && error.message ? error.message : "Discovery could not be started.");
    } finally {
      setRunning(false);
    }
  }

  function boardReport() {
    sessionStorage.setItem("gds_copilot_prefill", "Generate a board-level security report");
    navigate("/copilot");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={runCloudScan} disabled={running} className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition disabled:opacity-50">
        {running ? "⏳ Starting discovery…" : "🔍 Run Cloud Discovery"}
      </button>
      <button onClick={() => navigate("/executive-dashboard")} className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition">
        🏛️ Executive Dashboard
      </button>
      <button onClick={boardReport} className="px-4 py-2 rounded-lg text-xs font-medium bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 transition">
        📊 Board Report
      </button>
    </div>
  );
}
