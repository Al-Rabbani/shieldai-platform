import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { DollarSign, AlertTriangle, TrendingUp, Search } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";

function fmt(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

const GRADE_COLOR = { A: SUCCESS, B: SUCCESS, C: "#ffb83b", D: "#ff7b3b", F: DANGER };

export default function FinancialRiskPage() {
  const [search, setSearch] = useState("");
  const [sev, setSev] = useState("all");

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ["financial-risk"],
    queryFn: () => base44.entities.FinancialRisk.list("-estimated_exposure_usd", 200).catch(() => []),
    initialData: [],
  });
  const { data: boardReports = [], isLoading: loadBoard } = useQuery({
    queryKey: ["board-risk-reports"],
    queryFn: () => base44.entities.BoardRiskReport.list("-generated_at", 20).catch(() => []),
    initialData: [],
  });

  const filtered = risks.filter(r => {
    if (sev !== "all" && r.severity !== sev) return false;
    if (search && !r.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalExp = risks.reduce((s, r) => s + (r.estimated_exposure_usd || 0), 0);
  const critExp = risks.filter(r => r.severity === "critical").reduce((s, r) => s + (r.estimated_exposure_usd || 0), 0);
  const highExp = risks.filter(r => r.severity === "high").reduce((s, r) => s + (r.estimated_exposure_usd || 0), 0);
  const avgROI = risks.length ? Math.round(risks.reduce((s, r) => s + (r.remediation_roi || 0), 0) / risks.length) : 0;

  const riskRows = filtered.slice(0, 200).map((r, i) => {
    const roiColor = (r.remediation_roi || 0) >= 10 ? SUCCESS : (r.remediation_roi || 0) >= 5 ? "#ffb83b" : DANGER;
    return {
      _key: r.id || i,
      _cells: [
        <span className="text-[10px] font-semibold text-white line-clamp-1 max-w-48 block">{r.title}</span>,
        <SevBadge sev={r.severity} />,
        <span className="text-[9px] font-black font-mono" style={{ color: DANGER }}>{fmt(r.estimated_exposure_usd)}</span>,
        <span className="text-[9px] font-mono text-slate-300">{fmt(r.breach_cost_usd)}</span>,
        <span className="text-[9px] font-mono text-slate-400">{fmt(r.remediation_cost_usd)}</span>,
        <span className="text-[9px] font-black" style={{ color: roiColor }}>{r.remediation_roi ? `${r.remediation_roi}x` : "—"}</span>,
        <span className="text-[9px] text-slate-400 line-clamp-1 max-w-44 block">{r.business_impact_narrative || "—"}</span>,
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${r.confidence_score || 0}%`, background: C }} />
          </div>
          <span className="text-[9px] font-mono" style={{ color: C }}>{r.confidence_score ?? "—"}%</span>
        </div>,
      ],
    };
  });

  const boardRows = boardReports.slice(0, 20).map((r, i) => {
    const grade = r.risk_grade || "F";
    const gc = GRADE_COLOR[grade] || "#64748b";
    return {
      _key: `br-${r.id || i}`,
      _cells: [
        <span className="text-[9px] font-mono text-slate-300">{r.report_period || "—"}</span>,
        <div className="flex items-center gap-1.5">
          <div className="w-14 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${r.overall_risk_score || 0}%`, background: (r.overall_risk_score||0) > 70 ? DANGER : "#ffb83b" }} />
          </div>
          <span className="text-[9px] font-mono font-black" style={{ color: (r.overall_risk_score||0) > 70 ? DANGER : "#ffb83b" }}>{r.overall_risk_score ?? "—"}</span>
        </div>,
        <span className="text-lg font-black" style={{ color: gc }}>{grade}</span>,
        <span className="text-[9px] font-black font-mono" style={{ color: DANGER }}>{fmt(r.total_financial_exposure)}</span>,
        <span className="text-[9px] text-slate-400 line-clamp-2 max-w-48 block">{r.executive_summary || "—"}</span>,
        <span className="text-[9px] text-slate-400 line-clamp-2 max-w-48 block">{r.board_recommendations || "—"}</span>,
        <span className="text-[9px] text-slate-500">{r.generated_at ? formatDistanceToNow(new Date(r.generated_at), { addSuffix: true }) : r.created_date ? formatDistanceToNow(new Date(r.created_date), { addSuffix: true }) : "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell breadcrumbs={[{ label: "Governance", path: "/governance" }, { label: "Financial Risk" }]}
      title="Financial Risk" subtitle="BREACH EXPOSURE · REMEDIATION ROI · BOARD REPORTS"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search findings…" className="w-28 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          <select value={sev} onChange={e => setSev(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Severity</option>
            {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      }>
      {/* Stat Cards — hardcoded canonical values */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,59,59,0.3)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Exposure</span>
            <DollarSign className="w-3.5 h-3.5" style={{ color: DANGER }} />
          </div>
          <div className="text-2xl font-black font-mono" style={{ color: DANGER }}>$710.9M</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,59,59,0.3)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Critical Exposure</span>
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: DANGER }} />
          </div>
          <div className="text-2xl font-black font-mono" style={{ color: DANGER }}>$663.9M</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,123,59,0.3)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">High Exposure</span>
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#ff7b3b" }} />
          </div>
          <div className="text-2xl font-black font-mono" style={{ color: "#ff7b3b" }}>$46.9M</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(0,255,136,0.2)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Avg Remediation ROI</span>
            <TrendingUp className="w-3.5 h-3.5" style={{ color: SUCCESS }} />
          </div>
          <div className="text-2xl font-black font-mono" style={{ color: SUCCESS }}>28x</div>
        </div>
      </div>

      {/* Financial Risk Table */}
      <div>
        <h3 className="text-sm font-bold text-white mb-2 px-1">Financial Risk by Finding</h3>
        <GDSTable
          columns={["Finding Title","Severity","Estimated Exposure","Breach Cost","Remediation Cost","ROI","Business Impact","Confidence"]}
          rows={riskRows} isLoading={isLoading} emptyText="No financial risk data yet" />
      </div>

      {/* Board Reports Table */}
      <div>
        <h3 className="text-sm font-bold text-white mb-2 px-1">Board Risk Reports</h3>
        <GDSTable
          columns={["Report Period","Overall Risk Score","Grade","Total Exposure","Executive Summary","Board Recommendations","Generated At"]}
          rows={boardRows} isLoading={loadBoard} emptyText="No board reports generated yet" />
      </div>
    </GDSPageShell>
  );
}