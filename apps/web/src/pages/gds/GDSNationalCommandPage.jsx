import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Activity, Lock, Crown, FileText, Target } from "lucide-react";
import { Card } from "@/components/gds/GDSOSShared";
import { SovereignBanner, ClassificationBanner, SovereignBreadcrumb, SovereignBadge, SOVEREIGN_PAGE_BG, SOVEREIGN_CARD, NAVY_BASE, BORDER, MUTED, SOVEREIGN_GOLD, CRITICAL_RED } from "@/components/gds/NationalCommandShared";

export default function GDSNationalCommandPage() {
  const { data: threats = [] } = useQuery({ queryKey: ["national-threats"], queryFn: () => base44.entities.NationalThreat.filter({ status: "active" }).catch(() => []) });
  const { data: incidents = [] } = useQuery({ queryKey: ["national-incidents"], queryFn: () => base44.entities.NationalIncident.filter({ status: { $ne: "closed" } }).catch(() => []) });
  const { data: infrastructure = [] } = useQuery({ queryKey: ["critical-infra"], queryFn: () => base44.entities.CriticalInfrastructure.list("-risk_score", 100).catch(() => []) });
  const { data: directives = [] } = useQuery({ queryKey: ["national-directives"], queryFn: () => base44.entities.NationalDirective.list("-issued_at", 50).catch(() => []) });
  const { data: agencies = [] } = useQuery({ queryKey: ["gov-agencies"], queryFn: () => base44.entities.GovernmentAgency.list().catch(() => []) });
  const { data: tenant } = useQuery({ queryKey: ["gov-tenant"], queryFn: () => base44.entities.GovernmentTenant.list().then(r => r[0]).catch(() => null) });

  const stats = {
    activeThreats: threats.length,
    existentialThreats: threats.filter(t => t.severity === "existential").length,
    activeIncidents: incidents.length,
    criticalAssets: infrastructure.filter(i => ["critical", "severe"].includes(i.threat_level)).length,
    activeDirectives: directives.filter(d => d.status === "issued").length,
  };

  const threatLevel = tenant?.national_threat_score >= 80 ? "CRITICAL" : tenant?.national_threat_score >= 60 ? "SEVERE" : tenant?.national_threat_score >= 40 ? "HIGH" : tenant?.national_threat_score >= 20 ? "ELEVATED" : "LOW";
  const threatColors = { LOW: "#6b7280", ELEVATED: "#3b82f6", HIGH: "#f59e0b", SEVERE: "#f97316", CRITICAL: "#dc2626" };
  const threatColor = threatColors[threatLevel] || "#3b82f6";

  return (
    <div style={SOVEREIGN_PAGE_BG}>
      <SovereignBreadcrumb items={[{ label: "Command Center" }]} />
      <SovereignBanner />
      <ClassificationBanner level="OFFICIAL" />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white tracking-tight">NATIONAL CYBER DEFENSE COMMAND CENTER</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-001 · The Situation Room</p>
      </div>

      {/* THREAT LEVEL HERO */}
      <Card className="p-8 mb-6 text-center" style={{ background: `${threatColor}10`, border: `2px solid ${threatColor}40` }}>
        <div className={`text-6xl font-black mb-2 ${threatLevel === "CRITICAL" ? 'animate-pulse' : ''}`} style={{ color: threatColor, textShadow: `0 0 40px ${threatColor}60` }}>{threatLevel}</div>
        <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: MUTED }}>National Threat Level</p>
        <div className="flex items-center justify-center gap-4">
          <div className="text-left">
            <p className="text-3xl font-black" style={{ color: SOVEREIGN_GOLD }}>{tenant?.national_threat_score || 0}<span className="text-lg">/100</span></p>
            <p className="text-xs" style={{ color: MUTED }}>National Threat Score</p>
          </div>
        </div>
      </Card>

      {/* STAT ROW */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.activeThreats > 10 ? CRITICAL_RED + "40" : SOVEREIGN_GOLD + "40" }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active Threats</p>
          <p className="text-3xl font-black" style={{ color: stats.activeThreats > 10 ? CRITICAL_RED : SOVEREIGN_GOLD }}>{stats.activeThreats}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.existentialThreats > 0 ? CRITICAL_RED + "60" : SOVEREIGN_GOLD + "40" }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Existential</p>
          <p className={`text-3xl font-black ${stats.existentialThreats > 0 ? 'animate-pulse' : ''}`} style={{ color: stats.existentialThreats > 0 ? CRITICAL_RED : SOVEREIGN_GOLD }}>{stats.existentialThreats}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.activeIncidents > 5 ? "#f9731640" : SOVEREIGN_GOLD + "40" }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Incidents</p>
          <p className="text-3xl font-black" style={{ color: stats.activeIncidents > 5 ? "#f97316" : SOVEREIGN_GOLD }}>{stats.activeIncidents}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.criticalAssets > 0 ? CRITICAL_RED + "60" : SOVEREIGN_GOLD + "40" }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical Assets</p>
          <p className={`text-3xl font-black ${stats.criticalAssets > 0 ? 'animate-pulse' : ''}`} style={{ color: stats.criticalAssets > 0 ? CRITICAL_RED : SOVEREIGN_GOLD }}>{stats.criticalAssets}</p>
        </Card>
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Directives</p>
          <p className="text-3xl font-black" style={{ color: SOVEREIGN_GOLD }}>{stats.activeDirectives}</p>
        </Card>
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Agencies</p>
          <p className="text-3xl font-black" style={{ color: SOVEREIGN_GOLD }}>{tenant?.total_agencies || 0}</p>
        </Card>
      </div>

      {/* THREE PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: National Threats */}
        <Card className="p-5" style={SOVEREIGN_CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4" style={{ color: SOVEREIGN_GOLD }} />National Threats</h3>
            <Link to="/national-command/threats" className="text-[10px] font-bold" style={{ color: SOVEREIGN_GOLD }}>View All →</Link>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {threats.slice(0, 10).map(threat => (
              <div key={threat.id} className="p-3 rounded-lg" style={{ background: NAVY_BASE, border: `1px solid ${threat.severity === "existential" ? CRITICAL_RED : threat.severity === "critical" ? "#dc2626" : "#f97316"}30` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <SovereignBadge color={threat.severity === "existential" ? CRITICAL_RED : threat.severity === "critical" ? "#dc2626" : "#f97316"}>{threat.severity}</SovereignBadge>
                    <p className="text-xs font-bold text-white mt-1 truncate">{threat.title}</p>
                  </div>
                  {threat.five_eyes_shared && <Shield className="w-4 h-4" style={{ color: "#3b82f6" }} />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px]" style={{ color: MUTED }}>{threat.origin_country || "Unknown"}</span>
                  <div className="w-16 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${threat.probability_30d || 0}%`, background: (threat.probability_30d || 0) > 50 ? CRITICAL_RED : "#f59e0b" }} /></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* CENTRE: Critical Infrastructure */}
        <Card className="p-5" style={SOVEREIGN_CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Shield className="w-4 h-4" style={{ color: SOVEREIGN_GOLD }} />Critical Infrastructure</h3>
            <Link to="/national-command/infrastructure" className="text-[10px] font-bold" style={{ color: SOVEREIGN_GOLD }}>View All →</Link>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {infrastructure.slice(0, 10).map(asset => (
              <div key={asset.id} className="p-3 rounded-lg" style={{ background: NAVY_BASE, border: `1px solid ${asset.threat_level === "critical" ? CRITICAL_RED : asset.threat_level === "severe" ? "#dc2626" : "#f97316"}30` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white truncate">{asset.name}</p>
                  <div className="w-2 h-2 rounded-full" style={{ background: asset.threat_level === "critical" ? CRITICAL_RED : asset.threat_level === "severe" ? "#dc2626" : "#f97316" }} />
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span style={{ color: MUTED }}>{asset.asset_type || "Unknown"}</span>
                  <span style={{ color: MUTED }}>{asset.population_served ? `${(asset.population_served/1000000).toFixed(1)}M` : "—"}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-12 h-8 rounded bg-white/5 flex items-center justify-center">
                    <span className="text-xs font-bold" style={{ color: (asset.risk_score || 0) > 75 ? CRITICAL_RED : "#f97316" }}>{asset.risk_score || 0}</span>
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${asset.risk_score || 0}%`, background: (asset.risk_score || 0) > 75 ? CRITICAL_RED : "#f97316" }} /></div>
                    <p className="text-[8px] mt-1" style={{ color: MUTED }}>Risk Score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* RIGHT: Active Directives */}
        <Card className="p-5" style={SOVEREIGN_CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4" style={{ color: SOVEREIGN_GOLD }} />Active Directives</h3>
            <Link to="/national-command/directives" className="text-[10px] font-bold" style={{ color: SOVEREIGN_GOLD }}>View All →</Link>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {directives.filter(d => d.status === "issued").slice(0, 10).map(directive => (
              <div key={directive.id} className="p-3 rounded-lg" style={{ background: NAVY_BASE, border: `1px solid ${directive.urgency === "immediate" ? CRITICAL_RED : directive.urgency === "flash" ? "#dc2626" : "#f97316"}30` }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-mono font-bold" style={{ color: SOVEREIGN_GOLD }}>{directive.directive_ref}</p>
                  <SovereignBadge color={directive.urgency === "immediate" ? CRITICAL_RED : directive.urgency === "flash" ? "#dc2626" : "#f97316"}>{directive.urgency}</SovereignBadge>
                </div>
                <p className="text-xs font-bold text-white mb-2 truncate">{directive.title}</p>
                <div className="w-full h-1.5 rounded-full bg-white/10 mb-1">
                  <div className="h-full rounded-full" style={{ width: `${directive.compliance_rate_pct || 0}%`, background: (directive.compliance_rate_pct || 0) < 50 ? CRITICAL_RED : "#10b981" }} />
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span style={{ color: MUTED }}>{directive.agencies_compliant || 0}/{directive.agencies_total || 0}</span>
                  <span style={{ color: (directive.deadline && new Date(directive.deadline) < new Date()) ? CRITICAL_RED : MUTED }}>
                    {directive.deadline ? (new Date(directive.deadline) < new Date() ? "OVERDUE" : new Date(directive.deadline).toLocaleDateString()) : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}