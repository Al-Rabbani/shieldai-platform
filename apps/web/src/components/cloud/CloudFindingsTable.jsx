import React from "react";
import { format } from "date-fns";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
const SERVICE_ORDER = ["IAM", "CloudTrail", "GuardDuty", "RDS", "S3", "EC2", "Lambda", "ECS", "VPC", "KMS"];

export default function CloudFindingsTable({ findings, onRemediate }) {
  if (findings.length === 0) return <p className="text-sm text-slate-500 p-4">No cloud findings match this filter.</p>;

  const groups = {};
  findings.forEach(f => {
    const svc = (f.service || "Other").toUpperCase();
    if (!groups[svc]) groups[svc] = [];
    groups[svc].push(f);
  });
  const orderedServices = Object.keys(groups).sort((a, b) => {
    const ia = SERVICE_ORDER.findIndex(s => s.toUpperCase() === a);
    const ib = SERVICE_ORDER.findIndex(s => s.toUpperCase() === b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            {["Service", "Severity", "Finding Title", "CIS Control", "Resource", "Region", "Detected", "Status", "Action"].map(h => (
              <th key={h} className="text-left p-2 text-[10px] text-slate-500 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orderedServices.map(svc => (
            <React.Fragment key={svc}>
              <tr>
                <td colSpan={9} className="px-2 pt-3 pb-1 text-[10px] font-bold text-blue-400 uppercase tracking-widest">{svc} · {groups[svc].length}</td>
              </tr>
              {groups[svc].map((f, i) => (
                <tr key={f.id || i} className="border-b border-slate-800/60 hover:bg-white/5"
                  style={{ borderLeft: f.severity === "critical" ? "3px solid #ef4444" : "3px solid transparent" }}>
                  <td className="p-2 text-slate-400 whitespace-nowrap">{f.service}</td>
                  <td className="p-2"><span className="font-bold uppercase" style={{ color: SEV_COLOR[f.severity] || "#94a3b8" }}>{f.severity}</span></td>
                  <td className="p-2 text-white truncate max-w-[220px]">{f.title}</td>
                  <td className="p-2 text-slate-400 whitespace-nowrap">{f.cis_control || "—"}</td>
                  <td className="p-2 text-slate-400 truncate max-w-[160px]">{f.resource || "—"}</td>
                  <td className="p-2 text-slate-400 whitespace-nowrap">{f.region || "—"}</td>
                  <td className="p-2 text-slate-400 whitespace-nowrap">{f.detected_at ? format(new Date(f.detected_at), "MMM d") : "—"}</td>
                  <td className="p-2 text-slate-400 uppercase whitespace-nowrap">{f.status}</td>
                  <td className="p-2">
                    <button onClick={() => onRemediate(f)} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition whitespace-nowrap">
                      🤖 AI Remediate
                    </button>
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}