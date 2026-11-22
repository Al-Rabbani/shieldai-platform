import React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  className,
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="w-20 h-20 mb-6 rounded-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700">
        {React.cloneElement(icon, { className: "w-10 h-10 text-slate-400" })}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6">{subtitle}</p>
      <div className="flex items-center gap-3">
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className="px-5 py-2.5 rounded-lg text-sm font-bold text-black transition-all hover:scale-105"
            style={{ background: "#C9A84C" }}
          >
            {primaryAction.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-5 py-2.5 rounded-lg text-sm font-bold border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}