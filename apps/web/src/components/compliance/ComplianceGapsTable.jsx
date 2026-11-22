import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400" };

export default function ComplianceGapsTable({ violations }) {
  if (violations.length === 0) return <p className="text-sm text-slate-500">No critical gaps found.</p>;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-500 text-[10px] uppercase">Framework</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Control ID</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Resource</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Severity</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Description</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Remediation</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {violations.map((v) => (
            <TableRow key={v.id} className="border-slate-800 hover:bg-white/5">
              <TableCell className="text-xs text-slate-300">{v.framework || "—"}</TableCell>
              <TableCell className="text-xs text-slate-400 font-mono">{v.control_id || "—"}</TableCell>
              <TableCell className="text-xs text-slate-400 max-w-[160px] truncate">{v.resource || "—"}</TableCell>
              <TableCell><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[v.severity] || SEV_COLOR.low}`}>{v.severity}</span></TableCell>
              <TableCell className="text-xs text-slate-400 max-w-[220px] truncate">{v.description || "—"}</TableCell>
              <TableCell className="text-xs text-slate-400 max-w-[220px] truncate">{v.remediation || "—"}</TableCell>
              <TableCell className="text-xs text-slate-400 capitalize">{v.status?.replace(/_/g, " ")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}