import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Shield, AlertTriangle, Key, Lock, Calendar, CheckCircle, X } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

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

export default function GDSIdentityUsersPage() {
  const [filterAdmin, setFilterAdmin] = useState(false);
  const [filterKerberoastable, setFilterKerberoastable] = useState(false);
  const [filterASREP, setFilterASREP] = useState(false);
  const [sortBy, setSortBy] = useState("risk_score");

  const { data: users = [] } = useQuery({
    queryKey: ["ad-users"],
    queryFn: () => base44.entities.ADUser?.list().catch(() => []),
  });

  // Filter users
  let filteredUsers = [...users];
  if (filterAdmin) filteredUsers = filteredUsers.filter(u => u.is_admin || u.privilege_level === "domain_admin");
  if (filterKerberoastable) filteredUsers = filteredUsers.filter(u => u.kerberoastable);
  if (filterASREP) filteredUsers = filteredUsers.filter(u => u.asrep_roastable);

  // Sort users
  filteredUsers.sort((a, b) => {
    if (sortBy === "risk_score") return (b.risk_score || 0) - (a.risk_score || 0);
    if (sortBy === "password_age") return (b.password_age_days || 0) - (a.password_age_days || 0);
    return 0;
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Security" }, { label: "Identity User Explorer" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Identity User Explorer</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Active Directory user accounts with risk analysis</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs font-bold" style={{ color: MUTED }}>Filters:</span>
          <button
            onClick={() => setFilterAdmin(!filterAdmin)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterAdmin ? "" : "hover:opacity-70"}`}
            style={{
              background: filterAdmin ? `${DANGER}15` : "rgba(255,255,255,0.04)",
              border: `1px solid ${filterAdmin ? DANGER + "40" : BORDER}`,
              color: filterAdmin ? DANGER : MUTED
            }}
          >
            <Shield className="w-3 h-3 inline mr-1.5" />
            Admins Only
          </button>
          <button
            onClick={() => setFilterKerberoastable(!filterKerberoastable)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterKerberoastable ? "" : "hover:opacity-70"}`}
            style={{
              background: filterKerberoastable ? `${DANGER}15` : "rgba(255,255,255,0.04)",
              border: `1px solid ${filterKerberoastable ? DANGER + "40" : BORDER}`,
              color: filterKerberoastable ? DANGER : MUTED
            }}
          >
            <Key className="w-3 h-3 inline mr-1.5" />
            Kerberoastable
          </button>
          <button
            onClick={() => setFilterASREP(!filterASREP)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterASREP ? "" : "hover:opacity-70"}`}
            style={{
              background: filterASREP ? `${DANGER}15` : "rgba(255,255,255,0.04)",
              border: `1px solid ${filterASREP ? DANGER + "40" : BORDER}`,
              color: filterASREP ? DANGER : MUTED
            }}
          >
            <Lock className="w-3 h-3 inline mr-1.5" />
            AS-REP Roastable
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="risk_score">Sort by Risk Score</option>
            <option value="password_age">Sort by Password Age</option>
          </select>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">User Accounts ({filteredUsers.length})</h3>
          <Users className="w-4 h-4" style={{ color: CYAN }} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["SAM Account", "Display Name", "Admin", "Privilege", "Kerberoastable", "AS-REP", "Password Expires", "Password Age", "Inactive Days", "MFA", "Risk"].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, i) => {
                const isAdmin = user.is_admin || user.privilege_level === "domain_admin";
                const isKerberoastable = user.kerberoastable;
                const isASREP = user.asrep_roastable;
                const passwordNeverExpires = user.password_never_expires;
                const passwordAge = user.password_age_days || 0;
                const isPasswordOld = passwordAge > 90;
                const inactiveDays = user.days_inactive || 0;
                const isInactive = inactiveDays > 30;
                const isVeryInactive = inactiveDays > 90;
                const mfaEnabled = user.mfa_enabled;
                const mfaWarning = !mfaEnabled && isAdmin;

                return (
                  <tr key={user.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <span className="text-xs font-mono" style={{ color: CYAN }}>{user.sam_account_name || "—"}</span>
                    </td>
                    <td className="py-3 px-3" style={{ color: TEXT }}>{user.display_name || "—"}</td>
                    <td className="py-3 px-3">
                      {isAdmin ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>ADMIN</span>
                      ) : (
                        <span style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        user.privilege_level === "domain_admin" ? "bg-red-400/15 text-red-400" :
                        user.privilege_level === "enterprise_admin" ? "bg-orange-400/15 text-orange-400" :
                        "bg-blue-400/15 text-blue-400"
                      }`}>
                        {user.privilege_level || "standard"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {isKerberoastable ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>YES</span>
                      ) : (
                        <span style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {isASREP ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>YES</span>
                      ) : (
                        <span style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {passwordNeverExpires ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${HIGH}15`, color: HIGH }}>NEVER</span>
                      ) : (
                        <span style={{ color: LOW }}>Expires</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={isPasswordOld ? "text-red-400 font-bold" : "text-green-400"}>
                        {passwordAge}d
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={isVeryInactive ? "text-red-400 font-bold" : isInactive ? "text-orange-400" : "text-green-400"}>
                        {inactiveDays}d
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {mfaEnabled ? (
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      ) : (
                        <X className={`w-3 h-3 ${mfaWarning ? "text-red-400" : "text-slate-500"}`} />
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <RiskGauge score={user.risk_score} size={35} />
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