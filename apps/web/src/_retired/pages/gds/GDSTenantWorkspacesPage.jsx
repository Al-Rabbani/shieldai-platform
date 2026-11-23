import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Layers, Activity, Flag } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

export default function GDSTenantWorkspacesPage() {
  const { data: workspaces, isLoading } = useQuery({
    queryKey: ["tenant-workspaces"],
    queryFn: () => base44.entities.TenantWorkspace.filter({}, '-created_date', 50).catch(() => []),
  });

  const { data: jobs } = useQuery({
    queryKey: ["tenant-provisioning-jobs"],
    queryFn: () => base44.entities.TenantProvisioningJob.filter({}, '-created_date', 50).catch(() => []),
  });

  const { data: featureFlags } = useQuery({
    queryKey: ["tenant-feature-flags"],
    queryFn: () => base44.entities.TenantFeatureFlag.filter({ is_enabled: true }).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Workspace Manager" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Layers className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Tenant Workspace Manager</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Workspace provisioning, jobs, and feature flags</p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{workspaces?.length || 0} workspaces</span>
        </div>
      </div>

      {/* Workspaces Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Workspaces</h3>
        {isLoading ? <Skeleton lines={6} /> : workspaces?.length === 0 ? (
          <EmptyState icon={Layers} title="No workspaces" description="Workspaces will appear here after tenant provisioning" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Workspace", "Slug", "Tenant", "Region", "Data Residency", "Storage", "Agents", "Workflows", "Memory Namespace", "Initialized", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workspaces?.map(ws => (
                  <tr key={ws.workspace_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-bold" style={{ color: TEXT }}>{ws.workspace_name}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: MUTED }}>{ws.workspace_slug}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: CYAN }}>{ws.tenant_id}</td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{ws.region}</span></td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{ws.data_residency}</span></td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${(ws.storage_used_mb / ws.storage_limit_mb) * 100}%`, background: CYAN }} />
                        </div>
                        <span className="text-[9px]" style={{ color: MUTED }}>{ws.storage_used_mb}/{ws.storage_limit_mb}MB</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{ws.active_agents}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{ws.active_workflows}</td>
                    <td className="py-2 px-3 text-[9px] font-mono truncate max-w-[150px]" style={{ color: MUTED }}>{ws.memory_namespace}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(ws.initialized_at)}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ws.status === 'active' ? 'bg-green-400/15 text-green-400' : ws.status === 'initializing' ? 'bg-yellow-400/15 text-yellow-400' : 'bg-red-400/15 text-red-400'}`}>{ws.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Provisioning Jobs */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Provisioning Jobs</h3>
        {jobs?.length === 0 ? (
          <EmptyState icon={Activity} title="No jobs" description="Provisioning jobs will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Job ID", "Tenant", "Type", "Progress", "Stage", "Plan", "Admin", "Started", "Duration", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs?.map(job => (
                  <tr key={job.job_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{job.job_id}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: CYAN }}>{job.tenant_id}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${job.job_type === 'provision' ? 'bg-green-400/15 text-green-400' : 'bg-blue-400/15 text-blue-400'}`}>{job.job_type}</span></td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${job.progress_pct}%`, background: job.status === 'completed' ? LOW : CYAN }} />
                        </div>
                        <span className="text-[9px]" style={{ color: TEXT }}>{job.progress_pct}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{job.current_stage}/{job.total_stages}</td>
                    <td className="py-2 px-3 text-[10px] uppercase" style={{ color: MUTED }}>{job.plan}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{job.admin_email}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(job.started_at)}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{job.duration_ms}ms</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${job.status === 'completed' ? 'bg-green-400/15 text-green-400' : job.status === 'running' ? 'bg-blue-400/15 text-blue-400' : job.status === 'failed' ? 'bg-red-400/15 text-red-400' : 'bg-yellow-400/15 text-yellow-400'}`}>{job.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Feature Flags */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Active Feature Flags</h3>
        {featureFlags?.length === 0 ? (
          <EmptyState icon={Flag} title="No active flags" description="Enabled feature flags will appear here" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featureFlags?.map(flag => (
              <Card key={flag.flag_id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-mono font-bold text-white">{flag.flag_name}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{flag.tenant_id}</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-green-400/15 text-green-400">ENABLED</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {flag.requires_plan && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>Requires: {flag.requires_plan}</span>}
                  {flag.is_beta && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>BETA</span>}
                  <span className="text-[9px]" style={{ color: MUTED }}>{flag.flag_type}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}