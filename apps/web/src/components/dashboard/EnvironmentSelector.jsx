import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

const ENVIRONMENTS = [
  { id: "production", name: "Production", color: "#ef4444" },
  { id: "staging", name: "Staging", color: "#f59e0b" },
  { id: "development", name: "Development", color: "#3b82f6" },
  { id: "all", name: "All Environments", color: "#22c55e" },
];

export default function EnvironmentSelector({ value = "production", onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const current = ENVIRONMENTS.find(e => e.id === value) || ENVIRONMENTS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors"
        style={{ background: "#161b22", borderColor: "#1F2937" }}
      >
        <div className="w-2 h-2 rounded-full" style={{ background: current.color }} />
        <span className="text-xs text-white">{current.name}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-2 w-48 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: "#0f172a", border: "1px solid #1e293b" }}>
            {ENVIRONMENTS.map(env => (
              <button
                key={env.id}
                onClick={() => { onChange?.(env.id); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0"
              >
                <div className="w-2 h-2 rounded-full" style={{ background: env.color }} />
                <span className="text-xs text-white flex-1 text-left">{env.name}</span>
                {value === env.id && <Check className="w-3.5 h-3.5 text-green-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}