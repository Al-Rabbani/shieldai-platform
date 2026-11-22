import React, { useState } from "react";
import { User, Calendar, CheckCircle, Clock, AlertCircle, ChevronDown } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

const WORKFLOW_COLORS = {
  unassigned: MUTED,
  assigned: CYAN,
  in_progress: "#a855f7",
  review: HIGH,
  resolved: LOW
};

const WORKFLOW_STAGES = ["unassigned", "assigned", "in_progress", "review", "resolved"];

export default function FindingAssignmentCard({ finding, users, onAssign, onUpdateWorkflow, onAddNote }) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [showWorkflow, setShowWorkflow] = useState(false);

  const currentStageIndex = WORKFLOW_STAGES.indexOf(finding.workflow_status || "unassigned");

  const handleAssign = () => {
    if (selectedUser) {
      const user = users.find(u => u.id === selectedUser);
      onAssign(finding.id, selectedUser, user?.full_name, dueDate);
      setShowAssignModal(false);
      setSelectedUser("");
      setDueDate("");
    }
  };

  const handleWorkflowChange = (newStatus) => {
    onUpdateWorkflow(finding.id, newStatus, note);
    setNote("");
  };

  return (
    <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white mb-1">{finding.title}</h4>
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`px-1.5 py-0.5 rounded uppercase font-bold ${
              finding.severity === 'critical' ? 'bg-red-400/15 text-red-400' :
              finding.severity === 'high' ? 'bg-orange-400/15 text-orange-400' :
              finding.severity === 'medium' ? 'bg-yellow-400/15 text-yellow-400' :
              'bg-blue-400/15 text-blue-400'
            }`}>{finding.severity}</span>
            <span style={{ color: MUTED }}>{finding.status}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {finding.assigned_to_name ? (
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>
              <User className="w-3 h-3" style={{ color: CYAN }} />
              <span className="text-[10px] font-semibold" style={{ color: CYAN }}>{finding.assigned_to_name}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
            >
              Assign
            </button>
          )}
          
          <button
            onClick={() => setShowWorkflow(!showWorkflow)}
            className="p-1.5 rounded-lg transition-all hover:bg-white/5"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <ChevronDown className="w-3.5 h-3.5" style={{ color: MUTED }} />
          </button>
        </div>
      </div>

      {/* Workflow Progress */}
      {showWorkflow && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between mb-3">
            {WORKFLOW_STAGES.map((stage, idx) => (
              <React.Fragment key={stage}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      idx <= currentStageIndex ? 'ring-2 ring-offset-2 ring-offset-[#020817]' : ''
                    }`}
                    style={{
                      background: idx <= currentStageIndex ? WORKFLOW_COLORS[stage] : "rgba(255,255,255,0.1)",
                      borderColor: idx <= currentStageIndex ? WORKFLOW_COLORS[stage] : "transparent",
                      ringColor: WORKFLOW_COLORS[stage]
                    }}
                  >
                    {idx < currentStageIndex ? (
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    ) : idx === currentStageIndex ? (
                      <Clock className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
                    )}
                  </div>
                  <span className="text-[8px] uppercase font-bold" style={{ color: idx <= currentStageIndex ? WORKFLOW_COLORS[stage] : MUTED }}>
                    {stage.replace('_', ' ')}
                  </span>
                </div>
                {idx < WORKFLOW_STAGES.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-1"
                    style={{ background: idx < currentStageIndex ? WORKFLOW_COLORS[currentStageIndex] : "rgba(255,255,255,0.1)" }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {finding.workflow_status !== 'resolved' && (
            <div className="flex items-center gap-2 mt-3">
              <select
                value={finding.workflow_status}
                onChange={(e) => handleWorkflowChange(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              >
                {WORKFLOW_STAGES.map(stage => (
                  <option key={stage} value={stage}>{stage.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add progress note..."
                className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              />
              <button
                onClick={() => handleWorkflowChange(finding.workflow_status)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
              >
                Update
              </button>
            </div>
          )}

          {finding.due_date && (
            <div className="flex items-center gap-2 mt-3 text-[10px]" style={{ color: MUTED }}>
              <Calendar className="w-3 h-3" />
              <span>Due: {new Date(finding.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAssignModal(false)}>
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: CARD, border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5" style={{ color: CYAN }} />
              <h3 className="text-sm font-bold text-white">Assign Finding</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: MUTED }}>Team Member</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  <option value="">Select team member...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name} ({user.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: MUTED }}>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedUser}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: selectedUser ? `${CYAN}15` : "rgba(255,255,255,0.1)", border: `1px solid ${CYAN}40`, color: selectedUser ? CYAN : MUTED }}
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}