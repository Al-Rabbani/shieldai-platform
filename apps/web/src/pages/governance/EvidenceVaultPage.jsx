import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FolderOpen, Plus, Download, Share2, AlertTriangle } from "lucide-react";

const TYPE_ICON = { screenshot: "📸", scan_output: "🔍", audit_log: "📋", policy_doc: "📄", configuration_export: "⚙️", attestation: "✅", test_result: "🧪" };
const TYPE_COLOR = { screenshot: "#ec4899", scan_output: "#3b82f6", audit_log: "#8b5cf6", policy_doc: "#10b981", configuration_export: "#06b6d4", attestation: "#eab308", test_result: "#f97316" };
const FW_COLOR = { SOC2: "#3b82f6", ISO27001: "#8b5cf6", GDPR: "#ef4444", PCI_DSS: "#f97316", NIST_CSF: "#06b6d4", CIS_Benchmark: "#10b981", HIPAA: "#ec4899" };
const STATUS_COLOR = { valid: "#10b981", expired: "#ef4444", pending_review: "#eab308" };

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function ExpiryBadge({ expiresAt, status }) {
  const days = daysUntil(expiresAt);
  if (status === "expired") return (
    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded" style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>EXPIRED</span>
  );
  if (days == null) return <span className="text-slate-600 text-[10px]">—</span>;
  const color = days <= 7 ? "#ef4444" : days <= 30 ? "#eab308" : "#10b981";
  return (
    <div className="flex items-center gap-1">
      {days <= 30 && <AlertTriangle className="w-3 h-3" style={{ color }} />}
      <span className="text-[10px] font-mono font-semibold" style={{ color }}>
        {days <= 0 ? "Expired" : `${days}d left`}
      </span>
    </div>
  );
}

export default function EvidenceVaultPage() {
  const [fwFilter, setFwFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: evidence = [] } = useQuery({
    queryKey: ["evidence-vault"],
    queryFn: () => base44.entities.EvidenceVault.list("-collected_at", 50),
  });

  const filtered = evidence.filter(e => {
    if (fwFilter !== "all" && e.framework !== fwFilter) return false;
    if (typeFilter !== "all" && e.evidence_type !== typeFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  const valid = evidence.filter(e => e.status === "valid").length;
  const expired = evidence.filter(e => e.status === "expired").length;
  const expiringSoon = evidence.filter(e => { const d = daysUntil(e.expires_at); return d != null && d >= 0 && d <= 30 && e.status === "valid"; }).length;
  const pending = evidence.filter(e => e.status === "pending_review").length;

  const allTypes = [...new Set(evidence.map(e => e.evidence_type))];
  const allFw = [...new Set(evidence.map(e => e.framework))];

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-black text-white font-mono">EVIDENCE VAULT</h1>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Compliance evidence collection and audit trail management</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-amber-400 btn-interactive"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <Plus className="w-4 h-4" /> Add Evidence
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "VALID", val: valid, color: "#10b981" },
          { label: "PENDING REVIEW", val: pending, color: "#eab308" },
          { label: "EXPIRING SOON", val: expiringSoon, color: "#f97316" },
          { label: "EXPIRED", val: expired, color: "#ef4444", pulse: expired > 0 },
        ].map(({ label, val, color, pulse }) => (
          <div key={label} className="rounded-xl p-4 text-center card-hover"
            style={{ background: `linear-gradient(145deg, ${color}0d, #0a0f1e)`, border: `1px solid ${color}25` }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
              <p className="text-[9px] font-mono font-semibold tracking-widest text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { val: fwFilter, set: setFwFilter, opts: ["all", ...allFw], label: "Framework" },
          { val: typeFilter, set: setTypeFilter, opts: ["all", ...allTypes], label: "Type" },
          { val: statusFilter, set: setStatusFilter, opts: ["all", "valid", "expired", "pending_review"], label: "Status" },
        ].map(({ val, set, opts, label }) => (
          <select key={label} value={val} onChange={e => set(e.target.value)}
            className="text-xs rounded-lg px-3 py-2 outline-none"
            style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.5)", color: "#94a3b8" }}>
            <option value="all">All {label}s</option>
            {opts.filter(o => o !== "all").map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
          </select>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((ev) => {
          const days = daysUntil(ev.expires_at);
          const isExpired = ev.status === "expired";
          const typeColor = TYPE_COLOR[ev.evidence_type] || "#475569";
          const fwColor = FW_COLOR[ev.framework] || "#475569";
          const statusColor = STATUS_COLOR[ev.status] || "#475569";
          return (
            <div key={ev.id} className="rounded-xl p-5 card-hover relative overflow-hidden group"
              style={{
                background: isExpired ? "rgba(239,68,68,0.04)" : "#0a0f1e",
                border: `1px solid ${isExpired ? "rgba(239,68,68,0.25)" : "rgba(30,58,95,0.4)"}`,
                filter: isExpired ? "saturate(0.6)" : "none"
              }}>
              {isExpired && (
                <div className="absolute top-4 right-4 -rotate-12">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#ef4444", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }}>EXPIRED</span>
                </div>
              )}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: `${typeColor}15`, border: `1px solid ${typeColor}30` }}>
                  {TYPE_ICON[ev.evidence_type] || "📁"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{ev.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{ev.source || "Unknown source"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold capitalize"
                  style={{ color: fwColor, background: `${fwColor}15`, border: `1px solid ${fwColor}25` }}>
                  {ev.framework}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                  style={{ color: typeColor, background: `${typeColor}12` }}>
                  {ev.evidence_type?.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold capitalize"
                  style={{ color: statusColor, background: `${statusColor}12`, border: `1px solid ${statusColor}25` }}>
                  {ev.status?.replace(/_/g, " ")}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-4">
                <span className="font-mono">{ev.collected_by}</span>
                <span>{ev.collected_at ? new Date(ev.collected_at).toLocaleDateString() : "—"}</span>
              </div>

              <div className="flex items-center justify-between">
                <ExpiryBadge expiresAt={ev.expires_at} status={ev.status} />
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-lg transition-all btn-interactive"
                    style={{ color: "#94a3b8", background: "#1e293b", border: "1px solid rgba(30,58,95,0.5)" }}>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 rounded-lg transition-all btn-interactive"
                    style={{ color: "#94a3b8", background: "#1e293b", border: "1px solid rgba(30,58,95,0.5)" }}>
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-slate-600">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No evidence records found</p>
          </div>
        )}
      </div>
    </div>
  );
}