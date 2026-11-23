import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Ban } from "lucide-react";

/* Item 37, 23 Nov 2026. This page printed "No APT actors tracked yet." over base44.entities.APTActor, an entity with no
 * table behind it. That sentence is a claim about the estate and nothing measured it: no actor source, no campaign store
 * and no attribution feed exists on this platform. It now reads GET /intel/apt, which refuses in a form the page can
 * render - the absence named, and the exact sources that would have to exist before any actor could be listed.
 */

const ABSENT_LABELS = {
  actor_attribution: "Actor attribution",
  campaign_tracking: "Campaign tracking",
  ttps: "Technique mapping",
  targeting: "Targeting",
};

export default function APTTrackerPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.APTActor.summary()
      .then((payload) => setData(payload || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🧬 APT TRACKER</h1>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-700/40 text-slate-300">
          No actor source configured
        </span>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-purple-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="rounded-xl p-4 bg-amber-500/5 border border-amber-500/30 flex items-start gap-3">
            <Ban className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-400">
                {data?.available === false ? "No APT actor data is available on this platform." : "APT coverage could not be read from the API."}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {data?.reason ||
                  "The API did not answer. Nothing is listed rather than an empty list, because an empty list reads as 'no actors'."}
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

          {data?.what_is_recorded ? (
            <div className="rounded-xl p-4 space-y-1" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <p className="text-xs font-bold text-slate-300">What this platform does record</p>
              <p className="text-xs text-slate-400">
                {data.what_is_recorded.distinct_cves ?? 0} distinct CVE(s) against assets,{" "}
                {data.what_is_recorded.kev_listed_findings ?? 0} finding(s) on the CISA KEV list.
              </p>
              <p className="text-[11px] text-slate-500">{data.what_is_recorded.note}</p>
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
