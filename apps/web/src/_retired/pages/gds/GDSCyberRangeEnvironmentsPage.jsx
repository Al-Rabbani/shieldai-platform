import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, Shield, AlertTriangle, Clock, Lock, Trash2, Activity, Zap } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Card, Breadcrumb, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function Countdown({ expiresAt }) {
  const [remaining, setRemaining] = React.useState(0);
  React.useEffect(() => {
    const calc = () => {
      const diff = new Date(expiresAt) - new Date();
      setRemaining(Math.max(0, diff));
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const hrs = Math.floor(remaining / (1000 * 60 * 60));
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const urgent = remaining < 2 * 60 * 60 * 1000;
  return <span className={`font-mono text-sm ${urgent ? "text-red-400 font-bold" : "text-white"}`}>{hrs}h {mins}m</span>;
}

export default function GDSCyberRangeEnvironmentsPage() {
  const queryClient = useQueryClient();
  const { data: envs = [], isLoading } = useQuery({
    queryKey: ["cyber-range-envs"],
    queryFn: () => base44.entities.TwinEnvironment.list("-provisioned_at", 100).catch(() => []),
  });

  const destroyMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.TwinEnvironment.update(id, { status: "destroying" });
    },
    onSuccess: () => queryClient.invalidateQueries(["cyber-range-envs"]),
  });

  const activeEnvs = envs.filter(e => e.status === "active");
  const verifiedEnvs = envs.filter(e => e.isolation_verified);
  const expiringSoon = envs.filter(e => {
    if (!e.expires_at) return false;
    return new Date(e.expires_at) - new Date() < 2 * 60 * 60 * 1000;
  });

  const envTypeColors = {
    cyber_range: CYAN, chaos: DANGER, dr_test: HIGH, executive_exercise: "#a855f7",
    red_team: "#ef4444", blue_team: "#3b82f6", training: MEDIUM, research: "#10b981",
  };
  const isolationColors = {
    air_gapped: "#a855f7", network_isolated: LOW, container_isolated: "#0ea5e9", vm_isolated: MEDIUM,
  };

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "Cyber Range", path: "/cyber-range" }, { label: "Environments" }]} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Active Environments</p>
          <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{activeEnvs.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Isolated (Verified)</p>
          <p className="text-3xl font-black font-mono" style={{ color: LOW }}>{verifiedEnvs.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Expiring Soon</p>
          <p className="text-3xl font-black font-mono" style={{ color: expiringSoon.length > 0 ? DANGER : MUTED }}>{expiringSoon.length}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Cyber Range Environments</h3>
          </div>
        </div>
        {isLoading ? <Skeleton lines={6} /> : envs.length === 0 ? (
          <EmptyState icon={Lock} title="No environments" description="Provisioned environments will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.3)" }}>
                <tr>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Name</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Type</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Isolation</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Assets</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Active Sims</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Verified</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Expires</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Status</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: `${BORDER}40` }}>
                {envs.map(env => (
                  <tr key={env.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-bold text-white">{env.env_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: envTypeColors[env.env_type] || MUTED, background: `${envTypeColors[env.env_type] || MUTED}15` }}>
                        {(env.env_type || "cyber_range").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: isolationColors[env.isolation_level] || MUTED, background: `${isolationColors[env.isolation_level] || MUTED}15` }}>
                        {env.isolation_level?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <div className="h-full rounded-full" style={{ width: `${((env.provisioned_assets || 0) / (env.max_assets || 1)) * 100}%`, background: CYAN }} />
                        </div>
                        <span className="text-xs text-white">{env.provisioned_assets || 0}/{env.max_assets || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white">{env.active_simulations || 0}</td>
                    <td className="px-4 py-3">
                      {env.isolation_verified ? <Lock className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    </td>
                    <td className="px-4 py-3">
                      {env.expires_at && <Countdown expiresAt={env.expires_at} />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded ${
                        env.status === "active" ? "bg-green-400/20 text-green-400" :
                        env.status === "destroying" ? "bg-red-400/20 text-red-400" :
                        "bg-slate-400/20 text-slate-400"
                      }`}>
                        {env.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {env.status === "active" && (
                        <button onClick={() => destroyMutation.mutate(env.id)} className="text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}