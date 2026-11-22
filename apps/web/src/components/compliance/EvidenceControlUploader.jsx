import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Paperclip, Trash2, Upload, X } from "lucide-react";

// Attaches a support document to one or more individual controls of a framework.
export default function EvidenceControlUploader({ frameworkKey, controls = [], onCredited }) {
  const [docs, setDocs] = useState([]);
  const [title, setTitle] = useState("");
  const [refs, setRefs] = useState([]);
  const [markComplete, setMarkComplete] = useState(true);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(null);
  const inputRef = useRef(null);

  async function load() {
    const rows = await base44.entities.EvidenceLibrary.list("-uploaded_at", 300).catch(() => []);
    setDocs((rows || []).filter((row) => (row.frameworks || []).includes(frameworkKey)));
  }

  useEffect(() => { load(); }, [frameworkKey]);

  const sortedControls = useMemo(
    () => [...controls].sort((a, b) => String(a.control_ref).localeCompare(String(b.control_ref))),
    [controls]
  );

  function toggle(ref) {
    setRefs((prev) => (prev.includes(ref) ? prev.filter((item) => item !== ref) : [...prev, ref]));
  }

  async function submit(event) {
    event.preventDefault();
    if (!file || !title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.EvidenceLibrary.create({
        title: title.trim(),
        file_url: file_uri,
        file_type: "document",
        frameworks: [frameworkKey],
        control_ids: refs,
        uploaded_at: new Date().toISOString(),
        uploaded_by_name: me?.full_name || me?.email || "",
      });
      // A document mapped to a control is its evidence: clear the gap and, by default,
      // close the control so it counts towards the framework's passing percentage.
      const mapped = controls.filter((control) => refs.includes(control.control_ref));
      if (mapped.length > 0) {
        const stamp = markComplete
          ? { status: "complete", completed_at: new Date().toISOString(), completed_by: me?.full_name || me?.email || "" }
          : {};
        await base44.entities.ComplianceChecklistItem.bulkUpdate(
          mapped.map((control) => ({ id: control.id, evidence_missing: false, ...stamp }))
        );
        onCredited?.();
      }
      setTitle("");
      setRefs([]);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    }
    setSaving(false);
  }

  async function open(doc) {
    setOpening(doc.id);
    setError("");
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_url, expires_in: 300 });
      window.open(signed_url, "_blank", "noreferrer");
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    }
    setOpening(null);
  }

  async function remove(doc) {
    await base44.entities.EvidenceLibrary.delete(doc.id);
    setDocs((prev) => prev.filter((row) => row.id !== doc.id));
  }

  return (
    <div className="pt-2 space-y-2" style={{ borderTop: "1px solid #1F2937" }}>
      <p className="text-[9px] uppercase font-bold text-slate-500">Control evidence documents</p>

      {docs.length > 0 && (
        <div className="space-y-1">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-start gap-1.5">
              <FileText size={10} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <button onClick={() => open(doc)} className="text-[10px] text-slate-300 hover:text-blue-300 text-left truncate block w-full">
                  {doc.title}{opening === doc.id ? " …" : ""}
                </button>
                <p className="text-[9px] text-slate-600">
                  {(doc.control_ids || []).length > 0 ? `maps to ${doc.control_ids.join(", ")}` : "not mapped to a control"}
                </p>
              </div>
              <button onClick={() => remove(doc)} aria-label={`Remove ${doc.title}`} className="text-slate-600 hover:text-red-400 flex-shrink-0">
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="space-y-1.5">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Document title *"
          className="w-full px-2 py-1.5 rounded-md text-[11px] bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-purple-500 outline-none"
        />
        <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] bg-[#0a0f1e] border border-slate-700 text-slate-400 cursor-pointer">
          <Paperclip size={11} />
          <span className="truncate">{file ? file.name : "Choose file *"}</span>
          <input
            ref={inputRef}
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="hidden"
            required
          />
        </label>

        {sortedControls.length > 0 && (
          <div>
            <p className="text-[9px] text-slate-500 mb-1">Map to controls (required to credit progress)</p>
            <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1">
              {sortedControls.map((control) => {
                const active = refs.includes(control.control_ref);
                return (
                  <button
                    key={control.id}
                    type="button"
                    onClick={() => toggle(control.control_ref)}
                    title={control.title}
                    className={`text-[9px] px-1.5 py-0.5 rounded border transition ${active ? "bg-purple-500/25 text-purple-200 border-purple-500/50" : "text-slate-400 border-slate-700 hover:border-slate-500"}`}
                  >
                    {control.control_ref}
                  </button>
                );
              })}
            </div>
            {refs.length > 0 && (
              <button type="button" onClick={() => setRefs([])} className="text-[9px] text-slate-500 hover:text-slate-300 mt-1 flex items-center gap-0.5">
                <X size={8} /> clear selection
              </button>
            )}
            <label className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-1">
              <input type="checkbox" checked={markComplete} onChange={(event) => setMarkComplete(event.target.checked)} className="accent-violet-500" />
              Mark mapped controls complete
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !file || !title.trim()}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 transition disabled:opacity-40"
        >
          <Upload size={11} /> {saving ? "Attaching…" : "Attach document"}
        </button>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
      </form>
    </div>
  );
}