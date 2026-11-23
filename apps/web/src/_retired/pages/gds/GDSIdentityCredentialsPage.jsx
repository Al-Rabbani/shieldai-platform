import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Key, Lock, AlertTriangle, Shield, BookOpen, ChevronDown } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge } from "@/components/gds/GDSOSShared";

function ExposureTypeBadge({ type }) {
  const colors = {
    kerberoastable_hash: { bg: DANGER, text: DANGER },
    asrep_hash: { bg: "#f97316", text: "#f97316" },
    golden_ticket: { bg: "#dc2626", text: "#dc2626" },
    silver_ticket: { bg: "#a855f7", text: "#a855f7" },
    pass_the_hash: { bg: HIGH, text: HIGH },
    credential_dump: { bg: "#ec4899", text: "#ec4899" },
  };
  const color = colors[type] || { bg: MUTED, text: MUTED };
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${color.bg}15`, color: color.text, border: `1px solid ${color.bg}30` }}>
      {type?.replace(/_/g, " ").toUpperCase() || "UNKNOWN"}
    </span>
  );
}

function MITREBadge({ technique }) {
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
      {technique}
    </span>
  );
}

export default function GDSIdentityCredentialsPage() {
  const [expandedRows, setExpandedRows] = useState({});

  const { data: exposures = [] } = useQuery({
    queryKey: ["identity-credential-exposures"],
    queryFn: () => base44.entities.IdentityCredentialExposure?.list("-risk_score", 500).catch(() => []),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["identity-users"],
    queryFn: () => base44.entities.ADUser?.list().catch(() => []),
  });

  // Calculate stats
  const totalExposures = exposures.length;
  const kerberoastableHashes = exposures.filter(e => e.exposure_type === "kerberoastable_hash").length;
  const asrepHashes = exposures.filter(e => e.exposure_type === "asrep_hash").length;
  const passTheHashRisk = exposures.filter(e => e.exposure_type === "pass_the_hash").length;
  const goldenTicketRisk = exposures.filter(e => e.exposure_type === "golden_ticket").length;

  const toggleExpand = (exposureId) => {
    setExpandedRows(prev => ({
      ...prev,
      [exposureId]: !prev[exposureId]
    }));
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Security" }, { label: "Credential Exposure Center" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Credential Exposure Center</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Kerberoasting, AS-REP roasting, and credential-based attacks</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4" style={{ color: CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Exposures</p>
          </div>
          <p className="text-2xl font-black text-white">{totalExposures}</p>
        </Card>

        <Card className="p-4" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4" style={{ color: DANGER }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Kerberoastable</p>
          </div>
          <p className="text-2xl font-black" style={{ color: DANGER }}>{kerberoastableHashes}</p>
        </Card>

        <Card className="p-4" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4" style={{ color: HIGH }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>AS-REP Hashes</p>
          </div>
          <p className="text-2xl font-black" style={{ color: HIGH }}>{asrepHashes}</p>
        </Card>

        <Card className="p-4" style={{ background: `${MEDIUM}08`, border: `1px solid ${MEDIUM}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: MEDIUM }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>PtH Risk</p>
          </div>
          <p className="text-2xl font-black" style={{ color: MEDIUM }}>{passTheHashRisk}</p>
        </Card>

        <Card className="p-4" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Golden Ticket</p>
          </div>
          <p className="text-2xl font-black" style={{ color: DANGER }}>{goldenTicketRisk}</p>
        </Card>
      </div>

      {/* Exposures Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Credential Exposures</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Identity", "Type", "Exposure Type", "Severity", "Source", "Cracked", "Reused", "Risk Score", "MITRE", "Actions"].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exposures.map((exposure, i) => {
                const isExpanded = expandedRows[exposure.id];
                return (
                  <React.Fragment key={exposure.id || i}>
                    <tr className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{exposure.identity_name || "—"}</p>
                          <p className="text-[9px]" style={{ color: MUTED }}>{exposure.identity_type || "—"}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>
                          {exposure.identity_type || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <ExposureTypeBadge type={exposure.exposure_type} />
                      </td>
                      <td className="py-3 px-3">
                        <SevBadge sev={exposure.severity} />
                      </td>
                      <td className="py-3 px-3" style={{ color: TEXT }}>{exposure.source || "—"}</td>
                      <td className="py-3 px-3">
                        {exposure.is_cracked ? (
                          <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>CRACKED</span>
                        ) : (
                          <span className="text-[9px]" style={{ color: MUTED }}>No</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {exposure.is_reused ? (
                          <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: `${HIGH}15`, color: HIGH }}>REUSED</span>
                        ) : (
                          <span className="text-[9px]" style={{ color: MUTED }}>No</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm font-black" style={{ color: exposure.risk_score >= 80 ? DANGER : exposure.risk_score >= 60 ? HIGH : exposure.risk_score >= 40 ? MEDIUM : LOW }}>
                          {exposure.risk_score || 0}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {exposure.mitre_technique && <MITREBadge technique={exposure.mitre_technique} />}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => toggleExpand(exposure.id)}
                          className="px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5"
                          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
                        >
                          <BookOpen className="w-3 h-3" />
                          {isExpanded ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="p-4" style={{ background: "rgba(0,212,255,0.03)" }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Exposure Details</p>
                              <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span style={{ color: MUTED }}>Source Location:</span>
                                  <span style={{ color: TEXT }}>{exposure.source_location || "—"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span style={{ color: MUTED }}>Hash Type:</span>
                                  <span style={{ color: TEXT }}>{exposure.hash_type || "—"}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Remediation Guidance</p>
                              <div className="p-3 rounded-lg" style={{ background: `${LOW}05`, border: `1px solid ${LOW}30` }}>
                                <p className="text-xs" style={{ color: TEXT }}>{exposure.remediation || "No remediation guidance available"}</p>
                              </div>
                            </div>
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