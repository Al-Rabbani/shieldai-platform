import React from "react";

export function DashboardPage({ title, subtitle, badge, children }) {
  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {badge && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-slate-400 -mt-3">{subtitle}</p>}
      {children}
    </div>
  );
}

export function StatTile({ icon: Icon, label, value, sublabel, accent = "#3b82f6" }) {
  return (
    <div className="rounded-xl p-4 transition hover:scale-[1.02]" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        {Icon && <Icon size={18} style={{ color: accent }} />}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sublabel && <p className="text-[11px] text-slate-500 mt-1">{sublabel}</p>}
    </div>
  );
}

export function SectionCard({ title, action, children }) {
  return (
    <div className="rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const SEV_STYLES = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  info: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function SeverityBadge({ severity }) {
  const cls = SEV_STYLES[severity] || SEV_STYLES.info;
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{(severity || "info").toUpperCase()}</span>;
}

const STATUS_STYLES = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  online: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  compliant: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  connected: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  delivered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  sent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
  offline: "bg-red-500/20 text-red-400 border-red-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  non_compliant: "bg-red-500/20 text-red-400 border-red-500/30",
  inactive: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  partial: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  trial: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  not_started: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{(status || "unknown").replace(/_/g, " ").toUpperCase()}</span>;
}

export function ProgressBar({ value, max = 100, color = "#3b82f6" }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#1F2937" }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Tag({ children }) {
  return <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600/30">{children}</span>;
}

export function LoadingSpinner() {
  return <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />;
}

export function EmptyState({ message = "No data available" }) {
  return (
    <div className="text-center py-10">
      <p className="text-3xl mb-2">📭</p>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="px-3 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none w-64"
    />
  );
}

export function gradeFromScore(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function gradeColor(grade) {
  if (grade === "A") return "#10b981";
  if (grade === "B") return "#3b82f6";
  if (grade === "C") return "#f59e0b";
  if (grade === "D") return "#f97316";
  return "#ef4444";
}