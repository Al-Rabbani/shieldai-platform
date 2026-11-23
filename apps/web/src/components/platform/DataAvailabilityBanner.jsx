import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { unavailableEntities } from "@/api/base44Client";

/**
 * Names the stores THIS page asked for and the platform does not serve, instead of letting an empty list
 * read as a measured zero.
 *
 * WHY IT IS PER PAGE NOW. The adapter answers an unserved entity with an empty list and records the name in
 * unavailableEntities(). That record was session-wide, so this banner could only say "this app", and it was
 * mounted on one page of 102. MEASURED 23 Nov 2026: 44 names are still asked for by routed modules with no
 * route behind them at 58 call sites, and 31 of those modules render the empty result silently - "No business
 * units", "No teams", "0 alerts" over a store that does not exist. In a security product "0 open critical
 * findings" and "we cannot see open critical findings" must never be the same picture.
 *
 * PlatformShell mounts this with key={pathname}, so it remounts on every navigation: on mount it clears the
 * record, then samples twice. Names are unioned across the two samples because a slow request that lands after
 * the first sample is still this page's absence. A name refused by the PREVIOUS page can therefore be reported
 * here for one navigation; that errs toward naming an absence that exists rather than hiding one that does,
 * and the wording says "asked for here" rather than claiming a measurement.
 */
export default function DataAvailabilityBanner({ pathname }) {
  const [missing, setMissing] = useState([]);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const seen = new Set();
    const read = () => {
      for (const name of unavailableEntities()) seen.add(name);
      setMissing(Array.from(seen).sort());
    };
    const first = setTimeout(read, 900);
    const second = setTimeout(read, 3200);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, [pathname]);

  if (missing.length === 0) return null;

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="w-full text-[10px] py-1 px-6 text-left"
        style={{ background: "#2a1f00", color: "#eab308" }}
        title="This page asked for data the platform does not serve"
      >
        {missing.length} data source{missing.length === 1 ? "" : "s"} asked for here are not served on this platform · show
      </button>
    );
  }

  return (
    <div className="w-full px-6 py-2 text-[11px]" style={{ background: "#2a1f00", borderBottom: "1px solid #4a3600" }}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#eab308" }} />
        <div className="flex-1">
          <span className="font-bold" style={{ color: "#eab308" }}>
            This page asked for {missing.length} data source{missing.length === 1 ? "" : "s"} this platform does not serve.
          </span>{" "}
          <span className="text-slate-400">
            Panels built on {missing.length === 1 ? "it show" : "them show"} nothing, and an empty list is not a measured zero.
          </span>{" "}
          <button onClick={() => setOpen((v) => !v)} className="underline" style={{ color: "#eab308" }}>
            {open ? "hide names" : "show names"}
          </button>
          <button onClick={() => setHidden(true)} className="underline ml-3 text-slate-500">
            collapse
          </button>
          {open && (
            <div className="mt-1 text-[10px] text-slate-400 font-mono break-all">{missing.join(", ")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
