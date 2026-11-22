import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Checkbox } from "@/components/ui/checkbox";
import { exportEvidencePdf } from "@/lib/evidenceReport";
import { logEvidenceActivity } from "@/lib/evidenceActivity";
import { downloadEvidenceCsv } from "@/lib/evidenceCsv";
import EvidenceActivityTimeline from "@/components/forensics/EvidenceActivityTimeline";
import { ShieldCheck, FileText, Gavel, Fingerprint, Package, Plus, X, Download, ChevronRight, CloudUpload, FileSpreadsheet, RefreshCw } from "lucide-react";

/* Rewritten 22 Nov 2026 against the columns /evidence actually returns: id, subject_type, subject_id, sha256,
 * content_type, size_bytes, created_at, download_url.
 *
 * The previous page read title, evidence_id, collected_by, collected_at, evidence_type, integrity_status,
 * chain_of_custody_status, signed_by, signature_valid, signature_hash, description, source_system, agent_id and
 * framework_tags. None of those exist on the route, so the table rendered blank cells, the "Signed Records" tile was
 * always 0, and the Digital Signature Verification section filtered on signed_by and could never list anything. Legal
 * holds and the custody history read stores that do not exist at all.
 *
 * The verify action is now real and its verdict is read: GET /evidence/{id}/verify recomputes a SHA-256 over the stored
 * MinIO object and compares it with the hash recorded at write time. There is no signing key on this platform, so the
 * page says integrity rather than signature and never claims to know who wrote the bytes.
 */
const SUBJECT_TYPES = ["manual-upload", "scan_report", "assessment_report", "incident_forensics", "document", "log", "screenshot"];
const VERDICT_STYLE = {
  intact: "text-emerald-400",
  modified: "text-red-400",
};

function formatBytes(bytes) {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return "not reported";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ForensicEvidenceVaultPage() {
  const [evidence, setEvidence] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [drivePushing, setDrivePushing] = useState(false);
  const [driveResult, setDriveResult] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [integrity, setIntegrity] = useState({});
  const [verifying, setVerifying] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ subject_type: "manual-upload", subject_id: "" });
  const loggedAccess = useRef(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const [rows, activityRows] = await Promise.all([
      base44.entities.EvidenceRecord.list("-created_at", 100).catch(() => []),
      base44.entities.EvidenceActivity.list("-occurred_at", 300).catch(() => []),
    ]);
    setEvidence(rows || []);
    setActivities(activityRows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitEvidence(event) {
    event.preventDefault();
    if (!file) {
      setUploadError("Choose a file first. The API stores the bytes and hashes them, so an evidence record cannot exist without one.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await base44.evidence.upload(file, {
        subject_type: form.subject_type,
        subject_id: form.subject_id || null,
      });
      setFile(null);
      setForm({ subject_type: "manual-upload", subject_id: "" });
      setShowForm(false);
      await load();
    } catch (error) {
      setUploadError(error?.message || "Upload failed");
    }
    setUploading(false);
  }

  async function exportPackage() {
    setExporting(true);
    setExportResult(null);
    try {
      const res = await base44.functions.invoke("gdsForensicChain", { action: "export_package" });
      setExportResult(res.data);
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
    } catch (err) {
      setDriveResult({ error: err.message });
    }
    setDrivePushing(false);
  }

  async function verifyIntegrity(ev) {
    setVerifying(ev.id);
    try {
      const res = await base44.functions.invoke("gdsForensicChain", { action: "verify_signature", evidence_id: ev.id });
      const verdict = res.data || {};
      setIntegrity(prev => ({ ...prev, [ev.id]: { ...verdict, checked_at: new Date().toISOString() } }));
      logEvidenceActivity({
        action: "verified",
        record: ev,
        detail: verdict.intact
          ? `SHA-256 recomputed and matched for ${ev.id}`
          : `SHA-256 mismatch for ${ev.id}: stored ${String(verdict.stored_sha256).slice(0, 12)}… measured ${String(verdict.measured_sha256).slice(0, 12)}…`,
      });
    } catch (error) {
      setIntegrity(prev => ({ ...prev, [ev.id]: { error: error?.message || "verification failed" } }));
    }
    setVerifying(null);
  }

  function toggleAll() {
    setSelectedIds(selectedIds.length === evidence.length ? [] : evidence.map(e => e.id));
  }

  function toggleRow(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function exportSelected() {
    const chosen = evidence.filter(e => selectedIds.includes(e.id));
    if (chosen.length === 0) return;
    exportEvidencePdf(chosen);
  }

  function toggleDetail(ev) {
    const next = expandedId === ev.id ? null : ev.id;
    setExpandedId(next);
    if (next && !loggedAccess.current.has(ev.id)) {
      loggedAccess.current.add(ev.id);
      logEvidenceActivity({ action: "viewed", record: ev, detail: `Opened ${ev.id} in the vault` });
    }
  }

  const totalBytes = evidence.reduce((sum, ev) => sum + (typeof ev.size_bytes === "number" ? ev.size_bytes : 0), 0);
  const checkedCount = Object.keys(integrity).length;

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Forensic Evidence Vault</h1>
            <p className="text-xs text-slate-500">
              Evidence objects stored in MinIO, each with the SHA-256 recorded when it was written. There is no signing key
              on this platform, so an object&apos;s integrity can be rechecked but its author cannot be proven.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowForm(f => !f)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition">
            <Plus size={14} /> Add evidence
          </button>
          <button onClick={exportPackage} disabled={exporting} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition disabled:opacity-50">
            <Package size={14} /> {exporting ? "Checking…" : "Export package"}
          </button>
          <button onClick={exportSelected} disabled={selectedIds.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition disabled:opacity-40">
            <Download size={14} /> Export PDF{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
          </button>
          <button
            onClick={() => downloadEvidenceCsv(evidence)}
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
            <p className="text-sm font-bold text-white">Evidence package export</p>
            <button onClick={() => setExportResult(null)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
          </div>
          <p className={`text-xs ${exportResult.error ? "text-amber-300" : "text-slate-300"}`}>
            {exportResult.error || exportResult.message || "Export completed."}
          </p>
        </div>
      )}

      {driveResult && (
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-white">Google Drive export</p>
            <button onClick={() => setDriveResult(null)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
          </div>
          <p className={`text-xs ${driveResult.error ? "text-amber-300" : "text-slate-300"}`}>
            {driveResult.error || `${driveResult.evidence_count ?? 0} record(s) pushed to ${driveResult.folder_path}`}
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={submitEvidence} className="rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Add evidence</p>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
          </div>
          <p className="text-[11px] text-slate-500">
            The file is stored in MinIO and hashed with SHA-256 on upload. The subject is what the evidence is about, for
            example subject type cloud_finding and subject id f-1.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="md:col-span-3 px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none"
              required
            />
            <select value={form.subject_type} onChange={e => setForm({ ...form, subject_type: e.target.value })} className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none">
              {SUBJECT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <input value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} placeholder="Subject id (optional)" className="md:col-span-2 px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
          </div>
          {uploadError && <p className="text-xs text-amber-300">{uploadError}</p>}
          <button type="submit" disabled={uploading} className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50">
            {uploading ? "Uploading…" : "Upload evidence"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard icon={FileText} label="Evidence objects stored" value={evidence.length} accent="#3b82f6" />
            <StatCard icon={Package} label="Bytes stored" value={formatBytes(totalBytes)} accent="#a855f7" />
            <StatCard icon={Fingerprint} label="Integrity checks run this visit" value={checkedCount} accent="#8b5cf6" />
          </div>

          <Section title="Evidence objects" icon={FileText}>
            {evidence.length === 0 ? <Empty msg="No evidence objects stored yet" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="py-2 px-3 w-8">
                        <Checkbox checked={evidence.length > 0 && selectedIds.length === evidence.length} onCheckedChange={toggleAll} aria-label="Select all evidence records" />
                      </th>
                      <th className="text-left py-2 px-3 font-medium">Subject</th>
                      <th className="text-left py-2 px-3 font-medium">Content type</th>
                      <th className="text-left py-2 px-3 font-medium">Size</th>
                      <th className="text-left py-2 px-3 font-medium">Stored at</th>
                      <th className="text-left py-2 px-3 font-medium">SHA-256</th>
                      <th className="text-left py-2 px-3 font-medium">Integrity</th>
                      <th className="text-left py-2 px-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.map(ev => {
                      const check = integrity[ev.id];
                      return (
                        <React.Fragment key={ev.id}>
                          <tr onClick={() => toggleDetail(ev)} className="border-b border-slate-800/50 hover:bg-white/5 cursor-pointer">
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox checked={selectedIds.includes(ev.id)} onCheckedChange={() => toggleRow(ev.id)} aria-label={`Select ${ev.id}`} />
                            </td>
                            <td className="py-2 px-3 text-white font-medium">
                              <ChevronRight size={12} className={`inline mr-1 text-slate-500 transition-transform ${expandedId === ev.id ? "rotate-90" : ""}`} />
                              {ev.subject_type}
                              {ev.subject_id ? <span className="text-slate-500 font-normal"> · {ev.subject_id}</span> : null}
                            </td>
                            <td className="py-2 px-3 text-slate-400">{ev.content_type}</td>
                            <td className="py-2 px-3 text-slate-400">{formatBytes(ev.size_bytes)}</td>
                            <td className="py-2 px-3 text-slate-500">{ev.created_at ? new Date(ev.created_at).toLocaleString("en-GB") : "—"}</td>
                            <td className="py-2 px-3 font-mono text-slate-500">{String(ev.sha256 || "").slice(0, 16)}…</td>
                            <td className="py-2 px-3">
                              {!check ? (
                                <span className="text-slate-500">not checked</span>
                              ) : check.error ? (
                                <span className="text-amber-300">cannot verify</span>
                              ) : (
                                <span className={`font-medium ${VERDICT_STYLE[check.verdict] || "text-slate-400"}`}>{check.intact ? "● intact" : "● modified"}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => verifyIntegrity(ev)}
                                disabled={verifying === ev.id}
                                className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition disabled:opacity-50"
                              >
                                {verifying === ev.id ? "Checking…" : "Verify"}
                              </button>
                            </td>
                          </tr>
                          {expandedId === ev.id && (
                            <tr className="border-b border-slate-800/50" style={{ background: "#0a0f1e" }}>
                              <td colSpan={8} className="px-3 py-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                                  <p className="sm:col-span-2 font-mono break-all"><span className="text-slate-500">SHA-256 recorded at write: </span>{ev.sha256}</p>
                                  <p><span className="text-slate-500">Evidence id:</span> <span className="font-mono">{ev.id}</span></p>
                                  <p><span className="text-slate-500">Subject:</span> {ev.subject_type}{ev.subject_id ? ` · ${ev.subject_id}` : ""}</p>
                                  <p><span className="text-slate-500">Content type:</span> {ev.content_type}</p>
                                  <p><span className="text-slate-500">Size:</span> {formatBytes(ev.size_bytes)}</p>
                                  {ev.download_url && (
                                    <p className="sm:col-span-2">
                                      <a href={ev.download_url} target="_blank" rel="noreferrer" className="text-blue-300 underline">
                                        Download the stored object (signed link, 15 minutes)
                                      </a>
                                    </p>
                                  )}
                                  {integrity[ev.id] && !integrity[ev.id].error && (
                                    <p className="sm:col-span-2 font-mono break-all">
                                      <span className="text-slate-500">SHA-256 recomputed from the stored bytes: </span>
                                      {integrity[ev.id].measured_sha256}
                                    </p>
                                  )}
                                  {integrity[ev.id]?.error && (
                                    <p className="sm:col-span-2 text-amber-300">Verification could not run: {integrity[ev.id].error}</p>
                                  )}
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-800">
                                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Custody history</p>
                                  {(activities.filter(row => row.evidence_id === ev.id) || []).length === 0 ? (
                                    <p className="text-[10px] text-slate-600">
                                      No custody entries exist for this object, and none can: this platform has no evidence
                                      activity store, so viewing, verifying or exporting an object is not journalled.
                                    </p>
                                  ) : (
                                    <div className="space-y-1">
                                      {activities.filter(row => row.evidence_id === ev.id).slice(0, 8).map((row) => (
                                        <div key={row.id} className="flex flex-wrap items-baseline gap-2 text-[10px]">
                                          <span className="font-bold uppercase text-slate-300">{row.action}</span>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <EvidenceActivityTimeline />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Legal holds" icon={Gavel}>
              <p className="text-[11px] text-slate-500">
                Legal holds are not recorded on this platform: there is no legal hold store, so none can be listed, placed
                or released here. A hold shown as zero would be an absence, not a count of zero holds.
              </p>
            </Section>

            <Section title="Integrity verification" icon={Fingerprint}>
              <p className="text-[11px] text-slate-500 mb-2">
                Verify recomputes a SHA-256 over the stored object bytes and compares it in constant time with the hash
                recorded when the evidence was written. This proves the bytes have not changed. It is not a signature: no
                signing key exists here, so it cannot prove who wrote them.
              </p>
              {evidence.length === 0 ? <Empty msg="No objects to verify" /> : (
                <div className="flex flex-wrap gap-2">
                  {evidence.slice(0, 6).map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => verifyIntegrity(ev)}
                      disabled={verifying === ev.id}
                      className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition disabled:opacity-50"
                    >
                      <RefreshCw size={9} className="inline mr-1" />
                      {ev.subject_type} · {String(ev.id).slice(0, 8)}
                    </button>
                  ))}
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
