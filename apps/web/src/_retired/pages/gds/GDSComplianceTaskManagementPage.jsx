import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckSquare, Calendar, User, Bell, Clock, AlertCircle, TrendingUp, CheckCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, timeAgo, StatusBadge } from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";

export default function GDSComplianceTaskManagementPage() {
  const qc = useQueryClient();
  const [selectedFramework, setSelectedFramework] = useState("all");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedControl, setSelectedControl] = useState(null);
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");

  const { data: frameworks = [] } = useQuery({
    queryKey: ["compliance-frameworks-tasks"],
    queryFn: () => base44.entities.ComplianceFramework.list().catch(() => []),
  });

  const { data: controls = [] } = useQuery({
    queryKey: ["compliance-controls-tasks"],
    queryFn: () => base44.entities.ComplianceControl.list("-created_date", 500).catch(() => []),
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["compliance-milestones-tasks"],
    queryFn: () => base44.entities.AuditMilestone.list("-due_date", 500).catch(() => []),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-compliance-tasks"],
    queryFn: () => base44.entities.User.list().catch(() => []),
  });

  const assignControlMutation = useMutation({
    mutationFn: async (data) => {
      const milestoneData = {
        title: `Control ${data.controlId} - ${data.controlName}`,
        description: `Compliance control assignment for ${data.framework}`,
        milestone_type: "control_review",
        framework: data.framework,
        control_ids: [data.controlId],
        due_date: data.dueDate,
        priority: data.priority,
        assigned_to_id: data.assigneeId,
        assigned_to_name: data.assigneeName,
        reminders_enabled: true,
        reminder_days_before: 7,
        status: "scheduled",
      };
      return await base44.entities.AuditMilestone.create(milestoneData);
    },
    onSuccess: () => {
      qc.invalidateQueries(["compliance-milestones-tasks"]);
      setShowAssignModal(false);
      setSelectedControl(null);
      setAssignee("");
      setDueDate("");
      setPriority("medium");
    },
  });

  const handleAssignControl = async () => {
    if (!selectedControl || !assignee || !dueDate) return;
    await assignControlMutation.mutateAsync({
      controlId: selectedControl.control_id || selectedControl.id,
      controlName: selectedControl.control_name || selectedControl.name,
      framework: selectedControl.framework || selectedControl.framework_name,
      assigneeId: assignee,
      assigneeName: users.find(u => u.id === assignee)?.full_name || "Unknown",
      dueDate,
      priority,
    });
  };

  const filteredControls = selectedFramework === "all" 
    ? controls 
    : controls.filter(c => c.framework === selectedFramework || c.framework_name === selectedFramework);

  const stats = {
    total: milestones.length,
    upcoming: milestones.filter(m => {
      const due = new Date(m.due_date);
      const now = new Date();
      const daysUntil = (due - now) / (1000 * 60 * 60 * 24);
      return daysUntil > 0 && daysUntil <= 30 && m.status !== 'completed';
    }).length,
    overdue: milestones.filter(m => {
      const due = new Date(m.due_date);
      return due < new Date() && m.status !== 'completed';
    }).length,
    completed: milestones.filter(m => m.status === 'completed').length,
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Compliance Task Management" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <CheckSquare className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Compliance Task Management</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Assign audit controls and track compliance readiness</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Frameworks</option>
            {frameworks.map(fw => (
              <option key={fw.id} value={fw.framework_name || fw.name}>
                {fw.framework_name || fw.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
              <CheckSquare className="w-5 h-5" style={{ color: CYAN }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Tasks</p>
              <p className="text-2xl font-black text-white">{stats.total}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Active assignments</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}40` }}>
              <Clock className="w-5 h-5" style={{ color: HIGH }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Due Within 30 Days</p>
              <p className="text-2xl font-black text-white">{stats.upcoming}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Upcoming deadlines</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40` }}>
              <AlertCircle className="w-5 h-5" style={{ color: DANGER }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Overdue</p>
              <p className="text-2xl font-black text-white">{stats.overdue}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Past due date</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40` }}>
              <TrendingUp className="w-5 h-5" style={{ color: LOW }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Completed</p>
              <p className="text-2xl font-black text-white">{stats.completed}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Tasks finished</p>
        </Card>
      </div>

      {/* Compliance Controls Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Available Controls for Assignment</h3>
          <p className="text-xs" style={{ color: MUTED }}>{filteredControls.length} controls</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Control ID", "Name", "Framework", "Category", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredControls.slice(0, 50).map((control, i) => (
                <tr key={control.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                  <td className="py-3 px-3 font-mono" style={{ color: CYAN }}>{control.control_id || control.id}</td>
                  <td className="py-3 px-3">
                    <p className="text-xs font-semibold text-white">{control.control_name || control.name}</p>
                    <p className="text-[9px]" style={{ color: MUTED }}>{control.description?.slice(0, 60)}...</p>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] px-2 py-1 rounded font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>
                      {control.framework || control.framework_name || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-3" style={{ color: MUTED }}>{control.category || "—"}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={control.status || "not_started"} />
                  </td>
                  <td className="py-3 px-3">
                    <Button
                      onClick={() => { setSelectedControl(control); setShowAssignModal(true); }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
                    >
                      <User className="w-3 h-3 mr-1.5" />
                      Assign
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Assigned Milestones */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Assigned Tasks & Deadlines</h3>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: MUTED }} />
            <span className="text-xs" style={{ color: MUTED }}>Auto-reminders enabled</span>
          </div>
        </div>
        <div className="space-y-3">
          {milestones.slice(0, 20).map(milestone => {
            const daysUntil = getDaysUntilDue(milestone.due_date);
            const isOverdue = daysUntil < 0;
            const isUrgent = daysUntil >= 0 && daysUntil <= 7;
            
            return (
              <Card key={milestone.id} className="p-4" style={{ 
                background: isOverdue ? `${DANGER}05` : isUrgent ? `${HIGH}05` : CARD,
                border: `1px solid ${isOverdue ? DANGER + "30" : isUrgent ? HIGH + "30" : BORDER}`
              }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSquare className="w-4 h-4" style={{ color: milestone.status === 'completed' ? LOW : CYAN }} />
                      <p className="text-sm font-semibold text-white">{milestone.title}</p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px]">
                      <span className="flex items-center gap-1.5" style={{ color: MUTED }}>
                        <Calendar className="w-3 h-3" />
                        Due: {new Date(milestone.due_date).toLocaleDateString()}
                      </span>
                      {milestone.assigned_to_name && (
                        <span className="flex items-center gap-1.5" style={{ color: MUTED }}>
                          <User className="w-3 h-3" />
                          {milestone.assigned_to_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5" style={{ color: MUTED }}>
                        <Bell className="w-3 h-3" />
                        Reminder: {milestone.reminder_days_before} days before
                      </span>
                    </div>
                    {milestone.control_ids?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {milestone.control_ids.slice(0, 5).map((cid, idx) => (
                          <span key={idx} className="text-[9px] px-2 py-0.5 rounded font-mono" style={{ background: `${CYAN}15`, color: CYAN }}>
                            {cid}
                          </span>
                        ))}
                        {milestone.control_ids.length > 5 && (
                          <span className="text-[9px]" style={{ color: MUTED }}>+{milestone.control_ids.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={milestone.status} />
                    {daysUntil !== null && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        isOverdue ? 'bg-red-400/15 text-red-400' :
                        isUrgent ? 'bg-orange-400/15 text-orange-400' :
                        'bg-green-400/15 text-green-400'
                      }`}>
                        {isOverdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Due today' : `${daysUntil}d left`}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          {milestones.length === 0 && (
            <div className="text-center py-12">
              <CheckSquare className="w-12 h-12 mx-auto mb-3" style={{ color: MUTED }} />
              <p className="text-sm font-bold" style={{ color: MUTED }}>No assigned tasks</p>
              <p className="text-[10px]" style={{ color: MUTED }}>Assign controls to team members to get started</p>
            </div>
          )}
        </div>
      </Card>

      {/* Assignment Modal */}
      {showAssignModal && selectedControl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-lg p-6" style={{ background: "#0a1628" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Assign Compliance Control</h3>
              <button onClick={() => { setShowAssignModal(false); setSelectedControl(null); }} className="text-slate-400 hover:text-white">
                <AlertCircle className="w-5 h-5 rotate-90" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: TEXT }}>Control</p>
                <p className="text-sm" style={{ color: MUTED }}>
                  {selectedControl.control_id || selectedControl.id} - {selectedControl.control_name || selectedControl.name}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Assign To</label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  <option value="">Select team member</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name} ({user.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="p-3 rounded-xl" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}30` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-4 h-4" style={{ color: CYAN }} />
                  <p className="text-xs font-bold" style={{ color: CYAN }}>Automated Reminders</p>
                </div>
                <p className="text-[10px]" style={{ color: MUTED }}>
                  The assignee will receive automatic email reminders 7 days before the due date.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowAssignModal(false); setSelectedControl(null); }}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignControl}
                  disabled={!assignee || !dueDate || assignControlMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: (!assignee || !dueDate) ? "rgba(255,255,255,0.1)" : `${CYAN}15`,
                    border: `1px solid ${CYAN}40`,
                    color: (!assignee || !dueDate) ? MUTED : CYAN,
                    opacity: (!assignee || !dueDate) ? 0.5 : 1
                  }}
                >
                  {assignControlMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: CYAN }} />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Assign Control
                    </>
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}