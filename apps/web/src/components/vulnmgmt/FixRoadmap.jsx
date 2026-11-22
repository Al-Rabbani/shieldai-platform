import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { buildImpactModel, projectImpact } from "@/lib/patchImpact";
import FixDetailPanel from "@/components/fixes/FixDetailPanel";
import { GripVertical } from "lucide-react";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };

function mondayOf(date) {
  const next = new Date(date);
  const offset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - offset);
  next.setHours(0, 0, 0, 0);
  return next;
}

function mondayKey(value) {
  if (!value) return null;
  return mondayOf(new Date(`${value}T12:00:00`)).toISOString().slice(0, 10);
}

export default function FixRoadmap({ findings }) {
  const [schedule, setSchedule] = useState([]);
  const [score, setScore] = useState(null);
  const [assets, setAssets] = useState([]);
  const [links, setLinks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [scheduled, risk, assetRows, linkRows] = await Promise.all([
        base44.entities.FixScheduleItem.list("-created_date", 400).catch(() => []),
        base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
        base44.entities.Asset.list("-created_date", 300).catch(() => []),
        base44.entities.AssetDependency.list("-created_date", 400).catch(() => []),
      ]);
      setSchedule(scheduled || []);
      setScore(risk[0]?.overall_score ?? null);
      setAssets(assetRows || []);
      setLinks(linkRows || []);
      setLoading(false);
    })();
  }, []);

  const weeks = useMemo(() => {
    const base = mondayOf(new Date());
    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(base);
      start.setDate(base.getDate() + index * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return {
        key: start.toISOString().slice(0, 10),
        label: index === 0 ? "This week" : `Wk ${index + 1}`,
        range: `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      };
    });
  }, []);

  const model = useMemo(() => buildImpactModel(findings, score), [findings, score]);

  const board = useMemo(() => {
    const byFinding = new Map();
    schedule.forEach((item) => byFinding.set(item.finding_id, mondayKey(item.week_key)));
    const unscheduled = findings.filter((finding) => !byFinding.has(finding.id));

    const columns = weeks.map((week) => ({
      ...week,
      items: findings.filter((finding) => byFinding.get(finding.id) === week.key),
    }));

    let cumulative = [];
    return [
      { key: "unscheduled", label: "Unscheduled", range: "backlog", items: unscheduled, projection: null },
      ...columns.map((column) => {
        cumulative = [...cumulative, ...column.items.map((item) => item.id)];
        return { ...column, projection: projectImpact(model, cumulative) };
      }),
    ];
  }, [weeks, schedule, findings, model]);

  const allScheduled = board.slice(1).flatMap((column) => column.items.map((item) => item.id));
  const finalProjection = useMemo(() => projectImpact(model, allScheduled), [model, allScheduled]);

  async function onDragEnd(result) {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const target = destination.droppableId;
    const finding = findings.find((item) => item.id === draggableId);
    const existing = schedule.find((item) => item.finding_id === draggableId);
    setMessage(null);

    setSchedule((prev) => {
      const without = prev.filter((item) => item.finding_id !== draggableId);
      if (target === "unscheduled") return without;
      return [...without, { id: existing?.id, finding_id: draggableId, week_key: target }];
    });

    try {
      if (target === "unscheduled") {
        if (existing) await base44.entities.FixScheduleItem.delete(existing.id);
      } else if (existing) {
        await base44.entities.FixScheduleItem.update(existing.id, { week_key: target });
      } else {
        const created = await base44.entities.FixScheduleItem.create({
          finding_id: draggableId,
          finding_title: finding?.title || "",
          week_key: target,
          week_number: weeks.findIndex((week) => week.key === target) + 1,
        });
        setSchedule((prev) => prev.map((item) => (item.finding_id === draggableId && !item.id ? { ...item, id: created.id } : item)));
      }
    } catch (error) {
      setMessage(`Could not save the placement: ${error.message}`);
      const rows = await base44.entities.FixScheduleItem.list("-created_date", 400).catch(() => []);
      setSchedule(rows || []);
    }
  }

  if (loading) {
    return <div className="rounded-xl py-12 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}><div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Recorded score</p>
          <p className="text-lg font-bold font-mono text-white">{model.currentScore == null ? "—" : model.currentScore.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Projected after roadmap</p>
          <p className="text-lg font-bold font-mono text-emerald-400">{finalProjection.projected == null ? "—" : finalProjection.projected.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Fixes on roadmap</p>
          <p className="text-lg font-bold font-mono text-white">{allScheduled.length}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Score recovered</p>
          <p className="text-lg font-bold font-mono text-emerald-400">+{finalProjection.gain.toFixed(1)}</p>
        </div>
        <p className="col-span-2 sm:col-span-4 text-[10px] text-slate-500">
          Drag a fix into a week to see the projected score move. The projection spreads the recorded score gap across open findings by severity and CVSS — a planning estimate, not a recalculated platform score.
        </p>
      </div>

      {message && <p className="text-[11px] text-red-400">{message}</p>}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {board.map((column) => (
            <Droppable droppableId={column.key} key={column.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="min-w-[210px] w-[210px] flex-shrink-0 rounded-xl p-2 max-h-[52vh] overflow-y-auto"
                  style={{ background: "#111827", border: `1px solid ${snapshot.isDraggingOver ? "#3b82f6" : "#1F2937"}` }}
                >
                  <div className="px-1 mb-2">
                    <p className="text-[11px] font-bold text-white">{column.label}</p>
                    <p className="text-[9px] text-slate-500">{column.range} · {column.items.length} fix(es)</p>
                    {column.projection && (
                      <p className="text-[9px] font-mono text-emerald-400 mt-0.5">
                        score {column.projection.projected == null ? "—" : column.projection.projected.toFixed(1)} (+{column.projection.gain.toFixed(1)})
                      </p>
                    )}
                  </div>

                  {column.items.map((finding, index) => {
                    const severity = finding.severity || finding.normalized_severity || "info";
                    return (
                      <Draggable draggableId={finding.id} index={index} key={finding.id}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            onClick={() => setSelected(finding)}
                            style={{
                              ...dragProvided.draggableProps.style,
                              background: "#0a0f1e",
                              border: selected?.id === finding.id ? "1px solid #3b82f6" : "1px solid #1F2937",
                              borderLeft: `3px solid ${SEV_COLOR[severity] || SEV_COLOR.info}`,
                            }}
                            className="rounded-lg p-1.5 mb-1.5 cursor-pointer"
                          >
                            <div className="flex items-start gap-1">
                              <GripVertical size={10} className="text-slate-600 mt-0.5 flex-shrink-0" />
                              <p className="text-[10px] text-white leading-tight line-clamp-2">{finding.title}</p>
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-1 pl-3">
                              <span className="text-[9px] font-bold uppercase" style={{ color: SEV_COLOR[severity] }}>{severity}</span>
                              <span className="text-[9px] text-slate-500 truncate max-w-[110px]">{finding.asset_name}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  {column.items.length === 0 && <p className="text-[9px] text-slate-600 px-1 py-2">Drop fixes here</p>}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {selected && <FixDetailPanel finding={selected} assets={assets} links={links} onClose={() => setSelected(null)} />}

      <p className="text-[10px] text-slate-500">Placements are shared with the weekly planning board and the fix calendar, so the team always sees one schedule.</p>
    </div>
  );
}