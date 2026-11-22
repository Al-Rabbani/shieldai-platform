import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, AlertTriangle, Clock, DollarSign, Shield, CheckCircle, Filter, Search } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const INCIDENT_TYPE_COLORS = {
  ransomware: DANGER, malware: DANGER, phishing: HIGH, cloud_compromise: HIGH, data_breach: DANGER,
  insider_threat: "#a855f7", ddos: "#f97316", apt: DANGER, credential_theft: HIGH,
  lateral_movement: HIGH, c2: DANGER, data_exfiltration: DANGER, privilege_escalation: HIGH,
  initial_access: MEDIUM, discovery: MEDIUM, default: MUTED
};

const PRIORITY_COLORS = { P1: DANGER, P2: HIGH, P3: MEDIUM, P4: LOW };
const STATUS_COLORS = { new: DANGER, investigating: CYAN, contained: "#10b981", resolved: LOW, closed: MUTED };

function SLACountdown({ deadline }) {
  if (!deadline) return <span className="text-[10px]" style={{ color: MUTED }}>No SLA</span>;
  const now = new Date();
  const dl = new Date(deadline);
  const hoursLeft = (dl - now) / (1000 * 60 * 60);
  const isBreached = hoursLeft < 0;
  const isUrgent = hoursLeft < 1;
  const color = isBreached ? DANGER : isUrgent ? HIGH : hoursLeft < 24 ? MEDIUM : LOW;
  const text = isBreached ? `BREACHED ${Math.abs(Math.round(hoursLeft))}h` : hoursLeft < 1 ? `${Math.round(hoursLeft * 60)}m` : `${Math.round(hoursLeft)}h`;
  return <span className={`text-[10px] font-bold ${isBreached ? 'animate-pulse' : ''}`} style={{ color }}>{text}</span>;
}

export default function GDSDfIrIncidentsPage() {
  const [filterType, setFilterType] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedIncident, setSelectedIncident] = useState(null);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["dfir-incidents", filterType, filterSeverity, filterStatus],
    queryFn: () => base44.entities.Incident.list("-created_at", 500).then(r => r.filter(i => {
      if (filterType && i.incident_type !== filterType) return false;
      if (filterSeverity && i.severity !== filterSeverity) return false;
      if (filterStatus && i.status !== filterStatus) return false;
      return true;
    })).catch(() => []),
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status !== "closed" && i.status !== "resolved").length,
    critical: incidents.filter(i => i.severity === "critical").length,
    slaBreached: incidents.filter(i => i.sla_deadline && new Date(i.sla_deadline) < new Date()).length
  };

  const incidentTypes = [...new Set(incidents.map(i => i.incident_type).filter(Boolean))];

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Incident Response", path: "/dfir" }, { label: "Incident Lifecycle" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6" style={{ color: DANGER }} />
          <div>
            <h1 className="text-2xl font-black text-white">Incident Lifecycle Manager</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Full incident lifecycle tracking</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Incidents</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.open}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.critical}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>SLA Breached</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.slaBreached}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <Search className="w-4 h-4" style={{ color: MUTED }} />
            <input placeholder="Search incidents..." className="flex-1 bg-transparent text-sm outline-none" style={{ color: TEXT }} />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Types</option>
            {incidentTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="investigating">Investigating</option>
            <option value="contained">Contained</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </Card>

      {/* Incidents Table */}
      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : incidents.length === 0 ? (
          <EmptyState icon={Target} title="No incidents" description="No incidents match your filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["ID", "Title", "Type", "Severity", "Priority", "Assets", "Phases", "Financial", "SLA", "Status", "Opened", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => {
                  const typeColor = INCIDENT_TYPE_COLORS[inc.incident_type?.toLowerCase()] || INCIDENT_TYPE_COLORS.default;
                  const statusColor = STATUS_COLORS[inc.status] || MUTED;
                  return (
                    <tr key={inc.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5 cursor-pointer" onClick={() => setSelectedIncident(inc)}>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono font-bold" style={{ color: CYAN }}>INC-{inc.id?.slice(-6).toUpperCase()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-white max-w-xs">{inc.title}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${typeColor}15`, color: typeColor }}>{inc.incident_type || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4"><SevBadge sev={inc.severity} /></td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${PRIORITY_COLORS[inc.priority] || MUTED}15`, color: PRIORITY_COLORS[inc.priority] || MUTED }}>{inc.priority || "P3"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{inc.affected_assets?.length || 0}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {inc.is_contained && <Shield className="w-3 h-3" style={{ color: LOW }} title="Contained" />}
                          {inc.is_eradicated && <CheckCircle className="w-3 h-3" style={{ color: CYAN }} title="Eradicated" />}
                          {inc.is_recovered && <CheckCircle className="w-3 h-3" style={{ color: HIGH }} title="Recovered" />}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-mono" style={{ color: inc.financial_impact_usd > 100000 ? DANGER : TEXT }}>${inc.financial_impact_usd?.toLocaleString() || 0}</p>
                      </td>
                      <td className="py-3 px-4">
                        <SLACountdown deadline={inc.sla_deadline} />
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${inc.status === 'new' ? 'animate-pulse' : ''}`} style={{ color: statusColor, background: `${statusColor}15` }}>{inc.status || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: MUTED }}>{timeAgo(inc.created_at)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>View →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#0a1628" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedIncident.title}</h3>
                <p className="text-[10px] font-mono" style={{ color: CYAN }}>INC-{selectedIncident.id?.slice(-6).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-white"><span className="text-2xl">×</span></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Severity</p>
                <SevBadge sev={selectedIncident.severity} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Status</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: STATUS_COLORS[selectedIncident.status], background: `${STATUS_COLORS[selectedIncident.status]}15` }}>{selectedIncident.status}</span>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Priority</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: PRIORITY_COLORS[selectedIncident.priority], background: `${PRIORITY_COLORS[selectedIncident.priority]}15` }}>{selectedIncident.priority}</span>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>SLA</p>
                <SLACountdown deadline={selectedIncident.sla_deadline} />
              </div>
            </div>
            {selectedIncident.ai_summary && (
              <div className="p-4 rounded-lg mb-4" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}30` }}>
                <p className="text-xs font-bold mb-2" style={{ color: CYAN }}>AI Summary</p>
                <p className="text-sm" style={{ color: TEXT }}>{selectedIncident.ai_summary}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setSelectedIncident(null)} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Close</button>
              <button className="flex-1 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>Full Lifecycle →</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}