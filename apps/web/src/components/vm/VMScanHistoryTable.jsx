import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function VMScanHistoryTable({ scans }) {
  if (scans.length === 0) return <p className="text-sm text-slate-500">No scan history found.</p>;
  return (
    <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-500 text-[10px] uppercase">Hostname</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">OS</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Risk Score</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Total</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Critical</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">High</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Last Scanned</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans.map((s) => {
            const total = (s.critical_count || 0) + (s.high_count || 0) + (s.medium_count || 0) + (s.low_count || 0);
            return (
              <TableRow key={s.id} className="border-slate-800 hover:bg-white/5">
                <TableCell className="text-xs text-white font-medium">{s.nickname}</TableCell>
                <TableCell className="text-xs text-slate-400">{s.os_name} {s.os_version}</TableCell>
                <TableCell className="text-xs font-bold" style={{ color: s.risk_score >= 70 ? "#ef4444" : s.risk_score >= 40 ? "#f97316" : "#22c55e" }}>{s.risk_score ?? 0}</TableCell>
                <TableCell className="text-xs text-slate-300">{total}</TableCell>
                <TableCell className="text-xs text-red-400 font-semibold">{s.critical_count || 0}</TableCell>
                <TableCell className="text-xs text-orange-400 font-semibold">{s.high_count || 0}</TableCell>
                <TableCell className="text-xs text-slate-500">{s.scanned_at ? new Date(s.scanned_at).toLocaleString() : "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}