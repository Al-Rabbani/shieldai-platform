import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, AlertTriangle, CheckCircle2, XCircle, Terminal, Calendar } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { differenceInDays, parseISO, isPast } from "date-fns";

const RISK_STYLE = {
  critical: { bg: "rgba(220,38,38,0.15)",  color: "#dc2626", border: "#dc2626" },
  high:     { bg: "rgba(234,88,12,0.15)",   color: "#ea580c", border: "#ea580c" },
  medium:   { bg: "rgba(217,119,6,0.15)",   color: "#d97706", border: "#d97706" },
  low:      { bg: "rgba(22,163,74,0.15)",   color: "#16a34a", border: "#16a34a" },
  safe:     { bg: "rgba(107,114,128,0.15)", color: "#6b7280", border: "#6b7280" },
};

const LICENSE_COLOR = {
  "GPL-3.0": "#dc2626", "GPL-2.0": "#dc2626", "AGPL-3.0": "#dc2626",
  "LGPL-2.1": "#d97706", "LGPL-3.0": "#d97706",
  "MIT": "#16a34a", "Apache-2.0": "#16a34a", "BSD-2-Clause": "#16a34a", "BSD-3-Clause": "#16a34a",
};

function EolStatus({ eolDate }) {
  if (!eolDate) return null;
  let d;
  try { d = parseISO(eolDate); } catch { return null; }
  const past = isPast(d);
  const days = Math.abs(differenceInDays(new Date(), d));
  if (past) return (
    <span className="text-xs font-bold text-red-400">EXPIRED {days} days ago ({eolDate})</span>
  );
  if (days <= 90) return (
    <span className="text-xs font-semibold text-amber-400">Expires in {days} days ({eolDate})</span>
  );
  return <span className="text-xs text-slate-400">{eolDate}</span>;
}

export default function LicenseDrawer({ pkg, onClose, queryKey }) {
  const qc = useQueryClient();

  const updateMut = useMutation({
    mutationFn: (status) => base44.entities.LicenseRisk.update(pkg?.id, { status }),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey });
      toast.success(`Package marked as ${status}`);
      onClose();
    },
  });

  if (!pkg) return null;
  const risk = RISK_STYLE[pkg.risk_level] || RISK_STYLE.safe;
  const licColor = LICENSE_COLOR[pkg.license] || "#94a3b8";
  const isHighRisk = pkg.risk_level === "critical" || pkg.risk_level === "high";

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div className="w-full max-w-lg bg-slate-950 border-l border-slate-800 flex flex-col h-full shadow-2xl animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-white font-bold text-base">{pkg.package_name}</h2>
            <p className="text-slate-400 text-xs font-mono mt-0.5">v{pkg.version} · {pkg.registry?.toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Risk + License */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase" style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.border}40` }}>
              {pkg.risk_level}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${licColor}20`, color: licColor, border: `1px solid ${licColor}40` }}>
              {pkg.license || "Unknown"}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
              {pkg.is_direct ? "Direct" : "Transitive"}
            </span>
          </div>

          {/* Risk reason callout */}
          {isHighRisk && pkg.risk_reason && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200 leading-relaxed">{pkg.risk_reason}</p>
              </div>
            </div>
          )}

          {/* EOL */}
          {pkg.eol_date && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">End of Life Date</p>
                <EolStatus eolDate={pkg.eol_date} />
              </div>
            </div>
          )}

          {/* Replacement */}
          {pkg.replacement && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-emerald-300 font-semibold mb-0.5">Recommended Replacement</p>
                  <p className="text-xs text-emerald-200">{pkg.replacement}</p>
                </div>
              </div>
            </div>
          )}

          {/* Used in */}
          {pkg.used_in && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Used In</p>
              <p className="text-xs font-mono text-slate-300 bg-slate-800 px-3 py-2 rounded-lg break-all">{pkg.used_in}</p>
            </div>
          )}

          {/* Upgrade command */}
          {pkg.upgrade_command && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Upgrade Command</p>
              <div className="flex items-start gap-2 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg">
                <Terminal className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
                <code className="text-xs font-mono text-emerald-300 break-all">{pkg.upgrade_command}</code>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-slate-800 flex gap-2">
          <button onClick={() => updateMut.mutate("upgrading")} disabled={updateMut.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            <Terminal className="w-3.5 h-3.5" /> Upgrade Now
          </button>
          <button onClick={() => updateMut.mutate("approved")} disabled={updateMut.isPending}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-emerald-300 border border-emerald-600/40 hover:bg-emerald-500/10 transition-all">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </button>
          <button onClick={() => updateMut.mutate("rejected")} disabled={updateMut.isPending}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-red-300 border border-red-600/40 hover:bg-red-500/10 transition-all">
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}