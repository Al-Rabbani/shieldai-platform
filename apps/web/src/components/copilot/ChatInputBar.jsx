import React from "react";
import { QUICK_ACTIONS } from "./agentFleetData";

export default function ChatInputBar({ input, setInput, onSend, loading, selectedAgent, priority, setPriority, onQuickAction }) {
  return (
    <div className="flex-shrink-0" style={{ background: "#0d1428", borderTop: "1px solid #1e3a5f" }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg text-blue-300" style={{ background: "#141d35", border: "1px solid #1e3a5f" }}>
            {selectedAgent ? `${selectedAgent.replace(/^AI\s+/, "")}` : "🔮 GASCI Auto-Route"} ▾
          </span>
          <select value={priority} onChange={e => setPriority(e.target.value)} style={{ background: "#141d35", border: "1px solid #1e3a5f", borderRadius: 8, color: "#94a3b8", padding: "4px 8px", fontSize: 11 }}>
            <option value="normal">⚡ Priority: Normal</option>
            <option value="high">⚡ Priority: High</option>
            <option value="emergency">⚡ Priority: Emergency</option>
          </select>
        </div>

        <div className="rounded-xl p-2 flex items-end gap-2" style={{ background: "#141d35", border: "1px solid #1e3a5f" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Ask anything — threat hunting, cloud risks, incidents, compliance gaps, code generation..."
            rows={2}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none resize-none px-2 py-1.5"
          />
          <button
            onClick={onSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-lg text-sm font-bold text-white flex-shrink-0 transition"
            style={{ background: loading || !input.trim() ? "#1e3a5f" : "#3b82f6", cursor: loading || !input.trim() ? "not-allowed" : "pointer" }}
          >
            {loading ? "..." : "Enter ↵"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap px-4 pb-3">
        {QUICK_ACTIONS.map(a => (
          <button
            key={a.command_type}
            onClick={() => onQuickAction(a)}
            className="text-[11px] font-medium px-2.5 py-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#1e3a5f] transition whitespace-nowrap"
            style={{ background: "#141d35", border: "1px solid #1e3a5f" }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}