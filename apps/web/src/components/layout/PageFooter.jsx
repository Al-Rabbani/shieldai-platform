import React, { useState, useEffect } from "react";
import { Shield } from "lucide-react";

const GOLD = "#C9A84C";

export default function PageFooter() {
  const [lastScan, setLastScan] = useState("3 min ago");
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <footer className="flex items-center justify-between px-6 py-2.5 border-t text-[10px] text-slate-600 flex-shrink-0"
      style={{ background: "#070B14", borderColor: "#1a2235" }}>
      <div className="flex items-center gap-2">
        <Shield className="w-3 h-3" style={{ color: GOLD }} />
        <span>GDS OS — Global Digital Security <span style={{ color: GOLD }}>v2.0</span></span>
        <span>·</span>
        <span>Last scan: {lastScan}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-emerald-500">All systems operational</span>
        <span className="text-slate-700">·</span>
        <span>{time.toLocaleTimeString()}</span>
      </div>
    </footer>
  );
}