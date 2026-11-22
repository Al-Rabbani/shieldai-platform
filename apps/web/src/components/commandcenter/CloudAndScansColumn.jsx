import React from "react";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };
const STATUS_COLOR = { running: "bg-blue-500/20 text-blue-400", complete: "bg-emerald-500/20 text-emerald-400", queued: "bg-slate-500/20 text-slate-400", failed: "bg-red-500/20 text-red-400" };

export default function CloudAndScansColumn({ criticalCloud, scanJobs }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-bold text-white mb-3">☁️ Critical Cloud Findings</p>
        {criticalCloud.length === 0 ? <p className="text-xs text-slate-500">No critical cloud findings.</p> : (
          <div className="space-y-2">
            {criticalCloud.slice(0, 5).map((f, i) => (
              <div key={i} className="border-b border-slate-800 last:border-0 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white truncate flex-1">{f.title}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ml-2 ${SEV_COLOR[f.severity] || SEV_COLOR.low}`}>{f.severity}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{f.service} {f.cis_control ? `· CIS ${f.cis_control}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-bold text-white mb-3">🔍 Active Scans</p>
        {scanJobs.length === 0 ? <p className="text-xs text-slate-500">No scan jobs yet.</p> : (
          <div className="space-y-2">
            {scanJobs.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-white truncate flex-1">{s.repo_name || s.scan_type}</span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[s.status] || STATUS_COLOR.queued}`}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}