import React from "react";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export default function AgentHealthCard({ name, health, status, tasksToday, type }) {
  const statusColor = status === "online" ? "bg-emerald-400" : status === "degraded" ? "bg-yellow-400" : "bg-red-400";
  const barColor = health >= 90 ? "bg-emerald-500" : health >= 70 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", statusColor)} />
          <span className="text-xs font-semibold text-[#e2e8f0]">{name}</span>
        </div>
        <span className="text-[10px] text-[#64748b] uppercase tracking-wider">{type}</span>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-[#94a3b8]">Health</span>
          <span className="text-xs font-mono font-bold text-[#e2e8f0]">{health}%</span>
        </div>
        <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${health}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
        <Activity className="w-3 h-3" />
        <span>{tasksToday ?? "—"} tasks today</span>
      </div>
    </div>
  );
}