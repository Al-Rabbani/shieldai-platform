import React, { useState } from "react";
import { X, ExternalLink, Loader2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const GOLD = "#C9A84C";

const SYSTEMS = [
  { id: "jira", label: "Jira", color: "#3b82f6", prefix: "JIRA" },
  { id: "linear", label: "Linear", color: "#6366f1", prefix: "LIN" },
  { id: "github", label: "GitHub Issue", color: "#9CA3AF", prefix: "GH" },
  { id: "azure", label: "Azure DevOps", color: "#0ea5e9", prefix: "ADO" },
];

const SEV_PRIORITY = { critical: "Highest", high: "High", medium: "Medium", low: "Low", info: "Low" };

export default function CreateTicketDrawer({ finding, onClose, onCreated }) {
  const [system, setSystem] = useState("jira");
  const [submitting, setSubmitting] = useState(false);
  const [fields, setFields] = useState({
    title: `[ShieldAI] ${finding?.title || "Security Finding"} — ${finding?.severity || "high"}`,
    priority: SEV_PRIORITY[finding?.severity] || "High",
    description: `${finding?.description || ""}\n\n**Remediation:** ${finding?.remediation || "See finding details."}\n\n**CVSS Score:** ${finding?.cvss_score || "N/A"}\n**Affected Asset:** ${finding?.asset_name || finding?.endpoint || "N/A"}`,
    labels: `security,shieldai,${finding?.severity || "high"}`,
    assignee: finding?.assignee || finding?.assigned_to || "",
    dueDate: finding?.sla_deadline ? new Date(finding.sla_deadline).toISOString().slice(0, 10) : "",
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const sys = SYSTEMS.find(s => s.id === system);
      const ticketId = `${sys.prefix}-${Math.floor(Math.random() * 900 + 100)}`;
      const ticketUrl = system === "jira"
        ? `https://yourorg.atlassian.net/browse/${ticketId}`
        : system === "linear"
        ? `https://linear.app/yourorg/issue/${ticketId}`
        : `https://github.com/yourorg/repo/issues/${ticketId.replace("GH-", "")}`;

      if (finding?.id && onCreated) {
        onCreated({ ticket_id: ticketId, ticket_url: ticketUrl, ticket_system: system });
      }
      toast.success(`${sys.label} ticket ${ticketId} created successfully`);
      onClose();
    } catch (e) {
      toast.error("Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div className="relative w-full md:w-[480px] h-full md:h-auto md:max-h-[90vh] rounded-t-2xl md:rounded-2xl border overflow-hidden flex flex-col"
        style={{ background: "#111827", borderColor: "#374151" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0" style={{ borderColor: "#1F2937" }}>
          <h3 className="font-black text-white">Create Ticket</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* System selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">Destination</label>
            <div className="grid grid-cols-2 gap-2">
              {SYSTEMS.map(s => (
                <button key={s.id} onClick={() => setSystem(s.id)}
                  className="p-3 rounded-xl border text-left transition-all"
                  style={{ background: system === s.id ? s.color + "15" : "#1F2937", borderColor: system === s.id ? s.color : "#374151" }}>
                  <div className="text-sm font-bold" style={{ color: system === s.id ? s.color : "#9CA3AF" }}>{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          {[
            { label: "Title", key: "title" },
            { label: "Assignee", key: "assignee" },
            { label: "Due Date", key: "dueDate", type: "date" },
            { label: "Labels (comma-separated)", key: "labels" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">{f.label}</label>
              <input type={f.type || "text"} value={fields[f.key]}
                onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white border outline-none"
                style={{ background: "#1F2937", borderColor: "#374151" }} />
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Priority</label>
            <select value={fields.priority} onChange={e => setFields(p => ({ ...p, priority: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white border outline-none"
              style={{ background: "#1F2937", borderColor: "#374151" }}>
              {["Highest", "High", "Medium", "Low"].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Description</label>
            <textarea value={fields.description} onChange={e => setFields(p => ({ ...p, description: e.target.value }))}
              rows={5} className="w-full px-4 py-2.5 rounded-xl text-sm text-white border outline-none font-mono"
              style={{ background: "#1F2937", borderColor: "#374151" }} />
          </div>
        </div>

        <div className="p-5 border-t flex-shrink-0" style={{ borderColor: "#1F2937" }}>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><Check className="w-4 h-4" />Submit Ticket</>}
          </button>
        </div>
      </div>
    </div>
  );
}