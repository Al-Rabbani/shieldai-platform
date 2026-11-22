import React, { useRef, useState } from "react";

export default function ThreatDot({ label, location, x, y, severity }) {
  const ref = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function handleMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 80;
    if (distance < maxDistance) {
      const pull = (1 - distance / maxDistance) * 0.4;
      setOffset({ x: dx * pull, y: dy * pull });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }

  return (
    <div className="absolute group cursor-pointer z-10" style={{ left: x, top: y }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setOffset({ x: 0, y: 0 })}>
      <div ref={ref}
        className={`w-3 h-3 rounded-full transition-transform duration-150 ease-out ${severity === "critical" ? "bg-red-500" : "bg-orange-400"}`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, animation: "threatPulse 2s ease-out infinite" }} />
      <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#111827] border border-red-500/40 rounded-md px-3 py-2 text-xs whitespace-nowrap z-20 shadow-lg">
        <div className="font-semibold text-red-400">{label}</div>
        <div className="text-slate-400">{location} · {severity.toUpperCase()}</div>
      </div>
    </div>
  );
}