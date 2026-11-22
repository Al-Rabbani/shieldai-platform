import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import FixCalendarGrid from "@/components/fixes/FixCalendarGrid";
import FixDetailPanel from "@/components/fixes/FixDetailPanel";
import SlaCalendarSyncPanel from "@/components/fixes/SlaCalendarSyncPanel";
import { CalendarDays, ChevronLeft, ChevronRight, GripVertical, LayoutGrid } from "lucide-react";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function dayKey(date) {
  const local = new Date(date);
  local.setHours(12, 0, 0, 0);
  return local.toISOString().slice(0, 10);
}

function isoWeekNumber(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
}

function buildDays(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const today = dayKey(new Date());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: dayKey(date),
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === cursor.getMonth(),
      isToday: dayKey(date) === today,
    };
  });
}

export default function FixCalendarPage() {
  const [findings, setFindings] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [assets, setAssets] = useState([]);
  const [links, setLinks] = useState([]);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      const [openRows, scheduled, assetRows, linkRows] = await Promise.all([
        base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 200).catch(() => []),
        base44.entities.FixScheduleItem.list("-created_date", 400).catch(() => []),
        base44.entities.Asset.list("-created_date", 300).catch(() => []),
        base44.entities.AssetDependency.list("-created_date", 400).catch(() => []),
      ]);
      setFindings(openRows || []);
      setSchedule(scheduled || []);
      setAssets(assetRows || []);
      setLinks(linkRows || []);
      setLoading(false);
    })();
  }, []);

  const days = useMemo(() => buildDays(cursor), [cursor]);
  const findingById = useMemo(() => Object.fromEntries(findings.map((f) => [f.id, f])), [findings]);

  const findingsByDay = useMemo(() => {
    const map = new Map();
    schedule.forEach((item) => {
      const finding = findingById[item.finding_id];
      if (!finding) return;
      if (!map.has(item.week_key)) map.set(item.week_key, []);
      map.get(item.week_key).push({ ...finding, finding_title: finding.title, scheduled_id: item.id });
    });
    days.forEach((day) => {
      const rows = map.get(day.key);
      if (rows) rows.sort((a, b) => (b.cvss_score || 0) - (a.cvss_score || 0));
    });
    return map;
  }, [schedule, findingById, days]);

  const scheduledIds = useMemo(() => schedule.map((item) => item.finding_id), [schedule]);
  const backlog = useMemo(
    () => findings
      .filter((finding) => !scheduledIds.includes(finding.id))
      .filter((finding) => {
        const severity = finding.severity || finding.normalized_severity || "low";
        return ["critical", "high"].includes(severity) || findings.length <= 40;
      }),
    [findings, scheduledIds]
  );

  async function onDragEnd(result) {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const target = destination.droppableId;
    const finding = findingById[draggableId];
    const existing = schedule.find((item) => item.finding_id === draggableId);
    setMessage(null);

    setSchedule((prev) => {
      const without = prev.filter((item) => item.finding_id !== draggableId);
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
          week_number: isoWeekNumber(new Date(`${target}T12:00:00`)),
        });
        setSchedule((prev) => prev.map((item) => (item.finding_id === draggableId && !item.id ? { ...item, id: created.id } : item)));
      }
    } catch (error) {
      setMessage(`Could not save the placement: ${error.message}`);
      const rows = await base44.entities.FixScheduleItem.list("-created_date", 400).catch(() => []);
      setSchedule(rows || []);
    }
  }

  function shiftMonth(step) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + step, 1));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-3" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CalendarDays size={22} className="text-blue-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">FIX-014 | FIX CALENDAR</span>
            <h1 className="text-xl font-bold text-white mt-1">Fix calendar</h1>
            <p className="text-xs text-slate-500">Drag a finding onto a day to schedule it; click a scheduled fix for its remediation plan.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/fix-planner" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">
            <LayoutGrid size={12} /> Weekly board
          </Link>
          <button onClick={() => setCursor(new Date())} className="px-3 py-2 rounded-lg text-[11px] font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">Today</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="p-1.5 rounded-lg bg-white/5 border border-slate-700 text-slate-300 hover:bg-white/10"><ChevronLeft size={14} /></button>
        <p className="text-sm font-bold text-white w-40 text-center">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</p>
        <button onClick={() => shiftMonth(1)} aria-label="Next month" className="p-1.5 rounded-lg bg-white/5 border border-slate-700 text-slate-300 hover:bg-white/10"><ChevronRight size={14} /></button>
        <span className="text-[10px] text-slate-500 ml-auto">{schedule.length} fix(es) scheduled</span>
      </div>

      {message && <p className="text-[11px] text-red-400">{message}</p>}

      <SlaCalendarSyncPanel />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="backlog">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="rounded-xl p-2 max-h-[360px] lg:max-h-[560px] overflow-y-auto"
                style={{ background: "#111827", border: `1px solid ${snapshot.isDraggingOver ? "#3b82f6" : "#1F2937"}` }}
              >
                <p className="text-[11px] font-bold text-white px-1">Unscheduled</p>
                <p className="text-[9px] text-slate-500 px-1 mb-1.5">{backlog.length} finding(s) · drag onto a day</p>
                {backlog.map((finding, index) => {
                  const severity = finding.severity || finding.normalized_severity || "info";
                  return (
                    <Draggable draggableId={finding.id} index={index} key={finding.id}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => setSelected(finding)}
                          style={{ ...dragProvided.draggableProps.style, background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: `3px solid ${SEV_COLOR[severity] || SEV_COLOR.info}` }}
                          className="rounded-lg p-1.5 mb-1 cursor-pointer"
                        >
                          <div className="flex items-start gap-1">
                            <GripVertical size={9} className="text-slate-600 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-white leading-tight line-clamp-2">{finding.title}</p>
                          </div>
                          <p className="text-[8px] text-slate-500 truncate pl-2.5">{finding.asset_name}</p>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
                {backlog.length === 0 && <p className="text-[10px] text-slate-600 px-1 py-3">Everything is scheduled.</p>}
              </div>
            )}
          </Droppable>

          <div className="space-y-3 min-w-0">
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                <FixCalendarGrid
                  days={days}
                  findingsByDay={findingsByDay}
                  onDragEnd={onDragEnd}
                  onSelect={setSelected}
                  selectedId={selected?.id}
                />
              </div>
            </div>

            {selected && (
              <FixDetailPanel finding={selected} assets={assets} links={links} onClose={() => setSelected(null)} />
            )}
          </div>
        </DragDropContext>
      </div>

      <p className="text-[10px] text-slate-600">
        Placements use the same schedule as the weekly planning board, so a fix dropped on a day appears in that week's column too.
      </p>
    </div>
  );
}