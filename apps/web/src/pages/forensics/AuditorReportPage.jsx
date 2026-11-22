import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Checkbox } from "@/components/ui/checkbox";
import { exportAuditorReport } from "@/lib/auditorReport";
import { FileText, ShieldAlert, ClipboardCheck, Download, Upload, ExternalLink } from "lucide-react";

const FRAMEWORK_LABEL = { soc2: "SOC 2", iso27001: "ISO 27001", nist: "NIST CSF" };
const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

export default function AuditorReportPage() {
  const [incidents, setIncidents] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("incidents");
  const [search, setSearch] = useState("");
  const [incidentIds, setIncidentIds] = useState([]);
  const [controlIds, setControlIds] = useState([]);
  const [title, setTitle] = useState("Auditor Evidence Report");
  const [preparedFor, setPreparedFor] = useState("");
  const [savingDrive, setSavingDrive] = useState(false);
  const [driveResult, setDriveResult] = useState(null);

  useEffect(() => {
    (async () => {
      const [incidentRows, controlRows] = await Promise.all([
        base44.entities.Incident.list("-opened_at", 200).catch(() => []),
        base44.entities.ComplianceChecklistItem.list("-created_date", 300).catch(() => []),
      ]);
      setIncidents(incidentRows || []);
      setControls(controlRows || []);
      setLoading(false);
    })();
  }, []);

  const visibleIncidents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return incidents;
    return incidents.filter((i) => `${i.title} ${i.incident_type} ${i.severity} ${i.status}`.toLowerCase().includes(term));
  }, [incidents, search]);

  const visibleControls = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return controls;
    return controls.filter((c) => `${c.title} ${c.control_ref} ${c.framework} ${c.category}`.toLowerCase().includes(term));
  }, [controls, search]);

  const selectedIncidents = incidents.filter((i) => incidentIds.includes(i.id));
  const selectedControls = controls.filter((c) => controlIds.includes(c.id));
  const totalSelected = selectedIncidents.length + selectedControls.length;

  function toggleIncident(id) {
    setIncidentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleControl(id) {
    setControlIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAllVisible() {
    if (tab === "incidents") {
      const visibleIds = visibleIncidents.map((i) => i.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => incidentIds.includes(id));
      setIncidentIds(allSelected ? [] : visibleIds);
    } else {
      const visibleIds = visibleControls.map((c) => c.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => controlIds.includes(id));
      setControlIds(allSelected ? [] : visibleIds);
    }
  }

  function generate() {
    if (totalSelected === 0) return;
    exportAuditorReport({ title, preparedFor, incidents: selectedIncidents, controls: selectedControls });
  }

  async function saveToDrive() {
    if (totalSelected === 0 || savingDrive) return;
    setSavingDrive(true);
    setDriveResult(null);
    try {
      const response = await base44.functions.invoke("gdsScheduledReports", {
        report: "auditor_drive",
        title,
        prepared_for: preparedFor,
        incident_ids: incidentIds,
        control_ids: controlIds,
      });
      setDriveResult(response.data);
    } catch (error) {
      setDriveResult({ error: error?.response?.data?.error || error.message });
    }
    setSavingDrive(false);
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
      <div className="flex items-center gap-3">
        <FileText size={22} className="text-blue-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Auditor Evidence Report</h1>
          <p className="text-xs text-slate-500">Bundle selected incidents and compliance controls into one downloadable PDF</p>
        </div>
      </div>

      <div className="rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <label className="text-[11px] text-slate-400">
          Report title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none"
          />
        </label>
        <label className="text-[11px] text-slate-400">
          Prepared for (auditor or body)
          <input
            value={preparedFor}
            onChange={(e) => setPreparedFor(e.target.value)}
            placeholder="e.g. External audit firm"
            className="mt-1 w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => { setTab("incidents"); setSearch(""); }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${tab === "incidents" ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200"}`}
        >
          <ShieldAlert size={11} /> Incidents · {incidentIds.length}/{incidents.length}
        </button>
        <button
          onClick={() => { setTab("controls"); setSearch(""); }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${tab === "controls" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200"}`}
        >
          <ClipboardCheck size={11} /> Compliance controls · {controlIds.length}/{controls.length}
        </button>
        <button
          onClick={generate}
          disabled={totalSelected === 0}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-40"
        >
          <Download size={13} /> Generate PDF{totalSelected > 0 ? ` (${totalSelected})` : ""}
        </button>
        <button
          onClick={saveToDrive}
          disabled={totalSelected === 0 || savingDrive}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition disabled:opacity-40"
        >
          <Upload size={13} /> {savingDrive ? "Saving…" : "Save to Drive"}
        </button>
      </div>

      {driveResult && (
        <div className="rounded-xl p-3 text-[11px]" style={{ background: "#111827", border: driveResult.error ? "1px solid #7f1d1d" : "1px solid #1F2937" }}>
          {driveResult.error ? (
            <p className="text-red-400">{driveResult.error}</p>
          ) : (
            <div className="space-y-1">
              <p className="text-emerald-400 font-bold">Saved to Google Drive · GDS OS Audit Evidence</p>
              <p className="text-slate-400">{driveResult.incidents} incident(s) · {driveResult.controls} control(s)</p>
              <a href={driveResult.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
                Open the PDF in Drive <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="p-2.5 flex flex-wrap items-center gap-2 border-b border-slate-800">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "incidents" ? "Search incidents…" : "Search controls…"}
            className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
          />
          <button onClick={toggleAllVisible} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition">
            Select all visible
          </button>
          <button
            onClick={() => { if (tab === "incidents") setIncidentIds([]); else setControlIds([]); }}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-slate-700/40 text-slate-300 border border-slate-600/40 hover:bg-slate-700/60 transition"
          >
            Clear
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          {tab === "incidents" ? (
            visibleIncidents.length === 0 ? (
              <p className="text-center py-10 text-xs text-slate-500">No incidents match this search.</p>
            ) : (
              visibleIncidents.map((incident) => (
                <label key={incident.id} className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-white/5 transition border-b border-slate-800/60">
                  <Checkbox checked={incidentIds.includes(incident.id)} onCheckedChange={() => toggleIncident(incident.id)} className="mt-0.5" aria-label={`Select ${incident.title}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-white truncate">{incident.title}</span>
                    <span className="block text-[10px] text-slate-500 truncate">
                      {incident.incident_type ? incident.incident_type.replace(/_/g, " ") : "type not recorded"} · {incident.status?.replace(/_/g, " ") || "status not recorded"} · {incident.opened_at ? new Date(incident.opened_at).toLocaleDateString() : "date not recorded"}
                    </span>
                  </span>
                  <span className="text-[9px] font-bold uppercase flex-shrink-0" style={{ color: SEV_COLOR[incident.severity] || "#94a3b8" }}>{incident.severity}</span>
                </label>
              ))
            )
          ) : visibleControls.length === 0 ? (
            <p className="text-center py-10 text-xs text-slate-500">No compliance controls match this search.</p>
          ) : (
            visibleControls.map((control) => (
              <label key={control.id} className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-white/5 transition border-b border-slate-800/60">
                <Checkbox checked={controlIds.includes(control.id)} onCheckedChange={() => toggleControl(control.id)} className="mt-0.5" aria-label={`Select ${control.control_ref}`} />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium text-white truncate">
                    <span className="text-blue-400 font-mono mr-1.5">{control.control_ref}</span>
                    {control.title}
                  </span>
                  <span className="block text-[10px] text-slate-500 truncate">
                    {FRAMEWORK_LABEL[control.framework] || control.framework} · {control.owner || "owner not recorded"}
                  </span>
                </span>
                <span className={`text-[9px] font-bold uppercase flex-shrink-0 ${control.status === "complete" ? "text-emerald-400" : "text-slate-500"}`}>{control.status}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {totalSelected > 0 && (
        <p className="text-[10px] text-slate-500">
          Bundle: {selectedIncidents.length} incident(s) and {selectedControls.length} control(s). The PDF reproduces stored values and marks anything missing as "Not recorded".
        </p>
      )}
    </div>
  );
}