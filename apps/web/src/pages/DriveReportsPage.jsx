import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { FolderDown, RefreshCw, ExternalLink, FileText, Upload, ShieldCheck } from "lucide-react";
import ScanSheetShareCard from "@/components/reports/ScanSheetShareCard";

const FOLDERS = [
  { key: "weekly", name: "GDS OS Weekly Reports", action: "weekly_drive", label: "Export this week's status report" },
  { key: "compliance", name: "GDS OS Compliance", action: "compliance_drive", label: "Bundle compliance evidence logs" },
  { key: "auditor", name: "GDS OS Audit Evidence", action: "auditor_monthly_drive", label: "Push this month's auditor evidence PDF" },
];

export default function DriveReportsPage() {
  const [folderKey, setFolderKey] = useState("weekly");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState(null);

  const folder = FOLDERS.find((item) => item.key === folderKey);

  const load = useCallback(async (name) => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("gdsScheduledReports", { report: "drive_list", folder_name: name });
      setData(response.data);
    } catch (error) {
      setData({ error: error?.response?.data?.error || error.message });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(folder.name); }, [folder.name, load]);

  async function exportNow() {
    setExporting(true);
    setNotice(null);
    try {
      const response = await base44.functions.invoke("gdsScheduledReports", { report: folder.action });
      setNotice({ type: "ok", text: `${folder.label} — saved to ${folder.name}.`, file: response.data });
      await load(folder.name);
    } catch (error) {
      setNotice({ type: "err", text: error?.response?.data?.error || error.message });
    }
    setExporting(false);
  }

  return (
    <div className="space-y-4" style={{ background: "#0a0f1e", minHeight: "100vh" }}>
      {/* Stated on the page because its controls would otherwise look merely unsaved. */}
      <p className="text-[11px] text-amber-300/90 rounded-lg px-3 py-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        Google Drive is not connected on this host and no service account is installed, so no folder can be listed and no report can be filed. The platform can build the underlying report content, and the Compliance and Forensic pages can export PDF and CSV locally; only the Drive step is missing.
      </p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <FolderDown size={22} className="text-blue-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">DRIVE-004 | EXPORTS</span>
            <h1 className="text-xl font-bold text-white mt-1">Google Drive reports</h1>
            <p className="text-xs text-slate-500">One shared folder per report type — team members open the same Drive folder you do.</p>
          </div>
        </div>
        <button onClick={() => load(folder.name)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FOLDERS.map((item) => (
          <button
            key={item.key}
            onClick={() => setFolderKey(item.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${
              folderKey === item.key
                ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                : "bg-transparent text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            {item.name}
          </button>
        ))}
        <button
          onClick={exportNow}
          disabled={exporting}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition disabled:opacity-40"
        >
          <Upload size={13} /> {exporting ? "Exporting…" : folder.label}
        </button>
      </div>

      {notice && (
        <div className={`rounded-lg px-3 py-2 text-[11px] border ${notice.type === "err" ? "bg-red-500/10 border-red-500/40 text-red-300" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"}`}>
          {notice.type === "err" ? notice.text : (
            <span>
              {notice.text}{" "}
              {notice.file?.file_url && (
                <a href={notice.file.file_url} target="_blank" rel="noreferrer" className="underline">Open the new report</a>
              )}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-[10px] uppercase text-slate-500">Folder</p>
          <p className="text-sm font-semibold text-white truncate">{folder.name}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-[10px] uppercase text-slate-500">Reports stored</p>
          {/* Zero here would be an absence dressed as a count: nothing was read, so nothing can be counted. */}
          <p className="text-sm font-semibold text-white">{data?.error ? "not readable" : (data?.files?.length ?? 0)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-[10px] uppercase text-slate-500">Shared folder</p>
          {data?.error ? (
            <p className="text-sm text-slate-500">not readable</p>
          ) : data?.folder_url ? (
            <a href={data.folder_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300">
              Open in Drive <ExternalLink size={11} />
            </a>
          ) : (
            <p className="text-sm text-slate-500">Not created yet</p>
          )}
        </div>
      </div>

      <ScanSheetShareCard />

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #1F2937" }}>
          <FileText size={14} className="text-slate-400" />
          <p className="text-sm font-bold text-white">Reports in this folder</p>
        </div>

        {loading ? (
          <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-10" />
        ) : data?.error ? (
          <p className="text-xs text-red-400 px-4 py-6">{data.error}</p>
        ) : (data?.files || []).length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-slate-500 mb-2">Nothing in this folder yet.</p>
            <button onClick={exportNow} className="text-[11px] font-bold text-blue-400 hover:text-blue-300">{folder.label}</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500" style={{ borderBottom: "1px solid #1F2937" }}>
                  <th className="text-left py-2 px-4 font-medium">Report</th>
                  <th className="text-left py-2 px-4 font-medium">Saved</th>
                  <th className="text-left py-2 px-4 font-medium">Size</th>
                  <th className="text-left py-2 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.files.map((file) => (
                  <tr key={file.id} className="hover:bg-white/5" style={{ borderBottom: "1px solid #1F2937" }}>
                    <td className="py-2 px-4 text-white font-medium truncate max-w-[320px]">{file.name}</td>
                    <td className="py-2 px-4 text-slate-400">{file.created_time ? new Date(file.created_time).toLocaleString("en-GB") : "—"}</td>
                    <td className="py-2 px-4 text-slate-500">{file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "—"}</td>
                    <td className="py-2 px-4">
                      <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
                        Open <ExternalLink size={11} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl p-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <ShieldCheck size={13} className="text-emerald-400" />
        Need a bundle you choose yourself?
        <Link to="/forensics/auditor-report" className="text-blue-400 hover:text-blue-300 font-medium">Pick incidents and controls in the Auditor Report Builder</Link>
        <Link to="/forensics" className="text-blue-400 hover:text-blue-300 font-medium">Evidence vault</Link>
      </div>
    </div>
  );
}