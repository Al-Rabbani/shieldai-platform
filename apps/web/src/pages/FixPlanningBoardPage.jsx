import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { buildImpactModel, projectImpact } from "@/lib/patchImpact";
import { CalendarDays, RotateCcw, GripVertical } from "lucide-react";

const SEV_STYLE = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-amber-400",
  low: "text-blue-400",
  info: "text-slate-400",
};

function mondayOf(date) {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function FixPlanningBoardPage() {
  const [findings, setFindings] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [score, setScore] = useState(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      const [risk, openRows, scheduled] = await Promise.all([
        base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: "open" }, "-cvss_score", 200).catch(() => []),
        base44.entities.FixScheduleItem.list("-created_date", 300).catch(() => []),
      ]);
      setScore(risk[0]?.overall_score ?? null);
      setFindings(openRows || []);
      setSchedule(scheduled || []);
      setLoading(false);
    })();
  }, []);

  const weeks = useMemo(() => {
    const base = mondayOf(new Date());
    return [0, 1, 2, 3].map((index) => {
      const start = new Date(base);
      start.setDate(base.getDate() + index * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const key = start.toISOString().slice(0, 10);
      return {
        key,
        label: index === 0 ? "This week" : `Week ${index + 1}`,
        range: `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
      };
    });
  }, []);

  const model = useMemo(() => buildImpactModel(findings, score), [findings, score]);
  const pointsByFinding = useMemo(() => {
    const map = new Map();
    model.rows.forEach((row) => map.set(row.finding.id, row.delta));
    return map;
  }, [model]);

  const scheduledIds = useMemo(() => schedule.map((s) => s.finding_id), [schedule]);
  const projection = useMemo(() => projectImpact(model, scheduledIds), [model, scheduledIds]);

  const visibleFindings = useMemo(() => findings.filter((f) => {
    const severity = f.severity || f.normalized_severity || "low";
    return severityFilter === "all" || severity === severityFilter;
  }), [findings, severityFilter]);

  const buckets = useMemo(() => {
    const byWeek = new Map();
    schedule.forEach((item) => byWeek.set(item.finding_id, item.week_key));
    const backlog = visibleFindings.filter((f) => !byWeek.has(f.id));
    const columns = weeks.map((week) => ({
      ...week,
      items: visibleFindings.filter((f) => byWeek.get(f.id) === week.key),
    }));
    return [{ key: "backlog", label: "Unscheduled", range: "No week assigned", items: backlog }, ...columns];
  }, [weeks, schedule, visibleFindings]);

  async function onDragEnd(result) {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const target = destination.droppableId;
    const finding = findings.find((f) => f.id === draggableId);
    const existing = schedule.find((s) => s.finding_id === draggableId);
    const nextWeek = weeks.find((w) => w.key === target);
    setMessage(null);

    setSchedule((prev) => {
      const without = prev.filter((s) => s.finding_id !== draggableId);
      if (target === "backlog") return without;
      return [...without, { id: existing?.id, finding_id: draggableId, week_key: target }];
    });

    try {
      if (target === "backlog") {
        if (existing) await base44.entities.FixScheduleItem.delete(existing.id);
      } else if (existing) {
        await base44.entities.FixScheduleItem.update(existing.id, { week_key: target });
      } else {
        const created = await base44.entities.FixScheduleItem.create({
          finding_id: draggableId,
          finding_title: finding?.title || "",
          week_key: target,
          week_number: weeks.findIndex((w) => w.key === nextWeek?.key) + 1,
        });
        setSchedule((prev) => prev.map((s) => (s.finding_id === draggableId && !s.id ? { ...s, id: created.id } : s)));
      }
    } catch (error) {
      setMessage(`Could not save the placement: ${error.message}`);
      const rows = await base44.entities.FixScheduleItem.list("-created_date", 300).catch(() => []);
      setSchedule(rows || []);
    }
  }

  async function clearSchedule() {
    if (!window.confirm("Remove every item from the weekly schedule?")) return;
    setMessage(null);
    try {
      for (const item of schedule) {
        if (item.id) await base44.entities.FixScheduleItem.delete(item.id);
      }
      setSchedule([]);
    } catch (error) {
      setMessage(`Could not clear the schedule: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays size={24} className="text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Weekly Fix Planning Board</h1>
            <p className="text-xs text-slate-500">Drag fixes into the week you plan to ship them and watch the score move</p>
          </div>
        </div>
        <button onClick={clearSchedule} disabled={schedule.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-slate-700/40 text-slate-300 border border-slate-700 hover:bg-slate-700/60 transition disabled:opacity-40">
          <RotateCcw size={13} /> Clear schedule
        </button>
      </div>

      <div className="rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Recorded score</p>
          <p className="text-lg font-bold font-mono text-white">{projection.projected == null ? "—" : (model.currentScore ?? 0).toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Projected score</p>
          <p className="text-lg font-bold font-mono text-emerald-400">{projection.projected == null ? "—" : projection.projected.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Fixes scheduled</p>
          <p className="text-lg font-bold text-white font-mono">{schedule.length}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Score recovered</p>
          <p className="text-lg font-bold text-emerald-400 font-mono">+{projection.gain.toFixed(1)}</p>
        </div>
        <p className="col-span-2 sm:col-span-4 text-[10px] text-slate-500">
          {score == null
            ? "No recorded risk score snapshot yet, so projections stay at zero until one exists."
            : "Projection distributes the recorded gap to 100 across open findings by severity and CVSS. It is a planning estimate from stored numbers."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", "critical", "high", "medium", "low"].map((severity) => (
          <button
            key={severity}
            onClick={() => setSeverityFilter(severity)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${severityFilter === severity ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200"}`}
          >
            {severity === "all" ? "All severities" : severity}
          </button>
        ))}
        {message && <span className="text-[11px] text-red-400">{message}</span>}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {buckets.map((bucket) => (
            <Droppable droppableId={bucket.key} key={bucket.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="min-w-[230px] w-[230px] flex-shrink-0 rounded-xl p-2 max-h-[60vh] overflow-y-auto"
                  style={{ background: "#111827", border: `1px solid ${snapshot.isDraggingOver ? "#3b82f6" : "#1F2937"}` }}
                >
                  <div className="mb-2 px-1">
                    <p className="text-xs font-bold text-white">{bucket.label}</p>
                    <p className="text-[10px] text-slate-500">{bucket.range} · {bucket.items.length}</p>
                  </div>
                  {bucket.items.map((finding, index) => {
                    const severity = finding.severity || finding.normalized_severity || "low";
                    return (
                      <Draggable draggableId={finding.id} index={index} key={finding.id}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{ ...dragProvided.draggableProps.style, background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: "3px solid #3b82f6" }}
                            className="rounded-lg p-2 mb-1.5"
                          >
                            <div className="flex items-start gap-1">
                              <GripVertical size={11} className="text-slate-600 mt-0.5 flex-shrink-0" />
                              <p className="text-[11px] text-white leading-snug flex-1 min-w-0 break-words">{finding.title}</p>
                            </div>
                            <div className="flex items-center justify-between mt-1 pl-3">
                              <span className={`text-[9px] font-bold uppercase ${SEV_STYLE[severity] || SEV_STYLE.info}`}>{severity}</span>
                              <span className="text-[9px] font-mono text-emerald-400">+{(pointsByFinding.get(finding.id) || 0).toFixed(1)}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  {bucket.items.length === 0 && <p className="text-[10px] text-slate-600 px-1 py-2">Drop fixes here</p>}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <p className="text-[10px] text-slate-500">Placements are saved to the shared schedule, so the team sees the same board. Dragging an item back to Unscheduled removes it.</p>
    </div>
  );
}