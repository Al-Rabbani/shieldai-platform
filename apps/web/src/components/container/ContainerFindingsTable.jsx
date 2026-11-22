import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400", info: "bg-slate-500/20 text-slate-400" };
const ROW_TINT = { secret: "bg-red-500/10", misconfiguration: "bg-orange-500/5" };

export default function ContainerFindingsTable({ findings, onFix }) {
  if (findings.length === 0) return <p className="text-sm text-slate-500">No container findings found.</p>;
  return (
    <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-500 text-[10px] uppercase">Image</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">CVE ID</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Category</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Severity</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Package</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Installed</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Fixed</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">CVSS</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Description</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((f) => (
            <TableRow key={f.id} className={`border-slate-800 hover:bg-white/5 ${ROW_TINT[f.category] || ""}`}>
              <TableCell className="text-xs text-slate-300 max-w-[140px] truncate">{f.image || f.scan_id || "—"}</TableCell>
              <TableCell className="text-xs font-mono text-slate-200">{f.cve_id || "—"}</TableCell>
              <TableCell className="text-xs text-slate-300 capitalize">{f.category === "secret" && "🔑 "}{f.category}</TableCell>
              <TableCell><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[f.severity] || SEV_COLOR.low}`}>{f.severity}</span></TableCell>
              <TableCell className="text-xs text-slate-400">{f.package_name || "—"}</TableCell>
              <TableCell className="text-xs text-slate-500 font-mono">{f.package_version || "—"}</TableCell>
              <TableCell className="text-xs text-emerald-400 font-mono">{f.fixed_version || "—"}</TableCell>
              <TableCell className="text-xs text-slate-300">{f.cvss_score ?? "—"}</TableCell>
              <TableCell className="text-xs text-slate-500 max-w-[220px] truncate">{f.description || "—"}</TableCell>
              <TableCell>
                <button onClick={() => onFix(f)} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition whitespace-nowrap">
                  🧠 AI Fix
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}