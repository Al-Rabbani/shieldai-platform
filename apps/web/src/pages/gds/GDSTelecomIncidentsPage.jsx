import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { TelBreadcrumb, TelBadge, TelStat, TelGauge, TEL_PAGE_BG, MUTED, TEL_BLUE, TEL_RED, TEL_CRITICAL, TEL_AMBER, TEL_ORANGE, TEL_PURPLE, TEL_GREEN, BORDER, TEXT, formatCurrencyUSD, formatSubscribers, timeAgo, TELECOM_INCIDENT_COLORS } from "@/components/gds/TelecomSecurityShared";
import { CYAN } from "@/components/gds/GDSOSShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { AlertTriangle, Shield, Activity, CheckSquare, Square, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GDSTelecomIncidentsPage() {
  const qc = useQueryClient();
  const [selectedIncidentIds, setSelectedIncidentIds] = useState([]);
  const [selectedOutageIds, setSelectedOutageIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkType, setBulkType] = useState(null); // 'incident' or 'outage'
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkNote, setBulkNote] = useState("");

  const { data: incidents, isLoading: incLoading } = useQuery({ queryKey: ["telecomIncidents"], queryFn: () => base44.entities.TelecomIncident.filter({}, "-detected_at") });
  const { data: outages, isLoading: outLoading } = useQuery({ queryKey: ["networkOutages"], queryFn: () => base44.entities.NetworkOutage.filter({ status: "active" }) });
  const openIncidents = incidents?.filter(i => i.status !== "closed").length || 0;
  const carrierImpact = incidents?.filter(i => i.severity === "carrier_catastrophic").length || 0;
  const openOutages = outages?.length || 0;
  const slaBreaches = outages?.filter(o => o.sla_breach).length || 0;

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ type, ids, data }) => {
      const entity = type === 'incident' ? base44.entities.TelecomIncident : base44.entities.NetworkOutage;
      const results = await Promise.all(ids.map(id => entity.update(id, data)));
      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries(["telecomIncidents"]);
      qc.invalidateQueries(["networkOutages"]);
      setSelectedIncidentIds([]);
      setSelectedOutageIds([]);
      setShowBulkModal(false);
      setBulkStatus("");
      setBulkNote("");
    },
  });

  const toggleSelectIncident = (id) => {
    setSelectedIncidentIds(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  const toggleSelectOutage = (id) => {
    setSelectedOutageIds(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  const toggleSelectAllIncidents = () => {
    if (selectedIncidentIds.length === (incidents?.length || 0)) {
      setSelectedIncidentIds([]);
    } else {
      setSelectedIncidentIds(incidents?.map(i => i.id) || []);
    }
  };

  const toggleSelectAllOutages = () => {
    if (selectedOutageIds.length === (outages?.length || 0)) {
      setSelectedOutageIds([]);
    } else {
      setSelectedOutageIds(outages?.map(o => o.id) || []);
    }
  };

  const handleBulkStatusChange = () => {
    if (!bulkStatus) return;
    const type = bulkType;
    const ids = type === 'incident' ? selectedIncidentIds : selectedOutageIds;
    if (ids.length === 0) return;
    
    bulkUpdateMutation.mutate({
      type,
      ids,
      data: { status: bulkStatus, progress_notes: bulkNote || `Status changed to ${bulkStatus}` }
    });
  };

  return (
    <div style={TEL_PAGE_BG}>
      <TelBreadcrumb items={[{ label: "Incident Management" }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">🚨 Telecom Incident Management</h1>
        <LiveDataBadge />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <TelStat label="Open Incidents" value={openIncidents} color={TEL_BLUE} />
        <TelStat label="Carrier-Wide Impact" value={carrierImpact} color={TEL_CRITICAL} pulse={carrierImpact > 0} />
        <TelStat label="Open Outages" value={openOutages} color={TEL_RED} />
        <TelStat label="SLA Breaches" value={slaBreaches} color={TEL_AMBER} pulse={slaBreaches > 0} />
      </div>
      {/* Bulk Actions Toolbar */}
      {(selectedIncidentIds.length > 0 || selectedOutageIds.length > 0) && (
        <Card className="p-4 mb-6" glow>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {selectedIncidentIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: TEL_BLUE }}>{selectedIncidentIds.length} incidents</span>
                  <Button onClick={() => { setBulkType('incident'); setShowBulkModal(true); }} className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: `${TEL_BLUE}15`, border: `1px solid ${TEL_BLUE}40`, color: TEL_BLUE }}>
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Update Status
                  </Button>
                </div>
              )}
              {selectedOutageIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: TEL_RED }}>{selectedOutageIds.length} outages</span>
                  <Button onClick={() => { setBulkType('outage'); setShowBulkModal(true); }} className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: `${TEL_RED}15`, border: `1px solid ${TEL_RED}40`, color: TEL_RED }}>
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Update Status
                  </Button>
                </div>
              )}
            </div>
            <Button onClick={() => { setSelectedIncidentIds([]); setSelectedOutageIds([]); }} variant="ghost" className="px-3 py-2 rounded-xl text-xs font-bold" style={{ color: MUTED }}>
              <X className="w-4 h-4" /> Clear Selection
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Telecom Incidents</h2>
          <button onClick={toggleSelectAllIncidents} className="flex items-center gap-2 text-xs font-bold" style={{ color: MUTED }}>
            {selectedIncidentIds.length === (incidents?.length || 0) && incidents?.length > 0 ? (
              <CheckSquare className="w-4 h-4" style={{ color: TEL_BLUE }} />
            ) : (
              <Square className="w-4 h-4" style={{ color: MUTED }} />
            )}
            Select All
          </button>
        </div>
        {incLoading ? <Skeleton lines={6} /> : incidents?.length === 0 ? (
          <EmptyState icon={Shield} title="No incidents" description="All incidents resolved" />
        ) : (
          <div className="space-y-2">
            {incidents?.map(i => (
              <Card key={i.id} className={`p-3 transition-all ${selectedIncidentIds.includes(i.id) ? 'ring-2 ring-cyan-400/50' : ''}`} glow>
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); toggleSelectIncident(i.id); }} className="flex-shrink-0" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    {selectedIncidentIds.includes(i.id) ? (
                      <CheckSquare className="w-4 h-4" style={{ color: TEL_BLUE }} />
                    ) : (
                      <Square className="w-4 h-4" style={{ color: MUTED }} />
                    )}
                  </button>
                  <TelBadge color={TELECOM_INCIDENT_COLORS[i.incident_type] || TEL_RED}>{i.incident_type}</TelBadge>
                  <div className="text-sm font-semibold text-white">{i.incident_ref}</div>
                  <TelBadge color={i.severity === "carrier_catastrophic" ? TEL_CRITICAL : i.severity === "critical" ? TEL_RED : TEL_ORANGE}>{i.severity}</TelBadge>
                  <div className="text-xs text-red-400">{formatSubscribers(i.subscribers_affected)} affected</div>
                  <div className="flex gap-1">{i.services_impacted?.slice(0, 3).map((s, idx) => <TelBadge key={idx} color={MUTED}>{s}</TelBadge>)}</div>
                  <div className="flex gap-1">{i.regions_affected?.slice(0, 2).map((r, idx) => <TelBadge key={idx} color={TEL_BLUE}>{r}</TelBadge>)}</div>
                  <div className="text-red-400 font-bold">{formatCurrencyUSD(i.financial_impact_usd)}</div>
                  <div className="text-xs text-slate-400">${(i.revenue_loss_per_hour_usd / 1000000).toFixed(1)}M/hr</div>
                  {i.regulatory_reportable && <span>📋</span>}
                  <div className="flex gap-1">{i.mitre_techniques?.slice(0, 2).map((m, idx) => <TelBadge key={idx} color={TEL_PURPLE}>{m}</TelBadge>)}</div>
                  <div className="text-xs text-slate-400">{timeAgo(i.detected_at)}</div>
                  <TelBadge color={i.status === "investigating" ? TEL_RED : TEL_GREEN}>{i.status}</TelBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Network Outages</h2>
          <button onClick={toggleSelectAllOutages} className="flex items-center gap-2 text-xs font-bold" style={{ color: MUTED }}>
            {selectedOutageIds.length === (outages?.length || 0) && outages?.length > 0 ? (
              <CheckSquare className="w-4 h-4" style={{ color: TEL_RED }} />
            ) : (
              <Square className="w-4 h-4" style={{ color: MUTED }} />
            )}
            Select All
          </button>
        </div>
        {outLoading ? <Skeleton lines={6} /> : outages?.length === 0 ? (
          <EmptyState icon={Activity} title="No outages" description="All services operational" />
        ) : (
          <div className="space-y-2">
            {outages?.map(o => (
              <Card key={o.id} className={`p-3 transition-all ${selectedOutageIds.includes(o.id) ? 'ring-2 ring-red-400/50' : ''}`} glow>
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); toggleSelectOutage(o.id); }} className="flex-shrink-0" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    {selectedOutageIds.includes(o.id) ? (
                      <CheckSquare className="w-4 h-4" style={{ color: TEL_RED }} />
                    ) : (
                      <Square className="w-4 h-4" style={{ color: MUTED }} />
                    )}
                  </button>
                  <TelBadge color={o.outage_type === "cyber_attack" ? TEL_CRITICAL : TEL_RED}>{o.outage_type}</TelBadge>
                  <div className="text-sm font-semibold text-white">{o.outage_ref}</div>
                  <TelBadge color={o.severity === "carrier_catastrophic" ? TEL_CRITICAL : TEL_RED}>{o.severity}</TelBadge>
                  <div className="flex gap-1">{o.regions?.slice(0, 2).map((r, idx) => <TelBadge key={idx} color={TEL_BLUE}>{r}</TelBadge>)}</div>
                  <div className="text-xs text-red-400">{formatSubscribers(o.subscribers_affected)} affected</div>
                  <div className="flex gap-1">{o.services_down?.slice(0, 2).map((s, idx) => <TelBadge key={idx} color={MUTED}>{s}</TelBadge>)}</div>
                  <div className="text-red-400 font-bold">{formatCurrencyUSD(o.revenue_loss_usd)}</div>
                  {o.sla_breach && <TelBadge color={TEL_RED}>SLA</TelBadge>}
                  {o.ai_predicted && <span>🤖 {(o.prediction_accuracy_pct || 0).toFixed(0)}%</span>}
                  <div className="text-xs text-slate-400 truncate max-w-[200px]">{o.root_cause}</div>
                  <div className="text-xs">{o.mttr_minutes} min MTTR</div>
                  <div className="text-xs text-slate-400">{timeAgo(o.detected_at)}</div>
                  <TelBadge color={o.status === "active" ? TEL_RED : TEL_GREEN}>{o.status}</TelBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Status Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-lg p-6" style={{ background: "#0a1628", border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Bulk Update Status</h3>
              <button onClick={() => { setShowBulkModal(false); setBulkType(null); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-xs" style={{ color: MUTED }}>
                Applying to <span className="font-bold" style={{ color: bulkType === 'incident' ? TEL_BLUE : TEL_RED }}>
                  {bulkType === 'incident' ? selectedIncidentIds.length : selectedOutageIds.length}
                </span> {bulkType}s
              </p>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>New Status</label>
                <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="">Select status</option>
                  {bulkType === 'incident' ? (
                    <>
                      <option value="investigating">Investigating</option>
                      <option value="contained">Contained</option>
                      <option value="recovering">Recovering</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </>
                  ) : (
                    <>
                      <option value="active">Active</option>
                      <option value="investigating">Investigating</option>
                      <option value="restoring">Restoring</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Progress Notes (Optional)</label>
                <textarea value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} placeholder="Add notes..." rows={3} className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowBulkModal(false); setBulkType(null); }} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
                <button onClick={handleBulkStatusChange} disabled={!bulkStatus || bulkUpdateMutation.isPending} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2" style={{ background: bulkStatus && !bulkUpdateMutation.isPending ? `${CYAN}15` : "rgba(255,255,255,0.1)", border: `1px solid ${CYAN}40`, color: bulkStatus && !bulkUpdateMutation.isPending ? CYAN : MUTED, opacity: bulkStatus && !bulkUpdateMutation.isPending ? 1 : 0.5 }}>
                  {bulkUpdateMutation.isPending ? (<><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: CYAN }} /> Processing...</>) : (<><CheckCircle className="w-4 h-4" /> Apply Changes</>)}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}