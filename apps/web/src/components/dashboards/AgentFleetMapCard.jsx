import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

const BUCKETS = {
  live: { label: "Live (<5m)", color: "#10b981" },
  recent: { label: "Recent (<1h)", color: "#3b82f6" },
  stale: { label: "Stale (<24h)", color: "#f59e0b" },
  cold: { label: "Cold / never", color: "#ef4444" },
};

function bucketOf(agent) {
  if (!agent.last_heartbeat) return "cold";
  const age = Date.now() - new Date(agent.last_heartbeat).getTime();
  if (!Number.isFinite(age)) return "cold";
  if (age < 5 * 60000) return "live";
  if (age < 3600000) return "recent";
  if (age < 86400000) return "stale";
  return "cold";
}

export default function AgentFleetMapCard({ agents = [] }) {
  const buckets = useMemo(() => {
    const map = { live: [], recent: [], stale: [], cold: [] };
    agents.forEach((a) => map[bucketOf(a)].push(a));
    return map;
  }, [agents]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {Object.entries(BUCKETS).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
            <span className="text-[11px] text-slate-400">{meta.label}: </span>
            <span className="text-[11px] font-bold text-white">{buckets[key].length}</span>
          </div>
        ))}
      </div>

      <div className="relative rounded-lg flex items-center justify-center" style={{ background: "#060b16", border: "1px solid #1F2937", height: 220 }}>
        <svg viewBox="0 0 300 200" className="w-full h-full">
          {[30, 55, 80].map((r) => (
            <circle key={r} cx="150" cy="100" r={r} fill="none" stroke="#1F2937" strokeWidth="1" />
          ))}
          <line x1="150" y1="10" x2="150" y2="190" stroke="#132033" strokeWidth="1" />
          <line x1="40" y1="100" x2="260" y2="100" stroke="#132033" strokeWidth="1" />
          {agents.map((agent, index) => {
            const bucket = bucketOf(agent);
            const angle = (index / Math.max(agents.length, 1)) * Math.PI * 2;
            const radius = 32 + (index % 3) * 20;
            const cx = 150 + Math.cos(angle) * radius;
            const cy = 100 + Math.sin(angle) * radius * 0.7;
            return (
              <g key={agent.id}>
                <circle cx={cx} cy={cy} r="4" fill={BUCKETS[bucket].color} opacity={bucket === "cold" ? 0.55 : 1} />
                <title>{`${agent.display_name || agent.name} · ${bucket}`}</title>
              </g>
            );
          })}
        </svg>
        <span className="absolute bottom-1 right-2 text-[9px] text-slate-600">status ring · not geographic</span>
      </div>

      <div className="flex items-start gap-2 text-[11px] text-amber-300/90">
        <MapPin size={13} className="mt-0.5 flex-shrink-0" />
        <p>
          Agent locations are not recorded on fleet records (no coordinates or region field), so positions here show
          heartbeat status only. Add a location field to the Agent entity before plotting geography.
        </p>
      </div>

      <Link to="/settings/agents" className="inline-block text-[11px] font-medium text-blue-400 hover:text-blue-300">
        Open agent fleet →
      </Link>
    </div>
  );
}