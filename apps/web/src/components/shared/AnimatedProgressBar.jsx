import React, { useEffect, useState } from "react";

export default function AnimatedProgressBar({ value, color = "#3b82f6", height = 6 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.max(0, Math.min(100, value || 0))), 30);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: "#1F2937" }}>
      <div className="h-full rounded-full" style={{ width: `${width}%`, background: color, transition: "width 600ms ease-out" }} />
    </div>
  );
}