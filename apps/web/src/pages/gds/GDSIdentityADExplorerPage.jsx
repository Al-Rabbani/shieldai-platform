import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Database, Users, Server, AlertTriangle, ChevronRight, ChevronDown } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

function RiskGauge({ score, size = 50 }) {
  const r = size / 2 - 5;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = score >= 80 ? LOW : score >= 60 ? MEDIUM : score >= 40 ? HIGH : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 3} fill={color} fontSize={size * 0.25} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

function RiskGradeBadge({ score }) {
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";
  const color = grade === "A" || grade === "B" ? LOW : grade === "C" ? MEDIUM : grade === "D" ? HIGH : DANGER;
  return (
    <span className="text-sm font-black px-2 py-1 rounded" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {grade}
    </span>
  );
}

export default function GDSIdentityADExplorerPage() {
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [expandedForest, setExpandedForest] = useState(true);

  const { data: forests = [] } = useQuery({
    queryKey: ["ad-forests"],
    queryFn: () => base44.entities.ADForest?.list().catch(() => []),
  });

  const { data: domains = [] } = useQuery({
    queryKey: ["ad-domains"],
    queryFn: () => base44.entities.ADDomain?.list().catch(() => []),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["ad-users"],
    queryFn: () => base44.entities.ADUser?.list().catch(() => []),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["ad-groups"],
    queryFn: () => base44.entities.ADGroup?.list().catch(() => []),
  });

  const { data: computers = [] } = useQuery({
    queryKey: ["ad-computers"],
    queryFn: () => base44.entities.ADComputer?.list().catch(() => []),
  });

  // Group resources by domain
  const getResourcesByDomain = (domainName) => {
    return {
      users: users.filter(u => u.domain === domainName).length,
      groups: groups.filter(g => g.domain === domainName).length,
      computers: computers.filter(c => c.domain === domainName).length,
    };
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Security" }, { label: "Active Directory Explorer" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Active Directory Explorer</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Forest and domain topology with security posture</p>
        </div>
      </div>

      {/* Forest Tree Structure */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Forest Structure</h3>
        <div className="space-y-4">
          {forests.map((forest, i) => (
            <div key={forest.id || i}>
              <button
                onClick={() => setExpandedForest(!expandedForest)}
                className="flex items-center gap-2 mb-3 text-left"
              >
                {expandedForest ? <ChevronDown className="w-4 h-4" style={{ color: CYAN }} /> : <ChevronRight className="w-4 h-4" style={{ color: CYAN }} />}
                <Database className="w-4 h-4" style={{ color: CYAN }} />
                <span className="text-sm font-bold text-white">{forest.forest_name || "Unknown Forest"}</span>
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>
                  {domains.filter(d => d.forest === forest.forest_name).length} domains
                </span>
              </button>

              {expandedForest && (
                <div className="ml-6 space-y-3 border-l-2 pl-4" style={{ borderColor: `${CYAN}30` }}>
                  {domains.filter(d => d.forest === forest.forest_name).map((domain, j) => {
                    const resources = getResourcesByDomain(domain.domain_name);
                    const krbtgtAge = domain.krbtgt_password_age_days || 0;
                    const isKrbtgtOld = krbtgtAge > 90;
                    const smbSigning = domain.smb_signing_required;
                    const ldapSigning = domain.ldap_signing_required;

                    return (
                      <div key={domain.id || j}>
                        <button
                          onClick={() => setSelectedDomain(selectedDomain === domain.domain_name ? null : domain.domain_name)}
                          className="flex items-center gap-2 mb-2 text-left w-full"
                        >
                          {selectedDomain === domain.domain_name ? <ChevronDown className="w-3 h-3" style={{ color: CYAN }} /> : <ChevronRight className="w-3 h-3" style={{ color: CYAN }} />}
                          <Shield className="w-3 h-3" style={{ color: CYAN }} />
                          <span className="text-xs font-bold text-white">{domain.domain_name || "Unknown Domain"}</span>
                          <RiskGradeBadge score={domain.risk_score} />
                        </button>

                        {selectedDomain === domain.domain_name && (
                          <div className="ml-5 mt-3 p-4 rounded-xl" style={{ background: "rgba(0,212,255,0.03)", border: `1px solid ${BORDER}` }}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Functional Level</p>
                                <p className="text-xs" style={{ color: TEXT }}>{domain.functional_level || "—"}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Users</p>
                                <p className="text-xs font-bold" style={{ color: CYAN }}>{resources.users}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>DCs</p>
                                <p className="text-xs font-bold" style={{ color: CYAN }}>{resources.computers}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Groups</p>
                                <p className="text-xs font-bold" style={{ color: CYAN }}>{resources.groups}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px]" style={{ color: MUTED }}>Krbtgt Age:</span>
                                <span className={`font-bold ${isKrbtgtOld ? "text-red-400" : "text-green-400"}`}>
                                  {krbtgtAge} days
                                </span>
                                {isKrbtgtOld && <AlertTriangle className="w-3 h-3 text-red-400" />}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px]" style={{ color: MUTED }}>SMB Signing:</span>
                                {smbSigning ? (
                                  <span className="text-green-400">✓ Required</span>
                                ) : (
                                  <span className="text-red-400 flex items-center gap-1">✗ Not Required <AlertTriangle className="w-3 h-3" /></span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px]" style={{ color: MUTED }}>LDAP Signing:</span>
                                {ldapSigning ? (
                                  <span className="text-green-400">✓ Required</span>
                                ) : (
                                  <span className="text-red-400 flex items-center gap-1">✗ Not Required <AlertTriangle className="w-3 h-3" /></span>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 flex items-center gap-4">
                              <RiskGauge score={domain.risk_score} size={60} />
                              <div>
                                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Risk Score</p>
                                <p className="text-2xl font-black" style={{ color: domain.risk_score >= 80 ? LOW : domain.risk_score >= 60 ? MEDIUM : domain.risk_score >= 40 ? HIGH : DANGER }}>
                                  {domain.risk_score || 0}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {forests.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: MUTED }}>No Active Directory forests configured</p>
          )}
        </div>
      </Card>

      {/* Domain Stats Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Domain Security Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Domain Name", "Functional Level", "Users", "DCs", "Krbtgt Age", "SMB Signing", "LDAP Signing", "Risk Score", "Grade"].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {domains.map((domain, i) => {
                const krbtgtAge = domain.krbtgt_password_age_days || 0;
                const isKrbtgtOld = krbtgtAge > 90;
                const smbSigning = domain.smb_signing_required;
                const ldapSigning = domain.ldap_signing_required;
                const grade = domain.risk_score >= 80 ? "A" : domain.risk_score >= 60 ? "B" : domain.risk_score >= 40 ? "C" : domain.risk_score >= 20 ? "D" : "F";
                const gradeColor = grade === "A" || grade === "B" ? LOW : grade === "C" ? MEDIUM : grade === "D" ? HIGH : DANGER;

                return (
                  <tr key={domain.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <span className="text-xs font-bold" style={{ color: CYAN }}>{domain.domain_name || "—"}</span>
                    </td>
                    <td className="py-3 px-3" style={{ color: TEXT }}>{domain.functional_level || "—"}</td>
                    <td className="py-3 px-3" style={{ color: TEXT }}>{getResourcesByDomain(domain.domain_name).users}</td>
                    <td className="py-3 px-3" style={{ color: TEXT }}>{getResourcesByDomain(domain.domain_name).computers}</td>
                    <td className="py-3 px-3">
                      <span className={isKrbtgtOld ? "text-red-400 font-bold" : "text-green-400"}>
                        {krbtgtAge}d
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {smbSigning ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}
                    </td>
                    <td className="py-3 px-3">
                      {ldapSigning ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}
                    </td>
                    <td className="py-3 px-3">
                      <RiskGauge score={domain.risk_score} size={40} />
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sm font-black px-2 py-1 rounded" style={{ color: gradeColor, background: `${gradeColor}15` }}>
                        {grade}
                      </span>
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