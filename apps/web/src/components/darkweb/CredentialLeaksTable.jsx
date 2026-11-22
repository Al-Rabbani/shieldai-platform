import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400" };

export default function CredentialLeaksTable({ leaks }) {
  if (leaks.length === 0) return <p className="text-sm text-slate-500">No credential leaks found.</p>;
  return (
    <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-500 text-[10px] uppercase">Email</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Domain</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Breach</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Date</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Data Classes</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Severity</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaks.map((l) => (
            <TableRow key={l.id} className="border-slate-800 hover:bg-white/5">
              <TableCell className="text-xs text-slate-300 font-mono">{l.target_email}</TableCell>
              <TableCell className="text-xs text-slate-400">{l.target_domain || "—"}</TableCell>
              <TableCell className="text-xs text-white">{l.breach_name}</TableCell>
              <TableCell className="text-xs text-slate-500">{l.breach_date ? new Date(l.breach_date).toLocaleDateString() : "—"}</TableCell>
              <TableCell className="text-xs text-slate-400">{l.leaked_passwords ? `${l.leaked_passwords} passwords` : "—"}{l.password_cracked && " · cracked"}</TableCell>
              <TableCell><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[l.severity] || SEV_COLOR.low}`}>{l.severity}</span></TableCell>
              <TableCell className="text-xs text-slate-400 capitalize">{l.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}