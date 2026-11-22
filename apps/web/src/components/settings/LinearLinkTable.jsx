import React from "react";
import { ExternalLink } from "lucide-react";

const STATUS_COLOR = {
  open: "text-blue-300",
  in_remediation: "text-amber-300",
  fixed: "text-emerald-300",
  accepted_risk: "text-slate-400",
  false_positive: "text-slate-500",
};

export default function LinearLinkTable({ links }) {
  if (links.length === 0) {
    return <p className="text-xs text-slate-500 py-6 text-center">No Linear tickets linked yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-slate-500 border-b border-slate-800">
            <th className="text-left py-1.5 px-2 font-medium">Ticket</th>
            <th className="text-left py-1.5 px-2 font-medium">Finding</th>
            <th className="text-left py-1.5 px-2 font-medium">Linear state</th>
            <th className="text-left py-1.5 px-2 font-medium">App status</th>
            <th className="text-left py-1.5 px-2 font-medium">Synced</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id} className="border-b border-slate-800/60">
              <td className="py-1.5 px-2">
                <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold font-mono text-blue-300 hover:text-blue-200">
                  {link.identifier} <ExternalLink size={9} />
                </a>
              </td>
              <td className="py-1.5 px-2 text-slate-300 max-w-[220px] truncate">{link.finding_title}</td>
              <td className="py-1.5 px-2 text-slate-300">{link.state_name || "—"}<span className="text-slate-600"> · {link.state_type || "?"}</span></td>
              <td className={`py-1.5 px-2 font-bold ${STATUS_COLOR[link.app_status] || "text-slate-300"}`}>{String(link.app_status || "open").replace(/_/g, " ")}</td>
              <td className="py-1.5 px-2 text-slate-500">{link.synced_at ? new Date(link.synced_at).toLocaleString("en-GB") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}