import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { exportExecutiveReport } from "@/lib/executiveReportPdf";
import { FileDown } from "lucide-react";

export default function GenerateExecutiveReportButton({ className = "" }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function generate() {
    setBusy(true);
    setMessage(null);
    try {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [scores, incidents, frameworks, fixed, open] = await Promise.all([
        base44.entities.GlobalRiskScore.list("-calculated_at", 60).catch(() => []),
        base44.entities.Incident.list("-closed_at", 40).catch(() => []),
        base44.entities.ComplianceFramework.list("-created_date", 40).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: "fixed", fixed_at: { $gte: since } }, "-fixed_at", 300).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 300).catch(() => []),
      ]);

      // One row per framework, keeping the newest assessment of each.
      const byFramework = new Map();
      (frameworks || []).forEach((framework) => {
        const key = (framework.name || "").toLowerCase();
        if (!byFramework.has(key)) byFramework.set(key, framework);
      });

      const result = exportExecutiveReport({
        scores: scores || [],
        incidents: incidents || [],
        frameworks: [...byFramework.values()],
        resolvedFindings: fixed || [],
        openFindings: open || [],
        periodDays: 30,
      });
      setMessage(`${result.filename} downloaded · ${result.trendPoints} trend points · ${result.resolvedIncidents} resolved incidents`);
    } catch (error) {
      setMessage(`Could not generate the report: ${error.message}`);
    }
    setBusy(false);
  }

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <button
        onClick={generate}
        disabled={busy}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-violet-500 text-white hover:bg-violet-600 transition disabled:opacity-50"
      >
        <FileDown size={13} /> {busy ? "Building PDF…" : "Generate executive report"}
      </button>
      {message && <p className="text-[10px] text-slate-400 max-w-[280px]">{message}</p>}
    </div>
  );
}