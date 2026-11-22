import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Host package findings, one row per advisory.
 *
 * Every column here is a column GET /host/vulnerabilities actually returns. The previous table offered hostname, OS,
 * installed version, fixed version, patch command and category, none of which exist for this estate, so six of its
 * twelve columns could only ever read an em dash.
 */
function cvssChip(score) {
  if (score == null) return <span className="text-xs text-slate-500">—</span>;
  if (score >= 9) return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">{score}</span>;
  if (score >= 7) return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">{score}</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">{score}</span>;
}

function statusChip(finding) {
  const open = finding.is_open;
  const cls = open ? "bg-orange-500/15 text-orange-400" : "bg-emerald-500/15 text-emerald-400";
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cls}`}>{finding.status || "unknown"}</span>;
}

function severityText(sev) {
  const s = String(sev || "").toLowerCase();
  const colour = s === "critical" ? "text-red-400" : s === "high" ? "text-orange-400" : s === "medium" ? "text-yellow-400" : "text-slate-400";
  return <span className={`text-xs font-medium uppercase ${colour}`}>{sev || "—"}</span>;
}

export default function VMFindingsTable({ findings, onAnalyse, emptyNote }) {
  if (findings.length === 0) return <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">{emptyNote}</p>;
  return (
    <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-500 text-[10px] uppercase">Package</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Advisory</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Severity</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Status</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">CVSS</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">EPSS</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Detected</TableHead>
            <TableHead className="text-slate-500 text-[10px] uppercase">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((f) => (
            <TableRow key={f.id} className="border-slate-800 hover:bg-white/5">
              <TableCell className="text-xs font-mono text-slate-200">{f.package_name || "—"}</TableCell>
              <TableCell className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-300">{f.cve_id || "—"}</span>
                  {f.exploited_in_wild && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/30 text-red-300">KEV</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 max-w-[320px] truncate" title={f.title}>{f.title}</p>
              </TableCell>
              <TableCell>{severityText(f.severity)}</TableCell>
              <TableCell>{statusChip(f)}</TableCell>
              <TableCell>{cvssChip(f.cvss_score)}</TableCell>
              <TableCell className="text-xs text-slate-400">{f.epss_score ?? "—"}</TableCell>
              <TableCell className="text-xs text-slate-500">{(f.detected_at || "").slice(0, 10) || "—"}</TableCell>
              <TableCell>
                <button
                  onClick={() => onAnalyse(f)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition whitespace-nowrap"
                >
                  🧠 AI Analysis
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
