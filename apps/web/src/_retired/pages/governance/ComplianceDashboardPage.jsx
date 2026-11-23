import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, XCircle, AlertTriangle, Play } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import { StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const WARN = "#eab308"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const FW_META = {
  SOC2:     { color: "#3b82f6", icon: "🛡️" },
  ISO27001: { color: "#8b5cf6", icon: "📋" },
  "PCI-DSS":{ color: "#ef4444", icon: "💳" },
  GDPR:     { color: "#10b981", icon: "🇪🇺" },
  HIPAA:    { color: "#f97316", icon: "🏥" },
  "NIST CSF":{ color: "#00d4ff", icon: "🔒" },
};

function CircleGauge({ pct, color, size = 60 }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ filter: `drop-shadow(0 0 4px ${color}66)` }} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fill={color} fontSize={12} fontWeight="900" fontFamily="monospace">{pct}%</text>
    </svg>
  );
}

function FrameworkCard({ fw }) {
  const meta = FW_META[fw.name] || { color: GOLD, icon: "📄" };
  const total   = (fw.passing_count || 0) + (fw.failing_count || 0) + (fw.not_tested_count || 0);
  const pct     = total > 0 ? Math.round((fw.passing_count || 0) / total * 100) : 0;
  const status  = fw.status || (pct >= 80 ? "pass" : pct >= 50 ? "partial" : "fail");
  const statusColor = status === "pass" ? SUCCESS : status === "partial" ? WARN : DANGER;

  return (
    <div className="rounded-xl p-5 transition-all hover:brightness-110 cursor-pointer"
      style={{ background: CARD, border: `1px solid ${status === "fail" ? "rgba(239,68,68,0.2)" : BORDER}` }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">{meta.icon}</span>
            <h3 className="text-sm font-bold text-white">{fw.name || "Framework"}</h3>
          </div>
          <p className="text-[9px] text-slate-500 mt-0.5">{fw.version || "Latest"} · Owner: {fw.owner || "Security Team"}</p>
        </div>
        <span className="text-[9px] font-bold px-2 py-1 rounded capitalize"
          style={{ color: statusColor, background: `${statusColor}15` }}>{status}</span>
      </div>
      <div className="flex items-center gap-4">
        <CircleGauge pct={pct} color={meta.color} />
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center justify-between text-[9px]">
            <span className="flex items-center gap-1 text-slate-400"><CheckCircle className="w-3 h-3" style={{ color: SUCCESS }} /> Passing</span>
            <span className="font-bold" style={{ color: SUCCESS }}>{fw.passing_count ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-[9px]">
            <span className="flex items-center gap-1 text-slate-400"><XCircle className="w-3 h-3" style={{ color: DANGER }} /> Failing</span>
            <span className="font-bold" style={{ color: DANGER }}>{fw.failing_count ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-[9px]">
            <span className="flex items-center gap-1 text-slate-400"><AlertTriangle className="w-3 h-3" style={{ color: "#64748b" }} /> Not Tested</span>
            <span className="font-bold text-slate-500">{fw.not_tested_count ?? 0}</span>
          </div>
        </div>
      </div>
      {fw.last_assessed && (
        <p className="text-[8px] text-slate-600 mt-3">Last assessed: {fw.last_assessed?.slice?.(0, 10) || "—"}</p>
      )}
    </div>
  );
}

export default function ComplianceDashboardPage() {
  const { data: frameworks = [], isLoading } = useQuery({
    queryKey: ["compliance-frameworks"],
    queryFn: () => base44.entities.ComplianceFramework.list("-created_date", 50).catch(() => []),
    initialData: [],
  });

  const passing = frameworks.filter(f => f.status === "pass" || (!f.status && (f.passing_count || 0) > (f.failing_count || 0))).length;
  const failing = frameworks.filter(f => f.status === "fail").length;
  const total   = frameworks.reduce((s, f) => s + (f.passing_count || 0) + (f.failing_count || 0), 0);
  const pass    = frameworks.reduce((s, f) => s + (f.passing_count || 0), 0);
  const avgPct  = total > 0 ? Math.round(pass / total * 100) : 0;

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Governance", path: "/governance" }, { label: "Compliance" }]}
      title="Compliance Dashboard" subtitle="SOC2 · ISO27001 · PCI-DSS · GDPR · HIPAA · NIST CSF"
      actions={
        <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold" style={{ background: GOLD, color: "#0a0e17" }}>
          <Play className="w-3.5 h-3.5" /> Run Assessment
        </button>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Frameworks" value={frameworks.length} color={CYAN} icon={Shield} />
        <StatCard label="Passing" value={passing} color={SUCCESS} icon={CheckCircle} />
        <StatCard label="Failing" value={failing} color={DANGER} icon={XCircle} />
        <StatCard label="Overall Score" value={`${avgPct}%`} color={avgPct >= 80 ? SUCCESS : avgPct >= 50 ? WARN : DANGER} icon={Shield} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2,3,4,5].map(i => <div key={i} className="h-44 rounded-xl animate-pulse" style={{ background: CARD }} />)}
        </div>
      ) : frameworks.length === 0 ? (
        <div className="py-16 text-center rounded-2xl" style={{ border: `1px dashed ${BORDER}` }}>
          <Shield className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-sm text-slate-500">No compliance frameworks configured yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {frameworks.map(fw => <FrameworkCard key={fw.id} fw={fw} />)}
        </div>
      )}
    </GDSPageShell>
  );
}