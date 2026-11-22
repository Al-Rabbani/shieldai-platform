import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400" };
const ROW_TINT = { credential_leak: "bg-red-500/5", ransomware_attack: "bg-orange-500/5", positive_intel: "bg-emerald-500/5" };

export default function DarkWebTable({ alerts }) {
  if (alerts.length === 0) return <p className="text-sm text-slate-500">No dark web alerts.</p>;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-500 text-[10px] uppercase">Type</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Severity</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Title</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Source</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Target</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Status</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Detected</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((a) => (
            <TableRow key={a.id} className={`border-slate-800 hover:bg-white/5 ${ROW_TINT[a.alert_type] || ""}`}>
              <TableCell className="text-xs text-slate-300 capitalize">{a.alert_type?.replace(/_/g, " ")}</TableCell>
              <TableCell><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[a.severity] || SEV_COLOR.low}`}>{a.severity}</span></TableCell>
              <TableCell className="text-xs text-white font-medium">{a.title}</TableCell>
              <TableCell className="text-xs text-slate-400">{a.source || "—"}</TableCell>
              <TableCell className="text-xs text-slate-400">{a.target_org || "—"}</TableCell>
              <TableCell className="text-xs text-slate-400 capitalize">{a.status}</TableCell>
              <TableCell className="text-xs text-slate-500">{a.detected_at ? new Date(a.detected_at).toLocaleDateString() : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}