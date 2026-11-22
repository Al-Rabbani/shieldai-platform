import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ListFilter, RefreshCw, Inbox, Bot, CalendarClock, Target, LayoutGrid, List, Radio, CheckCircle2, X } from "lucide-react";
import TriageRow from "@/components/triage/TriageRow";
import TriageBoard from "@/components/triage/TriageBoard";
import TriageBulkBar from "@/components/triage/TriageBulkBar";
import { Checkbox } from "@/components/ui/checkbox";
import { pushLinearStates } from "@/lib/linearSync";
import { findingMatchesSegment } from "@/lib/cloudVulnClusters";

const SEVERITIES = ["all", "critical", "high", "medium", "low", "info"];

export default function TriageQueuePage() {
  const [findings, setFindings] = useState([]);
  const [agents, setAgents] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("all");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [view, setView] = useState("list");
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const [assetGroup, setAssetGroup] = useState("");
  const [vulnType, setVulnType] = useState("");
  // Arriving from a heatmap bubble: keep only that provider × asset-type segment.
  const [segment, setSegment] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("provider");
    const type = params.get("type");
    if (!provider || !type) return null;
    return { provider, type, label: params.get("label") || `${provider} · ${type}` };
  });

  function clearSegment() {
    setSegment(null);
    const url = new URL(window.location.href);
    ["provider", "type", "label"].forEach((key) => url.searchParams.delete(key));
    window.history.replaceState({}, "", url);
  }

  function isSnoozed(finding) {
    return Boolean(finding.snoozed_until) && new Date(finding.snoozed_until) > new Date();
  }

  const load = useCallback(async () => {
    setLoading(true);
    const [rows, agentRows, strategyRows, templateRows] = await Promise.all([
      base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 200).catch(() => []),
      base44.entities.Agent.list("-executions_total", 200).catch(() => []),
      base44.entities.FixStrategy.filter({ is_published: true }, "-times_reused", 100).catch(() => []),
      base44.entities.RemediationTemplate.filter({ is_active: true }, "-usage_count", 100).catch(() => []),
    ]);
    setFindings(rows);
    setAgents(agentRows.filter((agent) => agent.status !== "archived"));
    setStrategies(strategyRows || []);
    setTemplates(templateRows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live queue: new findings and status changes stream in as agents work.
  useEffect(() => {
    const unsubscribe = base44.entities.TriagedFinding.subscribe((event) => {
      const record = event.data || {};
      const isQueued = ["open", "in_remediation"].includes(record.status || "open");
      if (event.type === "create" && isQueued) {
        setFindings((prev) => (prev.some((f) => f.id === record.id) ? prev : [record, ...prev]));
      } else if (event.type === "update") {
        setFindings((prev) =>
          isQueued
            ? prev.map((f) => (f.id === record.id ? { ...f, ...record } : f))
            : prev.filter((f) => f.id !== record.id)
        );
      } else if (event.type === "delete") {
        setFindings((prev) => prev.filter((f) => f.id !== record.id));
      }

      if (event.type === "create" || event.type === "update") {
        const agent = record.assigned_to || record.assigned_agent_id;
        setEvents((prev) => [
          {
            id: `${event.id || record.id}-${Date.now()}`,
            severity: record.severity || "info",
            text:
              event.type === "create"
                ? `New finding: ${record.title || "untitled"}${agent ? ` → ${agent}` : " · unassigned"}`
                : `${record.title || "finding"} → ${(record.status || "updated").replace(/_/g, " ")}${agent ? ` · ${agent}` : ""}`,
          },
          ...prev,
        ].slice(0, 5));
      }
    });
    return unsubscribe;
  }, []);

  async function updateFinding(id, patch) {
    setSavingId(id);
    try {
      await base44.entities.TriagedFinding.update(id, patch);
      setFindings((prev) => prev.map((finding) => (finding.id === id ? { ...finding, ...patch } : finding)));
      // Status changes made here carry the signing-in engineer's Linear connection.
      if (["in_remediation", "fixed", "accepted_risk", "false_positive"].includes(patch.status)) {
        pushLinearStates([id]);
      }
    } finally {
      setSavingId(null);
    }
  }

  async function bulkAssign(agentId) {
    const agent = agents.find((item) => item.id === agentId);
    if (!agent || selected.length === 0) return;
    setBulkBusy(true);
    const name = agent.display_name || agent.name;
    const now = new Date().toISOString();
    try {
      await base44.entities.TriagedFinding.bulkUpdate(
        selected.map((id) => {
          const finding = findings.find((f) => f.id === id);
          return {
            id,
            assigned_agent_id: agent.id,
            assigned_to: name,
            status: finding?.status === "open" ? "in_remediation" : finding?.status,
            remediation_started_at: finding?.remediation_started_at || now,
          };
        })
      );
      setFindings((prev) =>
        prev.map((finding) =>
          selected.includes(finding.id)
            ? {
                ...finding,
                assigned_agent_id: agent.id,
                assigned_to: name,
                status: finding.status === "open" ? "in_remediation" : finding.status,
                remediation_started_at: finding.remediation_started_at || now,
              }
            : finding
        )
      );
      setSelected([]);
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkStatus(status) {
    if (!status || selected.length === 0) return;
    setBulkBusy(true);
    const patch = status === "fixed" ? { status, fixed_at: new Date().toISOString() } : { status };
    const ids = [...selected];
    try {
      await base44.entities.TriagedFinding.bulkUpdate(ids.map((id) => ({ id, ...patch })));
      setFindings((prev) => prev.map((finding) => (selected.includes(finding.id) ? { ...finding, ...patch } : finding)));
      setSelected([]);
    } finally {
      setBulkBusy(false);
    }
    // Bulk writes skip per-record triggers, so push the resolved / accepted-risk
    // status onto any linked Linear ticket here.
    if (status === "fixed" || status === "accepted_risk") {
      for (const id of ids) {
        await base44.functions.invoke("gdsLinearSync", { action: "push_state", finding_id: id }).catch(() => null);
      }
    }
  }

  async function bulkApplyStrategy(strategyId) {
    const strategy = strategies.find((item) => item.id === strategyId);
    if (!strategy || selected.length === 0) return;
    setBulkBusy(true);
    const now = new Date().toISOString();
    const notes = [strategy.title, strategy.remediation_steps].filter(Boolean).join("\n");
    try {
      const updates = selected.map((id) => {
        const finding = findings.find((item) => item.id === id);
        return {
          id,
          status: "in_remediation",
          remediation_notes: notes,
          ...(finding?.remediation_started_at ? {} : { remediation_started_at: now }),
        };
      });
      await base44.entities.TriagedFinding.bulkUpdate(updates);
      setFindings((prev) => prev.map((finding) => {
        const patch = updates.find((update) => update.id === finding.id);
        return patch ? { ...finding, ...patch } : finding;
      }));
      await base44.entities.FixStrategy.update(strategy.id, { times_reused: (strategy.times_reused || 0) + selected.length });
      setStrategies((prev) => prev.map((item) => (item.id === strategy.id ? { ...item, times_reused: (item.times_reused || 0) + selected.length } : item)));
    } finally {
      setBulkBusy(false);
    }
  }

  // Pre-approved remediation templates attach their steps and start remediation in one click.
  async function bulkApplyTemplate(templateId) {
    const template = templates.find((item) => item.id === templateId);
    if (!template || selected.length === 0) return;
    setBulkBusy(true);
    const now = new Date().toISOString();
    const notes = [template.template_name, template.remediation_steps].filter(Boolean).join("\n\n");
    try {
      const updates = selected.map((id) => {
        const finding = findings.find((item) => item.id === id);
        return {
          id,
          status: "in_remediation",
          remediation_notes: notes,
          ...(finding?.remediation_started_at ? {} : { remediation_started_at: now }),
        };
      });
      await base44.entities.TriagedFinding.bulkUpdate(updates);
      setFindings((prev) => prev.map((finding) => {
        const patch = updates.find((update) => update.id === finding.id);
        return patch ? { ...finding, ...patch } : finding;
      }));
      await base44.entities.RemediationTemplate.update(template.id, { usage_count: (template.usage_count || 0) + selected.length });
      setTemplates((prev) => prev.map((item) => (item.id === template.id ? { ...item, usage_count: (item.usage_count || 0) + selected.length } : item)));
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkSnooze() {
    if (selected.length === 0) return;
    setBulkBusy(true);
    const snoozed_until = new Date(Date.now() + 7 * 86400000).toISOString();
    try {
      await base44.entities.TriagedFinding.bulkUpdate(selected.map((id) => ({ id, snoozed_until })));
      setFindings((prev) => prev.map((finding) => (selected.includes(finding.id) ? { ...finding, snoozed_until } : finding)));
      setSelected([]);
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkLabel(label) {
    const clean = String(label || "").trim();
    if (!clean || selected.length === 0) return;
    setBulkBusy(true);
    try {
      const updates = selected.map((id) => {
        const finding = findings.find((item) => item.id === id);
        return { id, labels: [...new Set([...(finding?.labels || []), clean])] };
      });
      await base44.entities.TriagedFinding.bulkUpdate(updates);
      setFindings((prev) =>
        prev.map((finding) => {
          const patch = updates.find((update) => update.id === finding.id);
          return patch ? { ...finding, labels: patch.labels } : finding;
        })
      );
      setEvents((prev) => [
        { id: `label-${Date.now()}`, severity: "info", text: `${clean} added to ${selected.length} finding(s)` },
        ...prev,
      ].slice(0, 5));
    } finally {
      setBulkBusy(false);
    }
  }

  async function resolveCategory(category) {
    if (!category) return;
    if (!window.confirm(`Mark every open finding in ${category} as resolved?`)) return;
    setBulkBusy(true);
    const patch = { status: "fixed", fixed_at: new Date().toISOString() };
    try {
      await base44.entities.TriagedFinding.updateMany(
        { owner_team: category, status: { $in: ["open", "in_remediation"] } },
        { $set: patch }
      );
      setFindings((prev) =>
        prev.map((finding) =>
          finding.owner_team === category && ["open", "in_remediation"].includes(finding.status)
            ? { ...finding, ...patch }
            : finding
        )
      );
      setSelected([]);
      setEvents((prev) => [
        { id: `bulk-${Date.now()}`, severity: "info", text: `Every open finding in ${category} marked resolved` },
        ...prev,
      ].slice(0, 5));
    } finally {
      setBulkBusy(false);
    }
  }

  function selectWhere(predicate) {
    setSelected(findings.filter((finding) => !isSnoozed(finding)).filter(predicate).map((finding) => finding.id));
  }

  const labelOptions = useMemo(
    () => [...new Set(findings.flatMap((finding) => finding.labels || []))].sort(),
    [findings]
  );

  const ownerTeams = useMemo(
    () => [...new Set(findings.map((finding) => finding.owner_team).filter(Boolean))].sort(),
    [findings]
  );

  // Vulnerabilities of the same type: their CWE class, falling back to the asset type.
  const vulnTypes = useMemo(
    () => [...new Set(findings.map((finding) => finding.cwe_id || finding.asset_type).filter(Boolean))].sort(),
    [findings]
  );

  // Library fixes that match the selected findings' vulnerability type are listed first.
  const selectedTypes = useMemo(
    () =>
      new Set(
        findings
          .filter((finding) => selected.includes(finding.id))
          .map((finding) => (finding.cwe_id || finding.asset_type || "").toLowerCase())
          .filter(Boolean)
      ),
    [findings, selected]
  );

  const orderedStrategies = useMemo(() => {
    if (selectedTypes.size === 0) return strategies;
    const relevance = (strategy) => {
      const type = (strategy.vulnerability_type || "").toLowerCase();
      const tags = (strategy.tags || []).map((tag) => tag.toLowerCase());
      if (!type) return 0;
      const typeMatch = [...selectedTypes].some((selectedType) => type.includes(selectedType) || selectedType.includes(type));
      const tagMatch = tags.some((tag) => selectedTypes.has(tag));
      return typeMatch || tagMatch ? 1 : 0;
    };
    return [...strategies].sort((a, b) => relevance(b) - relevance(a));
  }, [strategies, selectedTypes]);

  const visible = useMemo(() => findings.filter((finding) => {
    if (!showSnoozed && isSnoozed(finding)) return false;
    if (segment && !findingMatchesSegment(finding, segment)) return false;
    if (severity !== "all" && finding.severity !== severity) return false;
    if (unassignedOnly && (finding.assigned_to || finding.assigned_agent_id)) return false;
    if (search) {
      const needle = search.toLowerCase();
      const haystack = `${finding.title || ""} ${finding.asset_name || ""} ${finding.cve_id || ""}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }), [findings, severity, unassignedOnly, search, showSnoozed, segment]);

  const snoozedCount = findings.filter(isSnoozed).length;

  const counts = {
    total: findings.length,
    unassigned: findings.filter((finding) => !finding.assigned_to && !finding.assigned_agent_id).length,
    working: findings.filter((finding) => finding.status === "in_remediation").length,
    withAction: findings.filter((finding) => finding.next_action_item).length,
  };

  return (
    <div className="space-y-4" style={{ background: "#0a0f1e", minHeight: "100vh" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Inbox size={22} className="text-blue-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">TRQ-003 | TRIAGE</span>
            <h1 className="text-xl font-bold text-white mt-1">Triage queue</h1>
            <p className="text-xs text-slate-500">Assign new findings to agents and set the next action before planning.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/fix-planner" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition">
            <CalendarClock size={13} /> Planning board
          </Link>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "In queue", value: counts.total, color: "#3b82f6" },
          { label: "Unassigned", value: counts.unassigned, color: "#f59e0b" },
          { label: "In remediation", value: counts.working, color: "#a855f7" },
          { label: "With next action", value: counts.withAction, color: "#22c55e" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${tile.color}` }}>
            <p className="text-xl font-bold text-white">{tile.value}</p>
            <p className="text-[10px] text-slate-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3 flex flex-wrap items-center gap-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <ListFilter size={14} className="text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, asset or CVE…"
          className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
        />
        {segment && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/40">
            Segment: {segment.label} · {visible.length}
            <button onClick={clearSegment} className="hover:text-white" aria-label="Clear segment filter">
              <X size={10} />
            </button>
          </span>
        )}
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="px-2 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none">
          {SEVERITIES.map((level) => <option key={level} value={level}>{level === "all" ? "All severities" : level}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} className="accent-blue-500" />
          Unassigned only
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Checkbox
            checked={visible.length > 0 && visible.every((finding) => selected.includes(finding.id))}
            onCheckedChange={() => {
              const allSelected = visible.length > 0 && visible.every((finding) => selected.includes(finding.id));
              setSelected(allSelected ? [] : visible.map((finding) => finding.id));
            }}
            aria-label="Select all listed findings"
          />
          Select all
        </label>
        <div className="flex items-center gap-1 ml-auto rounded-lg p-0.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <button onClick={() => setView("list")} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition ${view === "list" ? "bg-blue-500/25 text-blue-300" : "text-slate-400"}`}>
            <List size={11} /> List
          </button>
          <button onClick={() => setView("board")} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition ${view === "board" ? "bg-blue-500/25 text-blue-300" : "text-slate-400"}`}>
            <LayoutGrid size={11} /> Board
          </button>
        </div>
      </div>

      <div className="rounded-xl p-2 flex flex-wrap items-center gap-1.5" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1">Quick select</span>
        <button onClick={() => selectWhere((finding) => (finding.severity || finding.normalized_severity) === "critical")} className="px-2 py-1 rounded text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25">
          All critical
        </button>
        <button onClick={() => selectWhere((finding) => (finding.severity || finding.normalized_severity) === "high")} className="px-2 py-1 rounded text-[10px] font-bold bg-orange-500/15 text-orange-300 border border-orange-500/40 hover:bg-orange-500/25">
          All high
        </button>
        <button onClick={() => selectWhere((finding) => !finding.assigned_to && !finding.assigned_agent_id)} className="px-2 py-1 rounded text-[10px] font-bold bg-slate-700/40 text-slate-300 border border-slate-600 hover:bg-slate-700/60">
          All unassigned
        </button>
        <select value={assetGroup} onChange={(e) => setAssetGroup(e.target.value)} className="px-2 py-1 rounded text-[10px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none" aria-label="Asset group">
          <option value="">Asset group…</option>
          {ownerTeams.map((team) => <option key={team} value={team}>{team}</option>)}
        </select>
        <button
          onClick={() => selectWhere((finding) => finding.owner_team === assetGroup)}
          disabled={!assetGroup}
          className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/40 hover:bg-blue-500/25 disabled:opacity-40"
        >
          Select group
        </button>
        <select value={vulnType} onChange={(e) => setVulnType(e.target.value)} className="px-2 py-1 rounded text-[10px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none" aria-label="Vulnerability type">
          <option value="">Vulnerability type…</option>
          {vulnTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <button
          onClick={() => selectWhere((finding) => (finding.cwe_id || finding.asset_type) === vulnType)}
          disabled={!vulnType}
          className="px-2 py-1 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/40 hover:bg-purple-500/25 disabled:opacity-40"
        >
          Select same type
        </button>
        <button
          onClick={() => resolveCategory(assetGroup)}
          disabled={!assetGroup || bulkBusy}
          title="Mark every open finding in the chosen category as fixed, not just the selected page"
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 disabled:opacity-40"
        >
          <CheckCircle2 size={10} /> Resolve all in category
        </button>
        {snoozedCount > 0 && (
          <button
            onClick={() => setShowSnoozed((current) => !current)}
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25"
          >
            <CalendarClock size={10} /> {snoozedCount} snoozed · {showSnoozed ? "showing" : "hidden"}
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <TriageBulkBar
          count={selected.length}
          agents={agents}
          strategies={orderedStrategies}
          templates={templates}
          labelOptions={labelOptions}
          busy={bulkBusy}
          onAssign={bulkAssign}
          onStatus={bulkStatus}
          onApplyStrategy={bulkApplyStrategy}
          onApplyTemplate={bulkApplyTemplate}
          onLabel={bulkLabel}
          onResolve={() => bulkStatus("fixed")}
          onSnooze={bulkSnooze}
          onClear={() => setSelected([])}
        />
      )}

      <div className="rounded-xl px-3 py-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
          <Radio size={11} className="animate-pulse" /> Live queue
        </p>
        {events.length === 0 ? (
          <p className="text-[10px] text-slate-600">Watching for new findings and agent updates.</p>
        ) : (
          <div className="space-y-0.5">
            {events.map((event) => (
              <p key={event.id} className="text-[10px] text-slate-300 truncate">
                <span className="font-bold uppercase mr-1.5" style={{ color: event.severity === "critical" ? "#ef4444" : event.severity === "high" ? "#f97316" : "#64748b" }}>
                  {event.severity}
                </span>
                {event.text}
              </p>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-16" />
      ) : visible.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <Target size={22} className="mx-auto text-slate-600 mb-2" />
          <p className="text-xs text-slate-500">No findings match these filters.</p>
          {segment && (
            <button onClick={clearSegment} className="mt-2 text-[10px] font-bold text-blue-400 hover:text-blue-300">
              Clear the {segment.label} segment filter
            </button>
          )}
        </div>
      ) : view === "board" ? (
        <TriageBoard findings={visible} agents={agents} savingId={savingId} onUpdate={updateFinding} />
      ) : (
        <div className="space-y-2">
          {visible.map((finding) => (
            <div key={finding.id} className="flex items-start gap-2">
              <div className="pt-3.5">
                <Checkbox
                  checked={selected.includes(finding.id)}
                  onCheckedChange={() =>
                    setSelected((prev) => (prev.includes(finding.id) ? prev.filter((id) => id !== finding.id) : [...prev, finding.id]))
                  }
                  aria-label={`Select ${finding.title}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <TriageRow
                  finding={finding}
                  agents={agents}
                  saving={savingId === finding.id}
                  onUpdate={updateFinding}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-600 flex items-center gap-1">
        <Bot size={11} /> Assigning an agent moves the finding to remediation so it appears on the planning board.
      </p>
    </div>
  );
}