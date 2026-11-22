import React from "react";
import { cn } from "@/lib/utils";

const statusConfig = {
  open: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  in_progress: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  in_remediation: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  fixed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  accepted_risk: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
  false_positive: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
  scanned: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  scanning: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  connected: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  error: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  failed: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  active: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  inactive: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
  decommissioned: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  archived: { bg: "bg-slate-600/10", text: "text-slate-500", border: "border-slate-600/40" },
};

export default function StatusBadge({ status, size = "sm" }) {
  const config = statusConfig[status?.toLowerCase()] || statusConfig.open;
  const sizeClasses = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span className={cn(
      "inline-flex items-center rounded-full border font-medium capitalize",
      config.bg, config.text, config.border, sizeClasses
    )}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}