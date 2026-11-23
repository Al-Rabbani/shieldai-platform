import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Container, GitBranch, AlertTriangle, Activity, Database, Lock, FileText, TrendingUp, Zap, CheckCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";

const BG = "#020817";

export default function GDSDevSecOpsPage() {
  const [showCharts, setShowCharts] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowCharts(true), 400); return () => clearTimeout(t); }, []);

  const { data: clusters = [], isLoading: loadC } = useQuery({
    queryKey: ["k8s-clusters"], queryFn: () => base44.entities.KubernetesCluster.list().catch(() => []),
  });
  const { data: images = [], isLoading: loadI } = useQuery({
    queryKey: ["container-images"], queryFn: () => base44.entities.ContainerImage.list("-analyzed_at", 200).catch(() => []),
  });
  const { data: pipelines = [], isLoading: loadP } = useQuery({
    queryKey: ["ci-pipelines"], queryFn: () => base44.entities.CIPipeline.list("-last_run", 100).catch(() => []),
  });

  const totalClusters = clusters.length;
  const totalImages = images.length;
  const scannedImages = images.filter(i => i.scan_status === "completed").length;
  const totalPipelines = pipelines.length;
  const securePipelines = pipelines.filter(p => (p.security_score || 0) >= 80).length;
  const avgPipelineScore = pipelines.length > 0 ? Math.round(pipelines.reduce((s, p) => s + (p.security_score || 0), 0) / pipelines.length) : 0;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "DevSecOps", path: "/devsecops" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">DevSecOps Security Center</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Unified visibility across Kubernetes, containers, and CI/CD security</p>
          </div>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>K8s Clusters</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{totalClusters}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Container Images</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{totalImages}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>CI/CD Pipelines</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{totalPipelines}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Pipeline Score</p>
          <p className="text-2xl font-black font-mono" style={{ color: avgPipelineScore >= 80 ? LOW : avgPipelineScore >= 50 ? MEDIUM : DANGER }}>{avgPipelineScore}</p>
        </Card>
      </div>

      {/* Kubernetes Clusters */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Kubernetes Clusters</h3>
          </div>
        </div>
        {loadC ? <Skeleton lines={4} /> : clusters.length === 0 ? (
          <EmptyState icon={Database} title="No Kubernetes clusters" description="Connect your K8s clusters to see security posture" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Cluster", "Version", "Nodes", "Risk Score", "Critical Findings", "Last Scanned"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clusters.slice(0, 10).map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <p className="text-sm font-semibold text-white">{c.cluster_name || c.name}</p>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{c.kubernetes_version || "—"}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{c.node_count || 0}</td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-black font-mono" style={{ color: (c.risk_score || 0) >= 70 ? LOW : (c.risk_score || 0) >= 40 ? MEDIUM : DANGER }}>
                        {c.risk_score || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{c.critical_findings || 0}</span>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(c.last_scanned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Container Images */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Container className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Container Image Security</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>{scannedImages}/{totalImages} scanned</span>
        </div>
        {loadI ? <Skeleton lines={4} /> : images.length === 0 ? (
          <EmptyState icon={Container} title="No container images" description="Scan your container registries to see image security status" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Image", "Tag", "Scan Status", "Vulnerabilities", "Critical", "High", "Risk Score", "Last Scanned"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {images.slice(0, 10).map((img, i) => (
                  <tr key={img.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <p className="text-sm font-semibold text-white truncate max-w-xs">{img.image_name || img.repository || "—"}</p>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{img.tag || "latest"}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        img.scan_status === "completed" ? "bg-green-400/15 text-green-400" :
                        img.scan_status === "scanning" ? "bg-blue-400/15 text-blue-400" :
                        "bg-gray-400/15 text-gray-400"
                      }`}>
                        {img.scan_status || "unknown"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{img.vulnerability_count || 0}</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{img.critical_count || 0}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>{img.high_count || 0}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-black font-mono" style={{ color: (img.risk_score || 0) >= 70 ? LOW : (img.risk_score || 0) >= 40 ? MEDIUM : DANGER }}>
                        {img.risk_score || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(img.analyzed_at || img.last_scanned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CI/CD Pipeline Security */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">CI/CD Pipeline Security Metrics</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{securePipelines}/{totalPipelines} secure</span>
        </div>
        {loadP ? <Skeleton lines={4} /> : pipelines.length === 0 ? (
          <EmptyState icon={GitBranch} title="No CI/CD pipelines" description="Connect your CI/CD platforms to see pipeline security metrics" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pipelines.slice(0, 6).map((p) => {
              const scoreColor = (p.security_score || 0) >= 80 ? LOW : (p.security_score || 0) >= 50 ? MEDIUM : DANGER;
              return (
                <div key={p.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-white">{p.pipeline_name || p.name}</h4>
                    <span className="text-xs font-black font-mono" style={{ color: scoreColor }}>{p.security_score || 0}</span>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: MUTED }}>
                      <span>Security Score</span>
                      <span>{p.security_score || 0}/100</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${p.security_score || 0}%`, background: scoreColor }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: MUTED }}>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" style={{ color: LOW }} />
                      {p.security_gates?.length || 0} gates
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" style={{ color: CYAN }} />
                      {p.status === "success" ? "Success" : p.status === "running" ? "Running" : "Failed"}
                    </span>
                    <span>{timeAgo(p.last_run)}</span>
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