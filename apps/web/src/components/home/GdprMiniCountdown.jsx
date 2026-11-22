import React, { useState, useEffect } from "react";

const DEADLINE = new Date("2026-07-02T01:00:00Z");

export default function GdprMiniCountdown() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function tick() {
      const diff = DEADLINE - new Date();
      if (diff <= 0) { setTimeLeft("DEADLINE PASSED"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    }
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  return <span>{timeLeft}</span>;
}