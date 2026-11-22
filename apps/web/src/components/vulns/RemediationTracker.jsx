import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, User, Play, CheckCircle2, FileText, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { format, formatDistanceStrict } from "date-fns";

const statusSteps = [
  { key: "open", label: "Open", color: "#ef4444" },
  { key: "triaged", label: "Triaged", color: "#eab308" },
  { key: "in_remediation", label: "In Remediation", color: "#6366F1" },
  { key: "resolved", label: "Resolved", color: "#22c55e" },
];

function elapsed(startedAt) {
  if (!startedAt) return null;
  return formatDistanceStrict(new Date(startedAt), new Date(), { addSuffix: false });
}

export default function RemediationTracker({ vuln, onUpdate }) {
  const [hoursInput, setHoursInput] = useState(vuln.remediation_hours_spent?.toString() || "");
  const [notesInput, setNotesInput] = useState(vuln.remediation_notes || "");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const save = async (patch) => {
    setSaving(true);
    try {
      const updated = await base44.entities.Vulnerability.update(vuln.id, patch);
      onUpdate?.(updated);
      qc.invalidateQueries({ queryKey: ["vulns-mgmt"] });
    } finally {
      setSaving(false);
    }
  };

  const startRemediation = () => save({
    status: "in_remediation",
    remediation_started_at: new Date().toISOString(),
  });

  const markResolved = () => save({
    status: "resolved",
    resolved_at: new Date().toISOString(),
  });

  const saveProgress = () => save({
    remediation_hours_spent: parseFloat(hoursInput) || 0,
    remediation_notes: notesInput,
  });

  const currentStepIdx = statusSteps.findIndex(s => s.key === (vuln.status || "open"));
  const isActive = vuln.status === "in_remediation";
  const isResolved = vuln.status === "resolved";
  const elapsedTime = elapsed(vuln.remediation_started_at);

  return (
    <div className="space-y-4 pt-1">
      {/* Progress stepper */}
      <div>
        <Label className="text-xs text-muted-foreground mb-3 block">Remediation Progress</Label>
        <div className="flex items-center gap-0">
          {statusSteps.map((step, i) => {
            const done = i <= currentStepIdx;
            const active = i === currentStepIdx;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${done ? "border-transparent" : "border-[#374151]"}`}
                    style={{ background: done ? step.color : "#1F2937" }}>
                    {i < currentStepIdx
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      : <div className={`w-2 h-2 rounded-full ${active ? "bg-white" : "bg-[#374151]"}`} />}
                  </div>
                  <span className="text-[9px] font-medium whitespace-nowrap" style={{ color: done ? step.color : "#6B7280" }}>
                    {step.label}
                  </span>
                </div>
                {i < statusSteps.length - 1 && (
                  <div className="flex-1 h-0.5 mb-4 mx-1" style={{ background: i < currentStepIdx ? "#22c55e" : "#1F2937" }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Owner & timing */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "#0d1220", border: "1px solid #1F2937" }}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <User className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Responsible</p>
              <p className="text-sm font-semibold text-white mt-0.5">{vuln.assignee || <span className="text-slate-500 font-normal">Unassigned</span>}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Time Elapsed</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {elapsedTime || <span className="text-slate-500 font-normal">Not started</span>}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Timer className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Hours Logged</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {vuln.remediation_hours_spent ? `${vuln.remediation_hours_spent}h` : <span className="text-slate-500 font-normal">—</span>}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                {isResolved ? "Resolved On" : "Due Date"}
              </p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {isResolved && vuln.resolved_at
                  ? format(new Date(vuln.resolved_at), "MMM d, yyyy")
                  : vuln.due_date
                    ? format(new Date(vuln.due_date), "MMM d, yyyy")
                    : <span className="text-slate-500 font-normal">—</span>}
              </p>
            </div>
          </div>
        </div>

        {vuln.remediation_started_at && (
          <div className="text-[10px] text-slate-500 border-t border-[#1F2937] pt-2">
            Started: {format(new Date(vuln.remediation_started_at), "MMM d, yyyy 'at' HH:mm")}
          </div>
        )}
      </div>

      {/* Log hours & notes */}
      {!isResolved && (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Hours Spent</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={hoursInput}
                onChange={e => setHoursInput(e.target.value)}
                placeholder="e.g. 2.5"
                className="h-8 text-xs bg-[#1F2937] border-[#374151]"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Progress Notes</Label>
            <Textarea
              value={notesInput}
              onChange={e => setNotesInput(e.target.value)}
              placeholder="Describe what's been done, blockers, next steps…"
              rows={3}
              className="text-xs bg-[#1F2937] border-[#374151] resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs border-[#374151]" onClick={saveProgress} disabled={saving}>
              <FileText className="w-3.5 h-3.5 mr-1" /> Save Progress
            </Button>
            {!isActive && !isResolved && (
              <Button size="sm" className="text-xs bg-[#6366F1]" onClick={startRemediation} disabled={saving}>
                <Play className="w-3.5 h-3.5 mr-1" /> Start Remediation
              </Button>
            )}
            {isActive && (
              <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-500" onClick={markResolved} disabled={saving}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Resolved
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Notes display when resolved */}
      {isResolved && vuln.remediation_notes && (
        <div className="rounded-lg p-3 text-xs text-slate-300" style={{ background: "#1F2937" }}>
          <p className="text-[10px] text-slate-500 uppercase mb-1">Final Notes</p>
          {vuln.remediation_notes}
        </div>
      )}
    </div>
  );
}