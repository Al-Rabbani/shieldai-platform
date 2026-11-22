import React from "react";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-500" },
  high: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-500" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-500" },
  low: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
  info: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30", dot: "bg-slate-500" },
};

export default function SeverityBadge({ severity, size = "sm" }) {
  const config = severityConfig[severity?.toLowerCase()] || severityConfig.info;
  const sizeClasses = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-medium capitalize",
      config.bg, config.text, config.border, sizeClasses
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {severity}
    </span>
  );
}