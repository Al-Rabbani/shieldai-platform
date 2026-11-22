import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Checkbox } from "@/components/ui/checkbox";
import { exportEvidencePdf } from "@/lib/evidenceReport";
import { logEvidenceActivity } from "@/lib/evidenceActivity";
import { downloadEvidenceCsv } from "@/lib/evidenceCsv";
import EvidenceActivityTimeline from "@/components/forensics/EvidenceActivityTimeline";
import { ShieldCheck, FileText, Gavel, Signature, Package, Plus, X, Download, ChevronRight, CloudUpload, FileSpreadsheet } from "lucide-react";

const EVIDENCE_TYPES = ["scan_report", "assessment_report", "incident_forensics", "document", "log", "screenshot"];
const TYPE_COLOR = {
  scan_report: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  assessment_report: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  incident_forensics: "text-red-400 bg-red-500/10 border-red-500/30",
  document: "text-slate-400 bg-slate-500/10 border-slate-500/30",
  log: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  screenshot: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};
const INTEGRITY_COLOR = { verified: "text-emerald-400", tampered: "text-red-400", pending: "text-amber-400" };
const CUSTODY_COLOR = { active: "text-blue-400", transferred: "text-amber-400", released: "text-slate-400", archived: "text-slate-500" };
const ACTION_COLOR = { created: "#22c55e", viewed: "#3b82f6", modified: "#f59e0b", verified: "#a855f7", exported: "#eab308" };

export default function ForensicEvidenceVaultPage() {
  const [evidence, setEvidence] = useState([]);
  const [holds, setHolds] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [drivePushing, setDrivePushing] = useState(false);
  const [driveResult, setDriveResult] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const loggedAccess = useRef(new Set());
  const [form, setForm] = useState({ title: "", evidence_type: "scan_report", incident_type: "", severity_level: "", agent_id: "", agent_type: "", description: "", source_system: "", framework_tags: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [e, h, activityRows] = await Promise.all([
      base44.entities.EvidenceRecord.list("-collected_at", 100).catch(() => []),
      base44.entities.LegalHold.filter({ status: "active" }).catch(() => []),
      base44.entities.EvidenceActivity.list("-occurred_at", 300).catch(() => []),
    ]);
    setEvidence(e);
    setHolds(h);
    setActivities(activityRows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitEvidence(e) {
    e.preventDefault();
    if (!form.title) return;
    await base44.functions.invoke("gdsForensicChain", {
      action: "collect_evidence",
      title: form.title,
      evidence_type: form.evidence_type,
      description: form.description,
      source_system: form.source_system,
      incident_type: form.incident_type,
      severity_level: form.severity_level,
      agent_id: form.agent_id,
      agent_type: form.agent_type,
      framework_tags: form.framework_tags ? form.framework_tags.split(",").map(t => t.trim()) : [],
    });
    setForm({ title: "", evidence_type: "scan_report", incident_type: "", severity_level: "", agent_id: "", agent_type: "", description: "", source_system: "", framework_tags: "" });
    setShowForm(false);
    load();
  }

  async function exportPackage() {
    setExporting(true);
    setExportResult(null);
    try {
      const res = await base44.functions.invoke("gdsForensicChain", { action: "export_package" });
      setExportResult(res.data);
      logEvidenceActivity({
        action: "exported",
        record: null,
        detail: `Exported the evidence package manifest (${res.data?.manifest?.evidence_count ?? 0} records, ${res.data?.manifest?.active_holds ?? 0} active holds)`,
      });
    } catch (err) {
      setExportResult({ error: err.message });
    }
    setExporting(false);
  }

  async function pushToDrive() {
    setDrivePushing(true);
    setDriveResult(null);
    try {
      const res = await base44.functions.invoke("gdsEvidenceDriveExport", { action: "push_evidence" });
      setDriveResult(res.data);
      if (!res.data?.error) {
        logEvidenceActivity({ action: "exported", record: null, detail: `Pushed ${res.data?.evidence_count ?? 0} evidence record(s) to ${res.data?.folder_path}` });
      }
    } catch (err) {
      setDriveResult({ error: err.message });
    }
    setDrivePushing(false);
  }

  async function verifySig(ev) {
    await base44.functions.invoke("gdsForensicChain", { action: "verify_signature", evidence_id: ev.evidence_id });
    logEvidenceActivity({ action: "verified", record: ev, detail: `Signature verified for ${ev.evidence_id}` });
    load();
  }

  const historyByEvidence = activities.reduce((map, row) => {
    if (!row.evidence_id) return map;
    map[row.evidence_id] = map[row.evidence_id] || [];
    map[row.evidence_id].push(row);
    return map;
  }, {});

  const signedRecords = evidence.filter(e => e.signed_by);
  const allSelected = evidence.length > 0 && selectedIds.length === evidence.length;

  function toggleAll() {
    setSelectedIds(allSelected ? [] : evidence.map(e => e.id));
  }

  function toggleRow(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function exportSelected() {
    const chosen = evidence.filter(e => selectedIds.includes(e.id));
    if (chosen.length === 0) return;
    exportEvidencePdf(chosen);
    chosen.forEach(ev => logEvidenceActivity({ action: "exported", record: ev, detail: `Exported to the PDF evidence report (${chosen.length} record batch)` }));
  }

  function toggleDetail(ev) {
    const next = expandedId === ev.id ? null : ev.id;
    setExpandedId(next);
    if (next && !loggedAccess.current.has(ev.id)) {
      loggedAccess.current.add(ev.id);
      logEvidenceActivity({ action: "viewed", record: ev, detail: `Opened ${ev.evidence_id} in the vault` });
    }
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Forensic Evidence Vault</h1>
            <p className="text-xs text-slate-500">EDP-042 · Chain-of-custody and evidence management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(f => !f)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition">
            <Plus size={14} /> Collect Evidence
          </button>
          <button onClick={exportPackage} disabled={exporting} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition disabled:opacity-50">
            <Package size={14} /> {exporting ? "Exporting..." : "Export Package"}
          </button>
          <button onClick={exportSelected} disabled={selectedIds.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition disabled:opacity-40">
            <Download size={14} /> Export PDF{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
          </button>
          <button
            onClick={() => {
              downloadEvidenceCsv(evidence);
              logEvidenceActivity({ action: "exported", record: null, detail: `Exported ${evidence.length} evidence record(s) as CSV` });
            }}
            disabled={evidence.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition disabled:opacity-40"
          >
            <FileSpreadsheet size={14} /> Export CSV
          </button>
          <button
            onClick={pushToDrive}
            disabled={drivePushing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition disabled:opacity-40"
          >
            <CloudUpload size={14} /> {drivePushing ? "Pushing…" : "Push to Drive"}
          </button>
          <Link to="/forensics/auditor-report" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition">
            <FileText size={14} /> Auditor report
          </Link>
        </div>
      </div>

      {exportResult && (
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-white">Export Manifest</p>
            <button onClick={() => setExportResult(null)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
          </div>
          {exportResult.error ? (
            <p className="text-xs text-red-400">{exportResult.error}</p>
          ) : (
            <div className="text-xs text-slate-300 space-y-1">
              <p>{exportResult.message}</p>
              <p>Exported at: {new Date(exportResult.manifest?.exported_at).toLocaleString()}</p>
              <p>Evidence items: {exportResult.manifest?.evidence_count} · Active holds: {exportResult.manifest?.active_holds}</p>
            </div>
          )}
        </div>
      )}

      {driveResult && (
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-white">Google Drive export</p>
            <button onClick={() => setDriveResult(null)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
          </div>
          {driveResult.error ? (
            <p className="text-xs text-red-400">{driveResult.error}</p>
          ) : (
            <div className="text-xs text-slate-300 space-y-1">
              <p>Folder: {driveResult.folder_path}</p>
              <p>{driveResult.evidence_count} evidence record(s) · {driveResult.activity_count} activity entries</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {(driveResult.files || []).map((file) => (
                  <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20">
                    {file.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={submitEvidence} className="rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Collect New Evidence</p>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Evidence title *" className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none" required />
            <select value={form.evidence_type} onChange={e => setForm({ ...form, evidence_type: e.target.value })} className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none">
              {EVIDENCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <input value={form.source_system} onChange={e => setForm({ ...form, source_system: e.target.value })} placeholder="Source system" className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
            <input value={form.incident_type} onChange={e => setForm({ ...form, incident_type: e.target.value })} placeholder="Incident type (e.g. ransomware, phishing)" className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
            <select value={form.severity_level} onChange={e => setForm({ ...form, severity_level: e.target.value })} className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none">
              <option value="">Severity level (optional)</option>
              {["critical", "high", "medium", "low", "info"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={form.agent_id} onChange={e => setForm({ ...form, agent_id: e.target.value })} placeholder="Agent ID" className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
            <input value={form.agent_type} onChange={e => setForm({ ...form, agent_type: e.target.value })} placeholder="Agent type" className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
            <input value={form.framework_tags} onChange={e => setForm({ ...form, framework_tags: e.target.value })} placeholder="Framework tags (comma-separated: NIST, ISO27001)" className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} className="md:col-span-2 px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition">Submit Evidence</button>
        </form>
      )}

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard icon={FileText} label="Evidence Records" value={evidence.length} accent="#3b82f6" />
            <StatCard icon={Gavel} label="Active Legal Holds" value={holds.length} accent="#ef4444" />
            <StatCard icon={Signature} label="Signed Records" value={signedRecords.length} accent="#8b5cf6" />
          </div>

          <Section title="Evidence Records" icon={FileText}>
            {evidence.length === 0 ? <Empty msg="No evidence collected yet" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="py-2 px-3 w-8">
                        <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all evidence records" />
                      </th>
                      <th className="text-left py-2 px-3 font-medium">Evidence ID</th>
                      <th className="text-left py-2 px-3 font-medium">Title</th>
                      <th className="text-left py-2 px-3 font-medium">Type</th>
                      <th className="text-left py-2 px-3 font-medium">Collected By</th>
                      <th className="text-left py-2 px-3 font-medium">Collected At</th>
                      <th className="text-left py-2 px-3 font-medium">Integrity</th>
                      <th className="text-left py-2 px-3 font-medium">Custody</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.map(ev => (
                      <React.Fragment key={ev.id}>
                      <tr onClick={() => toggleDetail(ev)} className="border-b border-slate-800/50 hover:bg-white/5 cursor-pointer">
                        <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(ev.id)}
                            onCheckedChange={() => toggleRow(ev.id)}
                            aria-label={`Select ${ev.evidence_id}`}
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-400">{ev.evidence_id}</td>
                        <td className="py-2 px-3 text-white font-medium">
                          <ChevronRight size={12} className={`inline mr-1 text-slate-500 transition-transform ${expandedId === ev.id ? "rotate-90" : ""}`} />
                          {ev.title}
                        </td>
                        <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${TYPE_COLOR[ev.evidence_type] || ""}`}>{ev.evidence_type?.replace(/_/g, " ")}</span></td>
                        <td className="py-2 px-3 text-slate-400">{ev.collected_by || "—"}</td>
                        <td className="py-2 px-3 text-slate-500">{ev.collected_at ? new Date(ev.collected_at).toLocaleDateString() : "—"}</td>
                        <td className="py-2 px-3"><span className={`font-medium ${INTEGRITY_COLOR[ev.integrity_status] || "text-slate-400"}`}>● {ev.integrity_status}</span></td>
                        <td className="py-2 px-3"><span className={`font-medium ${CUSTODY_COLOR[ev.chain_of_custody_status] || "text-slate-400"}`}>{ev.chain_of_custody_status}</span></td>
                      </tr>
                      {expandedId === ev.id && (
                        <tr className="border-b border-slate-800/50" style={{ background: "#0a0f1e" }}>
                          <td colSpan={8} className="px-3 py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                              <p><span className="text-slate-500">Description:</span> {ev.description || "—"}</p>
                              <p><span className="text-slate-500">Source system:</span> {ev.source_system || "—"}</p>
                              <p><span className="text-slate-500">Incident type:</span> {ev.incident_type?.replace(/_/g, " ") || "—"}</p>
                              <p><span className="text-slate-500">Severity level:</span> {ev.severity_level || "—"}</p>
                              <p><span className="text-slate-500">Agent:</span> {ev.agent_id || "—"}{ev.agent_type ? ` (${ev.agent_type})` : ""}</p>
                              <p className="font-mono break-all"><span className="text-slate-500">Content hash:</span> {ev.content_hash || "—"}</p>
                              <p className="sm:col-span-2"><span className="text-slate-500">Framework tags:</span> {(ev.framework_tags || []).join(", ") || "—"}</p>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-800">
                              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Record history — every change, who made it and when</p>
                              {(historyByEvidence[ev.evidence_id] || []).length === 0 ? (
                                <p className="text-[10px] text-slate-600">No changes recorded for this record yet.</p>
                              ) : (
                                <div className="space-y-1">
                                  {(historyByEvidence[ev.evidence_id] || []).slice(0, 8).map((row) => (
                                    <div key={row.id} className="flex flex-wrap items-baseline gap-2 text-[10px]">
                                      <span className="font-bold uppercase" style={{ color: ACTION_COLOR[row.action] || "#94a3b8" }}>{row.action}</span>
                                      <span className="text-slate-300">{row.actor || "unknown user"}</span>
                                      <span className="text-slate-500 font-mono">{row.occurred_at ? new Date(row.occurred_at).toLocaleString("en-GB") : "—"}</span>
                                      {row.detail && <span className="text-slate-500 flex-1 min-w-0 truncate">{row.detail}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <EvidenceActivityTimeline />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Legal Holds" icon={Gavel}>
              {holds.length === 0 ? <Empty msg="No active legal holds" /> : (
                <div className="space-y-2">
                  {holds.map(h => (
                    <div key={h.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: "3px solid #ef4444" }}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-white">{h.title}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">ACTIVE HOLD</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">{h.legal_matter}</p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500">
                        <span>ID: <span className="font-mono text-slate-400">{h.hold_id}</span></span>
                        <span>Items: <span className="text-white font-medium">{h.items_held}</span></span>
                        <span>By: {h.issued_by || "—"}</span>
                        <span>{h.issued_at ? new Date(h.issued_at).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Digital Signature Verification" icon={Signature}>
              {signedRecords.length === 0 ? <Empty msg="No signed records yet" /> : (
                <div className="space-y-2">
                  {signedRecords.map(ev => (
                    <div key={ev.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-white">{ev.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ev.signature_valid ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                          {ev.signature_valid ? "✓ VALID" : "✗ INVALID"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2">
                        <span>Signer: <span className="text-slate-300">{ev.signed_by}</span></span>
                        <span>{ev.signed_at ? new Date(ev.signed_at).toLocaleString() : "—"}</span>
                      </div>
                      {ev.signature_hash && <p className="text-[10px] font-mono text-slate-600 truncate">SHA: {ev.signature_hash}</p>}
                    </div>
                  ))}
                </div>
              )}
              {evidence.filter(e => !e.signed_by).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <p className="text-[11px] text-slate-500 mb-2">Unsigned records awaiting verification:</p>
                  <div className="flex flex-wrap gap-2">
                    {evidence.filter(e => !e.signed_by).slice(0, 5).map(ev => (
                      <button key={ev.id} onClick={() => verifySig(ev)} className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition">
                        Verify {ev.evidence_id}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center gap-3">
        <Icon size={20} style={{ color: accent }} />
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-[11px] text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-slate-400" />
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Empty({ msg }) {
  return <div className="text-center py-8"><p className="text-xs text-slate-600">{msg}</p></div>;
}