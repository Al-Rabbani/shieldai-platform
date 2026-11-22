import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Scale, AlertTriangle, Package } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const WARN = "#eab308";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const LICENSE_COLOR = {
  MIT: SUCCESS, "Apache-2.0": SUCCESS, "Apache 2.0": SUCCESS,
  "GPL-2.0": WARN, "GPL-3.0": WARN, GPL: WARN,
  "AGPL-3.0": DANGER, AGPL: DANGER,
  Unlicense: DANGER, UNLICENSED: DANGER, UNKNOWN: "#64748b",
};
const ECO_COLOR = { npm: "#cb3837", pip: "#3776ab", maven: "#c71a36", go: "#00add8", nuget: "#004880", cargo: "#f74c00" };

function LicenseBadge({ license }) {
  const color = LICENSE_COLOR[license] || "#64748b";
  return <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ color, background: `${color}18` }}>{license || "—"}</span>;
}

export default function LicenseCompliancePage() {
  const [riskF, setRiskF]    = useState("all");
  const [regF, setRegF]      = useState("all");
  const [eolF, setEolF]      = useState("all");
  const [licF, setLicF]      = useState("all");

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ["license-risks"],
    queryFn: () => base44.entities.LicenseRisk.list("-created_date", 500).catch(() => []),
    initialData: [],
  });

  const regs     = [...new Set(risks.map(r => r.registry || r.ecosystem).filter(Boolean))];
  const licTypes = [...new Set(risks.map(r => r.license_type).filter(Boolean))].slice(0, 10);

  const filtered = risks.filter(r => {
    if (riskF !== "all" && r.risk_level !== riskF) return false;
    if (regF  !== "all" && (r.registry || r.ecosystem) !== regF) return false;
    if (eolF  === "eol" && !r.is_eol) return false;
    if (eolF  === "active" && r.is_eol) return false;
    if (licF  !== "all" && r.license_type !== licF) return false;
    return true;
  });

  const eolPackages = risks.filter(r => r.is_eol);
  const violations  = risks.filter(r => r.risk_level === "critical" || r.risk_level === "high");

  const rows = filtered.slice(0, 300).map(r => {
    const ec = ECO_COLOR[r.registry || r.ecosystem] || "#64748b";
    const riskColor = r.risk_level === "critical" ? DANGER : r.risk_level === "high" ? "#f97316" : r.risk_level === "medium" ? WARN : SUCCESS;
    return {
      _key: r.id,
      _cells: [
        <span className="text-[11px] font-semibold text-white">{r.package_name || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{r.version || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: ec, background: `${ec}18` }}>{r.registry || r.ecosystem || "—"}</span>,
        <LicenseBadge license={r.license_type} />,
        <span className="text-[9px] font-bold capitalize" style={{ color: riskColor }}>{r.risk_level || "—"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-28 block">{r.risk_reason || r.notes || "—"}</span>,
        <span className="text-[9px]" style={{ color: r.is_direct ? "#00d4ff" : "#64748b" }}>{r.is_direct ? "Direct" : "Transitive"}</span>,
        <span className="text-[9px] font-mono text-slate-500 truncate max-w-20 block">{r.used_in || "—"}</span>,
        <span className="text-[9px]" style={{ color: r.is_eol ? DANGER : SUCCESS }}>{r.is_eol ? `⚠ EOL${r.eol_date ? ` ${r.eol_date.slice(0,7)}` : ""}` : "✓ Active"}</span>,
        <span className="text-[9px] text-slate-400">{r.replacement_package || "—"}</span>,
        <span className="text-[9px] text-slate-500">{r.created_date ? formatDistanceToNow(new Date(r.created_date), { addSuffix: true }) : "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Supply Chain", path: "/supply-chain" }, { label: "License Compliance" }]}
      title="License Compliance" subtitle="OPEN SOURCE LICENSING · EOL TRACKING · COPYLEFT RISK"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {[
            ["risk", riskF, setRiskF, ["all","critical","high","medium","low"]],
            ["registry", regF, setRegF, ["all",...regs]],
            ["eol", eolF, setEolF, ["all","eol","active"]],
            ["license", licF, setLicF, ["all",...licTypes]],
          ].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o}</option>)}
            </select>
          ))}
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Risks" value={risks.length} color="#94a3b8" icon={Scale} />
        <StatCard label="High Risk Licenses" value={violations.length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="EOL Packages" value={eolPackages.length} color={WARN} icon={Package} />
        <StatCard label="License Violations" value={risks.filter(r=>r.risk_level==="critical").length} color={DANGER} icon={AlertTriangle} />
      </div>

      {/* EOL Section */}
      {eolPackages.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid rgba(239,68,68,0.2)` }}>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} /> EOL Packages — Immediate Attention Required
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {eolPackages.slice(0, 9).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <div>
                  <p className="text-[11px] font-bold text-white">{p.package_name}</p>
                  <p className="text-[9px] text-slate-500">{p.license_type || "—"} · {p.eol_date ? `EOL ${p.eol_date.slice(0,10)}` : "EOL"}</p>
                </div>
                {p.replacement_package && (
                  <div className="text-right">
                    <p className="text-[8px] text-slate-600">Replace with</p>
                    <p className="text-[10px] font-bold" style={{ color: SUCCESS }}>{p.replacement_package}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <GDSTable
        columns={["Package","Version","Registry","License","Risk Level","Reason","Direct","Used In","EOL Status","Replacement","Detected"]}
        rows={rows} isLoading={isLoading}
        emptyText="No license risks found" />
    </GDSPageShell>
  );
}