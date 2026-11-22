import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function cvssChip(score) {
  if (score >= 9) return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">{score}</span>;
  if (score >= 7) return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">{score}</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">{score ?? "—"}</span>;
}

export default function VMFindingsTable({ findings, onPatch, selectedIds = [], onToggle, onToggleAll }) {
  if (findings.length === 0) return <p className="text-sm text-slate-500">No VM findings found.</p>;
  const allSelected = findings.length > 0 && selectedIds.length === findings.length;
  return (
    <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="w-8">
              <input type="checkbox" checked={allSelected} onChange={(e) => onToggleAll?.(e.target.checked)} className="cursor-pointer" />
            </TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">CVE ID</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Hostname</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">OS</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Package</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Installed</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Fixed</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">CVSS</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">EPSS</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Category</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Patch Command</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((f) => (
            <TableRow key={f.id} className="border-slate-800 hover:bg-white/5">
              <TableCell>
                <input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => onToggle?.(f.id)} className="cursor-pointer" />
              </TableCell>
              <TableCell className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-200">{f.cve_id || "—"}</span>
                  {f.exploited_in_wild && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 animate-pulse">🔴 EXPLOITED</span>}
                </div>
              </TableCell>
              <TableCell className="text-xs text-slate-300">{f.nickname || f.scan_id || "—"}</TableCell>
              <TableCell className="text-xs text-slate-400">{f.os_name || "—"}</TableCell>
              <TableCell className="text-xs text-slate-400">{f.package_name || "—"}</TableCell>
              <TableCell className="text-xs text-slate-500 font-mono">{f.installed_version || "—"}</TableCell>
              <TableCell className="text-xs text-emerald-400 font-mono">{f.fixed_version || "—"}</TableCell>
              <TableCell>{cvssChip(f.cvss_score)}</TableCell>
              <TableCell className="text-xs text-slate-400">{f.epss_score ?? "—"}</TableCell>
              <TableCell className="text-xs text-slate-400 capitalize">{f.category || "—"}</TableCell>
              <TableCell className="text-xs text-slate-500 font-mono max-w-[160px] truncate">{f.patch_command || "—"}</TableCell>
              <TableCell>
                <button onClick={() => onPatch(f)} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition whitespace-nowrap">
                  🧠 AI Patch Script
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}