import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const GOLD = "#C9A84C";

const SHORTCUTS = [
  { keys: ["⌘", "K"], desc: "Open command palette" },
  { keys: ["/"], desc: "Focus search" },
  { keys: ["Esc"], desc: "Close modal / drawer" },
  { keys: ["G", "D"], desc: "Go to Dashboard" },
  { keys: ["G", "C"], desc: "Go to Code Security" },
  { keys: ["G", "T"], desc: "Go to Threat Feed" },
  { keys: ["G", "S"], desc: "Go to Settings" },
  { keys: ["R"], desc: "Refresh current page data" },
  { keys: ["?"], desc: "Show this keyboard shortcuts legend" },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const [gPressed, setGPressed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "?" && !e.shiftKey) { setOpen(o => !o); return; }
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "g" || e.key === "G") { setGPressed(true); setTimeout(() => setGPressed(false), 1000); return; }
      if (gPressed) {
        if (e.key === "d" || e.key === "D") { navigate("/"); setGPressed(false); }
        if (e.key === "c" || e.key === "C") { navigate("/code"); setGPressed(false); }
        if (e.key === "t" || e.key === "T") { navigate("/threat-feed"); setGPressed(false); }
        if (e.key === "s" || e.key === "S") { navigate("/settings"); setGPressed(false); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gPressed, navigate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
      onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{ background: "#111827", borderColor: "#374151" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1F2937" }}>
          <h3 className="font-bold text-white">Keyboard Shortcuts</h3>
          <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#1F2937" }}>
              <span className="text-sm text-slate-300">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="text-slate-600 text-xs">then</span>}
                    <kbd className="px-2 py-0.5 rounded text-xs font-mono font-bold" style={{ background: "#1F2937", color: GOLD, border: `1px solid ${GOLD}44` }}>{k}</kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t text-xs text-slate-600" style={{ borderColor: "#1F2937" }}>
          Press <kbd className="font-mono px-1 rounded" style={{ background: "#1F2937", color: GOLD }}>?</kbd> to toggle this panel
        </div>
      </div>
    </div>
  );
}