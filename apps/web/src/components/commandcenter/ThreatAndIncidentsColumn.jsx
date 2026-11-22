import React from "react";
import { Link } from "react-router-dom";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };
const STATUS_COLOR = { new: "bg-red-500/20 text-red-400", investigating: "bg-orange-500/20 text-orange-400", contained: "bg-yellow-500/20 text-yellow-400", resolved: "bg-emerald-500/20 text-emerald-400" };

export default function ThreatAndIncidentsColumn({ criticalThreats, incidents }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-bold text-white mb-3">⚡ Live Threat Feed</p>
        {criticalThreats.length === 0 ? <p className="text-xs text-slate-500">No critical findings.</p> : (
          <div className="space-y-2">
            {criticalThreats.slice(0, 6).map((f, i) => (
              <div key={i} className="border-b border-slate-800 last:border-0 pb-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-red-400">{f.cve_id || f.title?.slice(0, 30)}</span>
                  {f.cvss_score ? <span className="text-slate-500">CVSS {f.cvss_score}</span> : null}
                </div>
                <p className="text-slate-500 mt-0.5">{f.asset_name} {f.fixed_version ? `· fix ${f.fixed_version}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white">🚨 Open Incidents</p>
          <Link to="/incidents" className="text-[10px] text-blue-400 hover:underline">View all →</Link>
        </div>
        {incidents.length === 0 ? <p className="text-xs text-slate-500">No open incidents.</p> : (
          <div className="space-y-2">
            {incidents.slice(0, 5).map((inc, i) => (
              <div key={i} className="text-xs border-b border-slate-800 last:border-0 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white truncate flex-1">{inc.title}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ml-2 ${SEV_COLOR[inc.severity] || SEV_COLOR.low}`}>{inc.severity}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[inc.status] || STATUS_COLOR.new}`}>{inc.status}</span>
                  <span>{(inc.affected_assets || []).length} assets affected</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}