import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
}) {
  const baseClasses = "animate-pulse bg-slate-800";
  
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rounded: "rounded-lg",
    card: "rounded-xl",
  };

  const style = {
    width: width || '100%',
    height: variant === 'text' ? (height || '1rem') : height,
  };

  if (lines > 1) {
    return (
      <div className="space-y-2" style={style}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClasses, variantClasses[variant], className)}
            style={{
              width: i === lines - 1 ? '60%' : '100%',
              height: variant === 'text' ? '0.75rem' : height || '1rem',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
    />
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="w-full space-y-3">
      <div className="flex gap-4 px-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height="0.75rem" width={i === 0 ? '40%' : '20%'} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 px-4 py-3 border-t border-slate-800">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              height="1rem"
              width={colIndex === 0 ? '60%' : colIndex === 1 ? '30%' : '25%'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-800 p-5 bg-slate-900/50">
          <Skeleton height="0.75rem" width="40%" className="mb-3" />
          <Skeleton height="2rem" width="70%" className="mb-2" />
          <Skeleton height="0.75rem" width="50%" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = "200px" }) {
  return (
    <div
      className="w-full rounded-xl bg-slate-800/50 animate-pulse"
      style={{ height }}
    />
  );
}