import React from "react";

export default function LiveDataBadge({ label = "LIVE DATA" }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
      style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.35)" }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: "#00ff88" }} />
      <span className="text-[10px] font-black tracking-wide" style={{ color: "#00ff88" }}>{label}</span>
    </div>
  );
}