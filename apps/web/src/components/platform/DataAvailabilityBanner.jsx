import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { unavailableEntities } from "@/api/base44Client";

/**
 * Names what this platform cannot serve, instead of letting it read as zero.
 *
 * The builder app asks for 491 entity names. The platform answers 21 of them. The other 470 resolve
 * to an empty list, and because most pages wrap the call in .catch(() => []) a missing data source
 * and a measured zero look identical on screen. In a security product that is the worst possible
 * ambiguity: "0 open critical findings" and "we cannot see open critical findings" must never be the
 * same picture.
 *
 * The adapter records every name it refused in unavailableEntities(). This banner reads that record
 * after the first render and states plainly how many panels are in that position, with the names.
 *
 * The record is session-wide, not per page: it fills with whatever mounted before, so the wording says "this
 * app" rather than "this page". Measured on /v2/cloud, the page asks five names of which four are served, and
 * the banner reported two - the other had been recorded on an earlier page.
 * It is deliberately not dismissible to a silent state: closing it keeps a marker in place.
 */
export default function DataAvailabilityBanner() {
  const [missing, setMissing] = useState([]);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Refusals accumulate as pages mount, so sample once shortly after load and again a few seconds in.
    const read = () => setMissing(unavailableEntities());
    const first = setTimeout(read, 800);
    const second = setTimeout(read, 4000);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, []);

  if (missing.length === 0) return null;

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="w-full text-[10px] py-1 px-3 text-left"
        style={{ background: "#2a1f00", color: "#eab308" }}
        title="Some panels in this app ask for data this platform does not serve"
      >
        {missing.length} data source{missing.length === 1 ? "" : "s"} unavailable on this platform · show
      </button>
    );
  }

  return (
    <div className="w-full px-3 py-2 text-[11px]" style={{ background: "#2a1f00", borderBottom: "1px solid #4a3600" }}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#eab308" }} />
        <div className="flex-1">
          <span className="font-bold" style={{ color: "#eab308" }}>
            {missing.length} data source{missing.length === 1 ? "" : "s"} requested by this app are not served by this platform.
          </span>{" "}
          <span className="text-slate-400">
            Their panels show nothing. That is an absence, not a measured zero.
          </span>{" "}
          <button onClick={() => setOpen((v) => !v)} className="underline" style={{ color: "#eab308" }}>
            {open ? "hide names" : "show names"}
          </button>
          {open && (
            <div className="mt-1 text-[10px] text-slate-400 font-mono break-all">{missing.join(", ")}</div>
          )}
        </div>
        <button onClick={() => setHidden(true)} title="Collapse" className="text-slate-500 hover:text-slate-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
