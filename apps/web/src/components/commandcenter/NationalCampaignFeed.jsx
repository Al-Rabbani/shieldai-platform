import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Crosshair, Globe2, Radar } from "lucide-react";

const SEVERITY = {
  critical: { color: "#ef4444", label: "CRITICAL" },
  high: { color: "#f97316", label: "HIGH" },
  medium: { color: "#eab308", label: "MEDIUM" },
  low: { color: "#3b82f6", label: "LOW" },
};

function severityStyle(value) {
  return SEVERITY[String(value || "").toLowerCase()] || SEVERITY.high;
}

export default function NationalCampaignFeed() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    base44.entities.NationalThreat.filter({ campaign_active: true }, "-last_seen", 6)
      .then((rows) => { if (active) setCampaigns(rows || []); })
      .catch(() => { if (active) setCampaigns([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const sectors = [...new Set(campaigns.flatMap((campaign) => campaign.targeted_sectors || []))];

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid #1F2937" }}>
        <span className="relative flex items-center justify-center w-5 h-5">
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(239,68,68,0.25)" }} />
          <Radar size={13} className="relative text-red-400" />
        </span>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Live national threat campaigns</p>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
          {campaigns.length} active
        </span>
        {sectors.length > 0 && (
          <span className="hidden sm:inline text-[10px] text-slate-500">
            Targeting {sectors.slice(0, 4).join(" · ")}{sectors.length > 4 ? ` +${sectors.length - 4}` : ""}
          </span>
        )}
        <Link to="/threat-intelligence" className="ml-auto text-[11px] font-medium text-blue-400 hover:text-blue-300">
          Threat intel →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2 p-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-12 rounded-lg animate-shimmer" style={{ background: "#0a0f1e" }} />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <p className="text-[11px] text-slate-500 px-4 py-6">
          No active national campaigns are tracked right now. Campaigns appear here as soon as a threat record is marked active.
        </p>
      ) : (
        <div className="divide-y" style={{ borderColor: "#1F2937" }}>
          {campaigns.map((campaign) => {
            const style = severityStyle(campaign.severity);
            return (
              <div key={campaign.id} className="px-4 py-2.5 flex flex-wrap items-start gap-x-3 gap-y-1.5 hover:bg-white/[0.03] transition">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: style.color, boxShadow: `0 0 8px ${style.color}` }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-white truncate">{campaign.title}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase" style={{ color: style.color, borderColor: `${style.color}55`, background: `${style.color}18` }}>
                      {style.label}
                    </span>
                    {campaign.origin_country && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                        <Globe2 size={9} /> {campaign.origin_country}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {(campaign.targeted_sectors || []).slice(0, 5).map((sector) => (
                      <span key={sector} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                        <Crosshair size={8} /> {sector}
                      </span>
                    ))}
                    {(campaign.targeted_sectors || []).length > 5 && (
                      <span className="text-[9px] text-slate-500">+{campaign.targeted_sectors.length - 5} sectors</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  {campaign.ioc_count != null && <span className="font-mono">{campaign.ioc_count} IOCs</span>}
                  {campaign.probability_30d != null && <span className="font-mono">{campaign.probability_30d}% 30d</span>}
                  {campaign.last_seen && (
                    <span>{formatDistanceToNow(new Date(campaign.last_seen), { addSuffix: true })}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}