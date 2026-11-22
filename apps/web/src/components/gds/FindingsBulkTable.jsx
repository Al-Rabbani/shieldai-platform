import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckSquare, Square, UserCheck, CheckCircle, EyeOff, X, ChevronDown } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, SevBadge, StatusBadge } from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";

const STATUSES = ["open", "in_remediation", "resolved", "accepted_risk"];
const ASSIGNEES = ["security-team", "dev-team", "infra-team", "unassigned"];

function BulkBar({ count, onStatus, onAssign, onClear, loading }) {
  const [showStatus, setShowStatus] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap" style={{ background: `${CYAN}08`, borderBottom: `1px solid ${CYAN}25` }}>
      <CheckSquare className="w-4 h-4 flex-shrink-0" style={{ color: CYAN }} />
      <span className="text-sm font-bold mr-1" style={{ color: CYAN }}>{count} selected</span>

      {/* Quick action buttons */}
      <button onClick={() => onStatus("resolved")} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
        <CheckCircle className="w-3.5 h-3.5" /> Resolve
      </button>

      <button onClick={() => onStatus("accepted_risk")} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: `${MUTED}15`, border: `1px solid ${MUTED}40`, color: MUTED }}>
        <EyeOff className="w-3.5 h-3.5" /> Ignore
      </button>

      {/* Status dropdown */}
      <div className="relative">
        <button onClick={() => { setShowStatus(s => !s); setShowAssign(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: TEXT }}>
          Set Status <ChevronDown className="w-3 h-3" />
        </button>
        {showStatus && (
          <div className="absolute top-full mt-1 left-0 rounded-xl z-20 overflow-hidden min-w-[140px]"
            style={{ background: "#0a1628", border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => { onStatus(s); setShowStatus(false); }}
                className="w-full text-left px-3 py-2 text-xs capitalize hover:bg-white/10 transition-colors"
                style={{ color: TEXT }}>
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Assign dropdown */}
      <div className="relative">
        <button onClick={() => { setShowAssign(s => !s); setShowStatus(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <UserCheck className="w-3.5 h-3.5" /> Assign <ChevronDown className="w-3 h-3" />
        </button>
        {showAssign && (
          <div className="absolute top-full mt-1 left-0 rounded-xl z-20 overflow-hidden min-w-[140px]"
            style={{ background: "#0a1628", border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
            {ASSIGNEES.map(a => (
              <button key={a} onClick={() => { onAssign(a); setShowAssign(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors"
                style={{ color: TEXT }}>
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={onClear} className="ml-auto flex items-center gap-1 text-xs hover:opacity-80 transition-opacity" style={{ color: MUTED }}>
        <X className="w-3.5 h-3.5" /> Clear
      </button>
    </div>
  );
}

export default function FindingsBulkTable({
  findings = [],
  isLoading = false,
  queryKey,
  entityName = "TriagedFinding",
  columns = [],   // [{ key, label, render }]
  emptyIcon,
  emptyTitle = "No findings",
  emptyDesc = "",
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [sevFilter, setSevFilter] = useState("all");

  const filtered = useMemo(() =>
    sevFilter === "all" ? findings : findings.filter(f => (f.severity || f.normalized_severity) === sevFilter),
    [findings, sevFilter]
  );

  const entity = base44.entities[entityName];

  const bulkMutation = useMutation({
    mutationFn: (update) => Promise.all([...selected].map(id => entity.update(id, update))),
    onSuccess: () => { qc.invalidateQueries([queryKey]); setSelected(new Set()); },
  });

  const toggleAll = () =>
    selected.size === filtered.length
      ? setSelected(new Set())
      : setSelected(new Set(filtered.map(f => f.id)));

  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <SevFilterBar value={sevFilter} onChange={setSevFilter} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        {/* Bulk action bar — shown when items selected */}
        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            loading={bulkMutation.isPending}
            onStatus={(s) => bulkMutation.mutate({ status: s })}
            onAssign={(a) => bulkMutation.mutate({ assignee: a })}
            onClear={() => setSelected(new Set())}
          />
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                <th className="px-4 py-3 w-8">
                  <input type="checkbox"
                    className="w-3.5 h-3.5 cursor-pointer accent-cyan-400"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                  />
                </th>
                {columns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    {[...Array(columns.length + 1)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: "rgba(0,212,255,0.06)", width: j === 0 ? 16 : "80%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-sm" style={{ color: MUTED }}>
                    {emptyTitle}
                  </td>
                </tr>
              ) : filtered.map((row, i) => {
                const isSelected = selected.has(row.id);
                return (
                  <tr key={row.id || i}
                    style={{
                      borderBottom: `1px solid ${BORDER}20`,
                      background: isSelected ? "rgba(0,212,255,0.05)" : i % 2 === 0 ? CARD : "#050e1f",
                    }}>
                    <td className="px-4 py-3" onClick={() => toggleOne(row.id)}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(row.id)}
                        className="w-3.5 h-3.5 cursor-pointer accent-cyan-400" />
                    </td>
                    {columns.map(col => (
                      <td key={col.key} className="px-4 py-3">
                        {col.render ? col.render(row) : <span className="text-xs" style={{ color: TEXT }}>{row[col.key] ?? "—"}</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}