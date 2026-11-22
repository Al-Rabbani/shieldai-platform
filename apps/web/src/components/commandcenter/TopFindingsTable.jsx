import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TopFindingsTable({ findings }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-sm font-bold text-white mb-3">🔥 Top Findings by CVSS</p>
      {findings.length === 0 ? <p className="text-xs text-slate-500">No findings.</p> : (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              {["CVE ID", "Package", "CVSS", "EPSS", "Exploited", "Asset", "Status", "Fix Version"].map(h => (
                <TableHead key={h} className="text-[10px] text-slate-500 uppercase">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.map((f, i) => (
              <TableRow key={f.id || i} className="border-slate-800 hover:bg-white/5">
                <TableCell className="font-mono text-xs text-slate-300">{f.cve_id || "—"}</TableCell>
                <TableCell className="text-xs text-slate-400">{f.package_name || "—"}</TableCell>
                <TableCell>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${f.cvss_score >= 9 ? "bg-red-500/20 text-red-400" : "text-slate-300"}`}>{f.cvss_score ?? "—"}</span>
                </TableCell>
                <TableCell className="text-xs text-slate-400">{f.epss_score != null ? `${(f.epss_score * 100).toFixed(0)}%` : "—"}</TableCell>
                <TableCell>{f.exploited_in_wild ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 animate-pulse">🔴 EXPLOITED</span> : <span className="text-slate-600 text-xs">—</span>}</TableCell>
                <TableCell className="text-xs text-slate-400 truncate max-w-[140px]">{f.asset_name}</TableCell>
                <TableCell className="text-xs text-slate-400">{f.status}</TableCell>
                <TableCell className="text-xs text-emerald-400">{f.fixed_version || "no patch"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}