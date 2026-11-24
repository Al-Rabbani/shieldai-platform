import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";

const CHANNEL_ICON = { web_ui: "🌐", voice: "🎙️", api: "🔌", slack: "💬", whatsapp: "📱" };

export default function SessionHistorySidebar() {
  const [sessions, setSessions] = useState([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    base44.entities.CopilotSession.list("-created_date", 20).then(setSessions).catch(() => {});
  }, []);

  return (
    <div style={{ borderTop: "1px solid #1e3a5f", marginTop: 12, paddingTop: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <span style={{ fontWeight: 600, color: "#3b82f6", fontSize: 13 }}>Session History</span>
        {open ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
      </button>

      {open && (
        <div style={{ marginTop: 8, maxHeight: 260, overflowY: "auto" }}>
          {sessions.length === 0 ? (
            <p style={{ fontSize: 11, color: "#475569" }}>{absentStoreReason("CopilotSession")}</p>
          ) : sessions.map(s => (
            <div key={s.id} style={{ padding: "6px 8px", borderRadius: 6, marginBottom: 4, background: "#0a0f1e", border: "1px solid #1e293b" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{CHANNEL_ICON[s.channel] || "🌐"} {s.session_id?.slice(0, 10)}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: s.status === "completed" ? "#22c55e" : s.status === "failed" ? "#ef4444" : "#3b82f6" }}>{s.status}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 10, color: "#64748b" }}>{s.total_commands || 0} commands</span>
                <span style={{ fontSize: 10, color: "#475569" }}>{s.created_date ? formatDistanceToNow(new Date(s.created_date), { addSuffix: true }) : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}