import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const FEED_ICONS = {
  malware_package: "🦠", zero_day: "🔴", cve_published: "📦",
  typosquat: "🎭", exploit_released: "💥", supply_chain_compromise: "🔗", ip_threat: "🌐"
};
const FEED_COLORS = {
  malware_package: "#ef4444", zero_day: "#7f1d1d", cve_published: "#f97316",
  typosquat: "#8b5cf6", exploit_released: "#ef4444", supply_chain_compromise: "#f59e0b", ip_threat: "#3b82f6"
};
const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

export default function ThreatIntelWidget() {
  const { data: feeds = [] } = useQuery({
    queryKey: ["threat-intel-feed"],
    queryFn: () => base44.entities.ThreatIntelFeed.list("-detected_at", 50),
    refetchInterval: 30000,
    initialData: []
  });

  const affectsYou = feeds.filter(f => f.affects_you && f.status === "active").length;
  const latest = feeds.slice(0, 3);

  return (
    <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(239,68,68,0.2)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: "0 0 6px #ef4444" }} />
          <h3 className="text-sm font-semibold text-white">Threat Intel</h3>
          {affectsYou > 0 && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded animate-pulse"
              style={{ color: "#ef4444", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }}>
              ⚠️ AFFECTS YOU: {affectsYou}
            </span>
          )}
        </div>
        <Link to="/threat-intel" className="text-[11px] text-red-400 hover:underline flex items-center gap-1 font-mono">
          Full Feed <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {latest.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-4">Loading threat intelligence feed…</p>
        ) : latest.map(f => (
          <div key={f.id} className="flex items-start gap-2.5 p-2.5 rounded-lg transition-all hover:opacity-80"
            style={{
              background: f.affects_you ? "rgba(239,68,68,0.06)" : "#0f172a",
              border: f.affects_you ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(30,58,95,0.4)",
              borderLeft: f.affects_you ? "3px solid #ef4444" : `3px solid ${FEED_COLORS[f.feed_type] || "#ef4444"}60`
            }}>
            <span className="text-sm flex-shrink-0 mt-0.5">{FEED_ICONS[f.feed_type] || "⚠️"}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-mono font-bold uppercase" style={{ color: SEV_COLORS[f.severity] }}>{f.severity}</span>
                {f.affects_you && <span className="text-[9px] font-mono font-bold text-red-400 animate-pulse">⚠️ YOU</span>}
              </div>
              <p className="text-xs text-white font-semibold leading-snug truncate">{f.title}</p>
              {f.package_name && <p className="text-[10px] font-mono text-slate-500">{f.package_name} {f.cve_id && `· ${f.cve_id}`}</p>}
            </div>
            {f.detected_at && (
              <span className="text-[9px] font-mono text-slate-600 flex-shrink-0">
                {formatDistanceToNow(new Date(f.detected_at), { addSuffix: true })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}