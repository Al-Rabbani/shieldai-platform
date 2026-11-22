import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Mail, MessageSquare, Phone, CheckCircle, XCircle, Clock, Bell } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

const CHANNEL_ICONS = { email: Mail, slack: MessageSquare, sms: Phone, webhook: Clock, push: Bell };

export default function GDSDispatchLogPage() {
  const { data: dispatches, isLoading } = useQuery({
    queryKey: ["notification-dispatches"],
    queryFn: () => base44.entities.NotificationDispatch.filter({}, '-created_date', 100).catch(() => []),
    refetchInterval: 30000,
  });

  const stats = {
    total: dispatches?.length || 0,
    sent: dispatches?.filter(d => d.status === 'sent' || d.status === 'delivered').length || 0,
    failed: dispatches?.filter(d => d.status === 'failed' || d.status === 'bounced').length || 0,
    pending: dispatches?.filter(d => d.status === 'pending').length || 0
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Dispatch Log" }]} />

      <div className="flex items-start gap-3 mb-6">
        <Mail className="w-6 h-6" style={{ color: CYAN }} />
        <div>
          <h1 className="text-2xl font-black text-white">Notification Dispatch Log</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Track notification delivery across all channels</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Dispatches</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Delivered</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.sent}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Failed</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.failed}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Pending</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.pending}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Recent Dispatches</h3>
        {isLoading ? (
          <Skeleton lines={8} />
        ) : dispatches?.length === 0 ? (
          <EmptyState icon={Mail} title="No dispatches yet" description="Notifications will appear here when sent" />
        ) : (
          <div className="space-y-3">
            {dispatches?.map(dispatch => {
              const ChannelIcon = CHANNEL_ICONS[dispatch.channel] || Mail;
              return (
                <div key={dispatch.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                      <ChannelIcon className="w-5 h-5" style={{ color: CYAN }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{dispatch.subject || dispatch.message?.slice(0, 50)}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{dispatch.recipient} • {dispatch.channel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px]" style={{ color: MUTED }}>Sent</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(dispatch.sent_at)}</p>
                    </div>
                    {dispatch.status === 'delivered' || dispatch.status === 'sent' ? (
                      <CheckCircle className="w-5 h-5" style={{ color: LOW }} />
                    ) : dispatch.status === 'failed' ? (
                      <XCircle className="w-5 h-5" style={{ color: DANGER }} />
                    ) : (
                      <Clock className="w-5 h-5" style={{ color: CYAN }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}