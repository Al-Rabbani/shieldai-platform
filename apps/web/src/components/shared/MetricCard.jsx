import React from "react";
import { cn } from "@/lib/utils";

export default function MetricCard({ title, value, icon: Icon, trend, trendUp, className, accent }) {
  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-5 relative overflow-hidden group hover:border-primary/30 transition-colors duration-300",
      className
    )}>
      {accent && (
        <div className="absolute top-0 right-0 w-24 h-24 -translate-y-6 translate-x-6 rounded-full opacity-10 bg-primary blur-2xl" />
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1.5">{value}</p>
          {trend && (
            <p className={cn(
              "text-xs font-medium mt-2",
              trendUp ? "text-emerald-400" : "text-red-400"
            )}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}