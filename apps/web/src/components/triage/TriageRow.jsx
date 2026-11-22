import React, { useState } from "react";
import { AlertTriangle, Check, ArrowRight, CalendarClock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AutoFixPanel from "@/components/triage/AutoFixPanel";
import SlaCountdown from "@/components/triage/SlaCountdown";

const SEV_STYLE = {
  critical: "bg-red-500/15 text-red-400 border-red-500/40",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/40",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  info: "bg-slate-500/15 text-slate-400 border-slate-500/40",
};

const STATUSES = ["open", "in_remediation", "fixed", "accepted_risk", "false_positive"];
const FIELD = "px-2 py-1 rounded text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none";

export default function TriageRow({ finding, agents, onUpdate, saving }) {
  const [action, setAction] = useState(finding.next_action_item || "");
  const [savedFlash, setSavedFlash] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [meetingBusy, setMeetingBusy] = useState(false);
  const reviewable = ["critical", "high"].includes(finding.severity);

  const agentId = finding.assigned_agent_id || "";
  const unassigned = !finding.assigned_to && !agentId;

  async function assign(value) {
    const agent = agents.find((item) => item.id === value);
    if (!agent) {
      await onUpdate(finding.id, { assigned_agent_id: "", assigned_to: "" });
      return;
    }
    await onUpdate(finding.id, {
      assigned_agent_id: agent.id,
      assigned_to: agent.display_name || agent.name,
      status: finding.status === "open" ? "in_remediation" : finding.status,
      remediation_started_at: finding.remediation_started_at || new Date().toISOString(),
    });
  }

  async function saveAction() {
    await onUpdate(finding.id, { next_action_item: action.trim() });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  // Flags the finding for attention and books the fix-strategy review with the owning team.
  async function bookFixReview() {
    setMeetingBusy(true);
    setMeeting(null);
    try {
      const response = await base44.functions.invoke("gdsFixReviewMeeting", { finding_id: finding.id });
      const data = response.data || {};
      if (data.error) {
        setMeeting({ ok: false, message: data.error });
      } else {
        setMeeting({
          ok: true,
          link: data.html_link,
          message: `Review booked ${new Date(data.start).toLocaleString()} · ${(data.attendees || []).length} invitee${(data.attendees || []).length === 1 ? "" : "s"}`,
        });
      }
    } catch (error) {
      setMeeting({ ok: false, message: error?.response?.data?.error || "Could not book the review meeting" });
    } finally {
      setMeetingBusy(false);
    }
  }

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${unassigned ? "#f59e0b" : "#3b82f6"}` }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${SEV_STYLE[finding.severity] || SEV_STYLE.info}`}>{finding.severity}</span>
            <p className="text-xs font-semibold text-white">{finding.title}</p>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {finding.asset_name} · CVSS {finding.cvss_score ?? "—"}
            {finding.cve_id ? ` · ${finding.cve_id}` : ""}
            {finding.owner_team ? ` · ${finding.owner_team}` : ""}
          </p>
          {(finding.labels || []).length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {finding.labels.map((label) => (
                <span key={label} className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">{label}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <SlaCountdown finding={finding} />
          {unassigned && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">unassigned</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-[9px] uppercase text-slate-500">
          Assigned to
          <select
            value={agentId}
            disabled={saving}
            onChange={(e) => assign(e.target.value)}
            className={`mt-0.5 w-full ${FIELD}`}
          >
            <option value="">Unassigned</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.display_name || agent.name}</option>
            ))}
          </select>
        </label>
        <label className="text-[9px] uppercase text-slate-500">
          Status
          <select
            value={finding.status}
            disabled={saving}
            onChange={(e) => onUpdate(finding.id, { status: e.target.value })}
            className={`mt-0.5 w-full ${FIELD}`}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-end gap-1.5">
        <label className="text-[9px] uppercase text-slate-500 flex-1">
          Next action item
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveAction(); }}
            placeholder="e.g. Patch to 2.4.1 on staging, then production"
            className={`mt-0.5 w-full ${FIELD}`}
          />
        </label>
        <button
          onClick={saveAction}
          disabled={saving || action === (finding.next_action_item || "")}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition disabled:opacity-30"
        >
          {savedFlash ? <Check size={11} /> : <ArrowRight size={11} />} {savedFlash ? "Saved" : "Save"}
        </button>
      </div>

      {finding.next_action_item && finding.next_action_item !== action && (
        <p className="text-[10px] text-slate-500">Current: {finding.next_action_item}</p>
      )}

      {reviewable && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={bookFixReview}
            disabled={meetingBusy}
            title="Flag this finding for attention and invite the team to a fix-strategy review"
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/40 hover:bg-violet-500/25 transition disabled:opacity-40"
          >
            <CalendarClock size={11} /> {meetingBusy ? "Booking…" : "Flag & book fix review"}
          </button>
          {meeting?.ok ? (
            <a href={meeting.link} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-300 hover:underline">
              {meeting.message}
            </a>
          ) : meeting && !meeting.ok ? (
            <span className="text-[10px] text-red-400">{meeting.message}</span>
          ) : null}
        </div>
      )}

      <AutoFixPanel finding={finding} saving={saving} onUpdate={onUpdate} />
    </div>
  );
}