import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import SlaWarningBadge from "@/components/vulnmgmt/SlaWarningBadge";
import LinearTicketCell from "@/components/vulnmgmt/LinearTicketCell";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

export default function VulnTable({ findings, onRemediate, selectedIds = [], onToggleSelect, onToggleAll, linearLinks = {} }) {
  const allSelected = findings.length > 0 && findings.every(f => selectedIds.includes(f.id));
  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="w-8">
              <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all findings" />
            </TableHead>
            {["CVE ID", "Package", "Severity", "CVSS", "EPSS", "Exploited", "Asset", "Fix Version", "SLA Deadline", "SLA", "Linear", "Action"].map(h => (
              <TableHead key={h} className="text-[10px] text-slate-500 uppercase whitespace-nowrap">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.length === 0 ? (
            <TableRow><TableCell colSpan={13} className="text-center py-10 text-slate-500 text-sm">No vulnerabilities match this filter.</TableCell></TableRow>
          ) : findings.map((f, i) => (
            <TableRow key={f.id || i} className={`border-slate-800 hover:bg-white/5 ${f.exploited_in_wild ? "bg-red-500/5" : ""}`}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(f.id)}
                  onCheckedChange={() => onToggleSelect?.(f.id)}
                  aria-label={`Select ${f.cve_id || f.title || "finding"}`}
                />
              </TableCell>
              <TableCell className="font-mono text-xs text-slate-300 whitespace-nowrap">{f.cve_id || "—"}</TableCell>
              <TableCell className="text-xs text-slate-400 whitespace-nowrap">{f.package_name || "—"}</TableCell>
              <TableCell><span className="text-xs font-bold uppercase" style={{ color: SEV_COLOR[f.severity] || "#94a3b8" }}>{f.severity}</span></TableCell>
              <TableCell className="text-xs text-slate-300">{f.cvss_score ?? "—"}</TableCell>
              <TableCell className="text-xs text-slate-400">{f.epss_score != null ? `${(f.epss_score * 100).toFixed(0)}%` : "—"}</TableCell>
              <TableCell>{f.exploited_in_wild ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 animate-pulse whitespace-nowrap">EXPLOITED</span> : <span className="text-slate-600 text-xs">—</span>}</TableCell>
              <TableCell className="text-xs text-slate-400 truncate max-w-[140px]">{f.asset_name}</TableCell>
              <TableCell className="text-xs text-emerald-400 whitespace-nowrap">{f.fixed_version || "no patch"}</TableCell>
              <TableCell className="text-xs text-slate-400 whitespace-nowrap">{f.sla_deadline ? format(new Date(f.sla_deadline), "MMM d") : "—"}</TableCell>
              <TableCell><SlaWarningBadge finding={f} /></TableCell>
              <TableCell><LinearTicketCell link={linearLinks[f.id]} /></TableCell>
              <TableCell>
                <button onClick={() => onRemediate(f)} className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition whitespace-nowrap">
                  🤖 AI Fix
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}