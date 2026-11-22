import React from "react";

const GROUPS = ["containment", "forensics", "eradication", "recovery"];
const PRIORITY_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400" };

function categorize(title = "") {
  const t = title.toLowerCase();
  if (/isolat|network|firewall|block|disable/.test(t)) return "containment";
  if (/forensic|memory|dump|image|disk|evidence/.test(t)) return "forensics";
  if (/credential|revoke|persistence|malware|backdoor|remove/.test(t)) return "eradication";
  if (/restore|recover|backup|rebuild/.test(t)) return "recovery";
  return "containment";
}

export default function IncidentTaskChecklist({ tasks, onComplete }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-slate-500">No response tasks recorded for this incident.</p>;
  }
  const grouped = GROUPS.map(g => ({ group: g, items: tasks.filter(t => categorize(t.title) === g) })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map(({ group, items }) => (
        <div key={group}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{group}</p>
          <div className="space-y-1.5">
            {items.map(task => (
              <div key={task.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                <span className="text-sm">{task.status === "completed" ? "☑" : "☐"}</span>
                <p className={`flex-1 text-sm ${task.status === "completed" ? "text-slate-500 line-through" : "text-slate-200"}`}>{task.title}</p>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium}`}>{task.priority}</span>
                {task.status !== "completed" && (
                  <button onClick={() => onComplete(task)} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition whitespace-nowrap">Mark Complete</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}