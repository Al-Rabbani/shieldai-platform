import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CARD = "#111827"; const BORDER = "#1a1f2e";

export default function PolicyViolationsPage() {
  const [fwF,   setFwF]   = useState("all");
  const [sevF,  setSevF]  = useState("all");
  const [statF, setStatF] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const { data: violations = [], isLoading } = useQuery({
    queryKey: ["policy-violations"],
    queryFn: () => base44.entities.PolicyViolation.list("-created_date", 500).catch(() => []),
    initialData: [],
  });

  const frameworks = [...new Set(violations.map(v => v.framework).filter(Boolean))];
  const assignees  = [...new Set(violations.map(v => v.assignee).filter(Boolean))];

  const filtered = violations.filter(v => {
    if (fwF   !== "all" && v.framework !== fwF) return false;
    if (sevF  !== "all" && v.severity  !== sevF) return false;
    if (statF !== "all" && v.status    !== statF) return false;
    return true;
  });

  const thisMonth = new Date(); thisMonth.setDate(1);
  const resolvedThisMonth = violations.filter(v => v.status === "resolved" && v.resolved_at && new Date(v.resolved_at) >= thisMonth).length;

  const rows = filtered.slice(0, 300).map(v => ({
    _key: v.id,
    _data: v,
    _cells: [
      <div className="flex items-center gap-1">
        {expanded === v.id ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
        <span className="text-[11px] font-semibold text-white">{v.policy_name || v.name || "—"}</span>
      </div>,
      <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ color: "#a78bfa", background: "rgba(167,139,250,0.1)" }}>{v.framework || "—"}</span>,
      <span className="text-[9px] font-mono" style={{ color: "#00d4ff" }}>{v.control_id || "—"}</span>,
      <span className="text-[9px] text-slate-300">{v.resource || "—"}</span>,
      <span className="text-[9px] capitalize text-slate-500">{v.resource_type || "—"}</span>,
      <SevBadge sev={v.severity} />,
      <StatusBadge status={v.status} />,
      <span className="text-[9px] text-slate-400">{v.assignee || "—"}</span>,
      <span className="text-[9px] text-slate-500">{v.created_date ? formatDistanceToNow(new Date(v.created_date), { addSuffix: true }) : "—"}</span>,
    ],
  }));

  // Expand row detail
  const selectedViolation = expanded ? violations.find(v => v.id === expanded) : null;

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Governance", path: "/governance" }, { label: "Policy Violations" }]}
      title="Policy Violations" subtitle="CONTROL FAILURES · COMPLIANCE GAPS · REMEDIATION TRACKING"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {[
            ["framework", fwF, setFwF, ["all",...frameworks]],
            ["severity", sevF, setSevF, ["all","critical","high","medium","low"]],
            ["status", statF, setStatF, ["all","open","in_remediation","resolved","accepted_risk"]],
          ].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o.replace(/_/g," ")}</option>)}
            </select>
          ))}
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Violations" value={violations.length} color="#94a3b8" icon={AlertTriangle} />
        <StatCard label="Critical" value={violations.filter(v=>v.severity==="critical").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Unresolved" value={violations.filter(v=>v.status==="open"||v.status==="in_remediation").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Resolved This Month" value={resolvedThisMonth} color={SUCCESS} icon={AlertTriangle} />
      </div>

      {/* Expanded detail */}
      {selectedViolation && (
        <div className="rounded-xl p-4" style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-sm font-bold text-white">{selectedViolation.policy_name}</h4>
            <button onClick={() => setExpanded(null)} className="text-xs text-slate-500 hover:text-white">Close ✕</button>
          </div>
          <p className="text-xs text-slate-400 mb-3">{selectedViolation.description || "No description available."}</p>
          {selectedViolation.remediation && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Remediation</p>
              <p className="text-xs text-slate-300">{selectedViolation.remediation}</p>
            </div>
          )}
        </div>
      )}

      <GDSTable
        columns={["Policy Name","Framework","Control ID","Resource","Resource Type","Severity","Status","Assignee","Detected"]}
        rows={rows} isLoading={isLoading}
        emptyText="No policy violations found"
        onRowClick={row => setExpanded(expanded === row?.id ? null : row?.id)} />
    </GDSPageShell>
  );
}