import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { pushLinearStates } from "@/lib/linearSync";
import { BookMarked, CheckCircle2, Plus, Search, ShieldCheck, Wrench } from "lucide-react";
import RemediationTemplateForm from "@/components/fixes/RemediationTemplateForm";

function matches(template, finding) {
  const type = (template.vulnerability_type || "").toLowerCase().trim();
  if (!type) return false;
  const haystack = [
    finding.title,
    finding.cwe_id,
    finding.cve_id,
    finding.package_name,
    finding.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (type.startsWith("cwe-") || type.startsWith("cve-")) return haystack.includes(type);
  return haystack.includes(type);
}

export default function RemediationTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [findings, setFindings] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [templateRows, findingRows] = await Promise.all([
      base44.entities.RemediationTemplate.filter({ is_active: true }, "-usage_count", 200).catch(() => []),
      base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 300).catch(() => []),
    ]);
    setTemplates(templateRows || []);
    setFindings(findingRows || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const withMatches = useMemo(
    () =>
      templates
        .map((template) => ({ template, matches: findings.filter((finding) => matches(template, finding)) }))
        .filter((row) => {
          if (!query.trim()) return true;
          const haystack = `${row.template.template_name} ${row.template.vulnerability_type} ${row.template.description || ""}`.toLowerCase();
          return haystack.includes(query.trim().toLowerCase());
        })
        .sort((a, b) => b.matches.length - a.matches.length),
    [templates, findings, query]
  );

  async function applyTemplate(template, matched) {
    if (matched.length === 0) return;
    setApplying(template.id);
    setMessage(null);
    const now = new Date().toISOString();
    const notes = [template.template_name, template.remediation_steps].filter(Boolean).join("\n\n");
    try {
      await base44.entities.TriagedFinding.bulkUpdate(
        matched.map((finding) => ({
          id: finding.id,
          /* No status is written: this estate's findings carry open, resolved or accepted_risk, and "in_remediation" is
           * not one of them. Starting remediation is recorded as a timestamp plus notes, and "in remediation" is derived
           * from that, so no open count or SLA band silently changes meaning. */
          remediation_notes: notes,
          remediation_started_at: finding.remediation_started_at || now,
          remediation_template_id: template.id,
        }))
      );
      await pushLinearStates(matched.map((finding) => finding.id));
      await base44.entities.RemediationTemplate.update(template.id, { usage_count: (template.usage_count || 0) + matched.length });
      setTemplates((prev) =>
        prev.map((row) => (row.id === template.id ? { ...row, usage_count: (row.usage_count || 0) + matched.length } : row))
      );
      setFindings((prev) =>
        prev.map((finding) =>
          matched.some((item) => item.id === finding.id)
            ? { ...finding, remediation_notes: notes, remediation_started_at: finding.remediation_started_at || now, remediation_template_id: template.id }
            : finding
        )
      );
      setMessage({ type: "ok", text: `${template.template_name} applied to ${matched.length} finding(s).` });
    } catch (error) {
      setMessage({ type: "err", text: error.message });
    }
    setApplying(null);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <BookMarked size={22} className="text-violet-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">FIX-004 | TEMPLATES</span>
            <h1 className="text-xl font-bold text-white mt-1">Remediation templates</h1>
            <p className="text-xs text-slate-500">Pre-approved fixes for common vulnerabilities — one click pushes every matching finding into remediation.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates…"
              className="pl-7 pr-2 py-1.5 rounded-lg text-[11px] bg-[#111827] border border-slate-700 text-white placeholder-slate-600 focus:border-violet-500 outline-none"
            />
          </div>
          <button
            onClick={() => setShowForm((value) => !value)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-violet-500/20 text-violet-200 border border-violet-500/40 hover:bg-violet-500/30 transition whitespace-nowrap"
          >
            <Plus size={11} /> New template
          </button>
        </div>
      </div>

      {showForm && (
        <RemediationTemplateForm
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            setMessage({ type: "ok", text: "Template saved to the library." });
            await load();
          }}
        />
      )}

      {message && (
        <div className={`rounded-lg px-3 py-2 text-[11px] border ${message.type === "err" ? "bg-red-500/10 border-red-500/40 text-red-300" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-violet-500 border-white/10 rounded-full animate-spin mx-auto mt-16" />
      ) : withMatches.length === 0 ? (
        <div className="rounded-xl py-14 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <BookMarked size={22} className="mx-auto text-slate-600 mb-2" />
          <p className="text-xs text-slate-500">No templates match this search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {withMatches.map(({ template, matches: matched }) => (
            <div key={template.id} className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #8b5cf6" }}>
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{template.template_name}</p>
                  <p className="text-[10px] text-slate-500">{template.vulnerability_type}{template.estimated_effort ? ` · ${template.estimated_effort}` : ""}</p>
                </div>
                <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${matched.length ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" : "text-slate-400 border-slate-600 bg-slate-700/20"}`}>
                  {matched.length} match{matched.length === 1 ? "" : "es"}
                </span>
              </div>

              {template.description && <p className="text-[11px] text-slate-400 mt-1.5">{template.description}</p>}

              <details className="mt-2">
                <summary className="text-[10px] font-bold text-violet-300 cursor-pointer">Remediation steps</summary>
                <p className="text-[11px] text-slate-300 whitespace-pre-line mt-1">{template.remediation_steps}</p>
                {template.testing_guidance && <p className="text-[10px] text-slate-500 mt-1">Verify: {template.testing_guidance}</p>}
              </details>

              {matched.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {matched.slice(0, 3).map((finding) => (
                    <p key={finding.id} className="text-[10px] text-slate-500 truncate">• {finding.title} <span className="text-slate-600">({finding.asset_name})</span></p>
                  ))}
                  {matched.length > 3 && <p className="text-[10px] text-slate-600">+ {matched.length - 3} more</p>}
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => applyTemplate(template, matched)}
                  disabled={matched.length === 0 || applying === template.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-violet-500 text-white hover:bg-violet-600 transition disabled:opacity-40"
                >
                  <Wrench size={11} /> {applying === template.id ? "Applying…" : `Apply to ${matched.length || 0}`}
                </button>
                <span className="text-[9px] text-slate-600 flex items-center gap-1">
                  <ShieldCheck size={9} /> used {template.usage_count || 0}×
                </span>
                {matched.length > 0 && template.usage_count > 0 && (
                  <span className="ml-auto text-[9px] text-emerald-400 flex items-center gap-1"><CheckCircle2 size={9} /> pre-approved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}