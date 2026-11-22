import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function CinematicStatCard({ 
  label, 
  value, 
  icon: Icon, 
  accentColor = "#3b82f6", 
  trend, 
  linkTo,
  pulse = false,
  size = "default" 
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === "number" ? value : 0;

  useEffect(() => {
    if (numericValue === 0) {
      setDisplayValue(0);
      return;
    }
    
    let animationFrame;
    const startTime = Date.now();
    const duration = 1200;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(numericValue * easeOut);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [numericValue]);

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl p-4 card-hover cursor-pointer relative overflow-hidden",
        size === "large" ? "p-6" : "p-4"
      )}
      style={{
        background: "linear-gradient(145deg, #111118, #0a0a0f)",
        border: `1px solid ${accentColor}30`,
        boxShadow: pulse && numericValue > 0 ? `0 0 20px ${accentColor}20` : "none"
      }}
    >
      {/* Accent border glow on hover */}
      <div 
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${accentColor}15, transparent)`,
          border: `1px solid ${accentColor}40`
        }}
      />
      
      {/* Left accent border */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: accentColor }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          {Icon && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}20` }}>
              <Icon className="w-4 h-4" style={{ color: accentColor }} />
            </div>
          )}
          {trend !== undefined && (
            <span className={cn(
              "text-[10px] font-mono font-bold px-2 py-1 rounded flex items-center gap-1",
              trend > 0 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
            )}>
              {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
          )}
        </div>
        
        <div className="flex items-baseline gap-2">
          <p className={cn(
            "font-black font-mono",
            size === "large" ? "text-4xl" : "text-2xl"
          )} style={{ color: numericValue > 0 ? accentColor : "#475569" }}>
            {typeof value === "number" ? displayValue.toLocaleString() : value}
          </p>
          {pulse && numericValue > 0 && (
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: accentColor }} />
          )}
        </div>
        
        <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-mono">
          {label}
        </p>
      </div>
      
      {/* Pulse animation for critical values */}
      {pulse && numericValue > 0 && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            animation: "glow-breathe 2s ease-in-out infinite",
            boxShadow: `inset 0 0 20px ${accentColor}30`
          }}
        />
      )}
    </motion.div>
  );

  return linkTo ? (
    <a href={linkTo} className="block no-underline">{cardContent}</a>
  ) : cardContent;
}