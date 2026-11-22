import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Cpu, ChevronRight } from "lucide-react";
import { BORDER, CYAN, DANGER, LOW, MEDIUM, MUTED, TEXT, Card, timeAgo } from "@/components/gds/GDSOSShared";

export default function KernelStatusWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["kernel-status-widget"],
    queryFn: () => base44.functions.invoke("gdsKernelGateway", { action: "status" }).then(r => r.data),
    refetchInterval: 60000,
  });

  const d = data || {};
  const lastEvent = d.last_event;

  return (
    <Card className="p-5" style={{ border: `1px solid ${CYAN}20` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">AI Kernel Status</h3>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
            style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
            EDP-002
          </span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[9px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <Link to="/kernel"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}25`, color: CYAN }}>
          Open Kernel <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl text-center" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Sessions Today</p>
            <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{d.sessions_today ?? 0}</p>
          </div>
          <div className="p-3 rounded-xl text-center" style={{ background: "rgba(0,255,136,0.04)", border: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Completed</p>
            <p className="text-xl font-black font-mono" style={{ color: LOW }}>{d.completed ?? 0}</p>
          </div>
          <div className="p-3 rounded-xl text-center" style={{ background: (d.pending_approval ?? 0) > 0 ? `${MEDIUM}08` : "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Pending Approval</p>
            <p className="text-xl font-black font-mono" style={{ color: (d.pending_approval ?? 0) > 0 ? MEDIUM : MUTED }}>
              {d.pending_approval ?? 0}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Last Event</p>
            {lastEvent ? (
              <>
                <p className="text-[10px] font-bold truncate" style={{ color: CYAN }}>
                  {(lastEvent.event_type || "").replace("kernel.", "")}
                </p>
                <p className="text-[9px]" style={{ color: MUTED }}>{timeAgo(lastEvent.occurred_at || lastEvent.created_date)}</p>
              </>
            ) : (
              <p className="text-[10px]" style={{ color: MUTED }}>No events</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}