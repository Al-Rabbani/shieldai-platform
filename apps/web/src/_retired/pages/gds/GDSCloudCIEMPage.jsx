import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Shield, AlertTriangle, Activity, X, Check } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge, timeAgo } from "@/components/gds/GDSOSShared";

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

function RiskGauge({ score, size = 50 }) {
  const r = size / 2 - 5;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = score >= 70 ? LOW : score >= 40 ? MEDIUM : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 4} fill={color} fontSize={size * 0.28} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

export default function GDSCloudCIEMPage() {
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: identities = [] } = useQuery({
    queryKey: ["cloud-identities"],
    queryFn: () => base44.entities.CloudIdentity?.list("-risk_score", 500).catch(() => []),
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["ciem-findings"],
    queryFn: () => base44.entities.CIEMFinding?.list("-created_at", 500).catch(() => []),
  });

  const adminIdentities = identities.filter(i => i.admin_access || i.privilege_level === "admin");
  const inactiveIdentities = identities.filter(i => (i.days_inactive || 0) > 90);
  const mfaDisabled = identities.filter(i => i.type === "user" && !i.mfa_enabled);
  const overprivileged = identities.filter(i => i.privilege_level === "overprivileged" || (i.blast_radius && i.blast_radius > 50));

  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? identities :
    filter === "admin" ? adminIdentities :
    filter === "inactive" ? inactiveIdentities :
    filter === "mfa" ? mfaDisabled : overprivileged;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Cloud Security" }, { label: "Identity Center" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Cloud Identity Center</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>CIEM, access governance, and privilege management</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: CYAN }} />
          <span className="text-[10px] font-bold" style={{ color: CYAN }}>LIVE DATA</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4" style={{ color: CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Identities</p>
          </div>
          <p className="text-2xl font-black text-white">{identities.length}</p>
        </Card>

        <Card className="p-4" glow>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: DANGER }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Admin Access</p>
          </div>
          <p className="text-2xl font-black" style={{ color: DANGER }}>{adminIdentities.length}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4" style={{ color: MUTED }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Inactive 90d+</p>
          </div>
          <p className="text-2xl font-black" style={{ color: MUTED }}>{inactiveIdentities.length}</p>
        </Card>

        <Card className="p-4" glow>
          <div className="flex items-center gap-2 mb-2">
            <X className="w-4 h-4" style={{ color: DANGER }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>MFA Disabled</p>
          </div>
          <p className="text-2xl font-black" style={{ color: DANGER }}>{mfaDisabled.length}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: HIGH }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Overprivileged</p>
          </div>
          <p className="text-2xl font-black" style={{ color: HIGH }}>{overprivileged.length}</p>
        </Card>
      </div>

      {/* Identities Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-bold text-white">Cloud Identities</h3>
            <div className="flex gap-2">
              {[
                { value: "all", label: "All" },
                { value: "admin", label: "Admin" },
                { value: "inactive", label: "Inactive" },
                { value: "mfa", label: "No MFA" },
                { value: "overprivileged", label: "Overprivileged" }
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filter === f.value ? "active" : ""
                  }`}
                  style={{
                    background: filter === f.value ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${filter === f.value ? CYAN + "40" : BORDER}`,
                    color: filter === f.value ? CYAN : MUTED
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Identity", "Type", "Provider", "MFA", "Admin", "Inactive", "Key Age", "Privilege", "Risk", "Blast Radius"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((id, i) => (
                <React.Fragment key={id.id || i}>
                  <tr
                    onClick={() => setExpandedRow(expandedRow === id.id ? null : id.id)}
                    style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f", cursor: "pointer" }}>
                    <td className="px-4 py-3 text-xs font-bold text-white max-w-xs truncate">{id.identity_name || id.name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>
                        {id.type || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3"><ProviderBadge provider={id.provider} /></td>
                    <td className="px-4 py-3">
                      {id.type === "user" && !id.mfa_enabled ? (
                        <X className="w-3.5 h-3.5" style={{ color: DANGER }} />
                      ) : (
                        <Check className="w-3.5 h-3.5" style={{ color: LOW }} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {id.admin_access && (
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>ADMIN</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: (id.days_inactive || 0) > 90 ? DANGER : MUTED }}>
                      {id.days_inactive || 0}d
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: (id.access_key_age || 0) > 90 ? HIGH : MUTED }}>
                      {id.access_key_age || 0}d
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        id.privilege_level === "admin" ? `bg-[${DANGER}15] text-[${DANGER}]` :
                        id.privilege_level === "overprivileged" ? `bg-[${HIGH}15] text-[${HIGH}]` :
                        "bg-gray-700 text-gray-300"
                      }`} style={{
                        background: id.privilege_level === "admin" ? `${DANGER}15` : id.privilege_level === "overprivileged" ? `${HIGH}15` : "rgba(100,116,139,0.15)",
                        color: id.privilege_level === "admin" ? DANGER : id.privilege_level === "overprivileged" ? HIGH : MUTED
                      }}>
                        {id.privilege_level || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RiskGauge score={id.risk_score} size={40} />
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{id.blast_radius || "—"}</td>
                  </tr>
                  {expandedRow === id.id && (
                    <tr>
                      <td colSpan={10} className="px-4 py-3" style={{ background: "#050e1f" }}>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-white">CIEM Findings</p>
                          {findings.filter(f => f.identity_name === id.identity_name).length > 0 ? (
                            findings.filter(f => f.identity_name === id.identity_name).slice(0, 5).map((f, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <SevBadge sev={f.severity} />
                                <span className="text-white">{f.finding_type || f.title}</span>
                                <span className="text-[10px]" style={{ color: MUTED }}>Blast radius: {f.blast_radius || "—"}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs" style={{ color: MUTED }}>No findings for this identity</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}