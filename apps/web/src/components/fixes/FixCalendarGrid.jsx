import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };

export default function FixCalendarGrid({ days, findingsByDay, onDragEnd, onSelect, selectedId }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="grid grid-cols-7 text-center" style={{ borderBottom: "1px solid #1F2937" }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <p key={label} className="text-[9px] font-bold uppercase text-slate-500 py-1.5">{label}</p>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const items = findingsByDay.get(day.key) || [];
            return (
              <Droppable droppableId={day.key} key={day.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="min-h-[92px] p-1 border-r border-b border-slate-800/60"
                    style={{
                      background: !day.inMonth ? "#0b1120" : snapshot.isDraggingOver ? "rgba(59,130,246,0.12)" : "#0a0f1e",
                    }}
                  >
                    <div className="flex items-center justify-between px-0.5 mb-0.5">
                      <span className={`text-[9px] font-mono ${day.isToday ? "text-blue-400 font-bold" : day.inMonth ? "text-slate-500" : "text-slate-700"}`}>{day.dayNumber}</span>
                      {items.length > 0 && <span className="text-[8px] text-slate-500">{items.length}</span>}
                    </div>
                    {items.map((finding, index) => {
                      const severity = finding.severity || finding.normalized_severity || "info";
                      return (
                        <Draggable draggableId={finding.id} index={index} key={finding.id}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              onClick={() => onSelect(finding)}
                              style={{
                                ...dragProvided.draggableProps.style,
                                background: "#111827",
                                border: selectedId === finding.id ? "1px solid #3b82f6" : "1px solid #1F2937",
                                borderLeft: `2px solid ${SEV_COLOR[severity] || SEV_COLOR.info}`,
                              }}
                              className="rounded px-1 py-0.5 mb-0.5 cursor-pointer"
                              title={finding.title}
                            >
                              <div className="flex items-start gap-0.5">
                                <GripVertical size={8} className="text-slate-600 mt-0.5 flex-shrink-0" />
                                <p className="text-[8px] leading-tight text-slate-200 line-clamp-2">{finding.finding_title || finding.title}</p>
                              </div>
                              <p className="text-[7px] text-slate-500 truncate pl-2.5">{finding.asset_name || "asset —"}</p>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}