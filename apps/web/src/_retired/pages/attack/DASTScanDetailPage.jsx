import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function DASTScanDetailPage() {
  const { id } = useParams();
  const { data: scans = [] } = useQuery({ queryKey: ["dast-scans"], queryFn: () => base44.entities.DASTScan.list("-created_date", 50) });
  const scan = scans.find(s => s.id === id);

  if (!scan) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#050810" }}>
      <div className="text-center text-slate-500">
        <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>Scan not found</p>
        <Link to="/attack/dast" className="text-blue-400 text-sm mt-2 block hover:underline">← Back to DAST</Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 bg-[#050810] min-h-screen -m-6 p-6">
      <div className="flex items-center gap-3">
        <Link to="/attack/dast" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white font-mono">{scan.target_url}</h1>
          <p className="text-sm text-slate-500">DAST Scan Detail · {scan.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Status", scan.status, "text-blue-400"],
          ["Vulnerabilities", scan.vulnerabilities_found ?? 0, "text-orange-400"],
          ["Critical", scan.critical_count ?? 0, "text-red-400"],
          ["Requests Sent", (scan.requests_sent ?? 0).toLocaleString(), "text-emerald-400"],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-[#0D1117] border border-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">{l}</p>
            <p className={`text-2xl font-bold font-mono mt-1 capitalize ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0D1117] border border-[#1e293b] rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Scan Details</h3>
        {[
          ["Target URL", scan.target_url],
          ["Scan Type", scan.scan_type],
          ["Auth Method", scan.auth_type],
          ["Agent", scan.agent_name],
          ["Pages Crawled", scan.pages_crawled ?? 0],
          ["Started At", scan.started_at ? new Date(scan.started_at).toLocaleString() : "—"],
        ].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between py-2 border-b border-[#1e293b]">
            <span className="text-xs text-slate-500">{l}</span>
            <span className="text-xs text-white font-mono capitalize">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}