import React from "react";
import MagneticCard from "@/components/home/MagneticCard";

/* This panel used to assert things no store on this platform can support. Measured 22 Nov 2026:
 *
 *   "4 threat actors tracking GDS"        no threat-actor table exists
 *   "LockBit 3.0 — 47 victims/month"      no ransomware-group table exists
 *   "3 EU MSPs named on leak site"        nothing stores leak-site victims
 *   "GDS domain found in credential dump" no credential-leak or dark-web table exists
 *   "$2.4M" beside the incident           incidents has no financial column at all
 *   four dots at Russia / Western-EN / China / Unknown, joined by arcs to Ireland - invented coordinates and invented
 *   links
 *   "GDPR deadline: DEADLINE PASSED"      GdprMiniCountdown counted down to a hardcoded 2026-07-02, so it read
 *                                         "passed" every day since, regardless of any incident
 *
 * The page contradicted itself while doing it: the same screen reported "0 dark web alerts".
 *
 * What IS real: 145 cloud assets with recorded regions (141 across 17 AWS regions, 4 with no region), and two open
 * critical incidents opened 19 Nov. So the globe now plots where the estate actually is, and each card either states
 * a measured number or states the absence. No adversary, victim count, money or regulatory deadline is invented.
 */

/* Real region geography. Static because AWS region locations are facts, not measurements of this platform. */
const REGION_COORDS = {
  "us-east-1": [38.9, -77.4], "us-east-2": [40.0, -83.0], "us-west-1": [37.8, -122.4], "us-west-2": [45.9, -119.7],
  "ca-central-1": [45.5, -73.6], "sa-east-1": [-23.5, -46.6],
  "eu-west-1": [53.3, -6.3], "eu-west-2": [51.5, -0.1], "eu-west-3": [48.9, 2.3], "eu-central-1": [50.1, 8.7],
  "eu-north-1": [59.3, 18.1],
  "ap-south-1": [19.1, 72.9], "ap-southeast-1": [1.3, 103.8], "ap-southeast-2": [-33.9, 151.2],
  "ap-northeast-1": [35.7, 139.7], "ap-northeast-2": [37.6, 127.0], "ap-northeast-3": [34.7, 135.5],
};

const MERIDIANS = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5];
const LATITUDES = [-60, -30, 0, 30, 60];

/* Deterministic stars: the old ones called Math.random() during render, so every re-render moved the sky. */
const STARS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  top: (i * 37) % 100,
  left: (i * 61) % 100,
  size: 1 + (i % 3),
  delay: (i % 7) * 0.4,
}));

function project([lat, lon]) {
  return { x: `${((lon + 180) / 360) * 100}%`, y: `${((90 - lat) / 180) * 100}%` };
}

function ageLabel(from) {
  if (!from) return "opened at an unrecorded time";
  const hours = Math.floor((Date.now() - new Date(from).getTime()) / 3600000);
  if (hours < 1) return "open under an hour";
  if (hours < 48) return `open ${hours}h`;
  return `open ${Math.floor(hours / 24)}d`;
}

function RegionDot({ region, count }) {
  const { x, y } = project(REGION_COORDS[region]);
  return (
    <div className="absolute group z-10" style={{ left: x, top: y }}>
      <div className="w-2.5 h-2.5 rounded-full bg-blue-400/80 ring-2 ring-blue-400/25" />
      <div className="absolute -top-11 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#111827] border border-blue-500/40 rounded-md px-2.5 py-1.5 text-[11px] whitespace-nowrap z-20 shadow-lg">
        <div className="font-semibold text-blue-300">{region}</div>
        <div className="text-slate-400">{count} asset{count === 1 ? "" : "s"}</div>
      </div>
    </div>
  );
}

export default function GlobeHero({ risk, activeIncident, assets = [], incidents = [] }) {
  const byRegion = new Map();
  let unlocated = 0;
  for (const asset of assets) {
    const region = asset.region_or_location || asset.region;
    if (!region) {
      unlocated += 1;
      continue;
    }
    byRegion.set(region, (byRegion.get(region) || 0) + 1);
  }
  const plotted = [...byRegion.entries()].filter(([region]) => REGION_COORDS[region]);
  const mapped = plotted.reduce((sum, [, count]) => sum + count, 0);
  const openIncidents = incidents.filter((i) => i.status === "open" || i.status === "investigating");

  return (
    <div className="w-full rounded-2xl p-6 relative overflow-hidden" style={{ background: "#050b14", border: "1px solid #1F2937", minHeight: 520 }}>
      {STARS.map((s) => (
        <span key={s.id} className="star-dot" style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
      ))}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div>
          <p className="text-lg font-bold text-white">🌐 ESTATE MAP</p>
          <p className="text-xs text-slate-500">
            Where the monitored estate actually is — from the cloud asset inventory, not from threat intel
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300">
          {mapped} assets · {plotted.length} regions
        </span>
      </div>

      <div className="grid grid-cols-5 gap-4 mt-4">
        <div className="col-span-3 relative w-full h-[480px] flex items-center justify-center" style={{ perspective: "1000px" }}>
          <div className="relative w-[380px] h-[380px]" style={{ transformStyle: "preserve-3d", animation: "globeRotate 40s linear infinite" }}>
            {MERIDIANS.map((deg, i) => (
              <div key={i} className="absolute inset-0 rounded-full border border-blue-500/25" style={{ transform: `rotateY(${deg}deg)` }} />
            ))}
            {LATITUDES.map((lat, i) => (
              <div key={`lat-${i}`} className="absolute rounded-full border border-blue-500/20"
                style={{ top: `${50 - lat * 0.55}%`, left: "10%", right: "10%", height: `${Math.cos(lat * Math.PI / 180) * 100}%`, transform: "translateY(-50%)" }} />
            ))}
            <div className="absolute inset-[15%] rounded-full bg-gradient-to-br from-blue-600/10 to-transparent blur-xl" />
          </div>

          {plotted.map(([region, count]) => <RegionDot key={region} region={region} count={count} />)}

          <div className="absolute" style={{ left: "48%", top: "33%" }}>
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping absolute" />
            <div className="w-3 h-3 rounded-full bg-amber-400 relative" />
            <span className="text-[10px] text-amber-300 absolute top-4 -left-4 whitespace-nowrap">Platform · Ireland</span>
          </div>
        </div>

        <div className="col-span-2 space-y-3">
          <MagneticCard strength={3} className="rounded-xl p-3" as="div">
            <div style={{ background: "#111827", border: "1px solid #1F2937" }} className="rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Estate Footprint</p>
              <p className="text-xs text-white">{mapped} assets across {plotted.length} regions</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {unlocated} asset{unlocated === 1 ? "" : "s"} without a recorded region
                {byRegion.size - plotted.length > 0 ? ` · ${byRegion.size - plotted.length} region value(s) not on the map` : ""}
              </p>
            </div>
          </MagneticCard>

          <MagneticCard strength={3} className="rounded-xl p-3" as="div">
            <div style={{ background: "#111827", border: "1px solid #1F2937" }} className="rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Global Risk Score</p>
              <p className="text-xl font-bold text-white">{risk?.overall_score ?? "—"} / {risk?.grade ?? "—"} <span className="text-emerald-400 text-sm">{risk?.trend === "improving" ? "↗ Improving" : risk?.trend === "degrading" ? "↘ Degrading" : "→ Stable"}</span></p>
            </div>
          </MagneticCard>

          <MagneticCard strength={3} className="rounded-xl p-3" as="div">
            <div style={{ background: "#111827", border: "1px solid #1F2937" }} className="rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Active Incident</p>
              {activeIncident ? (
                <>
                  <p className="text-xs text-red-400 font-semibold">🔴 {activeIncident.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {String(activeIncident.severity || "").toUpperCase()} · {ageLabel(activeIncident.created_at)}
                    {openIncidents.length > 1 ? ` · ${openIncidents.length} open incidents` : ""}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    No financial impact or breach-notification deadline is recorded for this incident.
                  </p>
                </>
              ) : <p className="text-xs text-slate-500">No open incidents.</p>}
            </div>
          </MagneticCard>

          <MagneticCard strength={3} className="rounded-xl p-3" as="div">
            <div style={{ background: "#111827", border: "1px solid #1F2937" }} className="rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Adversary & Dark Web</p>
              <p className="text-xs text-slate-400">Not measured here.</p>
              <p className="text-[10px] text-slate-600 mt-1">
                This platform stores no threat-actor, ransomware, leak-site or credential-dump records, so nothing on
                this panel can claim an adversary is tracking GDS.
              </p>
            </div>
          </MagneticCard>
        </div>
      </div>
    </div>
  );
}
