import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Layers, Activity, AlertTriangle, Network, CheckCircle, XCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Card, Breadcrumb, Skeleton, EmptyState, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

export default function GDSCyberRangeModelsPage() {
  const { data: infraModels = [], isLoading: loadInfra } = useQuery({
    queryKey: ["cyber-range-infra-models"],
    queryFn: () => base44.entities.InfrastructureModel.list("-last_computed", 50).catch(() => []),
  });
  const { data: businessModels = [], isLoading: loadBusiness } = useQuery({
    queryKey: ["cyber-range-business-models"],
    queryFn: () => base44.entities.BusinessModel.list("", 50).catch(() => []),
  });
  const { data: recoveryModels = [], isLoading: loadRecovery } = useQuery({
    queryKey: ["cyber-range-recovery-models"],
    queryFn: () => base44.entities.RecoveryModel.list("-last_tested", 50).catch(() => []),
  });

  const isLoading = loadInfra || loadBusiness || loadRecovery;

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "Cyber Range", path: "/cyber-range" }, { label: "Models" }]} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Infrastructure Models */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5" style={{ color: CYAN }} />
              <h3 className="text-sm font-bold text-white">Infrastructure Models</h3>
            </div>
          </div>
          {isLoading ? <Skeleton lines={5} /> : infraModels.length === 0 ? (
            <EmptyState icon={Network} title="No infrastructure models" description="Models will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[9px] uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <tr>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Name</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Type</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Nodes</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Critical Paths</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>SPOFs</th>
                    <th className="px-4 py-3" style={{ color: MUTED }}>Last Computed</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm" style={{ borderColor: `${BORDER}40` }}>
                  {infraModels.map(m => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-bold text-white">{m.model_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{m.model_type}</span>
                      </td>
                      <td className="px-4 py-3 text-white">{m.nodes_count || 0}</td>
                      <td className="px-4 py-3 text-white">{m.critical_paths_count || 0}</td>
                      <td className="px-4 py-3">{m.spof_count > 0 ? <span className="text-red-400 font-bold">{m.spof_count}</span> : <span className="text-green-400">None</span>}</td>
                      <td className="px-4 py-3 text-white">{timeAgo(m.last_computed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Business & Recovery Models */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5" style={{ color: HIGH }} />
                <h3 className="text-sm font-bold text-white">Business Models</h3>
              </div>
            </div>
            {isLoading ? <Skeleton lines={4} /> : businessModels.length === 0 ? (
              <EmptyState icon={Activity} title="No business models" description="Business models will appear here" />
            ) : (
              <div className="p-4 space-y-3">
                {businessModels.slice(0, 3).map(bm => (
                  <div key={bm.id} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                    <p className="text-sm font-bold text-white mb-2">{bm.model_name}</p>
                    <div className="text-[10px] space-y-1" style={{ color: MUTED }}>
                      <p>Financial Exposure: <span className="text-red-400 font-bold">${bm.financial_exposure_per_hour_usd?.toLocaleString() || 0}/hr</span></p>
                      <p>Critical Services: <span className="text-white">{bm.critical_services_count || 0}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5" style={{ color: LOW }} />
                <h3 className="text-sm font-bold text-white">Recovery Models</h3>
              </div>
            </div>
            {isLoading ? <Skeleton lines={4} /> : recoveryModels.length === 0 ? (
              <EmptyState icon={Layers} title="No recovery models" description="Recovery models will appear here" />
            ) : (
              <div className="p-4 space-y-3">
                {recoveryModels.slice(0, 3).map(rm => (
                  <div key={rm.id} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                    <p className="text-sm font-bold text-white mb-2">{rm.model_name}</p>
                    <div className="flex items-center gap-4 text-[10px]">
                      <div>
                        <p className="text-[9px]" style={{ color: MUTED }}>RTO Target</p>
                        <p className={`font-bold ${rm.rto_tested_minutes <= rm.rto_target_minutes ? "text-green-400" : "text-red-400"}`}>
                          {rm.rto_target_minutes} min → {rm.rto_tested_minutes || "N/A"} min
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px]" style={{ color: MUTED }}>DR Test</p>
                        {rm.dr_test_passed ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}