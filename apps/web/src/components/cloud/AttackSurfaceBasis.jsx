import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * The sentence that stops a card grid being read as a measured estate.
 *
 * The Attack Surface tab draws up to 20 cards. Twenty cards out of 145 assets look like the whole
 * surface, and a card reading "INTERNAL · 0 findings" looks like a clean asset. This line states the
 * real totals and the two things the platform does not measure, so the grid is read for what it is.
 */
export default function AttackSurfaceBasis() {
  const [s, setS] = useState(null);

  useEffect(() => {
    let live = true;
    base44.entities.AttackSurface.summary()
      .then((data) => { if (live) setS(data); })
      .catch(() => { if (live) setS(null); });
    return () => { live = false; };
  }, []);

  if (!s) return null;

  return (
    <p className="text-[11px] text-slate-500 px-1 leading-relaxed">
      {s.assets} cloud assets · {s.with_known_exposure} with a known exposure, {s.exposure_unknown} unknown
      (unknown is not internal) · {s.assets_with_linked_findings} carry a linked finding, {s.linked_findings} in total ·
      cloud assets are not CVE-scanned, so the CVE column is a stated absence; container CVEs are under Container Security.
    </p>
  );
}
