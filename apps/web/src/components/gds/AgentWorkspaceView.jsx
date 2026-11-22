import React, { useMemo, useState } from "react";
import { CheckCircle, Circle, ArrowRight, ChevronRight, Users, Activity } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

const SKILL_COLORS = {
  scan: "#60a5fa", analyze: "#14b8a6", respond: DANGER, hunt: HIGH,
  monitor: MUTED, report: "#fbbf24", orchestrate: "#a855f7", remediate: "#f97316",
};

const STATUS_COLOR = { completed: LOW, in_progress: CYAN, pending: MUTED, failed: DANGER };

// ── Synthetic tasks derived from active collaborations ────────────────────────
function buildWorkspace(activeCollabs, agents) {
  const agentMap = {};
  agents.forEach(a => { agentMap[a.super_agent_id] = a; });

  const tasks = [];
  let taskId = 1;

  activeCollabs.forEach(collab => {
    const missionParts = (collab.mission || "Unnamed mission").split(/[.,;]/);
    const participantIds = Array.isArray(collab.participant_agent_ids)
      ? collab.participant_agent_ids
      : [];
    const allIds = [collab.initiator_agent_id, ...participantIds].filter(Boolean);

    allIds.forEach((agentId, idx) => {
      const agent = agentMap[agentId] || { name: agentId?.slice(0, 12) || "Unknown", agent_class: "unknown" };
      const isInitiator = idx === 0;
      const taskLabel = missionParts[idx % missionParts.length]?.trim() || "Subtask";
      const delegatedFrom = isInitiator ? null : collab.initiator_agent_id;
      const progress = isInitiator ? 100 : Math.round(30 + ((idx * 37) % 65));
      const status = progress === 100 ? "completed" : progress > 60 ? "in_progress" : "pending";

      tasks.push({
        id: taskId++,
        collab_id: collab.collaboration_id,
        agent_id: agentId,
        agent_name: agent.name || agentId?.slice(0, 12),
        agent_class: agent.agent_class,
        skill: agent.primary_skill || "analyze",
        task: isInitiator ? `[Lead] ${taskLabel}` : taskLabel,
        delegated_from: delegatedFrom,
        delegated_from_name: delegatedFrom ? (agentMap[delegatedFrom]?.name || delegatedFrom?.slice(0, 12)) : null,
        progress,
        status,
        is_initiator: isInitiator,
      });
    });
  });

  return tasks;
}

function ProgressRing({ pct, size = 44, color = CYAN }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ - dash}`}
        style={{ transition: "stroke-dasharray 0.8s ease", filter: `drop-shadow(0 0 3px ${color}88)` }} />
    </svg>
  );
}

function TaskRow({ task, tasks }) {
  const color = STATUS_COLOR[task.status] || MUTED;
  const skillColor = SKILL_COLORS[task.skill] || MUTED;
  const delegated = tasks.filter(t => t.delegated_from === task.agent_id && t.collab_id === task.collab_id);

  return (
    <div className="group relative">
      <div className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.03]"
        style={{ border: `1px solid ${BORDER}20`, borderLeft: `3px solid ${color}` }}>
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <ProgressRing pct={task.progress} color={color} size={40} />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black" style={{ color }}>
            {task.progress}%
          </span>
        </div>

        {/* Agent + task */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs font-black text-white truncate">{task.agent_name}</span>
            {task.is_initiator && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase"
                style={{ color: "#fbbf24", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
                Lead
              </span>
            )}
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
              style={{ color: skillColor, background: `${skillColor}15`, border: `1px solid ${skillColor}30` }}>
              {task.skill}
            </span>
          </div>
          <p className="text-[11px] truncate" style={{ color: MUTED }}>{task.task}</p>
          {task.delegated_from_name && (
            <div className="flex items-center gap-1 mt-0.5">
              <ArrowRight className="w-2.5 h-2.5 flex-shrink-0" style={{ color: MUTED }} />
              <span className="text-[9px]" style={{ color: MUTED }}>delegated by <span style={{ color: CYAN }}>{task.delegated_from_name}</span></span>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex-shrink-0 text-right">
          {task.status === "completed"
            ? <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
            : task.status === "in_progress"
            ? <Activity className="w-4 h-4 animate-pulse" style={{ color: CYAN }} />
            : <Circle className="w-4 h-4" style={{ color: MUTED }} />}
          <p className="text-[9px] capitalize mt-0.5" style={{ color }}>{task.status.replace("_", " ")}</p>
        </div>
      </div>

      {/* Delegation arrows to sub-tasks */}
      {delegated.length > 0 && (
        <div className="ml-8 mt-1 space-y-1 border-l pl-3" style={{ borderColor: `${CYAN}25` }}>
          {delegated.map(sub => (
            <div key={sub.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
              style={{ background: "rgba(0,212,255,0.02)", border: `1px solid ${BORDER}10` }}>
              <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: CYAN }} />
              <span className="text-[11px] font-semibold text-white">{sub.agent_name}</span>
              <div className="flex-1 h-1 rounded-full overflow-hidden mx-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${sub.progress}%`, background: STATUS_COLOR[sub.status] || MUTED }} />
              </div>
              <span className="text-[10px] font-mono" style={{ color: STATUS_COLOR[sub.status] || MUTED }}>{sub.progress}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentWorkspaceView({ activeCollabs = [], agents = [], isLoading = false }) {
  const [filterStatus, setFilterStatus] = useState("all");

  const tasks = useMemo(() => buildWorkspace(activeCollabs, agents), [activeCollabs, agents]);
  const leads = tasks.filter(t => t.is_initiator);
  const subtasks = tasks.filter(t => !t.is_initiator);

  // Overall team progress
  const totalProgress = tasks.length > 0
    ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
    : 0;
  const completed = tasks.filter(t => t.status === "completed").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const pending = tasks.filter(t => t.status === "pending").length;

  // Group by collaboration
  const byCollab = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!map[t.collab_id]) map[t.collab_id] = [];
      map[t.collab_id].push(t);
    });
    return map;
  }, [tasks]);

  const visibleTasks = filterStatus === "all" ? tasks : tasks.filter(t => t.status === filterStatus);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Users className="w-10 h-10 mb-3" style={{ color: MUTED }} />
        <p className="text-sm font-bold text-white mb-1">No active collaborations</p>
        <p className="text-xs" style={{ color: MUTED }}>Start a collaboration to see task delegation here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team progress summary */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Team Completion Progress</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{tasks.length} tasks across {Object.keys(byCollab).length} active collaborations</p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { key: "all", label: "All" },
              { key: "in_progress", label: "Active" },
              { key: "pending", label: "Pending" },
              { key: "completed", label: "Done" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFilterStatus(key)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: filterStatus === key ? `${CYAN}18` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${filterStatus === key ? CYAN + "50" : BORDER}`,
                  color: filterStatus === key ? CYAN : MUTED,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Aggregate progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Overall</span>
            <span className="text-lg font-black font-mono" style={{ color: totalProgress >= 75 ? LOW : totalProgress >= 40 ? CYAN : HIGH }}>
              {totalProgress}%
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${totalProgress}%`,
                background: `linear-gradient(90deg, ${CYAN}, ${LOW})`,
                boxShadow: `0 0 8px ${CYAN}55`,
              }} />
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Tasks", value: tasks.length, color: CYAN },
            { label: "In Progress", value: inProgress, color: CYAN },
            { label: "Pending",     value: pending,     color: HIGH },
            { label: "Completed",   value: completed,   color: LOW },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <p className="text-lg font-black font-mono" style={{ color }}>{value}</p>
              <p className="text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>{label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Per-collaboration task boards */}
      {Object.entries(byCollab).map(([collabId, collabTasks]) => {
        const leadTask = collabTasks.find(t => t.is_initiator);
        const collabProgress = Math.round(collabTasks.reduce((s, t) => s + t.progress, 0) / collabTasks.length);
        const visibleCollabTasks = filterStatus === "all" ? collabTasks.filter(t => t.is_initiator) : collabTasks.filter(t => filterStatus === "all" || t.status === filterStatus);

        if (visibleCollabTasks.length === 0 && filterStatus !== "all") return null;

        return (
          <Card key={collabId} className="overflow-hidden">
            {/* Collab header */}
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: CYAN }} />
                <span className="text-[10px] font-mono font-bold truncate" style={{ color: CYAN }}>
                  {collabId?.slice(0, 24) || "Collaboration"}
                </span>
                <span className="text-[10px]" style={{ color: MUTED }}>{collabTasks.length} agents</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${collabProgress}%`, background: collabProgress >= 75 ? LOW : CYAN }} />
                </div>
                <span className="text-[11px] font-black font-mono" style={{ color: collabProgress >= 75 ? LOW : CYAN }}>{collabProgress}%</span>
              </div>
            </div>

            {/* Tasks — lead first then delegation tree */}
            <div className="p-4 space-y-2">
              {(filterStatus === "all" ? collabTasks.filter(t => t.is_initiator) : collabTasks.filter(t => t.status === filterStatus)).map(task => (
                <TaskRow key={task.id} task={task} tasks={collabTasks} />
              ))}
              {filterStatus !== "all" && collabTasks.filter(t => !t.is_initiator && t.status === filterStatus).map(task => (
                <TaskRow key={task.id} task={task} tasks={collabTasks} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}