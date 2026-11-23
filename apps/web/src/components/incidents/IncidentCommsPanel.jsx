import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import AbsentStore from "@/components/platform/AbsentStore";

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

  /* The send() that used to live here wrote to IncidentComment, which has no store on this platform, and swallowed
   * the failure with .catch(() => {}). The box cleared and the message was discarded, so the panel reported a
   * delivered update that never existed. Posting is disabled below until there is somewhere to post to. */

  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase mb-1">🗨️ War room chat</p>
      <div className="rounded-lg p-2 space-y-2 max-h-48 overflow-y-auto" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
        {messages.length === 0 ? (
          <AbsentStore entity="IncidentComment" className="my-1" />
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
      <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "#d7c48a" }}>
        Posting is disabled: there is no incident-comment store on this platform, so an update posted here would be
        discarded rather than delivered to the team.
      </p>
    </div>
  );
}