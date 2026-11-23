import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Webhook, Activity, CheckCircle, AlertCircle } from "lucide-react";
import { CARD, BORDER, CYAN, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

export default function GDSWebhookManagerPage() {
  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhook-endpoints"],
    queryFn: () => base44.entities.WebhookEndpoint.filter({}, '-created_date', 50).catch(() => []),
    refetchInterval: 60000,
  });

  const stats = {
    total: webhooks?.length || 0,
    active: webhooks?.filter(w => w.is_active).length || 0,
    totalDeliveries: webhooks?.reduce((sum, w) => sum + (w.total_deliveries || 0), 0) || 0,
    failedDeliveries: webhooks?.reduce((sum, w) => sum + (w.failed_deliveries || 0), 0) || 0
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Webhook Manager" }]} />

      <div className="flex items-start gap-3 mb-6">
        <Webhook className="w-6 h-6" style={{ color: CYAN }} />
        <div>
          <h1 className="text-2xl font-black text-white">Webhook Manager</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Manage webhook endpoints and delivery status</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Webhooks</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.active}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Deliveries</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.totalDeliveries}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Failed</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.failedDeliveries}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Configured Webhooks</h3>
        {isLoading ? (
          <Skeleton lines={6} />
        ) : webhooks?.length === 0 ? (
          <EmptyState icon={Webhook} title="No webhooks configured" description="Create webhook endpoints to receive external events" />
        ) : (
          <div className="space-y-3">
            {webhooks?.map(webhook => (
              <div key={webhook.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                    <Webhook className="w-5 h-5" style={{ color: CYAN }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{webhook.endpoint_name}</p>
                    <p className="text-[10px] font-mono truncate" style={{ color: MUTED }}>{webhook.endpoint_url}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {webhook.event_types?.slice(0, 5).map((event, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>{event}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px]" style={{ color: MUTED }}>Deliveries</p>
                    <p className="text-sm font-bold" style={{ color: TEXT }}>{webhook.total_deliveries}</p>
                  </div>
                  {webhook.is_active ? (
                    <CheckCircle className="w-5 h-5" style={{ color: LOW }} />
                  ) : (
                    <AlertCircle className="w-5 h-5" style={{ color: MUTED }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}