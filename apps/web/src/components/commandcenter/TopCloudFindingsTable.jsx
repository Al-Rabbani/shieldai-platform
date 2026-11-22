import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TopCloudFindingsTable({ findings }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-sm font-bold text-white mb-3">☁️ Top Critical Cloud Findings</p>
      {findings.length === 0 ? <p className="text-xs text-slate-500">No critical cloud findings.</p> : (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              {["Service", "Finding", "CIS Control", "Region", "Status"].map(h => (
                <TableHead key={h} className="text-[10px] text-slate-500 uppercase">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.map((f, i) => (
              <TableRow key={f.id || i} className="border-slate-800 hover:bg-white/5">
                <TableCell className="text-xs text-slate-300 uppercase">{f.service}</TableCell>
                <TableCell className="text-xs text-white truncate max-w-[220px]">{f.title}</TableCell>
                <TableCell className="text-xs text-slate-400">{f.cis_control || "—"}</TableCell>
                <TableCell className="text-xs text-slate-400">{f.region || "—"}</TableCell>
                <TableCell className="text-xs text-slate-400">{f.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}