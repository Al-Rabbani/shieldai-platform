import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AgentHealthCard from "@/components/code/AgentHealthCard";
import SeverityPill from "@/components/code/SeverityPill";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Play, CheckCircle2, Activity, ChevronRight, Clock, Target, Zap } from "lucide-react";

const TACTIC_COLORS = {
  recon: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  initial_access: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  execution: "bg-red-500/15 text-red-400 border-red-500/30",
  persistence: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  privilege_escalation: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  lateral_movement: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  exfiltration: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  impact: "bg-red-600/20 text-red-300 border-red-600/40",
};

const MITRE_NAMES = {
  "T1595": "Active Scanning", "T1190": "Exploit Public-Facing App", "T1552": "Unsecured Credentials",
  "T1078": "Valid Accounts", "T1098": "Account Manipulation", "T1548": "Abuse Elevation Control",
  "T1567": "Exfiltration Over Web Service", "T1486": "Data Encrypted for Impact",
  "T1195.002": "Compromise Software Supply Chain", "T1059.001": "PowerShell",
  "T1053.005": "Scheduled Task", "T1547.001": "Registry Run Keys",
  "T1055": "Process Injection", "T1021.001": "Remote Desktop Protocol",
  "T1083": "File and Directory Discovery", "T1560": "Archive Collected Data",
  "T1041": "Exfiltration Over C2 Channel", "T1490": "Inhibit System Recovery",
  "T1489": "Service Stop", "T1562.001": "Disable or Modify Tools",
  "T1070": "Indicator Removal", "T1567.001": "Exfil Over Web Service",
};

const statusStyle = { draft: "text-[#64748b]", active: "text-amber-400 bg-amber-500/10 border-amber-500/20", completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", paused: "text-blue-400 bg-blue-500/10 border-blue-500/20" };

export default function RedTeamPage() {
  const [selected, setSelected] = useState(null);
  const { data: scenarios = [] } = useQuery({ queryKey: ["red-team"], queryFn: () => base44.entities.RedTeamScenario.list("-created_date", 10) });
  const { data: findings = [] } = useQuery({ queryKey: ["attack-findings"], queryFn: () => base44.entities.AttackFinding.list("-created_date", 50) });

  const redTeamFindings = findings.filter(f => f.campaign_name === "Red Team Alpha");

  return (
    <div className="space-y-6 bg-[#050810] min-h-screen -m-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Red Team Scenarios</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Advanced kill chain simulations — Powered by RedTeamAgent-v1 · MITRE ATT&CK mapped</p>
        </div>
        <Button className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 gap-2">
          <Play className="w-4 h-4" /> Launch Scenario
        </Button>
      </div>

      <AgentHealthCard name="RedTeamAgent-v1" health={97} status="online" tasksToday={8} type="executor" />

      <div className="grid grid-cols-1 gap-4">
        {scenarios.map(s => {
          const progress = s.steps_total > 0 ? (s.steps_completed / s.steps_total) * 100 : 0;
          return (
            <div key={s.id} onClick={() => setSelected(s)} className="bg-[#0D1117] border border-[#1e293b] hover:border-red-900/40 rounded-2xl p-5 cursor-pointer transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded border uppercase font-bold ${TACTIC_COLORS[s.tactic]}`}>{s.tactic?.replace(/_/g, " ")}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded border capitalize ${statusStyle[s.status]}`}>{s.status}</span>
                    {s.status === "active" && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                  </div>
                  <h3 className="text-base font-bold text-[#e2e8f0]">{s.name}</h3>
                  <p className="text-xs text-[#64748b] mt-1 leading-relaxed">{s.objective}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-2xl font-black font-mono text-red-400">{s.findings_count}</p>
                  <p className="text-[10px] text-[#64748b]">findings</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#64748b]">Kill Chain Progress</span>
                  <span className="font-mono text-[#C9A84C]">{s.steps_completed}/{s.steps_total} steps</span>
                </div>
                <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {(s.mitre_techniques || []).slice(0, 6).map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-[#1e293b] text-[#64748b] font-mono hover:text-[#94a3b8] transition-colors" title={MITRE_NAMES[t] || t}>{t}</span>
                ))}
                {(s.mitre_techniques || []).length > 6 && <span className="text-[10px] px-2 py-0.5 rounded bg-[#1e293b] text-[#475569]">+{(s.mitre_techniques || []).length - 6} more</span>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px] text-[#64748b]">
                  <span>{(s.agents_assigned || []).length} agents</span>
                  {s.start_date && <span><Clock className="w-3 h-3 inline mr-1" />{new Date(s.start_date).toLocaleDateString()}</span>}
                </div>
                <button className="text-[11px] px-3 py-1.5 rounded border border-red-600/30 text-red-400 hover:bg-red-600/10 flex items-center gap-1.5 transition-all">
                  View Details <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Red Team Findings */}
      <div className="bg-[#0D1117] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e293b] flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Red Team Findings ({redTeamFindings.length})</h3>
        </div>
        <div className="divide-y divide-[#1e293b]">
          {redTeamFindings.map(f => (
            <div key={f.id} className="px-5 py-4 flex items-start gap-4 hover:bg-[#1e293b]/30 transition-colors">
              <SeverityPill severity={f.severity} />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#e2e8f0]">{f.title}</p>
                <p className="text-xs text-[#64748b] mt-0.5">{f.agent_codename} · {f.target}</p>
              </div>
              {f.exploited && <span className="text-[11px] px-2 py-0.5 rounded border text-amber-400 border-amber-500/30 bg-amber-500/10 flex-shrink-0">EXPLOITED</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Scenario Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-[#0D1117] border-[#1e293b] text-[#e2e8f0] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#e2e8f0]">
              <Target className="w-5 h-5 text-red-400" />
              {selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded border uppercase font-bold ${TACTIC_COLORS[selected.tactic]}`}>{selected.tactic?.replace(/_/g, " ")}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded border capitalize ${statusStyle[selected.status]}`}>{selected.status}</span>
              </div>
              <div>
                <p className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Objective</p>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{selected.objective}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748b] uppercase tracking-wider mb-3">Kill Chain Steps ({selected.steps_completed}/{selected.steps_total})</p>
                <div className="space-y-2">
                  {(selected.kill_chain_steps || []).map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${i < selected.steps_completed ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" : i === selected.steps_completed ? "bg-amber-500/20 border border-amber-500/40 text-amber-400" : "bg-[#1e293b] border border-[#334155] text-[#64748b]"}`}>
                        {i < selected.steps_completed ? "✓" : i + 1}
                      </div>
                      <p className={`text-xs leading-relaxed pt-0.5 ${i < selected.steps_completed ? "text-emerald-400" : i === selected.steps_completed ? "text-amber-400" : "text-[#64748b]"}`}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-[#64748b] uppercase tracking-wider mb-3">MITRE ATT&CK Techniques</p>
                <div className="grid grid-cols-2 gap-2">
                  {(selected.mitre_techniques || []).map(t => (
                    <div key={t} className="bg-[#050810] border border-[#1e293b] rounded-lg p-2 flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-red-400">{t}</span>
                      <span className="text-[10px] text-[#64748b]">{MITRE_NAMES[t] || ""}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Assigned Agents ({(selected.agents_assigned || []).length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {(selected.agents_assigned || []).map(a => <span key={a} className="text-[11px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono">{a}</span>)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}