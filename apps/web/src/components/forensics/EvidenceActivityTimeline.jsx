import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { History } from "lucide-react";
import { actionStyle } from "@/components/forensics/evidenceActionStyles";
import EvidenceTimelineFilters, { EMPTY_EVIDENCE_FILTERS, actionOptionsFromRows } from "@/components/forensics/EvidenceTimelineFilters";

const PAGE_SIZE = 200;

function dayLabel(iso) {
  if (!iso) return "Unrecorded date";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function EvidenceActivityTimeline() {
  const [rows, setRows] = useState([]);
  const [optionSource, setOptionSource] = useState([]);
  const [filters, setFilters] = useState(EMPTY_EVIDENCE_FILTERS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const query = {};
    if (filters.from) query.occurred_at = { ...(query.occurred_at || {}), $gte: new Date(`${filters.from}T00:00:00`).toISOString() };
    if (filters.to) query.occurred_at = { ...(query.occurred_at || {}), $lte: new Date(`${filters.to}T23:59:59`).toISOString() };
    if (filters.action !== "all") query.action = filters.action;
    if (filters.actor !== "all") query.actor = filters.actor;
    if (filters.agentId !== "all") query.agent_id = filters.agentId;
    if (filters.incidentType !== "all") query.incident_type = filters.incidentType;

    const data = Object.keys(query).length
      ? await base44.entities.EvidenceActivity.filter(query, "-occurred_at", PAGE_SIZE + 200)
      : await base44.entities.EvidenceActivity.list("-occurred_at", PAGE_SIZE);

    setRows(data || []);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    base44.entities.EvidenceActivity.list("-occurred_at", 500)
      .then((all) => setOptionSource(all || []))
      .catch(() => setOptionSource([]));
  }, []);

  const actorOptions = useMemo(() => [...new Set(optionSource.map((row) => row.actor).filter(Boolean))].sort(), [optionSource]);
  const agentOptions = useMemo(() => [...new Set(optionSource.map((row) => row.agent_id).filter(Boolean))].sort(), [optionSource]);
  const incidentOptions = useMemo(() => [...new Set(optionSource.map((row) => row.incident_type).filter(Boolean))].sort(), [optionSource]);
  const actionOptions = useMemo(() => actionOptionsFromRows(optionSource), [optionSource]);

  const activeCount = Object.entries(filters).filter(([, value]) => value && value !== "all").length;

  const grouped = useMemo(() => {
    const groups = [];
    rows.forEach((row) => {
      const label = dayLabel(row.occurred_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.rows.push(row);
      else groups.push({ label, rows: [row] });
    });
    return groups;
  }, [rows]);

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <History size={16} className="text-slate-400" />
        <h2 className="text-sm font-bold text-white">Chain-of-custody activity</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
          {loading ? "loading…" : `${rows.length} event${rows.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <EvidenceTimelineFilters
        filters={filters}
        setFilters={setFilters}
        actionOptions={actionOptions}
        actorOptions={actorOptions}
        agentOptions={agentOptions}
        incidentOptions={incidentOptions}
        activeCount={activeCount}
      />

      {rows.length === 0 && !loading ? (
        <div className="text-center py-8">
          <p className="text-xs text-slate-500">
            {activeCount > 0
              ? "No activity matches these filters."
              : "No activity recorded yet. Collecting, opening, verifying or exporting evidence records events here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{group.label}</p>
              <ol className="relative pl-6 space-y-3">
                <span className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-800" aria-hidden="true" />
                {group.rows.map((row) => {
                  const style = actionStyle(row.action);
                  return (
                    <li key={row.id} className="relative">
                      <span className="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: style.dot, background: "#0f172a" }} />
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`text-[11px] font-bold ${style.className}`}>{style.label}</span>
                        <span className="text-[11px] font-mono text-slate-400">{row.evidence_id || "vault-wide"}</span>
                        {row.evidence_title && <span className="text-[11px] text-slate-300 truncate max-w-[220px]">{row.evidence_title}</span>}
                        <span className="text-[10px] text-slate-600 ml-auto">{row.occurred_at ? new Date(row.occurred_at).toLocaleTimeString("en-GB") : "—"}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                        <span>By {row.actor || "not recorded"}</span>
                        <span>· {row.actor_type || "human"}</span>
                        {row.agent_id && <span>· Agent {row.agent_id}{row.agent_type ? ` (${row.agent_type})` : ""}</span>}
                        {row.incident_type && <span>· {row.incident_type.replace(/_/g, " ")}</span>}
                      </div>
                      {row.detail && <p className="text-[11px] text-slate-400 mt-1">{row.detail}</p>}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}