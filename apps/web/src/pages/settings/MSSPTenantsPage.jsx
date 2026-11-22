import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Plus, AlertTriangle, DollarSign, Shield } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const WARN = "#eab308"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";
const RISK_COLOR = score => score >= 70 ? DANGER : score >= 40 ? WARN : SUCCESS;
const PLAN_COLOR = { enterprise: GOLD, professional: "#3b82f6", starter: "#64748b", free: "#374151" };

export default function MSSPTenantsPage() {
  const [statF, setStatF] = useState("all");
  const [planF, setPlanF] = useState("all");

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["mssp-tenants"],
    queryFn: () => base44.entities.Organization.list("-created_date", 100).catch(() => []),
    initialData: [],
  });

  const filtered = tenants.filter(t => {
    if (statF !== "all" && t.status !== statF) return false;
    if (planF !== "all" && t.plan   !== planF) return false;
    return true;
  });

  const plans   = [...new Set(tenants.map(t => t.plan).filter(Boolean))];
  const totalRev = tenants.reduce((s, t) => s + (t.monthly_revenue || 0), 0);
  const slaBreached = tenants.filter(t => t.sla_breached).length;
  const slaOk = tenants.filter(t => !t.sla_breached).length;

  const sorted = [...filtered].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  const rows = sorted.map(t => {
    const rc = RISK_COLOR(t.risk_score || 0);
    const pc = PLAN_COLOR[t.plan] || "#64748b";
    return {
      _key: t.id,
      _cells: [
        <span className="text-[11px] font-semibold text-white">{t.name || t.org_name || "—"}</span>,
        <span className="text-[9px] text-slate-400">{t.mssp_provider || "GDS"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: pc, background: `${pc}18` }}>{t.plan || "—"}</span>,
        <span className="text-[9px] capitalize" style={{ color: t.status === "active" ? SUCCESS : "#64748b" }}>{t.status || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{t.seats ?? "—"}</span>,
        <span className="text-[9px] capitalize text-slate-400">{t.sla_tier || "standard"}</span>,
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", width: 40 }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(t.risk_score||0, 100)}%`, background: rc }} />
          </div>
          <span className="text-[10px] font-mono" style={{ color: rc }}>{t.risk_score ?? 0}</span>
        </div>,
        <span className="text-[9px] font-mono text-slate-400">{t.total_findings ?? 0}</span>,
        <span className="text-[9px] font-mono" style={{ color: (t.critical_findings||0) > 0 ? DANGER : "#64748b" }}>{t.critical_findings ?? 0}</span>,
        <span className="text-[9px] font-bold" style={{ color: t.sla_breached ? DANGER : SUCCESS }}>{t.sla_breached ? "⚠ Breached" : "✓ OK"}</span>,
        <span className="text-[9px] text-slate-500">{t.last_health_check ? t.last_health_check.slice(0,10) : "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Settings" }, { label: "MSSP Tenants" }]}
      title="MSSP Tenant Management" subtitle="MANAGED TENANTS · SLA TRACKING · CROSS-TENANT INTEL"
      actions={
        <div className="flex items-center gap-2">
          {[["status", statF, setStatF, ["all","active","suspended","onboarding"]], ["plan", planF, setPlanF, ["all",...plans]]].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o}</option>)}
            </select>
          ))}
          <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold" style={{ background: GOLD, color: "#0a0e17" }}>
            <Plus className="w-3.5 h-3.5" /> Onboard Tenant
          </button>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Managed Tenants" value={tenants.length} color={CYAN} icon={Users} />
        <StatCard label="SLA Compliant" value={slaOk} color={SUCCESS} icon={Shield} />
        <StatCard label="SLA Breached" value={slaBreached} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Monthly Revenue" value={totalRev > 0 ? `$${(totalRev/1000).toFixed(0)}k` : "—"} color={GOLD} icon={DollarSign} />
      </div>

      {/* Risk Ranking */}
      {sorted.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-3">Cross-Tenant Risk Ranking (Highest First)</h3>
          <div className="space-y-2">
            {sorted.slice(0, 10).map((t, i) => {
              const rc = RISK_COLOR(t.risk_score || 0);
              return (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-600 w-5">{i+1}</span>
                  <span className="text-[11px] text-white flex-1 font-semibold">{t.name || t.org_name || "Tenant"}</span>
                  <div className="flex items-center gap-2 w-32">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(t.risk_score||0, 100)}%`, background: rc }} />
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: rc }}>{t.risk_score ?? 0}</span>
                  </div>
                  {t.sla_breached && <span className="text-[8px] font-bold px-1.5 rounded" style={{ color: DANGER, background: "rgba(239,68,68,0.1)" }}>SLA!</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <GDSTable
        columns={["Tenant","MSSP Provider","Plan","Status","Seats","SLA Tier","Risk Score","Findings","Critical","SLA Status","Last Health"]}
        rows={rows} isLoading={isLoading}
        emptyText="No tenants onboarded yet" />
    </GDSPageShell>
  );
}