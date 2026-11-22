import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Clock } from "lucide-react";

const GOLD = "#C9A84C";
const IDLE_WARN_MS = 25 * 60 * 1000; // 25 min
const IDLE_LOGOUT_MS = 30 * 60 * 1000; // 30 min

export default function SessionTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(300);

  const resetTimer = useCallback(() => {
    setShowWarning(false);
    setCountdown(300);
  }, []);

  useEffect(() => {
    let warnTimer, logoutTimer;
    const reset = () => {
      clearTimeout(warnTimer);
      clearTimeout(logoutTimer);
      warnTimer = setTimeout(() => setShowWarning(true), IDLE_WARN_MS);
      logoutTimer = setTimeout(() => base44.auth.logout("/login"), IDLE_LOGOUT_MS);
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(warnTimer);
      clearTimeout(logoutTimer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, []);

  useEffect(() => {
    if (!showWarning) return;
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) { base44.auth.logout("/login"); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [showWarning]);

  if (!showWarning) return null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="w-full max-w-sm rounded-2xl border p-6 text-center" style={{ background: "#111827", borderColor: "#374151" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(234,179,8,0.15)", border: "2px solid rgba(234,179,8,0.4)" }}>
          <Clock className="w-7 h-7 text-yellow-400" />
        </div>
        <h3 className="font-black text-white mb-2">Session Expiring</h3>
        <p className="text-slate-400 text-sm mb-4">Your session will expire in</p>
        <div className="text-4xl font-black mb-5" style={{ color: GOLD }}>{mins}:{String(secs).padStart(2, "0")}</div>
        <div className="flex gap-3">
          <button onClick={resetTimer}
            className="flex-1 py-2.5 rounded-xl font-bold text-black"
            style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Stay Logged In</button>
          <button onClick={() => base44.auth.logout("/login")}
            className="flex-1 py-2.5 rounded-xl font-bold border text-slate-400"
            style={{ borderColor: "#374151", background: "#1F2937" }}>Log Out</button>
        </div>
      </div>
    </div>
  );
}