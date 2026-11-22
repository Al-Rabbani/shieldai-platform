import React from "react";
import { Badge } from "@/components/ui/badge";

const REACHABILITY_CONFIG = {
  exploitable: {
    label: "EXPLOITABLE",
    icon: "🔴",
    className: "bg-red-900/30 text-red-300 border-red-700",
    description: "Confirmed reachable and exploitable in production",
  },
  likely: {
    label: "LIKELY",
    icon: "🟠",
    className: "bg-orange-900/30 text-orange-300 border-orange-700",
    description: "High probability of exploitability based on exposure",
  },
  conditional: {
    label: "CONDITIONAL",
    icon: "🟡",
    className: "bg-yellow-900/30 text-yellow-300 border-yellow-700",
    description: "Exploitable only under specific conditions",
  },
  theoretical: {
    label: "THEORETICAL",
    icon: "⚫",
    className: "bg-gray-800 text-gray-500 border-gray-700",
    description: "Not reachable in your environment",
  },
};

export function ReachabilityBadge({ status, showDescription = false }) {
  const config = REACHABILITY_CONFIG[status] || REACHABILITY_CONFIG.conditional;
  
  return (
    <div className="flex flex-col gap-1">
      <Badge className={`${config.className} border text-xs font-semibold px-2.5 py-0.5`}>
        {config.icon} {config.label}
      </Badge>
      {showDescription && (
        <span className="text-[10px] text-gray-400">{config.description}</span>
      )}
    </div>
  );
}

export function getReachabilityStatus(severity, cvssScore, isInternetFacing, isInUse) {
  if (severity === "critical" && cvssScore >= 9.0) {
    return "exploitable";
  }
  if (severity === "high" && cvssScore >= 7.5 && isInternetFacing) {
    return "likely";
  }
  if (severity === "medium" || !isInternetFacing) {
    return "conditional";
  }
  return "theoretical";
}

export default ReachabilityBadge;