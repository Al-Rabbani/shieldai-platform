import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BookOpen, Play, Clock, Crosshair, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";

const BG = "#020817";

const PLAYBOOK_CATALOG = [
  { name: "Ransomware Containment", type: "incident_response", priority: "P1", steps: 12, auto_steps: 8, mitre: ["T1486", "T1490"] },
  { name: "Phishing Email Triage", type: "triage", priority: "P2", steps: 8, auto_steps: 6, mitre: ["T1566"] },
  { name: "Cloud Compromise Response", type: "incident_response", priority: "P1", steps: 15, auto_steps: 10, mitre: ["T1078", "T1530"] },
  { name: "Credential Theft Investigation", type: "investigation", priority: "P2", steps: 10, auto_steps: 5, mitre: ["T1557", "T1110"] },
  { name: "DDoS Mitigation", type: "mitigation", priority: "P1", steps: 6, auto_steps: 4, mitre: ["T1498"] },
  { name: "Insider Threat Detection", type: "investigation", priority: "P2", steps: 14, auto_steps: 7, mitre: ["T1078"] },
  { name: "Malware Analysis", type: "analysis", priority: "P2", steps: 11, auto_steps: 6, mitre: ["T1204", "T1059"] },
  { name: "Data Exfiltration Response", type: "incident_response", priority: "P1", steps: 13, auto_steps: 9, mitre: ["T1041", "T1048"] },
];

const TYPE_COLORS = { incident_response: DANGER, triage: CYAN, investigation: HIGH, mitigation: "#10b981", analysis: "#a855f7" };
const PRIORITY_COLORS = { P1: DANGER, P2: HIGH, P3: MEDIUM, P4: LOW };

export default function GDSSOCPlaybooksPage() {
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["soc-workflows"],
    queryFn: () => base44.entities.Workflow.filter({ workflow_type: "playbook" }, "-created_at", 50).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "AI-SOC", path: "/soc" }, { label: "Playbooks" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">SOAR Playbook Manager</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Automated incident response playbooks</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Playbooks</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{PLAYBOOK_CATALOG.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>P1 Priority</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{PLAYBOOK_CATALOG.filter(p => p.priority === "P1").length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Auto Steps</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{PLAYBOOK_CATALOG.reduce((s, p) => s + p.auto_steps, 0)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Executions</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{workflows.length}</p>
        </Card>
      </div>

      {/* Playbook Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAYBOOK_CATALOG.map((playbook, i) => {
          const typeColor = TYPE_COLORS[playbook.type] || MUTED;
          return (
            <Card key={i} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{playbook.name}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${typeColor}15`, color: typeColor }}>{playbook.type.replace(/_/g, " ")}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${playbook.priority === "P1" ? "animate-pulse" : ""}`} style={{ color: PRIORITY_COLORS[playbook.priority], background: `${PRIORITY_COLORS[playbook.priority]}15` }}>{playbook.priority}</span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-[10px]">
                  <span style={{ color: MUTED }}>Total Steps</span>
                  <span style={{ color: TEXT }}>{playbook.steps}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span style={{ color: MUTED }}>Auto Steps</span>
                  <span style={{ color: LOW }}>{playbook.auto_steps}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {playbook.mitre.map((m, j) => (
                    <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{m}</span>
                  ))}
                </div>
              </div>
              <Button onClick={() => setSelectedPlaybook(playbook)} className="w-full px-3 py-2 rounded-xl text-xs font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                <Play className="w-3 h-3 mr-1.5" /> Run Playbook
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Execution History */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: HIGH }} />
            Recent Executions
          </h3>
        </div>
        {isLoading ? <Skeleton lines={6} /> : workflows.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm" style={{ color: MUTED }}>No playbook executions yet</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Playbook", "Incident", "Status", "Started", "Duration", "Steps Completed"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workflows.slice(0, 10).map((wf) => (
                  <tr key={wf.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-4">
                      <p className="text-xs font-bold text-white">{wf.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      {wf.incident_id ? <span className="text-[10px] font-mono" style={{ color: DANGER }}>INC-{wf.incident_id.slice(-6).toUpperCase()}</span> : <span className="text-[10px]" style={{ color: MUTED }}>—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${wf.status === "completed" ? "bg-green-400/15 text-green-400" : wf.status === "running" ? "bg-blue-400/15 text-blue-400" : "bg-gray-400/15 text-gray-400"}`}>{wf.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(wf.started_at)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs" style={{ color: TEXT }}>{wf.duration_minutes || 0}m</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs" style={{ color: TEXT }}>{wf.steps_completed || 0}/{wf.total_steps || 0}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Run Modal */}
      {selectedPlaybook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-lg p-6" style={{ background: "#0a1628" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Run Playbook</h3>
              <button onClick={() => setSelectedPlaybook(null)} className="text-slate-400 hover:text-white"><span className="text-xl">×</span></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: TEXT }}>Playbook</p>
                <p className="text-sm" style={{ color: TEXT }}>{selectedPlaybook.name}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}30` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: HIGH }}>⚠️ Requires Incident Selection</p>
                <p className="text-xs" style={{ color: MUTED }}>Select an active incident to execute this playbook against.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setSelectedPlaybook(null)} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
                <button className="flex-1 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>Select Incident →</button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}