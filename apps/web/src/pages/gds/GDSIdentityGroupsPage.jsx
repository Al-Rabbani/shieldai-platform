import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Shield, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

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

export default function GDSIdentityGroupsPage() {
  const [expandedGroups, setExpandedGroups] = useState({});

  const { data: groups = [] } = useQuery({
    queryKey: ["ad-groups"],
    queryFn: () => base44.entities.ADGroup?.list().catch(() => []),
  });

  // Filter to privileged groups only
  const privilegedGroups = groups.filter(g => g.is_privileged === true);

  // Highlight critical groups
  const criticalGroupNames = ["Domain Admins", "Enterprise Admins", "Schema Admins"];

  const toggleExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Security" }, { label: "Privileged Groups" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Privileged Groups</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Active Directory privileged and administrative groups</p>
        </div>
      </div>

      {/* Groups Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Privileged Groups ({privilegedGroups.length})</h3>
          <Shield className="w-4 h-4" style={{ color: DANGER }} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Group Name", "Members", "Admin Count", "Built-in", "Nested", "Risk Score"].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {privilegedGroups.map((group, i) => {
                const isCritical = criticalGroupNames.includes(group.group_name);
                const memberCount = group.member_count || 0;
                const adminCount = group.admin_count || 0;
                const hasHighAdminCount = adminCount > 5;
                const hasNested = group.nested_groups && group.nested_groups.length > 0;

                return (
                  <React.Fragment key={group.id || i}>
                    <tr 
                      className="hover:bg-white/[0.02] cursor-pointer" 
                      style={{ 
                        borderBottom: `1px solid ${BORDER}20`,
                        background: isCritical ? `${DANGER}05` : "transparent"
                      }}
                      onClick={() => toggleExpand(group.id)}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`w-3 h-3 transition-transform ${expandedGroups[group.id] ? "rotate-90" : ""}`} style={{ color: CYAN }} />
                          <span className={`text-xs font-bold ${isCritical ? "text-red-400" : TEXT}`}>
                            {group.group_name || "—"}
                          </span>
                          {isCritical && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>
                              CRITICAL
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3" style={{ color: TEXT }}>{memberCount}</td>
                      <td className="py-3 px-3">
                        <span className={hasHighAdminCount ? "text-red-400 font-bold" : "text-green-400"}>
                          {adminCount}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {group.is_builtin ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>BUILTIN</span>
                        ) : (
                          <span style={{ color: MUTED }}>Custom</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {hasNested ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${HIGH}15`, color: HIGH }}>NESTED</span>
                        ) : (
                          <span style={{ color: MUTED }}>—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <RiskGauge score={group.risk_score} size={35} />
                      </td>
                    </tr>
                    {expandedGroups[group.id] && (
                      <tr>
                        <td colSpan={6} className="py-3 px-3" style={{ background: "rgba(0,212,255,0.03)" }}>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Members</p>
                              <div className="flex flex-wrap gap-2">
                                {(group.members || []).slice(0, 10).map((member, j) => (
                                  <span key={j} className="text-[9px] px-2 py-1 rounded" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
                                    {member}
                                  </span>
                                ))}
                                {(group.members || []).length > 10 && (
                                  <span className="text-[9px] px-2 py-1" style={{ color: MUTED }}>+{group.members.length - 10} more</span>
                                )}
                              </div>
                            </div>
                            {hasNested && (
                              <div>
                                <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Nested Groups</p>
                                <div className="flex flex-wrap gap-2">
                                  {(group.nested_groups || []).map((nested, j) => (
                                    <span key={j} className="text-[9px] px-2 py-1 rounded" style={{ background: `${HIGH}15`, color: HIGH, border: `1px solid ${HIGH}30` }}>
                                      {nested}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}