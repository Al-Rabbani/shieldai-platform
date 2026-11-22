import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function ScanJobStuckBanner({ scanJob, onReset }) {
  const [resetting, setResetting] = useState(false);
  if (!scanJob) return null;

  async function handleReset() {
    setResetting(true);
    await base44.entities.ScanJob.update(scanJob.id, { status: "failed", error_message: "Timed out — manually reset" });
    setResetting(false);
    onReset();
  }

  return (
    <button onClick={handleReset} disabled={resetting}
      className="w-full text-left flex items-center justify-between rounded-xl px-4 py-3 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/15 transition disabled:opacity-60">
      <span className="text-sm font-medium text-amber-400">
        ⚠️ Scan job stuck — started {scanJob.started_at ? format(new Date(scanJob.started_at), "MMM d, HH:mm") : "unknown"}. Click to reset.
      </span>
      <span className="text-xs font-bold text-amber-400">{resetting ? "Resetting..." : "Reset →"}</span>
    </button>
  );
}