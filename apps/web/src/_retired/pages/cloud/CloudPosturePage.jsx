import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Link } from "react-router-dom";
import ProviderBadge from "@/components/cloud/ProviderBadge";

const PROV_META = {
  aws:   { label: "Amazon Web Services", color: "#FF9900", bg: "rgba(255,153,0,0.08)",  border: "rgba(255,153,0,0.25)" },
  gcp:   { label: "Google Cloud Platform", color: "#4285F4", bg: "rgba(66,133,244,0.08)", border: "rgba(66,133,244,0.25)" },
  azure: { label: "Microsoft Azure",       color: "#0078D4", bg: "rgba(0,120,212,0.08)", border: "rgba(0,120,212,0.25)" },
};

const SVC_COLORS = ["#3b82f6","#10b981","#f97316","#8b5cf6","#06b6d4","#ec4899","#eab308","#ef4444","#14b8a6","#a78bfa"];

function RiskGauge({ score, color }) {
  const r = 52, cx = 70, cy = 70;
  const maxAngle = 180;
  const angle = (score / 100) * maxAngle;
  const toRad = d => (d - 180) * Math.PI / 180;
  const x1 = cx + r * Math.cos(toRad(0)), y1 = cy + r * Math.sin(toRad(0));
  const x2 = cx + r * Math.cos(toRad(angle)), y2 = cy + r * Math.sin(toRad(angle));
  const large = angle > 90 ? 1 : 0;
  return (
    <svg width="140" height="80" viewBox="0 0 140 80">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(30,58,95,0.5)" strokeWidth="8" strokeLinecap="round" />
      {score > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="900" fill={color} fontFamily="JetBrains Mono">{score}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#475569" fontFamily="JetBrains Mono">RISK SCORE</text>
    </svg>
  );
}

function ProviderCard({ provider, accounts, findings }) {
  const meta = PROV_META[provider];
  if (!meta) return null;
  const accs = accounts.filter(a => a.provider === provider);
  const finds = findings.filter(f => f.provider === provider);
  const open = finds.filter(f => f.status === "open");
  const avgRisk = accs.length > 0 ? Math.round(accs.reduce((s, a) => s + (a.risk_score || 0), 0) / accs.length) : 0;
  const critical = open.filter(f => f.severity === "critical").length;
  const high = open.filter(f => f.severity === "high").length;
  const medium = open.filter(f => f.severity === "medium").length;
  const riskColor = avgRisk >= 70 ? "#ef4444" : avgRisk >= 40 ? "#f97316" : "#10b981";

  return (
    <div className="rounded-xl p-5" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
      <div className="flex items-center gap-3 mb-4">
        <ProviderBadge provider={provider} size="lg" />
        <div>
          <p className="text-xs text-slate-400">{meta.label}</p>
          <p className="text-[10px] text-slate-600 font-mono">{accs.length} account{accs.length !== 1 ? "s" : ""} · {finds.length} findings</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <RiskGauge score={avgRisk} color={riskColor} />
        <div className="space-y-2 flex-1 ml-4">
          {[
            { label: "Critical", val: critical, color: "#ef4444" },
            { label: "High",     val: high,     color: "#f97316" },
            { label: "Medium",   val: medium,   color: "#eab308" },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">{label}</span>
              <span className="text-sm font-black font-mono" style={{ color }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = { backgroundColor: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 8, color: "#e2e8f0", fontSize: 11 };

export default function CloudPosturePage() {
  const { data: accounts = [] } = useQuery({ queryKey: ["cloud-accounts"], queryFn: () => base44.entities.CloudAccount.list("-created_date", 50), initialData: [] });
  const { data: findings = [] } = useQuery({ queryKey: ["cloud-findings"], queryFn: () => base44.entities.CloudFinding.list("-detected_at", 500), initialData: [] });

  const serviceData = useMemo(() => {
    const map = {};
    findings.filter(f => f.status === "open").forEach(f => {
      if (f.service) map[f.service] = (map[f.service] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 12);
  }, [findings]);

  const cisData = useMemo(() => {
    const map = {};
    findings.filter(f => f.cis_control).forEach(f => {
      if (!map[f.cis_control]) map[f.cis_control] = { total: 0, open: 0 };
      map[f.cis_control].total++;
      if (f.status === "open") map[f.cis_control].open++;
    });
    return Object.entries(map).map(([ctrl, d]) => ({ ctrl, ...d })).sort((a, b) => b.open - a.open);
  }, [findings]);

  const openFindings = findings.filter(f => f.status === "open");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Security Posture</h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          {accounts.length} accounts · {openFindings.length} open findings across all providers
        </p>
      </div>

      {/* Provider cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["aws","gcp","azure"].map(p => <ProviderCard key={p} provider={p} accounts={accounts} findings={findings} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Findings by service */}
        <div className="rounded-xl p-5" style={{ background: "#0d1117", border: "1px solid rgba(30,58,95,0.4)" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Findings by Service</h3>
          {serviceData.length === 0 ? (
            <p className="text-xs text-slate-600 py-8 text-center">No findings yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={serviceData} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(59,130,246,0.05)" }} />
                <Bar dataKey="count" radius={3}>
                  {serviceData.map((_, i) => <Cell key={i} fill={SVC_COLORS[i % SVC_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CIS Controls */}
        <div className="rounded-xl p-5" style={{ background: "#0d1117", border: "1px solid rgba(30,58,95,0.4)" }}>
          <h3 className="text-sm font-semibold text-white mb-4">CIS Control Findings</h3>
          {cisData.length === 0 ? (
            <p className="text-xs text-slate-600 py-8 text-center">No CIS data yet</p>
          ) : (
            <div className="overflow-y-auto max-h-72">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
                    {["CIS Control","Total","Open","Pass %"].map(h => (
                      <th key={h} className="text-left pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cisData.map((row, i) => {
                    const passRate = row.total > 0 ? Math.round(((row.total - row.open) / row.total) * 100) : 100;
                    const passColor = passRate >= 80 ? "#10b981" : passRate >= 50 ? "#f97316" : "#ef4444";
                    return (
                      <tr key={row.ctrl} style={{ borderBottom: i < cisData.length-1 ? "1px solid rgba(30,58,95,0.2)" : "none" }}>
                        <td className="py-2.5 pr-4"><span className="text-xs text-blue-400 font-mono">{row.ctrl}</span></td>
                        <td className="py-2.5"><span className="text-xs text-slate-300 font-mono">{row.total}</span></td>
                        <td className="py-2.5"><span className="text-xs font-mono" style={{ color: row.open > 0 ? "#ef4444" : "#10b981" }}>{row.open}</span></td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-800">
                              <div className="h-full rounded-full transition-all" style={{ width: `${passRate}%`, background: passColor }} />
                            </div>
                            <span className="text-[10px] font-mono font-bold" style={{ color: passColor }}>{passRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick link */}
      <div className="text-center">
        <Link to="/cloud" className="text-sm text-blue-400 hover:underline font-mono">← Back to Cloud Accounts</Link>
      </div>
    </div>
  );
}