import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { GitBranch, Shield, CheckCircle, XCircle, AlertTriangle, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const PLATFORM_COLORS = { github_actions: "#333", gitlab_ci: "#fc6d26", jenkins: "#d24939", circleci: "#343434", azure_devops: "#0078d4", bitbucket: "#0052cc" };
const GATES = ["sast", "sca", "secret_scan", "container_scan", "sbom", "signing", "policy_gate", "dependency_review", "iac_scan"];

export default function GDSCIPipelineSecurityPage() {
  const [platformFilter, setPlatformFilter] = useState("");
  const [scoreRange, setScoreRange] = useState([0, 100]);

  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ["ci-pipelines"],
    queryFn: () => base44.entities.CIPipeline.list("-last_run", 200).catch(() => []),
  });

  const filteredPipelines = pipelines.filter(p => {
    const matchPlatform = !platformFilter || p.platform === platformFilter;
    const score = p.security_score || 0;
    const matchScore = score >= scoreRange[0] && score <= scoreRange[1];
    return matchPlatform && matchScore;
  });

  const platforms = [...new Set(pipelines.map(p => p.platform).filter(Boolean))];

  const stats = {
    total: pipelines.length,
    highScore: pipelines.filter(p => (p.security_score || 0) >= 80).length,
    mediumScore: pipelines.filter(p => (p.security_score || 0) >= 50 && (p.security_score || 0) < 80).length,
    lowScore: pipelines.filter(p => (p.security_score || 0) < 50).length,
  };

  const getScoreColor = (score) => score >= 80 ? LOW : score >= 60 ? MEDIUM : DANGER;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "DevSecOps", path: "/devsecops" }, { label: "CI/CD Security Center" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <GitBranch className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">CI/CD Security Center</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Pipeline security posture and gate coverage analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="">All Platforms</option>
            {platforms.map(p => (
              <option key={p} value={p}>{p.replace(/_/g, " ").toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Pipelines</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: LOW }}>High Score (80+)</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.highScore}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MEDIUM }}>Medium Score (50-79)</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{stats.mediumScore}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.lowScore > 0 ? `${DANGER}08` : "transparent", border: stats.lowScore > 0 ? `1px solid ${DANGER}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Low Score (&lt;50)</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.lowScore > 0 ? DANGER : MUTED }}>{stats.lowScore}</p>
        </Card>
      </div>

      {/* Pipelines Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">CI/CD Pipelines</h3>
        {isLoading ? <Skeleton lines={6} /> : filteredPipelines.length === 0 ? (
          <EmptyState icon={GitBranch} title="No pipelines found" description={pipelines.length === 0 ? "Connect your CI/CD platforms to see security analysis" : "No pipelines match the current filters"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Pipeline", "Platform", "Security Score", "SAST", "SCA", "Secret Scan", "Container Scan", "SBOM", "Signing", "Policy Gate", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPipelines.slice(0, 100).map((p, i) => {
                  const scoreColor = getScoreColor(p.security_score || 0);
                  const gates = p.security_gates || [];
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-3">
                        <p className="text-sm font-semibold text-white truncate max-w-xs">{p.pipeline_name}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{p.repo_url?.split("/").slice(-2).join("/") || "unknown"}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${PLATFORM_COLORS[p.platform] || MUTED}15`, color: PLATFORM_COLORS[p.platform] || MUTED }}>
                          {(p.platform || "unknown").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${p.security_score || 0}%`, background: scoreColor }} />
                          </div>
                          <span className="text-xs font-black font-mono" style={{ color: scoreColor }}>{p.security_score || 0}</span>
                        </div>
                      </td>
                      {GATES.slice(0, 7).map(gate => (
                        <td key={gate} className="py-3 px-3 text-center">
                          {gates.includes(gate) ? (
                            <CheckCircle className="w-4 h-4 inline" style={{ color: LOW }} />
                          ) : (
                            <XCircle className="w-4 h-4 inline" style={{ color: DANGER }} />
                          )}
                        </td>
                      ))}
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.status === "success" ? "bg-green-400/15 text-green-400" : p.status === "failed" ? "bg-red-400/15 text-red-400" : "bg-yellow-400/15 text-yellow-400"}`}>
                          {p.status || "unknown"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Missing Controls Details */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Security Gate Coverage Analysis</h3>
        {filteredPipelines.filter(p => (p.security_score || 0) < 80).length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}>
            <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: LOW }} />
            <div>
              <p className="text-sm font-bold" style={{ color: LOW }}>All pipelines meet security standards</p>
              <p className="text-[10px]" style={{ color: MUTED }}>All pipelines have 80+ security score</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPipelines.filter(p => (p.security_score || 0) < 80).slice(0, 5).map(p => {
              const allGates = ["sast", "sca", "secret_scan", "container_scan", "sbom", "signing", "policy_gate", "dependency_review", "iac_scan"];
              const missing = allGates.filter(g => !(p.security_gates || []).includes(g));
              return (
                <div key={p.id} className="p-4 rounded-xl" style={{ background: `${DANGER}05`, border: `1px solid ${DANGER}20` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-white">{p.pipeline_name}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${getScoreColor(p.security_score || 0)}15`, color: getScoreColor(p.security_score || 0) }}>
                      Score: {p.security_score || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertTriangle className="w-3 h-3" style={{ color: MEDIUM }} />
                    <span className="text-[10px]" style={{ color: MUTED }}>Missing gates:</span>
                    <div className="flex flex-wrap gap-1">
                      {missing.map(g => (
                        <span key={g} className="text-[9px] px-1.5 py-0.5 rounded uppercase" style={{ background: `${DANGER}15`, color: DANGER }}>{g}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}