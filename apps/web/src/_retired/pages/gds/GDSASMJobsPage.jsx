import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Play } from "lucide-react";
import { Card, Breadcrumb, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

export default function GDSASMJobsPage() {
  const [jobType, setJobType] = useState("");
  const [target, setTarget] = useState("");
  const { data: jobs = [] } = useQuery({ queryKey: ["asm-jobs-all"], queryFn: () => base44.entities.ASMDiscoveryJob.list("-started_at", 200).catch(() => []) });

  const handleTrigger = async () => {
    if (!jobType || !target) return;
    await base44.entities.ASMDiscoveryJob.create({ job_type: jobType, target, status: "queued", started_at: new Date().toISOString(), triggered_by: "manual" });
    setJobType(""); setTarget("");
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }, { label: "Discovery Jobs", path: "/asm/jobs" }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Search className="w-6 h-6" style={{ color: CYAN }} /><div><h1 className="text-2xl font-black text-white">Discovery Jobs</h1><p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Manage and trigger asset discovery</p></div></div>
      </div>
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Trigger Manual Discovery</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={jobType} onChange={e => setJobType(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">Select job type...</option>
            <option value="full_scan">Full Scan</option>
            <option value="domain_discovery">Domain Discovery</option>
            <option value="subdomain_enum">Subdomain Enumeration</option>
            <option value="port_scan">Port Scan</option>
            <option value="api_discovery">API Discovery</option>
          </select>
          <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Target (domain/IP range)..." className="flex-1 min-w-[200px] px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          <button onClick={handleTrigger} disabled={!jobType || !target} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: jobType && target ? `${CYAN}15` : "rgba(255,255,255,0.1)", border: `1px solid ${CYAN}40`, color: jobType && target ? CYAN : MUTED, opacity: jobType && target ? 1 : 0.5 }}><Play className="w-4 h-4" />Start Job</button>
        </div>
      </Card>
      <Card className="p-5">
        {jobs.length === 0 ? <div className="text-center py-12" style={{ color: MUTED }}>No discovery jobs</div> : (
          <table className="w-full text-xs">
            <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>{["Job ID", "Type", "Target", "Status", "Assets", "Exposures", "Duration", "Started"].map(h => <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>)}</tr></thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td className="py-3 px-3"><p className="text-[10px] font-mono" style={{ color: MUTED }}>{j.job_id}</p></td>
                  <td className="py-3 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>{j.job_type}</span></td>
                  <td className="py-3 px-3"><p className="text-xs text-white">{j.target}</p></td>
                  <td className="py-3 px-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded ${j.status === 'running' ? 'bg-cyan-400/15 text-cyan-400' : j.status === 'completed' ? 'bg-green-400/15 text-green-400' : j.status === 'failed' ? 'bg-red-400/15 text-red-400' : 'bg-gray-400/15 text-gray-400'}`}>{j.status}</span></td>
                  <td className="py-3 px-3"><p className="text-xs font-mono" style={{ color: TEXT }}>{j.assets_discovered || 0}</p></td>
                  <td className="py-3 px-3"><p className="text-xs font-mono" style={{ color: DANGER }}>{j.exposures_found || 0}</p></td>
                  <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{j.duration_minutes || 0}m</p></td>
                  <td className="py-3 px-3"><p className="text-[10px]" style={{ color: MUTED }}>{j.started_at ? new Date(j.started_at).toLocaleString() : "—"}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}