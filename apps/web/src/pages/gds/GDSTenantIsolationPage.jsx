import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Flame, CheckCircle, Search } from "lucide-react";
import { timeAgo } from "@/components/gds/GDSOSShared";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSTenantIsolationPage() {
  const [actorTenantId, setActorTenantId] = useState("");
  const [resourceTenantId, setResourceTenantId] = useState("");
  const [resourceType, setResourceType] = useState("entity");
  const [action, setAction] = useState("read");
  
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["isolation-metrics"],
    queryFn: () => base44.functions.invoke("gdsTenantEngine", { action: "isolation_metrics" }).then(r => r.data.result),
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["isolation-events"],
    queryFn: () => base44.entities.TenantIsolationEvent.filter({}, '-created_date', 50).catch(() => []),
  });

  const { data: workspaces, isLoading: workspacesLoading } = useQuery({
    queryKey: ["tenant-workspaces-isolation"],
    queryFn: () => base44.entities.TenantWorkspace.filter({ status: 'active' }).catch(() => []),
  });
  
  const validateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsTenantEngine", { action: "validate_isolation", ...data }),
  });

  const handleValidate = async () => {
    validateMutation.mutate({ actor_tenant_id: actorTenantId, resource_tenant_id: resourceTenantId, resource_type: resourceType, action });
  };
  
  const validationResult = validateMutation.data?.result;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Isolation Monitor" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Tenant Isolation Monitor</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Cross-tenant boundary enforcement, violation detection, AI boundary validation</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Events</p><p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{events?.length || 0}</p></Card>
        <Card className="p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Violations Blocked</p><p className="text-2xl font-black font-mono" style={{ color: events?.filter(e => e.was_blocked).length > 0 ? DANGER : MUTED }}>{events?.filter(e => e.was_blocked).length || 0}</p></Card>
        <Card className="p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>False Positives</p><p className="text-2xl font-black font-mono" style={{ color: MUTED }}>{metrics?.false_positives || 0}</p></Card>
        <Card className="p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Escalated</p><p className="text-2xl font-black font-mono" style={{ color: events?.filter(e => e.status === 'escalated').length > 0 ? HIGH : MUTED }}>{events?.filter(e => e.status === 'escalated').length || 0}</p></Card>
        <Card className="p-4 text-center"><p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Investigated</p><p className="text-2xl font-black font-mono" style={{ color: metrics?.investigated || 0 > 0 ? HIGH : MUTED }}>{metrics?.investigated || 0}</p></Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Cross-Tenant Isolation Validator</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <input value={actorTenantId} onChange={(e) => setActorTenantId(e.target.value)} placeholder="Actor Tenant ID" className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          <input value={resourceTenantId} onChange={(e) => setResourceTenantId(e.target.value)} placeholder="Resource Tenant ID" className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="entity">Entity</option>
            <option value="workspace">Workspace</option>
            <option value="agent">Agent</option>
            <option value="workflow">Workflow</option>
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="read">Read</option>
            <option value="write">Write</option>
            <option value="delete">Delete</option>
            <option value="execute">Execute</option>
          </select>
          <button onClick={handleValidate} className="px-4 py-2 rounded-xl text-sm font-bold transition-all" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>Validate Isolation</button>
        </div>
        {validationResult && (
          <div className={`p-4 rounded-xl ${validationResult.allowed ? 'bg-green-400/10 border-green-400/30' : 'bg-red-400/10 border-red-400/30'}`} style={{ border: `1px solid ${validationResult.allowed ? LOW : DANGER}` }}>
            <div className="flex items-center gap-3">
              {validationResult.allowed ? <CheckCircle className="w-5 h-5" style={{ color: LOW }} /> : <Flame className="w-5 h-5" style={{ color: DANGER }} />}
              <div>
                <p className="text-sm font-bold" style={{ color: validationResult.allowed ? LOW : DANGER }}>{validationResult.allowed ? 'ALLOWED' : 'BLOCKED'}</p>
                <p className="text-xs" style={{ color: MUTED }}>{validationResult.message} • Stage {validationResult.stage}/15</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Isolation Events</h3>
        {eventsLoading ? <Skeleton lines={6} /> : events?.length === 0 ? (
          <EmptyState icon={Shield} title="No isolation events" description="Cross-tenant violation attempts will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Event ID", "Actor", "Actor Tenant", "Resource Type", "Resource Tenant", "Violation Type", "Action", "Blocked", "Risk", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events?.map(event => (
                  <tr key={event.event_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{event.event_id}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{event.actor_id}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: CYAN }}>{event.actor_tenant_id}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{event.resource_type}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: event.resource_tenant_id !== event.actor_tenant_id ? DANGER : MUTED }}>{event.resource_tenant_id}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${event.violation_type === 'cross_tenant_read' ? 'bg-red-400/15 text-red-400' : 'bg-orange-400/15 text-orange-400'}`}>{event.violation_type}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{event.action_attempted}</td>
                    <td className="py-2 px-3">{event.was_blocked ? <Flame className="w-3.5 h-3.5" style={{ color: DANGER }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${event.risk_level === 'critical' ? 'bg-red-400/15 text-red-400' : event.risk_level === 'high' ? 'bg-orange-400/15 text-orange-400' : 'bg-yellow-400/15 text-yellow-400'}`}>{event.risk_level}</span></td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${event.status === 'resolved' ? 'bg-green-400/15 text-green-400' : event.status === 'escalated' ? 'bg-orange-400/15 text-orange-400' : 'bg-red-400/15 text-red-400'}`}>{event.status}</span></td>
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