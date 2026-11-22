import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Key, Shield, AlertTriangle, Lock, Users } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

function AccountTypeBadge({ type }) {
  const colors = {
    gMSA: { bg: LOW, text: LOW },
    sMSA: { bg: CYAN, text: CYAN },
    regular_sa: { bg: MEDIUM, text: MEDIUM },
    krbtgt: { bg: DANGER, text: DANGER },
  };
  const color = colors[type] || { bg: MUTED, text: MUTED };
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${color.bg}15`, color: color.text, border: `1px solid ${color.bg}30` }}>
      {type || "UNKNOWN"}
    </span>
  );
}

function RiskGauge({ score, size = 40 }) {
  const r = size / 2 - 4;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = score >= 80 ? LOW : score >= 60 ? MEDIUM : score >= 40 ? HIGH : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 2} fill={color} fontSize={size * 0.22} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

export default function GDSIdentityServicesPage() {
  const { data: serviceAccounts = [] } = useQuery({
    queryKey: ["ad-service-accounts"],
    queryFn: () => base44.entities.ADServiceAccount?.list("-risk_score", 500).catch(() => []),
  });

  // Calculate stats
  const total = serviceAccounts.length;
  const kerberoastable = serviceAccounts.filter(sa => sa.kerberoastable === true).length;
  const passwordOld = serviceAccounts.filter(sa => (sa.password_age_days || 0) > 90).length;
  const privileged = serviceAccounts.filter(sa => sa.privileged === true).length;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Security" }, { label: "Service Accounts" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Service Accounts</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Active Directory service accounts and managed identities</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4" style={{ color: CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Service Accounts</p>
          </div>
          <p className="text-2xl font-black text-white">{total}</p>
        </Card>

        <Card className="p-4" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4" style={{ color: DANGER }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Kerberoastable</p>
          </div>
          <p className="text-2xl font-black" style={{ color: DANGER }}>{kerberoastable}</p>
        </Card>

        <Card className="p-4" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: HIGH }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Password &gt;90 Days</p>
          </div>
          <p className="text-2xl font-black" style={{ color: HIGH }}>{passwordOld}</p>
        </Card>

        <Card className="p-4" style={{ background: `${MEDIUM}08`, border: `1px solid ${MEDIUM}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: MEDIUM }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Privileged</p>
          </div>
          <p className="text-2xl font-black" style={{ color: MEDIUM }}>{privileged}</p>
        </Card>
      </div>

      {/* Service Accounts Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Service Account Inventory</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Account Name", "Type", "SPNs", "Password Age", "Kerberoastable", "Privileged", "Admin Count", "Interactive Logon", "Risk Score"].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {serviceAccounts.map((sa, i) => {
                const isPasswordOld = (sa.password_age_days || 0) > 90;
                return (
                  <tr key={sa.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <span className="text-xs font-semibold" style={{ color: TEXT }}>{sa.account_name || "—"}</span>
                    </td>
                    <td className="py-3 px-3">
                      <AccountTypeBadge type={sa.account_type} />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(sa.spn_list || []).slice(0, 3).map((spn, j) => (
                          <span key={j} className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${CYAN}10`, color: CYAN, border: `1px solid ${CYAN}20` }}>
                            {spn}
                          </span>
                        ))}
                        {(sa.spn_list || []).length > 3 && (
                          <span className="text-[8px]" style={{ color: MUTED }}>+{sa.spn_list.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={isPasswordOld ? "text-red-400 font-bold" : "text-green-400"}>
                        {sa.password_age_days || 0}d
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {sa.kerberoastable ? (
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>YES</span>
                      ) : (
                        <span className="text-[9px]" style={{ color: MUTED }}>No</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {sa.privileged ? (
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: `${MEDIUM}15`, color: MEDIUM }}>YES</span>
                      ) : (
                        <span className="text-[9px]" style={{ color: MUTED }}>No</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={sa.admin_count > 0 ? "text-red-400 font-bold" : "text-green-400"}>
                        {sa.admin_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {sa.interactive_logon_allowed ? (
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: `${HIGH}15`, color: HIGH }}>ALLOWED</span>
                      ) : (
                        <span className="text-[9px]" style={{ color: MUTED }}>Denied</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <RiskGauge score={sa.risk_score} size={40} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}