import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400" };

export default function BreachRecordsTable({ records }) {
  if (records.length === 0) return <p className="text-sm text-slate-500">No breach records found.</p>;
  return (
    <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-500 text-[10px] uppercase">Breach Name</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Organization</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Records</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Attack Vector</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Severity</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Date</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id} className="border-slate-800 hover:bg-white/5">
              <TableCell className="text-xs text-white font-medium">{r.breach_name}</TableCell>
              <TableCell className="text-xs text-slate-300">{r.organization || "—"}</TableCell>
              <TableCell className="text-xs text-slate-300">{(r.records_exposed || 0).toLocaleString()}</TableCell>
              <TableCell className="text-xs text-slate-400">{r.attack_vector || "—"}</TableCell>
              <TableCell><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[r.severity] || SEV_COLOR.low}`}>{r.severity}</span></TableCell>
              <TableCell className="text-xs text-slate-500">{r.detected_at ? new Date(r.detected_at).toLocaleDateString() : "—"}</TableCell>
              <TableCell className="text-xs text-slate-400 capitalize">{r.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}