import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FolderOpen, Plus, Download, Eye, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { FrameworkBadge } from "@/components/shared/PillarBadge";

const TYPE_COLORS = {
  scan_report: "#3b82f6", policy_doc: "#9333ea", audit_log: "#16a34a",
  screenshot: "#ea580c", config_export: "#0891b2", attestation: "#6366f1",
  test_result: "#ec4899",
};
const TYPE_ICONS = {
  scan_report: "🔍", policy_doc: "📄", audit_log: "📋",
  screenshot: "📸", config_export: "⚙️", attestation: "✅", test_result: "🧪",
};

function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

function AddEvidenceModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: "", framework: "SOC2", evidence_type: "scan_report", source: "", status: "valid" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onCreate({ ...form, collected_at: new Date().toISOString() });
    toast.success("Evidence added");
    setLoading(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Add Evidence</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { label: "Title", key: "title", type: "text" },
            { label: "Source", key: "source", type: "text" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase font-mono">{label}</label>
              <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} required
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: "#0d1117", border: "1px solid #30363d" }} />
            </div>
          ))}
          {[
            { label: "Framework", key: "framework", opts: ["SOC2", "ISO27001", "GDPR", "NIST_CSF", "CIS_Benchmark", "PCI_DSS", "HIPAA"] },
            { label: "Evidence Type", key: "evidence_type", opts: Object.keys(TYPE_COLORS) },
            { label: "Status", key: "status", opts: ["valid", "pending_review", "expired"] },
          ].map(({ label, key, opts }) => (
            <div key={key}>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase font-mono">{label}</label>
              <select value={form[key]} onChange={e => set(key, e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#0d1117", border: "1px solid #30363d", color: "#e6edf3" }}>
                {opts.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#6366f1" }}>
            {loading ? "Adding..." : "Add Evidence"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function EvidencePage() {
  const [fwFilter, setFwFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const qc = useQueryClient();

  const { data: evidence = [] } = useQuery({ queryKey: ["gov-evidence-page"], queryFn: () => base44.entities.EvidencePack.list("-created_date", 200) });
  const createEvidence = useMutation({
    mutationFn: (data) => base44.entities.EvidencePack.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gov-evidence-page"] }),
  });

  const filtered = evidence.filter(e => {
    if (fwFilter !== "all" && e.framework !== fwFilter) return false;
    if (typeFilter !== "all" && e.evidence_type !== typeFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: evidence.length,
    valid: evidence.filter(e => e.status === "valid").length,
    pending: evidence.filter(e => e.status === "pending_review").length,
    expired: evidence.filter(e => e.status === "expired").length,
    autoGen: evidence.filter(e => e.auto_generated).length,
  };

  const allFw = [...new Set(evidence.map(e => e.framework).filter(Boolean))];
  const allTypes = [...new Set(evidence.map(e => e.evidence_type).filter(Boolean))];

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#0d1117" }}>
      {showAdd && <AddEvidenceModal onClose={() => setShowAdd(false)} onCreate={d => createEvidence.mutateAsync(d)} />}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-black text-white font-mono">EVIDENCE VAULT</h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8" }}>
          <Plus className="w-4 h-4" /> Add Evidence
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", val: stats.total, color: "#6366f1" },
          { label: "Valid", val: stats.valid, color: "#16a34a" },
          { label: "Pending Review", val: stats.pending, color: "#d97706" },
          { label: "Expired", val: stats.expired, color: "#dc2626", pulse: stats.expired > 0 },
          { label: "Auto-Generated", val: stats.autoGen, color: "#0891b2" },
        ].map(({ label, val, color, pulse }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            {pulse && <div className="w-2 h-2 rounded-full animate-pulse mx-auto mb-1" style={{ background: color }} />}
            <p className="text-xl font-black font-mono" style={{ color }}>{val}</p>
            <p className="text-[10px] text-slate-500 uppercase">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { val: fwFilter, set: setFwFilter, opts: ["all", ...allFw], label: "Framework" },
          { val: typeFilter, set: setTypeFilter, opts: ["all", ...allTypes], label: "Type" },
          { val: statusFilter, set: setStatusFilter, opts: ["all", "valid", "pending_review", "expired"], label: "Status" },
        ].map(({ val, set, opts, label }) => (
          <select key={label} value={val} onChange={e => set(e.target.value)}
            className="text-xs rounded-lg px-3 py-2 outline-none"
            style={{ background: "#161b22", border: "1px solid #30363d", color: "#94a3b8" }}>
            <option value="all">All {label}s</option>
            {opts.filter(o => o !== "all").map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
              {["Framework", "Control ID", "Title", "Type", "Source", "Status", "Collected", "Expires", "Auto"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev, i) => {
              const days = daysUntil(ev.expires_at);
              const isExpired = ev.status === "expired";
              const expiringSoon = days != null && days >= 0 && days <= 30;
              const typeColor = TYPE_COLORS[ev.evidence_type] || "#64748b";
              return (
                <tr key={ev.id}
                  style={{
                    background: isExpired ? "rgba(220,38,38,0.05)" : expiringSoon ? "rgba(217,119,6,0.05)" : i % 2 === 0 ? "#0d1117" : "#161b22",
                    borderBottom: "1px solid rgba(48,54,61,0.5)",
                    borderLeft: isExpired ? "3px solid #dc2626" : expiringSoon ? "3px solid #d97706" : "3px solid transparent",
                  }}
                  className="hover:bg-indigo-500/5 transition-colors">
                  <td className="px-4 py-3"><FrameworkBadge framework={ev.framework} size="xs" /></td>
                  <td className="px-4 py-3"><span className="text-[11px] font-mono text-indigo-400">{ev.control_id || "—"}</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-white max-w-[160px] block truncate">{ev.title || "—"}</span></td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1 w-fit"
                      style={{ color: typeColor, background: `${typeColor}15` }}>
                      {TYPE_ICONS[ev.evidence_type] || "📁"} {ev.evidence_type?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="text-[11px] text-slate-500 max-w-[100px] block truncate">{ev.source || "—"}</span></td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded capitalize font-semibold"
                      style={{
                        color: ev.status === "valid" ? "#16a34a" : ev.status === "expired" ? "#dc2626" : "#d97706",
                        background: ev.status === "valid" ? "rgba(22,163,74,0.1)" : ev.status === "expired" ? "rgba(220,38,38,0.1)" : "rgba(217,119,6,0.1)"
                      }}>
                      {ev.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="text-[11px] text-slate-500">{ev.collected_at ? new Date(ev.collected_at).toLocaleDateString() : "—"}</span></td>
                  <td className="px-4 py-3">
                    {isExpired ? <span className="text-[10px] text-red-400 font-bold">EXPIRED</span>
                      : days != null ? (
                        <span className="text-[10px] flex items-center gap-1" style={{ color: days <= 30 ? "#d97706" : "#64748b" }}>
                          {days <= 30 && <AlertTriangle className="w-3 h-3" />}{days}d
                        </span>
                      ) : <span className="text-slate-700">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {ev.auto_generated ? <span className="text-[9px] px-1.5 py-0.5 rounded text-blue-400" style={{ background: "rgba(59,130,246,0.1)" }}>AUTO</span> : <span className="text-slate-700">—</span>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-600">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No evidence records found</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}