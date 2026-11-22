import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cloud, AlertTriangle, Shield, Zap, TrendingUp, Activity, Wrench, Search } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge, timeAgo } from "@/components/gds/GDSOSShared";

function RiskGauge({ score, size = 60 }) {
  const r = size / 2 - 6;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = score >= 70 ? LOW : score >= 40 ? MEDIUM : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 4} fill={color} fontSize={size * 0.25} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

function ProviderBadge({ provider }) {
  const colors = { aws: "#ff9900", azure: "#0078d4", gcp: "#4285f4" };
  const labels = { aws: "AWS", azure: "Azure", gcp: "GCP" };
  const color = colors[provider?.toLowerCase()] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {labels[provider?.toLowerCase()] || provider || "—"}
    </span>
  );
}

export default function GDSCloudSecurityPage() {
  const [search, setSearch] = useState("");

  const { data: accounts = [], isLoading: loadAccounts } = useQuery({
    queryKey: ["cloud-accounts"],
    queryFn: () => base44.entities.CloudAccount.list().catch(() => []),
  });

  const { data: misconfigs = [] } = useQuery({
    queryKey: ["cloud-misconfigs"],
    queryFn: () => base44.entities.CloudMisconfiguration.list("-risk_score", 500).catch(() => []),
  });

  const { data: threats = [] } = useQuery({
    queryKey: ["cloud-threats"],
    queryFn: () => base44.entities.CloudThreat?.list("-detected_at", 100).catch(() => []),
  });

  const { data: compliance = [] } = useQuery({
    queryKey: ["cloud-compliance"],
    queryFn: () => base44.entities.CloudCompliance?.list().catch(() => []),
  });

  const awsAccounts = accounts.filter(a => a.provider === "aws");
  const azureAccounts = accounts.filter(a => a.provider === "azure");
  const gcpAccounts = accounts.filter(a => a.provider === "gcp");

  const criticalMisconfigs = misconfigs.filter(m => m.severity === "critical");
  const toxicCount = criticalMisconfigs.filter(m => m.is_public_facing).length;
  const avgCompliance = compliance.length > 0
    ? Math.round(compliance.reduce((sum, c) => sum + (c.score || 0), 0) / compliance.length)
    : 0;

  const topMisconfigs = misconfigs
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 10)
    .filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || m.resource_id?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Cloud Security" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Cloud Security Center</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Multi-cloud posture, threats, and remediation</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: CYAN }} />
          <span className="text-[10px] font-bold" style={{ color: CYAN }}>LIVE DATA</span>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Cloud Accounts</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {awsAccounts.length > 0 && <ProviderBadge provider="aws" />}
            {azureAccounts.length > 0 && <ProviderBadge provider="azure" />}
            {gcpAccounts.length > 0 && <ProviderBadge provider="gcp" />}
          </div>
          <p className="text-2xl font-black text-white mt-2">{accounts.length}</p>
        </Card>

        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Misconfigs</p>
          <p className="text-2xl font-black text-white mt-2">{misconfigs.length}</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>{criticalMisconfigs.length} critical</p>
        </Card>

        <Card className="p-4" glow>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Critical</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: DANGER }} />
            <p className="text-2xl font-black" style={{ color: DANGER }}>{criticalMisconfigs.length}</p>
          </div>
        </Card>

        <Card className="p-4" glow>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Toxic Combos</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: DANGER }} />
            <p className="text-2xl font-black" style={{ color: DANGER }}>{toxicCount}</p>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Compliance</p>
          <div className="flex items-center gap-2 mt-2">
            <RiskGauge score={avgCompliance} size={48} />
          </div>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Average score</p>
        </Card>

        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Active Threats</p>
          <p className="text-2xl font-black" style={{ color: HIGH }} mt-2>{threats?.filter(t => t.status === "active").length || 0}</p>
        </Card>
      </div>

      {/* Provider Cards */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Multi-Cloud Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accounts.map((account, i) => (
            <Card key={account.id || i} glow className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-base font-bold text-white">{account.nickname || account.account_id || "Unknown"}</p>
                  <ProviderBadge provider={account.provider} />
                </div>
                <RiskGauge score={account.risk_score} size={64} />
              </div>
              <div className="flex gap-3 text-[10px]">
                <span><span className="font-bold" style={{ color: DANGER }}>{account.critical_count || 0}</span> <span style={{ color: MUTED }}>critical</span></span>
                <span><span className="font-bold" style={{ color: HIGH }}>{account.high_count || 0}</span> <span style={{ color: MUTED }}>high</span></span>
              </div>
              {account.last_scanned && (
                <p className="text-[10px] mt-2" style={{ color: MUTED }}>Scanned: {timeAgo(account.last_scanned)}</p>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Top Misconfigurations */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">Top 10 Misconfigurations by Risk</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-3 py-1.5 rounded-xl text-xs outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, width: 200 }}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Check ID", "Title", "Provider", "Severity", "Resource", "Autofix", "Detected"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topMisconfigs.map((m, i) => (
                <tr key={m.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{m.cis_control || m.check_id || "—"}</td>
                  <td className="px-4 py-3 text-xs text-white max-w-xs truncate">{m.title}</td>
                  <td className="px-4 py-3"><ProviderBadge provider={m.provider} /></td>
                  <td className="px-4 py-3"><SevBadge sev={m.severity} /></td>
                  <td className="px-4 py-3 text-xs font-mono truncate max-w-xs" style={{ color: MUTED }}>{m.resource_id || "—"}</td>
                  <td className="px-4 py-3">
                    {m.autofix_available ? (
                      <Wrench className="w-3.5 h-3.5" style={{ color: LOW }} />
                    ) : (
                      <span className="text-[10px]" style={{ color: MUTED }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{timeAgo(m.detected_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}