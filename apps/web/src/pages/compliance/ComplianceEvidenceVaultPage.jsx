import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { FolderLock, RefreshCw, Download, FileText, ExternalLink, AlertTriangle, Cloud, History } from "lucide-react";
import EvidenceControlUploader from "@/components/compliance/EvidenceControlUploader";

const FRAMEWORKS = [
  { key: "soc2", label: "SOC 2" },
  { key: "iso27001", label: "ISO 27001" },
  { key: "nist", label: "NIST CSF" },
];

export default function ComplianceEvidenceVaultPage() {
  const [checklist, setChecklist] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [folders, setFolders] = useState([]);
  const [busy, setBusy] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadChecklist = useCallback(async () => {
    const items = await base44.entities.ComplianceChecklistItem.list("-created_date", 500).catch(() => []);
    setChecklist(items || []);
  }, []);

  const loadVault = useCallback(async () => {
    try {
      const response = await base44.functions.invoke("gdsScheduledReports", { report: "compliance_vault_list" });
      setFolders(response.data?.folders || []);
      return null;
    } catch (error) {
      return error?.response?.data?.error || error.message;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const records = await base44.entities.EvidenceRecord.list("-collected_at", 500).catch(() => []);
      await loadChecklist();
      setEvidence(records || []);
      const driveError = await loadVault();
      if (driveError) setMessage({ type: "err", text: driveError });
      setLoading(false);
    })();
  }, [loadVault, loadChecklist]);

  const byFramework = useMemo(() => FRAMEWORKS.map((framework) => {
    const controls = checklist.filter((item) => (item.framework || "").toLowerCase() === framework.key);
    const complete = controls.filter((item) => item.status === "complete").length;
    const needles = framework.key === "soc2" ? ["soc"] : framework.key === "nist" ? ["nist"] : ["iso", "27001"];
    const records = evidence.filter((record) =>
      (record.framework_tags || []).some((tag) => needles.some((needle) => String(tag).toLowerCase().includes(needle)))
    );
    const stored = folders.find((folder) => folder.framework === framework.key);
    return {
      ...framework,
      controls: controls.length,
      complete,
      percent: controls.length ? Math.round((complete / controls.length) * 100) : 0,
      evidence: records.length,
      files: stored?.files || [],
      folder: stored?.folder || null,
    };
  }), [checklist, evidence, folders]);

  async function bundle(frameworkKey) {
    setBusy(frameworkKey);
    setMessage(null);
    try {
      const response = await base44.functions.invoke("gdsScheduledReports", {
        report: "compliance_framework_drive",
        framework: frameworkKey,
      });
      const results = response.data?.results || [];
      const skipped = results.filter((item) => item.skipped || item.error);
      if (results.length === 0) {
        setMessage({ type: "err", text: "Nothing was bundled — no controls or evidence matched." });
      } else if (skipped.length > 0) {
        setMessage({ type: "err", text: skipped.map((item) => `${item.label}: ${item.reason || item.error}`).join(" · ") });
      } else {
        setMessage({ type: "ok", text: `${results.map((item) => item.label).join(", ")} bundled to Drive.` });
      }
      setFolders((prev) => {
        const next = [...prev];
        results.filter((item) => item.file_id).forEach((item) => {
          const file = { id: item.file_id, name: item.filename, url: item.file_url, created_at: new Date().toISOString() };
          const index = next.findIndex((folder) => folder.framework === item.framework);
          if (index === -1) next.push({ framework: item.framework, label: item.label, folder: item.folder, files: [file] });
          else next[index] = { ...next[index], files: [file, ...(next[index].files || [])] };
        });
        return next;
      });
      await loadVault();
    } catch (error) {
      setMessage({ type: "err", text: error?.response?.data?.error || error.message });
    }
    setBusy(null);
  }

  // Runs the same portal sync the daily schedule runs: registers plus evidence documents per framework folder.
  async function syncNow() {
    setSyncing(true);
    setMessage(null);
    try {
      const response = await base44.functions.invoke("gdsCompliancePortalSync", {});
      const data = response.data || {};
      if (data.error) {
        setMessage({ type: "err", text: data.error });
      } else {
        const frameworks = data.frameworks || [];
        const files = frameworks.reduce((total, item) => total + (item.files?.length || 0), 0);
        const documents = frameworks.reduce((total, item) => total + (item.documents_copied || 0), 0);
        setMessage({
          type: "ok",
          text: `Synced ${frameworks.length} framework folder(s) to Drive — ${files} register file(s), ${documents} evidence document(s).`,
        });
      }
      await loadVault();
    } catch (error) {
      setMessage({ type: "err", text: error?.response?.data?.error || error.message });
    }
    setSyncing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <FolderLock size={22} className="text-purple-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">CMP-021 | EVIDENCE VAULT</span>
            <h1 className="text-xl font-bold text-white mt-1">Compliance evidence vault</h1>
            <p className="text-xs text-slate-500">Bundle every framework's controls and evidence logs into an audit-ready PDF stored in Drive.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/compliance/audit-log" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">
            <History size={13} /> Audit log
          </Link>
          <button onClick={syncNow} disabled={syncing || busy !== null} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition disabled:opacity-40">
            <Cloud size={13} /> {syncing ? "Syncing…" : "Sync now"}
          </button>
          <button onClick={() => bundle("all")} disabled={busy !== null || syncing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition disabled:opacity-40">
            <Download size={13} /> {busy === "all" ? "Bundling…" : "Bundle all frameworks"}
          </button>
          <button onClick={async () => { const error = await loadVault(); if (error) setMessage({ type: "err", text: error }); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg px-3 py-2 text-[11px] border ${message.type === "err" ? "bg-red-500/10 border-red-500/40 text-red-300" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {byFramework.map((framework) => {
          const color = framework.percent >= 80 ? "#10b981" : framework.percent >= 50 ? "#f59e0b" : "#ef4444";
          return (
            <div key={framework.key} className="rounded-xl p-3 space-y-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-white">{framework.label}</p>
                <span className="text-[11px] font-mono" style={{ color }}>{framework.percent}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#0a0f1e" }}>
                <div className="h-full rounded-full" style={{ width: `${framework.percent}%`, background: color }} />
              </div>
              <p className="text-[10px] text-slate-500">
                {framework.complete}/{framework.controls} controls · {framework.evidence} tagged evidence record(s)
              </p>

              <button
                onClick={() => bundle(framework.key)}
                disabled={busy !== null}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition disabled:opacity-40"
              >
                <Download size={12} /> {busy === framework.key ? "Bundling…" : "Bundle & store"}
              </button>

              <EvidenceControlUploader
                frameworkKey={framework.key}
                controls={checklist.filter((item) => (item.framework || "").toLowerCase() === framework.key)}
                onCredited={loadChecklist}
              />

              <div className="pt-1">
                <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Stored bundles</p>
                {framework.files.length === 0 ? (
                  <p className="text-[10px] text-slate-600">Nothing stored for this framework yet.</p>
                ) : (
                  <div className="space-y-1">
                    {framework.files.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[10px] text-slate-300 hover:text-blue-300"
                      >
                        <FileText size={10} className="flex-shrink-0 text-slate-500" />
                        <span className="flex-1 min-w-0 truncate">{file.name}</span>
                        <span className="text-[9px] text-slate-500 flex-shrink-0">{file.created_at ? new Date(file.created_at).toLocaleDateString("en-GB") : ""}</span>
                        <ExternalLink size={9} className="flex-shrink-0 text-slate-600" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
          <AlertTriangle size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <span>
            Each bundle prints stored checklist controls for that framework plus the evidence records tagged with it, and is stored in the Drive folder
            "GDS OS Compliance Evidence — &lt;framework&gt;". A monthly schedule re-bundles every framework automatically. Records print as stored; missing values print "Not recorded".
          </span>
        </p>
      </div>
    </div>
  );
}