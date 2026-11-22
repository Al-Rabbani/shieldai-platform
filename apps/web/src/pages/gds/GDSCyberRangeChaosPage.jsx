import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, AlertTriangle, CheckCircle, XCircle, Activity, Clock } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Card, Breadcrumb, Skeleton, EmptyState, PAGE_BG
} from "@/components/gds/GDSOSShared";

function formatSec(seconds) {
  if (!seconds && seconds !== 0) return "0s";
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)}m`;
  return `${seconds}s`;
}

export default function GDSCyberRangeChaosPage() {
  const { data: experiments = [], isLoading } = useQuery({
    queryKey: ["cyber-range-chaos"],
    queryFn: () => base44.entities.ChaosExperiment.list("-completed_at", 100).catch(() => []),
  });

  const chaosTypeColors = {
    region_outage: DANGER, ransomware_simulation: DANGER, database_failover: HIGH,
    certificate_expiry: MEDIUM, network_partition: HIGH, cpu_stress: "#f97316",
    memory_leak: "#f97316", disk_failure: HIGH, api_rate_limit: "#0ea5e9",
    dependency_failure: "#a855f7", dns_failure: HIGH, ssl_tls_failure: HIGH,
    authentication_failure: DANGER, data_corruption: DANGER, cascading_failure: DANGER,
  };
  const blastColors = {
    enterprise: DANGER, multi_region: HIGH, zone: MEDIUM, service: "#0ea5e9", pod: LOW, instance: LOW,
  };

  const confirmed = experiments.filter(e => e.hypothesis_confirmed).length;
  const avgResilience = experiments.length > 0
    ? Math.round(experiments.reduce((sum, e) => sum + (e.resilience_score || 0), 0) / experiments.length)
    : 0;
  const totalWeaknesses = experiments.reduce((sum, e) => sum + (e.weaknesses_count || 0), 0);

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "Cyber Range", path: "/cyber-range" }, { label: "Chaos Engineering" }]} />
      
      <Card className="p-4" style={{ background: `${HIGH}10`, border: `1px solid ${HIGH}40` }}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" style={{ color: HIGH }} />
          <p className="text-sm font-bold" style={{ color: HIGH }}>
            DISCLAIMER: All chaos experiments run in isolated ChaosExperiment environments with verified network isolation.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Total Experiments</p>
          <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{experiments.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Hypotheses Confirmed</p>
          <p className="text-3xl font-black font-mono" style={{ color: LOW }}>{confirmed} ({experiments.length > 0 ? Math.round((confirmed / experiments.length) * 100) : 0}%)</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Avg Resilience Score</p>
          <p className="text-3xl font-black font-mono" style={{ color: avgResilience > 70 ? LOW : avgResilience > 50 ? HIGH : DANGER }}>{avgResilience}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Weaknesses Found</p>
          <p className="text-3xl font-black font-mono" style={{ color: totalWeaknesses > 0 ? DANGER : LOW }}>{totalWeaknesses}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: HIGH }} />
            <h3 className="text-sm font-bold text-white">Chaos Experiments</h3>
          </div>
        </div>
        {isLoading ? <Skeleton lines={6} /> : experiments.length === 0 ? (
          <EmptyState icon={Zap} title="No experiments" description="Chaos experiments will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.3)" }}>
                <tr>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Name</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Type</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Blast Radius</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Hypothesis</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>RTO</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Recovery</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Resilience</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Weaknesses</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: `${BORDER}40` }}>
                {experiments.map(exp => (
                  <tr key={exp.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-bold text-white">{exp.experiment_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: chaosTypeColors[exp.chaos_type] || MUTED, background: `${chaosTypeColors[exp.chaos_type] || MUTED}15` }}>
                        {(exp.chaos_type || "unknown").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: blastColors[exp.blast_radius] || MUTED, background: `${blastColors[exp.blast_radius] || MUTED}15` }}>
                        {exp.blast_radius}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {exp.hypothesis_confirmed ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    </td>
                    <td className="px-4 py-3">{exp.rto_met ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}</td>
                    <td className="px-4 py-3 text-white font-mono">
                      {formatSec(exp.recovery_time_seconds)} <span className="text-[9px]" style={{ color: MUTED }}>(exp: {formatSec(exp.expected_recovery_seconds)})</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <div className={`h-full rounded-full ${exp.resilience_score > 70 ? "bg-green-400" : exp.resilience_score > 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${exp.resilience_score || 0}%` }} />
                        </div>
                        <span className="text-xs font-bold text-white">{exp.resilience_score || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {exp.weaknesses_count > 0 ? (
                        <span className="text-xs font-bold text-red-400">{exp.weaknesses_count}</span>
                      ) : (
                        <span className="text-xs text-green-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded ${
                        exp.status === "completed" ? "bg-green-400/20 text-green-400" :
                        exp.status === "running" ? "bg-blue-400/20 text-blue-400" :
                        exp.status === "failed" ? "bg-red-400/20 text-red-400" :
                        "bg-slate-400/20 text-slate-400"
                      }`}>
                        {exp.status}
                      </span>
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