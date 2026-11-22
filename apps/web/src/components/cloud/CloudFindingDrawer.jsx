import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import ProviderBadge from "./ProviderBadge";

const SEV = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.35)" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.35)" },
  low:      { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)" },
};

const STATUSES = ["open", "in_review", "fixed", "suppressed"];

export default function CloudFindingDrawer({ finding, onClose, onUpdate }) {
  const [status, setStatus] = useState(finding.status || "open");
  const [assignee, setAssignee] = useState(finding.assignee || "");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const sev = SEV[finding.severity] || SEV.low;

  const copyRemediation = () => {
    navigator.clipboard.writeText(finding.remediation || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    setSaving(true);
    await base44.entities.CloudFinding.update(finding.id, { status, assignee });
    toast.success("Finding updated");
    onUpdate?.();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(3,7,18,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="ml-auto h-full w-full max-w-xl overflow-y-auto flex flex-col"
        style={{ background: "#0d1117", borderLeft: "1px solid rgba(30,58,95,0.5)" }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-3 p-5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded uppercase"
                style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}>
                {finding.severity}
              </span>
              <ProviderBadge provider={finding.provider} />
              {finding.service && (
                <span className="text-[11px] px-2 py-0.5 rounded font-mono text-slate-400"
                  style={{ background: "#161b22", border: "1px solid rgba(30,58,95,0.4)" }}>{finding.service}</span>
              )}
            </div>
            <h2 className="text-sm font-bold text-white leading-snug">{finding.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white flex-shrink-0 mt-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            {finding.resource && (
              <div className="col-span-2 p-3 rounded-lg overflow-hidden" style={{ background: "#161b22", border: "1px solid rgba(30,58,95,0.4)" }}>
                <p className="text-slate-500 mb-1">Resource</p>
                <p className="text-slate-300 break-all">{finding.resource}</p>
              </div>
            )}
            {finding.region && <div className="p-2 rounded" style={{ background: "#161b22" }}><p className="text-slate-500">Region</p><p className="text-slate-300">{finding.region}</p></div>}
            {finding.detected_at && <div className="p-2 rounded" style={{ background: "#161b22" }}><p className="text-slate-500">Detected</p><p className="text-slate-300">{new Date(finding.detected_at).toLocaleDateString()}</p></div>}
          </div>

          {/* CIS Control */}
          {finding.cis_control && (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <span className="text-blue-400 text-xs font-mono font-bold">{finding.cis_control}</span>
              <a href={`https://www.cisecurity.org/benchmark`} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-xs flex items-center gap-1 ml-auto">
                CIS Benchmark <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Description */}
          {finding.description && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">Description</p>
              <p className="text-sm text-slate-300 leading-relaxed">{finding.description}</p>
            </div>
          )}

          {/* Remediation */}
          {finding.remediation && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Remediation</p>
                <button onClick={copyRemediation} className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="text-xs text-emerald-300 font-mono p-4 rounded-lg overflow-x-auto leading-relaxed whitespace-pre-wrap"
                style={{ background: "#030712", border: "1px solid rgba(16,185,129,0.2)" }}>
                {finding.remediation}
              </pre>
            </div>
          )}

          {/* Status + Assignee controls */}
          <div className="space-y-3 pt-2" style={{ borderTop: "1px solid rgba(30,58,95,0.4)" }}>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-mono">Status</label>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium capitalize transition-all"
                    style={status === s
                      ? { background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.5)", color: "#60a5fa" }
                      : { background: "#161b22", border: "1px solid rgba(30,58,95,0.4)", color: "#475569" }}>
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-mono">Assignee</label>
              <input value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="engineer@company.com"
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-blue-500"
                style={{ background: "#161b22", border: "1px solid rgba(30,58,95,0.5)" }} />
            </div>
            <button onClick={save} disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "rgba(59,130,246,0.25)", border: "1px solid rgba(59,130,246,0.4)" }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}