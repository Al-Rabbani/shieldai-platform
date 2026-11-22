import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { buildImpactModel, projectImpact } from "@/lib/patchImpact";
import { pushLinearStates } from "@/lib/linearSync";
import { gradeColor } from "@/components/dashboards/DashboardShared";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench } from "lucide-react";

const cvssText = (f) => (Number.isFinite(Number(f.cvss_score)) ? `CVSS ${Number(f.cvss_score).toFixed(1)}` : "CVSS not recorded");

export default function PatchImpactSimulator({ findings, currentScore, agents = [], onRecorded }) {
  const model = useMemo(() => buildImpactModel(findings || [], currentScore), [findings, currentScore]);
  const [selected, setSelected] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const impact = projectImpact(model, selected);

  const rows = [...model.rows].sort((a, b) => b.delta - a.delta);

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function recordFixes() {
    if (!agentId || selected.length === 0 || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      await base44.entities.TriagedFinding.bulkUpdate(
        selected.map((id) => ({
          id,
          status: "fixed",
          fixed_at: new Date().toISOString(),
          fixed_by_agent_id: agentId,
        }))
      );
      await pushLinearStates(selected);
      setMessage({ ok: true, text: `${selected.length} finding(s) recorded as fixed · linked Linear tickets updated.` });
      setSelected([]);
      if (onRecorded) await onRecorded();
    } catch (error) {
      setMessage({ ok: false, text: error.message });
    }
    setSaving(false);
  }

  if (!model.scorable) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-400">
          {model.currentScore == null
            ? "No recorded overall risk score to anchor the projection against."
            : "No open findings to model — there is nothing to patch."}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">A projection needs one recorded score snapshot and at least one open finding.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Recorded score</p>
          <p className="text-2xl font-bold" style={{ color: gradeColor(model.currentGrade) }}>
            {model.currentScore} <span className="text-sm text-slate-500">/100 · {model.currentGrade}</span>
          </p>
        </div>
        <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Selected fixes</p>
          <p className="text-2xl font-bold text-white">{impact.removedCount} <span className="text-sm text-slate-500">of {rows.length}</span></p>
        </div>
        <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: `1px solid ${impact.gradeChanged ? "#10b98155" : "#1F2937"}` }}>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Projected score</p>
          <p className="text-2xl font-bold" style={{ color: gradeColor(impact.projectedGrade) }}>
            {impact.projected} <span className="text-sm text-slate-500">/100 · {impact.projectedGrade}</span>
          </p>
          <p className="text-[11px] text-emerald-400 mt-0.5">
            +{impact.gain.toFixed(1)} pts{impact.gradeChanged ? " · grade improves" : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setSelected(rows.map((r) => r.finding.id))}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition"
        >
          Select all {rows.length}
        </button>
        <button
          onClick={() => setSelected([])}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-700/40 text-slate-300 border border-slate-600/40 hover:bg-slate-700/60 transition"
        >
          Clear
        </button>
        <span className="text-[11px] text-slate-500">
          Model: the recorded {model.gap.toFixed(1)}-point gap from 100 is spread across open findings by severity and CVSS.
        </span>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #1F2937" }}>
        <div className="max-h-[340px] overflow-y-auto">
          {rows.map(({ finding, delta }) => (
            <label
              key={finding.id}
              className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-white/5 transition"
              style={{ borderBottom: "1px solid #1a2334" }}
            >
              <Checkbox
                checked={selected.includes(finding.id)}
                onCheckedChange={() => toggle(finding.id)}
                aria-label={`Simulate fixing ${finding.title}`}
                className="mt-0.5"
              />
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-medium text-white truncate">{finding.title}</span>
                <span className="block text-[10px] text-slate-500 truncate">
                  {finding.cve_id || "No CVE"} · {cvssText(finding)} · {finding.asset_name || "asset not recorded"}
                </span>
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-400 flex-shrink-0">+{delta.toFixed(2)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none"
        >
          <option value="">Attribute fixes to agent…</option>
          {agents.map((a) => (
            <option key={a.id} value={a.agent_id || a.name}>{a.display_name || a.name}</option>
          ))}
        </select>
        <button
          onClick={recordFixes}
          disabled={selected.length === 0 || !agentId || saving}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition disabled:opacity-40"
        >
          <Wrench size={13} />
          {saving ? "Recording…" : `Record ${selected.length || ""} fix${selected.length === 1 ? "" : "es"} as applied`}
        </button>
        <span className="text-[10px] text-slate-500">Recording changes the real finding status and feeds the per-agent counter.</span>
      </div>

      {message && (
        <p className={`text-[11px] ${message.ok ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>
      )}
    </div>
  );
}