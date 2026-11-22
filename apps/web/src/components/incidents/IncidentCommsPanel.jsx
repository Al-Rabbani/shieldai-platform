import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

export default function IncidentCommsPanel({ incidentId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [me, setMe] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => {});
    base44.entities.IncidentComment.filter({ incident_id: incidentId }, "created_date", 200).then(setMessages).catch(() => setMessages([]));

    const unsubscribe = base44.entities.IncidentComment.subscribe((event) => {
      if (event.data?.incident_id !== incidentId) return;
      if (event.type === "create") setMessages(prev => [...prev, event.data]);
    });
    return unsubscribe;
  }, [incidentId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    await base44.entities.IncidentComment.create({
      incident_id: incidentId, message: text.trim(), author_name: me?.full_name || "Responder",
    }).catch(() => {});
    setText("");
    setSending(false);
  }

  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase mb-1">🗨️ Live War Room Chat</p>
      <div className="rounded-lg p-2 space-y-2 max-h-48 overflow-y-auto" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
        {messages.length === 0 ? (
          <p className="text-xs text-slate-600 py-2 text-center">No updates yet. Say something to the team.</p>
        ) : (
          messages.map((m, i) => (
            <div key={m.id || i} className="text-xs">
              <span className="font-bold text-blue-400">{m.author_name || "Responder"}: </span>
              <span className="text-slate-300">{m.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 mt-2">
        <input
          value={text} onChange={e => setText(e.target.value)} placeholder="Post an update..."
          className="flex-1 rounded-lg px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-white"
        />
        <button type="submit" disabled={sending} className="px-3 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}