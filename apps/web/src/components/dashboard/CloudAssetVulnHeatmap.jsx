import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Flame, Radar } from "lucide-react";
import { buildCloudVulnClusters, heatBand, HEAT_STYLE, PROVIDER_ACCENT, TYPE_LABEL } from "@/lib/cloudVulnClusters";

// One bubble per provider × asset-type segment. Clicking a bubble hands that
// segment to the triage queue, so the findings behind it can be worked there.
export default function CloudAssetVulnHeatmap({ findings = [], cloudFindings = [] }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Asset.list("-created_date", 400)
      .then((rows) => setAssets(rows || []))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, []);

  const { clusters, groups, totals } = useMemo(
    () => buildCloudVulnClusters({ assets, findings, cloudFindings }),
    [assets, findings, cloudFindings]
  );

  const hottest = [...clusters].sort((a, b) => b.weighted - a.weighted)[0];

  function openSegment(cluster) {
    const label = `${cluster.provider} · ${TYPE_LABEL[cluster.type] || cluster.type}`;
    navigate(`/triage?provider=${encodeURIComponent(cluster.provider)}&type=${encodeURIComponent(cluster.type)}&label=${encodeURIComponent(label)}`);
  }

  function bubbleSize(cluster) {
    return Math.round(42 + Math.min(48, Math.sqrt(cluster.openVulns) * 13));
  }

  return (
    <div className="rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-start gap-2">
          <Flame size={15} className="text-red-400 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Cloud vulnerability heatmap</p>
            <p className="text-[10px] text-slate-500">
              Scan findings overlaid on every cloud asset segment · bubble size = open vulns · colour = severity heat
            </p>
          </div>
        </div>
        <span className="text-[10px] text-slate-400">
          <span className="font-mono text-white">{totals.openVulns}</span> open ·{" "}
          <span className="font-mono text-red-400">{totals.critical}</span> critical ·{" "}
          <span className="font-mono text-white">{totals.assets}</span> assets
        </span>
      </div>

      {hottest && hottest.openVulns > 0 && (
        <button
          onClick={() => openSegment(hottest)}
          className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-red-500/5 transition-colors"
          style={{ borderBottom: "1px solid #1F2937" }}
        >
          <Radar size={12} className="text-red-400" />
          <span className="text-[11px] text-slate-300">
            Hottest segment: <span className="font-bold text-white">{hottest.provider} · {TYPE_LABEL[hottest.type] || hottest.type}</span> —{" "}
            {hottest.openVulns} open ({hottest.critical} critical) across {hottest.assets} assets
          </span>
        </button>
      )}

      {loading ? (
        <div className="h-40 rounded-lg m-4 animate-shimmer" style={{ background: "#0a0f1e" }} />
      ) : clusters.length === 0 ? (
        <p className="text-xs text-slate-500 py-8 text-center">No cloud assets discovered yet — run a scan to populate the heatmap.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {groups.map((group) => (
            <div key={group.provider} className="rounded-lg p-2.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: PROVIDER_ACCENT[group.provider] || "#94a3b8" }}>
                {group.provider} · {group.rows.reduce((sum, row) => sum + row.openVulns, 0)} open
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {group.rows.map((cluster) => {
                  const band = HEAT_STYLE[heatBand(cluster)];
                  const size = bubbleSize(cluster);
                  return (
                    <button
                      key={cluster.key}
                      onClick={() => openSegment(cluster)}
                      title={`Open the triage queue for ${cluster.provider} ${TYPE_LABEL[cluster.type] || cluster.type} — ${cluster.openVulns} open findings`}
                      className="rounded-full flex flex-col items-center justify-center transition-transform hover:scale-105 hover:brightness-125"
                      style={{
                        width: size,
                        height: size,
                        background: band.color,
                        border: `1px solid ${band.ring}`,
                        boxShadow: heatBand(cluster) >= 3 ? `0 0 12px ${band.ring}` : "none",
                      }}
                    >
                      <span className="text-[9px] font-bold leading-none text-center px-1" style={{ color: band.text }}>
                        {TYPE_LABEL[cluster.type] || cluster.type}
                      </span>
                      <span className="text-xs font-black font-mono text-white leading-tight">{cluster.openVulns}</span>
                      <span className="text-[8px] text-white/60 leading-none">{cluster.assets}a</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        {HEAT_STYLE.map((band) => (
          <span key={band.label} className="flex items-center gap-1 text-[9px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: band.color, border: `1px solid ${band.ring}` }} />
            {band.label}
          </span>
        ))}
        <span className="ml-auto text-[9px] text-slate-600">Tap a bubble to open its segment in the triage queue</span>
      </div>

      {totals.unattached > 0 && (
        <p className="px-4 pb-3 text-[10px] text-slate-600">
          {totals.unattached} more open finding{totals.unattached === 1 ? "" : "s"} sit on resources outside the cloud inventory
          (repositories, VMs, DAST targets) —{" "}
          <Link to="/triage" className="text-blue-400 hover:text-blue-300">see the triage queue</Link>.
        </p>
      )}
    </div>
  );
}