import React, { useState } from "react";
import { X, ArrowRight, CheckCircle2, Clock, FileText, Wrench, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, CARD } from "@/components/gds/GDSOSShared";
import { SevBadge } from "@/components/gds/GDSOSShared";
import { formatDistanceStrict, formatDuration, intervalToDuration } from "date-fns";

function timeTaken(startISO, endISO) {
  if (!startISO || !endISO) return null;
  try {
    const start = new Date(startISO);
    const end = new Date(endISO);
    if (isNaN(start) || isNaN(end)) return null;
    return formatDistanceStrict(start, end);
  } catch { return null; }
}

const WORKFLOW_STEPS = [
  { key: "open",           label: "Open",        icon: AlertTriangle, color: MEDIUM  },
  { key: "in_remediation", label: "In Progress",  icon: Wrench,        color: CYAN    },
  { key: "fixed",          label: "Resolved",     icon: CheckCircle2,  color: LOW     },
];

export default function RemediationWorkflowModal({ finding, onClose, onSaved }) {
  const currentStep = WORKFLOW_STEPS.findIndex(s => s.key === finding.status);
  const [notes, setNotes] = useState(finding.remediation_notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canMoveToInProgress = finding.status === "open";
  const canMoveToResolved   = finding.status === "in_remediation";

  const moveStatus = async (newStatus) => {
    setSaving(true); setError("");
    try {
      const now = new Date().toISOString();
      const updates = { status: newStatus, remediation_notes: notes };
      if (newStatus === "in_remediation" && !finding.remediation_started_at) {
        updates.remediation_started_at = now;
      }
      if (newStatus === "fixed") {
        updates.fixed_at = now;
      }
      await base44.entities.TriagedFinding.update(finding.id, updates);
      onSaved();
    } catch (e) {
      setError(e.message || "Failed to update finding.");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true); setError("");
    try {
      await base44.entities.TriagedFinding.update(finding.id, { remediation_notes: notes });
      onSaved();
    } catch (e) {
      setError(e.message || "Failed to save notes.");
    } finally {
      setSaving(false);
    }
  };

  const timeInProgress = timeTaken(finding.remediation_started_at, finding.fixed_at || new Date().toISOString());
  const totalFixTime   = finding.fixed_at ? timeTaken(finding.detected_at, finding.fixed_at) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#050e1f", border: `1px solid ${BORDER}` }}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: BORDER }}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <SevBadge sev={finding.severity} />
              {finding.sla_breached && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>SLA BREACH</span>
              )}
            </div>
            <h3 className="text-sm font-bold text-white leading-snug">{finding.title}</h3>
            <p className="text-[11px] mt-1 font-mono truncate" style={{ color: MUTED }}>{finding.asset_name}</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 hover:text-white transition-colors" style={{ color: MUTED }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Workflow Steps */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: MUTED }}>Workflow</p>
            <div className="flex items-center gap-2">
              {WORKFLOW_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isDone    = i < currentStep;
                const isCurrent = i === currentStep;
                const stepColor = isDone || isCurrent ? step.color : MUTED;
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: (isDone || isCurrent) ? `${step.color}20` : "rgba(255,255,255,0.04)", border: `2px solid ${isCurrent ? step.color : isDone ? step.color + "60" : BORDER}` }}>
                        <Icon className="w-4 h-4" style={{ color: stepColor }} />
                      </div>
                      <span className="text-[9px] font-bold text-center leading-tight" style={{ color: isCurrent ? step.color : isDone ? step.color : MUTED }}>
                        {step.label}
                      </span>
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mb-4" style={{ color: i < currentStep ? CYAN : BORDER }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Time Tracking */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Detected",      value: finding.detected_at         ? new Date(finding.detected_at).toLocaleDateString()          : "—", color: MUTED  },
              { label: "In Progress",   value: finding.remediation_started_at ? new Date(finding.remediation_started_at).toLocaleDateString() : "—", color: CYAN   },
              { label: "Resolved",      value: finding.fixed_at            ? new Date(finding.fixed_at).toLocaleDateString()             : "—", color: LOW    },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 rounded-xl text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{label}</p>
                <p className="text-xs font-mono font-bold mt-1" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {(timeInProgress || totalFixTime) && (
            <div className="flex gap-3">
              {timeInProgress && (
                <div className="flex items-center gap-2 flex-1 p-3 rounded-xl" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}20` }}>
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: CYAN }} />
                  <div>
                    <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Time in Progress</p>
                    <p className="text-sm font-black font-mono" style={{ color: CYAN }}>{timeInProgress}</p>
                  </div>
                </div>
              )}
              {totalFixTime && (
                <div className="flex items-center gap-2 flex-1 p-3 rounded-xl" style={{ background: `${LOW}08`, border: `1px solid ${LOW}20` }}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: LOW }} />
                  <div>
                    <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Total Fix Time</p>
                    <p className="text-sm font-black font-mono" style={{ color: LOW }}>{totalFixTime}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Remediation Notes */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-3.5 h-3.5" style={{ color: MUTED }} />
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>Remediation Notes</p>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe the fix applied, steps taken, or blockers…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: "#020817", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
            />
          </div>

          {error && <p className="text-xs" style={{ color: DANGER }}>{error}</p>}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={saveNotes} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: MUTED }}>
              Save Notes
            </button>
            <div className="flex-1" />
            {canMoveToInProgress && (
              <button onClick={() => moveStatus("in_remediation")} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                <Wrench className="w-4 h-4" />
                {saving ? "Saving…" : "Start Remediation"}
              </button>
            )}
            {canMoveToResolved && (
              <button onClick={() => moveStatus("fixed")} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
                <CheckCircle2 className="w-4 h-4" />
                {saving ? "Saving…" : "Mark Resolved"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}