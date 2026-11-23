import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Cloud, Plus, AlertTriangle, Shield } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import GDSPageShell from "@/components/gds/GDSPageShell";
import { SevBadge, StatusBadge, StatCard, ProviderBadge } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";
const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

function MiniGauge({ score }) {
  const color = score >= 75 ? SUCCESS : score >= 40 ? "#eab308" : DANGER;
  return <span className="text-lg font-black font-mono" style={{ color }}>{score ?? "—"}</span>;
}

export default function CloudOverviewPage() {
  const { data: accounts = [], isLoading: loadA } = useQuery({
    queryKey: ["cloud-accounts-overview"],
    queryFn: () => base44.entities.CloudAccount.list().catch(() => []),
    initialData: [],
  });
  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["cloud-findings-overview"],
    queryFn: () => base44.entities.CloudFinding.list("-detected_at", 500).catch(() => []),
    initialData: [],
  });

  const open = findings.filter(f => f.status === "open");
  const donut = [
    { name: "Critical", value: open.filter(f => f.severity === "critical").length, color: "#ef4444" },
    { name: "High",     value: open.filter(f => f.severity === "high").length,     color: "#f97316" },
    { name: "Medium",   value: open.filter(f => f.severity === "medium").length,   color: "#eab308" },
    { name: "Low",      value: open.filter(f => f.severity === "low").length,      color: "#3b82f6" },
  ].filter(d => d.value > 0);

  // Group by service
  const svcMap = {};
  findings.forEach(f => { if (f.service) svcMap[f.service] = (svcMap[f.service] || 0) + 1; });
  const svcData = Object.entries(svcMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Cloud Security" }]}
      title="Cloud Security" subtitle="CSPM · CIEM · DSPM · KUBERNETES · ATTACK PATHS"
      actions={
        <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: GOLD, color: "#0a0e17" }}>
          <Plus className="w-3.5 h-3.5" /> Connect Cloud Account
        </button>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Cloud Accounts" value={accounts.length} color={CYAN} icon={Cloud} />
        <StatCard label="Total Findings" value={open.length} color="#94a3b8" icon={AlertTriangle} />
        <StatCard label="Critical" value={open.filter(f => f.severity === "critical").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Connected" value={accounts.filter(a => a.status === "connected" || a.status === "scanned").length} color={SUCCESS} icon={Shield} />
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadA ? [...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: CARD }} />
        )) : accounts.map(acc => (
          <div key={acc.id} className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ProviderBadge provider={acc.provider} />
                <span className="text-sm font-bold text-white">{acc.account_name || acc.account_id || "Account"}</span>
              </div>
              <StatusBadge status={acc.status} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-500">Findings</p>
                <p className="text-lg font-black font-mono" style={{ color: DANGER }}>{acc.total_findings ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-slate-500">Risk Score</p>
                <MiniGauge score={acc.risk_score} />
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-500">Last Scan</p>
                <p className="text-[9px] text-slate-400">
                  {acc.last_scanned ? formatDistanceToNow(new Date(acc.last_scanned), { addSuffix: true }) : "Never"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4">Findings by Severity</h3>
          {donut.length === 0 ? <p className="text-xs text-slate-500 text-center py-8">No open findings</p> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={donut} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" strokeWidth={0} paddingAngle={2}>
                    {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: `1px solid ${BORDER}`, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {donut.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                    <span className="text-xs text-slate-400 w-16">{d.name}</span>
                    <span className="text-xs font-black font-mono" style={{ color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4">Findings by Service</h3>
          {svcData.length === 0 ? <p className="text-xs text-slate-500 text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={svcData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 9 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 9 }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: `1px solid ${BORDER}`, fontSize: 11 }} />
                <Bar dataKey="count" fill={GOLD} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </GDSPageShell>
  );
}