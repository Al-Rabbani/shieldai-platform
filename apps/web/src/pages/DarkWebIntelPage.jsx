import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Ban } from "lucide-react";

/* Item 37, 23 Nov 2026. This page drew "● MONITORING" with a pulsing green dot, a "0 Live Alerts" chip and four tiles
 * (Total Alerts / Critical / Credential Leaks / Ransomware Mentions) computed from empty arrays over three stores that
 * do not exist - DarkWebAlert, CredentialLeak and BreachRecord. Zero alerts over a collector that does not run is not a
 * clean result, it is an unmeasured one, and "MONITORING" described a process that was never started.
 *
 * It now reads GET /intel/dark-web, which refuses in a renderable form and points at what IS measured: the credential
 * posture served by GET /secrets/posture. A leak corpus and a configured-credential list answer different questions and
 * the page says so rather than merging them.
 */

const ABSENT_LABELS = {
  alert_feed: "Alert feed",
  credential_leaks: "Credential leaks",
  breach_records: "Breach records",
  monitoring: "Continuous monitoring",
};

export default function DarkWebIntelPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.DarkWebAlert.summary()
      .then((payload) => setData(payload || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🕵️ Dark Web Intelligence</h1>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-700/40 text-slate-300">
          No collector connected
        </span>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="rounded-xl p-4 bg-amber-500/5 border border-amber-500/30 flex items-start gap-3">
            <Ban className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-400">
                {data?.available === false
                  ? "No dark-web collection is running on this platform."
                  : "Dark-web coverage could not be read from the API."}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {data?.reason ||
                  "The API did not answer. Nothing is shown rather than zeroes, because zero alerts over a collector that does not run reads as a clean estate."}
              </p>
            </div>
          </div>

          {data?.absent ? (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <p className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-500" /> What is absent, and why
              </p>
              {Object.entries(data.absent).map(([key, reason]) => (
                <div key={key} className="text-xs">
                  <span className="text-slate-300 font-semibold">{ABSENT_LABELS[key] || key}: </span>
                  <span className="text-slate-400">{reason}</span>
                </div>
              ))}
            </div>
          ) : null}

          {data?.what_is_recorded?.note ? (
            <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <p className="text-xs font-bold text-slate-300">What is measured instead</p>
              <p className="text-xs text-slate-400 mt-1">{data.what_is_recorded.note}</p>
              <a href="/v2/secrets" className="inline-block text-xs font-bold text-blue-400 hover:text-blue-300 mt-2">
                Open Secrets &amp; Key Management →
              </a>
            </div>
          ) : null}

          {Array.isArray(data?.would_need) && data.would_need.length > 0 ? (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <p className="text-xs font-bold text-slate-300">What would have to exist first</p>
              <ul className="list-disc list-inside space-y-1">
                {data.would_need.map((need, index) => (
                  <li key={index} className="text-xs text-slate-400">
                    {need}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
