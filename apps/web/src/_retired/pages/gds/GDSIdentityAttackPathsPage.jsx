import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Crosshair, AlertTriangle, TrendingUp, ChevronDown, Shield, Key } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge } from "@/components/gds/GDSOSShared";

function MITREBadge({ technique }) {
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
      {technique}
    </span>
  );
}

function PathTypeBadge({ type }) {
  const colors = {
    kerberoasting_path: { bg: DANGER, text: DANGER },
    asrep_roasting_path: { bg: "#f97316", text: "#f97316" },
    domain_admin_path: { bg: "#dc2626", text: "#dc2626" },
    privilege_escalation: { bg: "#a855f7", text: "#a855f7" },
    lateral_movement: { bg: HIGH, text: HIGH },
    credential_dump: { bg: "#ec4899", text: "#ec4899" },
  };
  const color = colors[type] || { bg: MUTED, text: MUTED };
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${color.bg}15`, color: color.text, border: `1px solid ${color.bg}30` }}>
      {type?.replace(/_/g, " ").toUpperCase() || "UNKNOWN"}
    </span>
  );
}

export default function GDSIdentityAttackPathsPage() {
  const [expandedPaths, setExpandedPaths] = useState({});

  const { data: attackPaths = [] } = useQuery({
    queryKey: ["identity-attack-paths"],
    queryFn: () => base44.entities.IdentityAttackPath?.list("-risk_score", 500).catch(() => []),
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["identity-findings"],
    queryFn: () => base44.entities.IdentityFinding?.list().catch(() => []),
  });

  const totalPaths = attackPaths.length;
  const criticalPaths = attackPaths.filter(p => p.severity === "critical").length;

  const toggleExpand = (pathId) => {
    setExpandedPaths(prev => ({
      ...prev,
      [pathId]: !prev[pathId]
    }));
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Security" }, { label: "Attack Path Viewer" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Attack Path Viewer</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Active Directory attack paths and exploitation chains</p>
        </div>
      </div>

      {/* Critical Finding Banner */}
      {criticalPaths > 0 && (
        <Card className="p-4" style={{ background: `${DANGER}08`, border: `2px solid ${DANGER}40` }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${DANGER}15` }}>
              <Crosshair className="w-6 h-6 animate-pulse" style={{ color: DANGER }} />
            </div>
            <div className="flex-1">
              <p className="text-lg font-black" style={{ color: DANGER }}>{criticalPaths} Critical Attack Paths Active</p>
              <p className="text-[10px]" style={{ color: MUTED }}>Immediate remediation required to prevent compromise</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black" style={{ color: DANGER }}>{totalPaths}</p>
              <p className="text-[9px]" style={{ color: MUTED }}>Total Paths</p>
            </div>
          </div>
        </Card>
      )}

      {/* Attack Path Cards */}
      <div className="space-y-4">
        {attackPaths.map((path, i) => {
          const isExpanded = expandedPaths[path.id];
          const stepCount = path.exploitation_steps?.length || 0;

          return (
            <Card key={path.id || i} className="p-5" style={{ background: path.severity === "critical" ? `${DANGER}05` : CARD, border: `1px solid ${path.severity === "critical" ? DANGER + "30" : BORDER}` }}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-base font-bold text-white">{path.title || path.path_name || "Unknown Path"}</h3>
                    <PathTypeBadge type={path.path_type} />
                    <SevBadge sev={path.severity} />
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      path.exploitability === "trivial" ? "bg-red-400/15 text-red-400" :
                      path.exploitability === "easy" ? "bg-orange-400/15 text-orange-400" :
                      path.exploitability === "medium" ? "bg-yellow-400/15 text-yellow-400" :
                      "bg-green-400/15 text-green-400"
                    }`}>
                      {path.exploitability?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: MUTED }}>{path.description || "No description available"}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black" style={{ color: path.severity === "critical" ? DANGER : path.severity === "high" ? HIGH : MEDIUM }}>
                    {path.risk_score || 0}
                  </p>
                  <p className="text-[9px]" style={{ color: MUTED }}>Risk Score</p>
                </div>
              </div>

              {/* Attack Path Flow Diagram */}
              <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}` }}>
                <p className="text-[9px] font-bold uppercase mb-3" style={{ color: MUTED }}>Attack Flow</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {(path.nodes || []).map((node, j) => (
                    <React.Fragment key={j}>
                      <div className="flex-shrink-0 px-3 py-2 rounded-lg text-center" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>
                        <p className="text-[9px] font-bold" style={{ color: CYAN }}>{node.type || "Node"}</p>
                        <p className="text-xs font-semibold" style={{ color: TEXT }}>{node.name || `Step ${j + 1}`}</p>
                      </div>
                      {j < (path.nodes || []).length - 1 && (
                        <ChevronDown className="w-4 h-4 rotate-[-90deg] flex-shrink-0" style={{ color: MUTED }} />
                      )}
                    </React.Fragment>
                  ))}
                  {(path.nodes || []).length === 0 && (
                    <span className="text-xs" style={{ color: MUTED }}>No nodes defined</span>
                  )}
                </div>
              </div>

              {/* MITRE Techniques */}
              {(path.mitre_techniques || []).length > 0 && (
                <div className="mb-4">
                  <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>MITRE ATT&CK Techniques</p>
                  <div className="flex flex-wrap gap-2">
                    {path.mitre_techniques.map((technique, j) => (
                      <MITREBadge key={j} technique={technique} />
                    ))}
                  </div>
                </div>
              )}

              {/* Expand Button */}
              <button
                onClick={() => toggleExpand(path.id)}
                className="flex items-center gap-2 text-xs font-bold transition-all"
                style={{ color: CYAN }}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                {isExpanded ? "Hide Details" : "View Exploitation Steps & Remediation"}
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: BORDER }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Exploitation Steps */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4" style={{ color: HIGH }} />
                        <p className="text-sm font-bold text-white">Exploitation Steps ({stepCount})</p>
                      </div>
                      <ol className="space-y-2">
                        {(path.exploitation_steps || []).map((step, j) => (
                          <li key={j} className="text-xs p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                            <span className="text-[9px] font-bold" style={{ color: CYAN }}>Step {j + 1}:</span>
                            <span className="ml-2" style={{ color: TEXT }}>{step}</span>
                          </li>
                        ))}
                        {stepCount === 0 && (
                          <li className="text-xs" style={{ color: MUTED }}>No exploitation steps defined</li>
                        )}
                      </ol>
                    </div>

                    {/* Remediation */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4" style={{ color: LOW }} />
                        <p className="text-sm font-bold text-white">Remediation</p>
                      </div>
                      <div className="p-4 rounded-lg" style={{ background: `${LOW}05`, border: `1px solid ${LOW}30` }}>
                        <p className="text-xs" style={{ color: TEXT }}>{path.remediation || "No remediation guidance available"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {attackPaths.length === 0 && (
          <Card className="p-12 text-center">
            <Crosshair className="w-12 h-12 mx-auto mb-4" style={{ color: MUTED }} />
            <p className="text-sm font-bold" style={{ color: MUTED }}>No attack paths detected</p>
            <p className="text-[10px]" style={{ color: MUTED }}>Identity attack paths will appear here</p>
          </Card>
        )}
      </div>
    </div>
  );
}