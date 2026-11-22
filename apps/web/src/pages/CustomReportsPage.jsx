import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { REPORT_SOURCES, sourceFor, buildQuery, formatCell, dateFieldFor } from "@/lib/reportSources";
import { FilePlus2, Play, Save, Trash2, Download, FileText, FileDown, FolderUp } from "lucide-react";
import { jsPDF } from "jspdf";

const LIMITS = [50, 100, 200];

const FRAMEWORKS = [
  { value: "soc2", label: "SOC 2" },
  { value: "iso27001", label: "ISO 27001" },
  { value: "nist", label: "NIST CSF" },
];

export default function CustomReportsPage() {
  const [reports, setReports] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [sourceKey, setSourceKey] = useState("TriagedFinding");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [columns, setColumns] = useState(sourceFor("TriagedFinding").defaultColumns);
  const [statusFilter, setStatusFilter] = useState("any");
  const [severityFilter, setSeverityFilter] = useState("any");
  const [sortOrder, setSortOrder] = useState("newest");
  const [rowLimit, setRowLimit] = useState(100);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [framework, setFramework] = useState("all");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushResult, setPushResult] = useState(null);

  const source = useMemo(() => sourceFor(sourceKey), [sourceKey]);

  useEffect(() => {
    base44.entities.CustomReport.list("-created_date", 100)
      .then((list) => setReports(list || []))
      .catch(() => setMessage({ type: "error", text: "Saved reports could not be loaded." }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setColumns(source.defaultColumns);
    setStatusFilter("any");
    setSeverityFilter("any");
    setDateFrom("");
    setDateTo("");
    setRows([]);
  }, [source]);

  function resetBuilder() {
    setActiveId(null);
    setName("");
    setDescription("");
    setSourceKey("TriagedFinding");
    setColumns(sourceFor("TriagedFinding").defaultColumns);
    setStatusFilter("any");
    setSeverityFilter("any");
    setSortOrder("newest");
    setRowLimit(100);
    setDateFrom("");
    setDateTo("");
    setFramework("all");
    setRows([]);
    setMessage(null);
    setPushResult(null);
  }

  function loadReport(report) {
    const loadedSource = sourceFor(report.source_entity);
    setActiveId(report.id);
    setName(report.name || "");
    setDescription(report.description || "");
    setSourceKey(loadedSource.key);
    setColumns(Array.isArray(report.columns) && report.columns.length ? report.columns : loadedSource.defaultColumns);
    setStatusFilter(report.status_filter || "any");
    setSeverityFilter(report.severity_filter || "any");
    setSortOrder(report.sort_order || "newest");
    setRowLimit(report.row_limit || 100);
    setDateFrom(report.date_from || "");
    setDateTo(report.date_to || "");
    setFramework(report.framework || "all");
    setMessage(null);
    setPushResult(null);
    runReport({
      key: loadedSource.key,
      statusFilter: report.status_filter || "any",
      severityFilter: report.severity_filter || "any",
      sortOrder: report.sort_order || "newest",
      rowLimit: report.row_limit || 100,
      dateFrom: report.date_from || "",
      dateTo: report.date_to || "",
      framework: report.framework || "all",
    });
  }

  async function runReport(override = {}) {
    const key = override.key || sourceKey;
    const activeSource = sourceFor(key);
    const activeStatus = override.statusFilter ?? statusFilter;
    const activeSeverity = override.severityFilter ?? severityFilter;
    const activeSort = override.sortOrder ?? sortOrder;
    const activeLimit = override.rowLimit ?? rowLimit;
    const activeFrom = override.dateFrom ?? dateFrom;
    const activeTo = override.dateTo ?? dateTo;
    const activeFramework = override.framework ?? framework;
    const dateField = dateFieldFor(activeSource);
    setRunning(true);
    setMessage(null);
    try {
      const entity = base44.entities[key];
      const sort = activeSort === "oldest" ? "created_date" : "-created_date";
      const result = await entity.filter(buildQuery(activeSource, activeStatus, activeSeverity), sort, Math.min(activeLimit, 200));
      const fetched = Array.isArray(result) ? result : result?.items || [];
      const list = fetched
        .filter((row) => (activeFramework === "all" || key !== "ComplianceChecklistItem" ? true : row.framework === activeFramework))
        .filter((row) => {
          if (!activeFrom && !activeTo) return true;
          const value = row[dateField];
          if (!value) return false;
          const day = String(value).slice(0, 10);
          if (activeFrom && day < activeFrom) return false;
          if (activeTo && day > activeTo) return false;
          return true;
        });
      setRows(list);
      const range = activeFrom || activeTo ? ` within ${activeFrom || "start"} → ${activeTo || "today"} on ${dateField.replace(/_/g, " ")}` : "";
      setMessage({ type: "ok", text: `${list.length} record(s) returned${range}.` });
    } catch (error) {
      setRows([]);
      setMessage({ type: "error", text: `Report failed: ${error.message}` });
    }
    setRunning(false);
  }

  async function saveReport() {
    if (!name.trim()) {
      setMessage({ type: "error", text: "Give the report a name before saving." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      source_entity: sourceKey,
      columns,
      status_filter: statusFilter === "any" ? "" : statusFilter,
      severity_filter: severityFilter === "any" ? "" : severityFilter,
      date_from: dateFrom,
      date_to: dateTo,
      framework: framework === "all" ? "" : framework,
      sort_order: sortOrder,
      row_limit: rowLimit,
    };
    try {
      if (activeId) {
        await base44.entities.CustomReport.update(activeId, payload);
        setReports((prev) => prev.map((r) => (r.id === activeId ? { ...r, ...payload } : r)));
      } else {
        const created = await base44.entities.CustomReport.create(payload);
        setReports((prev) => [created, ...prev]);
        setActiveId(created.id);
      }
      setMessage({ type: "ok", text: "Report saved." });
    } catch (error) {
      setMessage({ type: "error", text: `Save failed: ${error.message}` });
    }
    setSaving(false);
  }

  async function deleteReport(report) {
    if (!window.confirm(`Delete "${report.name}"?`)) return;
    try {
      await base44.entities.CustomReport.delete(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      if (activeId === report.id) resetBuilder();
    } catch (error) {
      setMessage({ type: "error", text: `Delete failed: ${error.message}` });
    }
  }

  function exportCsv() {
    if (rows.length === 0) return;
    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [columns.join(","), ...rows.map((row) => columns.map((col) => escape(formatCell(row[col]))).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(name || `${source.label}_report`).replace(/[^a-z0-9]+/gi, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    if (rows.length === 0) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const title = name || `${source.label} report`;
    doc.setFontSize(16);
    doc.setTextColor(20);
    doc.text(title, 40, 46);
    doc.setFontSize(9);
    doc.setTextColor(120);
    if (description) doc.text(description, 40, 62);
    doc.text(`Source: ${source.label} · Generated ${new Date().toLocaleString()} · ${rows.length} record(s)`, 40, description ? 76 : 62);

    const colWidth = (pageWidth - 80) / Math.max(columns.length, 1);
    let y = 100;
    doc.setFontSize(8);
    doc.setTextColor(90);
    columns.forEach((col, index) => doc.text(String(col).replace(/_/g, " ").toUpperCase(), 40 + index * colWidth, y));
    y += 12;
    doc.setDrawColor(200);
    doc.line(40, y - 6, pageWidth - 40, y - 6);
    doc.setTextColor(40);

    rows.forEach((row) => {
      if (y > pageHeight - 36) {
        doc.addPage();
        y = 50;
      }
      columns.forEach((col, index) => {
        const cell = doc.splitTextToSize(formatCell(row[col]), colWidth - 8)[0] || "";
        doc.text(cell, 40 + index * colWidth, y);
      });
      y += 14;
    });

    doc.save(`${title.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
  }

  async function pushBriefing() {
    if (rows.length === 0) {
      setMessage({ type: "error", text: "Run the report before pushing a briefing." });
      return;
    }
    setPushBusy(true);
    setPushResult(null);
    const frameworkLabel = framework === "all" ? "All frameworks" : FRAMEWORKS.find((option) => option.value === framework)?.label || framework;
    const period = new Date().toISOString().slice(0, 7);
    const title = name.trim() || `${source.label} briefing`;
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[character]));
    const head = columns.map((column) => `<th>${escapeHtml(column.replace(/_/g, " "))}</th>`).join("");
    const body = rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(formatCell(row[column]))}</td>`).join("")}</tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;background:#0a0f1e;color:#e2e8f0;padding:32px}
      h1{font-size:20px;margin:0 0 6px}p{font-size:11px;color:#94a3b8;margin:0 0 4px}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px}
      th,td{border:1px solid #1F2937;padding:6px;text-align:left;vertical-align:top}
      th{background:#111827;color:#93c5fd;text-transform:uppercase;font-size:10px}</style></head>
      <body><h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(frameworkLabel)} · ${escapeHtml(source.label)} · GDS OS</p>
      <p>Generated ${escapeHtml(new Date().toLocaleString())} · ${rows.length} record(s)</p>
      ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;

    try {
      const response = await base44.functions.invoke("saveReportToDrive", {
        content: html,
        mimeType: "text/html",
        filename: `${title.replace(/[^a-z0-9]+/gi, "_")}_${period}.html`,
        folderPath: ["GDS OS", "Executive Briefings", frameworkLabel, period],
      });
      const data = response?.data || {};
      if (data.error) throw new Error(data.error);
      setPushResult(data);
      setMessage({ type: "ok", text: `Briefing pushed to ${data.folder_path}.` });
    } catch (error) {
      setMessage({ type: "error", text: `Drive push failed: ${error.message}` });
    }
    setPushBusy(false);
  }

  function toggleColumn(field) {
    setColumns((prev) => (prev.includes(field) ? prev.filter((c) => c !== field) : [...prev, field]));
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
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Custom Reports</h1>
            <p className="text-xs text-slate-500">Build, save and export a report over any of your security data</p>
          </div>
        </div>
        <button onClick={resetBuilder} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-slate-700/40 text-slate-300 border border-slate-700 hover:bg-slate-700/60 transition">
          <FilePlus2 size={13} /> New report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-[10px] uppercase text-slate-500 mb-2">Saved reports</p>
          {reports.length === 0 ? (
            <p className="text-[11px] text-slate-500">No saved reports yet.</p>
          ) : (
            <div className="space-y-1">
              {reports.map((report) => (
                <div key={report.id} className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${activeId === report.id ? "bg-blue-500/15" : "hover:bg-white/5"}`}>
                  <button onClick={() => loadReport(report)} className="flex-1 text-left min-w-0">
                    <p className={`text-[11px] truncate ${activeId === report.id ? "text-blue-300" : "text-slate-200"}`}>{report.name}</p>
                    <p className="text-[9px] text-slate-500 truncate">{sourceFor(report.source_entity).label}</p>
                  </button>
                  <button onClick={() => deleteReport(report)} aria-label={`Delete ${report.name}`} className="text-slate-600 hover:text-red-400 flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl p-3 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-[10px] uppercase text-slate-500">
                Report name
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Critical cloud findings" className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none" />
              </label>
              <label className="text-[10px] uppercase text-slate-500">
                Data source
                <select value={sourceKey} onChange={(e) => setSourceKey(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none">
                  {REPORT_SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
            </div>

            <label className="block text-[10px] uppercase text-slate-500">
              Description
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this report is for" className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none" />
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="text-[10px] uppercase text-slate-500">
                {source.statusField || "Status"}
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none">
                  <option value="any">Any</option>
                  {(source.statusOptions || []).map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
                </select>
              </label>
              <label className="text-[10px] uppercase text-slate-500">
                {source.severityField ? "Severity" : "Severity (n/a)"}
                <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} disabled={!source.severityField} className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none disabled:opacity-40">
                  <option value="any">Any</option>
                  {(source.severityOptions || []).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-[10px] uppercase text-slate-500">
                Framework
                <select value={framework} onChange={(e) => setFramework(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none">
                  <option value="all">All frameworks</option>
                  {FRAMEWORKS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="text-[10px] uppercase text-slate-500">
                Sort
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none">
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
              <label className="text-[10px] uppercase text-slate-500">
                Rows
                <select value={rowLimit} onChange={(e) => setRowLimit(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none">
                  {LIMITS.map((limit) => <option key={limit} value={limit}>{limit}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] uppercase text-slate-500">
                From ({dateFieldFor(source).replace(/_/g, " ")})
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none" />
              </label>
              <label className="text-[10px] uppercase text-slate-500">
                To
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none" />
              </label>
            </div>

            <div>
              <p className="text-[10px] uppercase text-slate-500 mb-1">Columns</p>
              <div className="flex flex-wrap gap-1.5">
                {source.fields.map((field) => (
                  <button
                    key={field}
                    onClick={() => toggleColumn(field)}
                    className={`px-2 py-1 rounded-lg text-[10px] border transition ${columns.includes(field) ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200"}`}
                  >
                    {field.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => runReport()} disabled={running || columns.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition disabled:opacity-40">
                <Play size={13} /> {running ? "Running…" : "Run report"}
              </button>
              <button onClick={saveReport} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition disabled:opacity-40">
                <Save size={13} /> {saving ? "Saving…" : activeId ? "Update report" : "Save report"}
              </button>
              <button onClick={exportCsv} disabled={rows.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-slate-700/40 text-slate-300 border border-slate-700 hover:bg-slate-700/60 transition disabled:opacity-40">
                <Download size={13} /> Export CSV
              </button>
              <button onClick={exportPdf} disabled={rows.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition disabled:opacity-40">
                <FileDown size={13} /> Export PDF
              </button>
              <button onClick={pushBriefing} disabled={pushBusy || rows.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition disabled:opacity-40">
                <FolderUp size={13} /> {pushBusy ? "Pushing…" : "Push briefing to Drive"}
              </button>
            </div>
            {message && <p className={`text-[11px] ${message.type === "error" ? "text-red-400" : "text-emerald-400"}`}>{message.text}</p>}
            {pushResult?.file_url && (
              <a href={pushResult.file_url} target="_blank" rel="noreferrer" className="inline-block text-[11px] text-blue-300 hover:text-blue-200 underline">
                Open briefing in {pushResult.folder_path}
              </a>
            )}
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            {rows.length === 0 ? (
              <p className="text-center py-10 text-xs text-slate-500">Run the report to see results.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {columns.map((col) => <th key={col} className="py-2 px-2 font-bold uppercase text-[9px] text-slate-500 whitespace-nowrap">{col.replace(/_/g, " ")}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-800/50 hover:bg-white/5">
                        {columns.map((col) => <td key={col} className="py-1.5 px-2 text-slate-300 max-w-[240px] truncate" title={formatCell(row[col])}>{formatCell(row[col])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}