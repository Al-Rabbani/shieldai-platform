import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const COLUMNS = [
  { key: "open", label: "Open" },
  { key: "in_remediation", label: "In Remediation" },
  { key: "fixed", label: "Fixed" },
  { key: "accepted_risk", label: "Accepted Risk" },
  { key: "false_positive", label: "False Positive" },
];

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400", info: "bg-slate-500/20 text-slate-400" };

export default function VulnKanbanBoard({ findings, selectedIds, onToggleSelect, onStatusChange }) {
  function onDragEnd(result) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    if (newStatus === result.source.droppableId) return;
    onStatusChange(result.draggableId, newStatus);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-5 gap-3 items-start">
        {COLUMNS.map(col => {
          const items = findings.filter(f => f.status === col.key);
          return (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef} {...provided.droppableProps}
                  className="rounded-xl p-2 min-h-[200px] space-y-2"
                  style={{ background: snapshot.isDraggingOver ? "#16233a" : "#0d1117", border: "1px solid #1F2937" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pb-1">{col.label} <span className="text-slate-600">({items.length})</span></p>
                  {items.map((f, idx) => (
                    <Draggable draggableId={f.id} index={idx} key={f.id}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}
                          className="rounded-lg p-2.5"
                          style={{ background: "#111827", border: selectedIds.includes(f.id) ? "1px solid #3b82f6" : "1px solid #1F2937", opacity: dragSnapshot.isDragging ? 0.85 : 1, ...dragProvided.draggableProps.style }}
                        >
                          <div className="flex items-start gap-2">
                            <input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => onToggleSelect(f.id)} className="mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white truncate">{f.title}</p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${SEV_COLOR[f.severity] || SEV_COLOR.info}`}>{f.severity}</span>
                                {f.cvss_score != null && <span className="text-[9px] text-slate-500">CVSS {f.cvss_score}</span>}
                              </div>
                              <p className="text-[10px] text-slate-600 truncate mt-1">{f.asset_name}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}