import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, AlertTriangle, Heart, Shield, FileText, Clock, Flag, DollarSign, Eye, CheckSquare, Square, X, CheckCircle } from "lucide-react";
import { Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";
import { HCBreadcrumb, HCBanner, HCBadge, PatientSafetyBanner, HCStat, HC_PAGE_BG, HC_CARD, HC_TEAL, HC_RED, HC_ORANGE, HC_GREEN, BORDER, MUTED, TEXT, INCIDENT_TYPE_COLORS } from "@/components/gds/HealthcareSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import HealthcareIncidentTimeline from "@/components/gds/HealthcareIncidentTimeline";
import { Button } from "@/components/ui/button";

export default function GDSHealthcareIncidentsPage() {
  const qc = useQueryClient();
  const { data: incidents = [], isLoading } = useQuery({ queryKey: ["hc-incidents"], queryFn: () => base44.entities.HealthcareIncident.filter({ status: { $ne: "closed" } }, "-patient_safety_risk", "-severity", "-detected_at", 200).catch(() => []) });
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkNote, setBulkNote] = useState("");

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates) => {
      const results = await Promise.all(updates.map(({ id, data }) => base44.entities.HealthcareIncident.update(id, data)));
      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries(["hc-incidents"]);
      setSelectedIds([]);
      setShowBulkModal(false);
      setBulkStatus("");
      setBulkNote("");
    },
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === (incidents?.length || 0)) {
      setSelectedIds([]);
    } else {
      setSelectedIds(incidents?.map(i => i.id) || []);
    }
  };

  const handleBulkStatusChange = () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    const updates = selectedIds.map(id => ({
      id,
      data: { status: bulkStatus, progress_notes: bulkNote || `Status changed to ${bulkStatus}` }
    }));
    bulkUpdateMutation.mutate(updates);
  };

  const stats = {
    open: incidents.length,
    patientSafetyActive: incidents.filter(i => i.patient_safety_risk).length,
    hipaaReportable: incidents.filter(i => i.hipaa_breach_reportable).length,
    ransomIncidents: incidents.filter(i => i.ransom_demanded_usd > 0).length,
  };

  return (
    <div style={HC_PAGE_BG}>
      <HCBreadcrumb items={[{ label: "Clinical Incident Management" }]} />
      <HCBanner />
      <PatientSafetyBanner active={stats.patientSafetyActive > 0} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">CLINICAL INCIDENT MANAGEMENT</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-004 · Patient Safety Priority</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={HC_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open Incidents</p>
          <p className="text-3xl font-black text-white">{stats.open}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.patientSafetyActive > 0 ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Patient Safety Active</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.patientSafetyActive}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>HIPAA Reportable</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.hipaaReportable}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Ransom Incidents</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.ransomIncidents}</p>
        </Card>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <Card className="p-4 mb-6" glow style={{ background: `${HC_TEAL}08`, border: `1px solid ${HC_TEAL}30` }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: HC_TEAL }}>{selectedIds.length} selected</span>
              <Button onClick={() => setShowBulkModal(true)} className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: `${HC_TEAL}15`, border: `1px solid ${HC_TEAL}40`, color: HC_TEAL }}>
                <CheckCircle className="w-4 h-4 mr-1.5" /> Update Status
              </Button>
              <Button onClick={() => setSelectedIds([])} variant="ghost" className="px-3 py-2 rounded-xl text-xs font-bold" style={{ color: MUTED }}>
                <X className="w-4 h-4" /> Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5" style={HC_CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4" style={{ color: HC_RED }} />Active Incidents</h3>
          <div className="flex items-center gap-2">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs font-bold" style={{ color: MUTED }}>
              {selectedIds.length === (incidents?.length || 0) && incidents?.length > 0 ? (
                <CheckSquare className="w-4 h-4" style={{ color: HC_TEAL }} />
              ) : (
                <Square className="w-4 h-4" style={{ color: MUTED }} />
              )}
              Select All
            </button>
            <span className="text-[10px]" style={{ color: MUTED }}>{incidents.length} incidents</span>
          </div>
        </div>

        {isLoading ? <Skeleton lines={10} /> : incidents.length === 0 ? (
          <EmptyState icon={Shield} title="All Clear" description="No active clinical incidents" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Incident List */}
            <div className="lg:col-span-2 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                    <th className="pb-3 w-10">
                      <button onClick={toggleSelectAll} className="flex items-center justify-center" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                        {selectedIds.length === (incidents?.length || 0) && incidents?.length > 0 ? (
                          <CheckSquare className="w-4 h-4" style={{ color: HC_TEAL }} />
                        ) : (
                          <Square className="w-4 h-4" style={{ color: MUTED }} />
                        )}
                      </button>
                    </th>
                    <th className="pb-3">Incident Ref</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Severity</th>
                    <th className="pb-3">Patient Safety</th>
                    <th className="pb-3">Departments</th>
                    <th className="pb-3">PHI Involved</th>
                    <th className="pb-3">HIPAA Reportable</th>
                    <th className="pb-3">Ransom</th>
                    <th className="pb-3">Detected</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Timeline</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {incidents.slice(0, 50).map(inc => (
                    <tr key={inc.id} className={`border-t hover:bg-white/5 transition-colors ${selectedIds.includes(inc.id) ? 'bg-teal-400/10' : ''}`} style={{ borderColor: BORDER }}>
                      <td className="py-3 px-3">
                        <button onClick={() => toggleSelect(inc.id)} className="flex items-center justify-center" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                          {selectedIds.includes(inc.id) ? (
                            <CheckSquare className="w-4 h-4" style={{ color: HC_TEAL }} />
                          ) : (
                            <Square className="w-4 h-4" style={{ color: MUTED }} />
                          )}
                        </button>
                      </td>
                      <td className="py-3 font-mono" style={{ color: HC_TEAL }}>{inc.incident_ref}</td>
                      <td className="py-3"><HCBadge color={INCIDENT_TYPE_COLORS[inc.incident_type] || HC_ORANGE}>{inc.incident_type}</HCBadge></td>
                      <td className="py-3"><SevBadge sev={inc.severity} /></td>
                      <td className="py-3">{inc.patient_safety_risk ? <span className="text-[10px] font-bold" style={{ color: HC_RED }}>⚕️ {inc.patient_safety_description?.slice(0, 30)}...</span> : "—"}</td>
                      <td className="py-3"><div className="flex gap-1">{(inc.affected_departments || []).slice(0, 2).map((d, i) => <HCBadge key={i} color={HC_ORANGE}>{d}</HCBadge>)}</div></td>
                      <td className="py-3">{inc.phi_involved ? <span className="text-[10px] font-bold" style={{ color: HC_RED }}>🛡️ {inc.phi_records_count || 0}</span> : "—"}</td>
                      <td className="py-3">{inc.hipaa_breach_reportable ? <Flag className="w-4 h-4" style={{ color: HC_RED }} /> : "—"}</td>
                      <td className="py-3">{inc.ransom_demanded_usd > 0 ? <span className="text-[10px] font-bold" style={{ color: HC_RED }}>${(inc.ransom_demanded_usd / 1000).toFixed(0)}K</span> : "—"}</td>
                      <td className="py-3" style={{ color: MUTED }}>{timeAgo(inc.detected_at)}</td>
                      <td className="py-3"><HCBadge color={inc.status === "investigating" ? HC_ORANGE : HC_GREEN}>{inc.status}</HCBadge></td>
                      <td className="py-3">
                        <button 
                          onClick={() => setSelectedIncident(selectedIncident?.id === inc.id ? null : inc)}
                          className="text-[10px] font-bold px-2 py-1 rounded hover:opacity-80 transition-opacity"
                          style={{ background: `${HC_TEAL}15`, color: HC_TEAL, border: `1px solid ${HC_TEAL}30` }}
                          title="View Timeline"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Timeline Panel */}
            {selectedIncident && (
              <div className="lg:col-span-1">
                <HealthcareIncidentTimeline 
                  incident={selectedIncident} 
                  onClose={() => setSelectedIncident(null)}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Bulk Status Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-lg p-6" style={{ background: "#0a1628", border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Bulk Update Status</h3>
              <button onClick={() => { setShowBulkModal(false); setBulkStatus(""); setBulkNote(""); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-xs" style={{ color: MUTED }}>
                Applying to <span className="font-bold" style={{ color: HC_TEAL }}>{selectedIds.length}</span> incidents
              </p>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>New Status</label>
                <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="">Select status</option>
                  <option value="investigating">Investigating</option>
                  <option value="contained">Contained</option>
                  <option value="recovering">Recovering</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Progress Notes (Optional)</label>
                <textarea value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} placeholder="Add notes..." rows={3} className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowBulkModal(false); setBulkStatus(""); setBulkNote(""); }} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
                <button onClick={handleBulkStatusChange} disabled={!bulkStatus || bulkUpdateMutation.isPending} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2" style={{ background: bulkStatus && !bulkUpdateMutation.isPending ? `${HC_TEAL}15` : "rgba(255,255,255,0.1)", border: `1px solid ${HC_TEAL}40`, color: bulkStatus && !bulkUpdateMutation.isPending ? HC_TEAL : MUTED, opacity: bulkStatus && !bulkUpdateMutation.isPending ? 1 : 0.5 }}>
                  {bulkUpdateMutation.isPending ? (<><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: HC_TEAL }} /> Processing...</>) : (<><CheckCircle className="w-4 h-4" /> Apply Changes</>)}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}