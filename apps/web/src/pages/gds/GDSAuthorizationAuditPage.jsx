import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, TrendingUp, Flame, AlertTriangle, CheckCircle, XCircle, Clock, Database } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

export default function GDSAuthorizationAuditPage() {
  const { data: auditRecords, isLoading } = useQuery({
    queryKey: ["rbac-audit"],
    queryFn: () => base44.entities.AuthorizationAuditRecord.filter({}, '-created_date', 50).catch(() => []),
  });

  const { data: accessReviews } = useQuery({
    queryKey: ["rbac-access-reviews"],
    queryFn: () => base44.entities.AccessReviewItem.filter({}, '-reviewed_at', 20).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Authorization Audit" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Clock className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Authorization Audit Log</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Complete RBAC+ABAC+ZT decision history</p>
          </div>
        </div>
      </div>

      {/* Audit Timeline */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Audit Timeline</h3>
        {isLoading ? <Skeleton lines={10} /> : auditRecords?.length === 0 ? (
          <EmptyState icon={Clock} title="No audit records" description="Authorization audits will appear here" />
        ) : (
          <div className="space-y-4">
            {auditRecords?.map((record, i) => {
              const decisionColor = record.final_decision === 'allow' ? LOW : record.final_decision === 'deny' ? DANGER : HIGH;
              return (
                <div key={record.audit_id || i} className="relative pl-8 pb-4 border-l-2" style={{ borderColor: BORDER }}>
                  <div className="absolute -left-3 top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{ background: decisionColor, color: "#020817" }}>
                    {record.stage_number}
                  </div>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h4 className="text-xs font-bold text-white">{record.stage_name}</h4>
                      <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{record.actor_id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${record.final_decision === 'allow' ? 'bg-green-400/15 text-green-400' : record.final_decision === 'deny' ? 'bg-red-400/15 text-red-400' : 'bg-yellow-400/15 text-yellow-400'}`}>
                        {record.final_decision}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{record.actor_type}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{record.actor_role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${record.rbac_result === 'pass' ? 'bg-green-400/15 text-green-400' : 'bg-red-400/15 text-red-400'}`}>RBAC: {record.rbac_result}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${record.abac_result === 'pass' ? 'bg-green-400/15 text-green-400' : 'bg-red-400/15 text-red-400'}`}>ABAC: {record.abac_result}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{record.duration_ms}ms</span>
                    <span className="text-[9px] font-mono" style={{ color: MUTED }}>{record.correlation_id?.slice(0, 12)}...</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Access Reviews */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Access Review Items</h3>
        {accessReviews?.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No review items" description="Access reviews will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Subject", "Type", "Role", "Resource", "Access Type", "Last Used", "Decision", "Reviewed"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accessReviews?.map(item => (
                  <tr key={item.review_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{item.subject_id}</td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{item.subject_type}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{item.role_name}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{item.resource_type}</td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: CYAN, background: `${CYAN}15` }}>{item.access_type}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(item.last_used)}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.reviewer_decision === 'certified' ? 'bg-green-400/15 text-green-400' : item.reviewer_decision === 'revoked' ? 'bg-red-400/15 text-red-400' : 'bg-yellow-400/15 text-yellow-400'}`}>
                        {item.reviewer_decision}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(item.reviewed_at)}</td>
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