import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Clock, CheckCircle, AlertTriangle, Shield, FileText, Users, Crosshair, ArrowRight } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";

const BG = "#020817";
const TABS = ["Overview", "Timeline", "Tasks", "Evidence"];

export default function GDSSOCIncidentDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("Overview");

  const { data: incident, isLoading } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => base44.entities.Incident.get(id).catch(() => null),
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["incident-timeline", id],
    queryFn: () => base44.entities.IncidentTimeline.filter({ incident_id: id }, "-occurred_at").catch(() => []),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["incident-tasks", id],
    queryFn: () => base44.entities.IncidentTask.filter({ incident_id: id }, "-due_at").catch(() => []),
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ["incident-evidence", id],
    queryFn: () => base44.entities.IncidentEvidence.filter({ incident_id: id }, "-collected_at").catch(() => []),
  });

  if (isLoading) return <Skeleton lines={10} />;
  if (!incident) return <div className="p-8 text-center"><h2 className="text-xl font-bold text-white">Incident not found</h2></div>;

  const recommendations = typeof incident.ai_recommendations === "string" ? incident.ai_recommendations.split("\n").filter(r => r.trim()) : (incident.ai_recommendations || []);
  const affectedAssets = incident.affected_assets || [];
  const mitreTechniques = incident.mitre_techniques || [];

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "SOC", path: "/soc" }, { label: "Incidents", path: "/soc/incidents" }, { label: incident.title.slice(0, 30) + "..." }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-black text-white">{incident.title}</h1>
            <SevBadge sev={incident.severity} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono" style={{ color: CYAN }}>INC-{id?.slice(-6).toUpperCase()}</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${HIGH}15`, color: HIGH }}>{incident.incident_type || "UNKNOWN"}</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${MUTED}15`, color: MUTED }}>Priority: {incident.priority || "P3"}</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${LOW}15`, color: LOW }}>Status: {incident.status}</span>
          </div>
        </div>
        <Link to="/soc/incidents" className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>← Back</Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b" style={{ borderColor: BORDER }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-bold transition-all ${activeTab === tab ? "" : "hover:opacity-70"}`}
            style={{ background: activeTab === tab ? `${CYAN}15` : "transparent", color: activeTab === tab ? CYAN : MUTED, borderBottom: activeTab === tab ? `2px solid ${CYAN}` : "2px solid transparent" }}>{tab}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Overview" && (
        <div className="space-y-6">
          {/* AI Summary */}
          {incident.ai_summary && (
            <Card className="p-5" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}30` }}>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5" style={{ color: CYAN }} />
                <h3 className="text-sm font-bold text-white">AI Investigation Summary</h3>
              </div>
              <p className="text-sm" style={{ color: TEXT }}>{incident.ai_summary}</p>
            </Card>
          )}

          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Crosshair className="w-5 h-5" style={{ color: HIGH }} />
                <h3 className="text-sm font-bold text-white">AI Recommendations</h3>
              </div>
              <ol className="space-y-2">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: TEXT }}>
                    <span className="text-xs font-bold mt-0.5" style={{ color: CYAN }}>{i + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {/* Affected Assets */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5" style={{ color: MEDIUM }} />
              <h3 className="text-sm font-bold text-white">Affected Assets</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {affectedAssets.length > 0 ? affectedAssets.map((asset, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: `${MEDIUM}15`, color: MEDIUM, border: `1px solid ${MEDIUM}30` }}>{asset}</span>
              )) : <p className="text-sm" style={{ color: MUTED }}>No assets listed</p>}
            </div>
          </Card>

          {/* MITRE Techniques */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Crosshair className="w-5 h-5" style={{ color: DANGER }} />
              <h3 className="text-sm font-bold text-white">MITRE ATT&CK Techniques</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {mitreTechniques.length > 0 ? mitreTechniques.map((tech, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: `${DANGER}15`, color: DANGER, border: `1px solid ${DANGER}30` }}>{tech}</span>
              )) : <p className="text-sm" style={{ color: MUTED }}>No techniques mapped</p>}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "Timeline" && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Incident Timeline</h3>
          <div className="space-y-4">
            {timeline.map((event, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                  <Clock className="w-4 h-4" style={{ color: CYAN }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-white">{event.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${MUTED}15`, color: MUTED }}>{event.event_type}</span>
                  </div>
                  <p className="text-sm" style={{ color: TEXT }}>{event.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {event.actor && <p className="text-[10px]" style={{ color: MUTED }}>Actor: {event.actor}</p>}
                    {event.asset && <p className="text-[10px]" style={{ color: MUTED }}>Asset: {event.asset}</p>}
                    <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(event.occurred_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "Tasks" && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Investigation Tasks</h3>
          <div className="space-y-3">
            {tasks.map((task, i) => {
              const isOverdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== "completed";
              return (
                <div key={i} className={`p-4 rounded-lg border ${isOverdue ? "animate-pulse" : ""}`} style={{ background: `${DANGER}08`, borderColor: isOverdue ? DANGER : BORDER }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-white">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${MUTED}15`, color: MUTED }}>{task.task_type}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: task.auto_generated ? `${LOW}15` : `${CYAN}15`, color: task.auto_generated ? LOW : CYAN }}>{task.auto_generated ? "Auto" : "Manual"}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.status === "completed" ? "bg-green-400/15 text-green-400" : task.status === "in_progress" ? "bg-blue-400/15 text-blue-400" : "bg-gray-400/15 text-gray-400"}`}>{task.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px]" style={{ color: MUTED }}>Assigned: {task.assigned_to || "Unassigned"}</p>
                    {task.due_at && <p className={`text-[10px] font-bold ${isOverdue ? "text-red-400" : ""}`} style={{ color: isOverdue ? DANGER : MUTED }}>Due: {timeAgo(task.due_at)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {activeTab === "Evidence" && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Collected Evidence</h3>
          <div className="space-y-3">
            {evidence.map((ev, i) => (
              <div key={i} className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-bold text-white">{ev.title}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{ev.evidence_type}</span>
                </div>
                <p className="text-sm" style={{ color: TEXT }}>{ev.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  {ev.file_url && <a href={ev.file_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold" style={{ color: CYAN }}>View File →</a>}
                  <p className="text-[10px]" style={{ color: MUTED }}>Collected: {timeAgo(ev.collected_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}