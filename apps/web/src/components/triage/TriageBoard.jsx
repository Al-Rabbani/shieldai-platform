import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Bot } from "lucide-react";

const COLUMNS = [
  { key: "open", label: "Open", color: "#ef4444" },
  { key: "in_remediation", label: "In remediation", color: "#f59e0b" },
  { key: "fixed", label: "Resolved", color: "#10b981" },
];

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };

export default function TriageBoard({ findings, agents, savingId, onUpdate }) {
  const agentName = (finding) => {
    const key = finding.assigned_agent_id || finding.assigned_to;
    if (!key) return "Unassigned";
    const match = agents.find((a) => a.display_name === key || a.name === key || a.canonical_agent_id === key || a.id === key);
    return match ? match.display_name || match.name : key;
  };

  function onDragEnd(result) {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const status = destination.droppableId;
    const patch = { status };
    if (status === "fixed") patch.fixed_at = new Date().toISOString();
    onUpdate(draggableId, patch);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {COLUMNS.map((column) => {
          const items = findings.filter((f) => (f.status || "open") === column.key);
          return (
            <Droppable droppableId={column.key} key={column.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="min-w-[240px] w-[240px] flex-shrink-0 rounded-xl p-2"
                  style={{
                    background: "#111827",
                    border: `1px solid ${snapshot.isDraggingOver ? column.color : "#1F2937"}`,
                    maxHeight: "62vh",
                    overflowY: "auto",
                  }}
                >
                  <div className="mb-2 px-1 flex items-center justify-between">
                    <p className="text-xs font-bold text-white" style={{ color: column.color }}>{column.label}</p>
                    <span className="text-[10px] font-mono text-slate-500">{items.length}</span>
                  </div>

                  {items.map((finding, index) => (
                    <Draggable draggableId={finding.id} index={index} key={finding.id}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          style={{
                            ...dragProvided.draggableProps.style,
                            background: "#0a0f1e",
                            border: "1px solid #1F2937",
                            borderLeft: `3px solid ${SEV_COLOR[finding.severity] || SEV_COLOR.info}`,
                            opacity: savingId === finding.id ? 0.6 : 1,
                          }}
                          className="rounded-lg p-2 mb-1.5"
                        >
                          <div className="flex items-start gap-1">
                            <GripVertical size={11} className="text-slate-600 mt-0.5 flex-shrink-0" />
                            <p className="text-[11px] text-white leading-snug flex-1 min-w-0 break-words">{finding.title}</p>
                          </div>
                          <p className="text-[9px] text-slate-500 truncate mt-1 pl-3">{finding.asset_name || "no asset"}</p>
                          <div className="flex items-center justify-between gap-1 mt-1 pl-3">
                            <span className="text-[9px] font-bold uppercase" style={{ color: SEV_COLOR[finding.severity] || SEV_COLOR.info }}>
                              {finding.severity || "—"}
                            </span>
                            <span className="flex items-center gap-0.5 text-[9px] text-slate-400 truncate max-w-[110px]">
                              <Bot size={9} /> {agentName(finding)}
                            </span>
                          </div>
                          {(finding.labels || []).length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1 pl-3">
                              {finding.labels.slice(0, 3).map((label) => (
                                <span key={label} className="text-[8px] px-1 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">{label}</span>
                              ))}
                              {finding.labels.length > 3 && (
                                <span className="text-[8px] text-slate-500">+{finding.labels.length - 3}</span>
                              )}
                            </div>
                          )}
                          {finding.next_action_item && (
                            <p className="text-[9px] text-blue-300/80 mt-1 pl-3 line-clamp-2">{finding.next_action_item}</p>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {items.length === 0 && <p className="text-[10px] text-slate-600 px-1 py-2">Drop findings here</p>}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}