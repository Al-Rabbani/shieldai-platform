import { Link } from "react-router-dom";

const ASSET_ICONS = { repository: "📦", vm: "🖥️", cloud: "☁️", api: "🔌", container: "🐳", domain: "🌐" };
const CRIT_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
const CRIT_BG = { critical: "rgba(239,68,68,0.12)", high: "rgba(249,115,22,0.12)", medium: "rgba(234,179,8,0.1)", low: "rgba(34,197,94,0.1)" };

function RiskGauge({ score }) {
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f97316" : "#10b981";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-black font-mono" style={{ color }}>{score}</span>
    </div>
  );
}

export default function ASPMAssetRow({ asset: a, index, scannerColors }) {
  const scanners = (a.scanners_coverage || "").split(",").map(s => s.trim()).filter(Boolean);
  const bg = index % 2 === 0 ? "#0a0f1e" : "#080d18";

  return (
    <Link to={`/aspm/${a.id}`} className="block transition-colors hover:bg-slate-800/20"
      style={{ borderBottom: "1px solid rgba(30,58,95,0.3)" }}>
      <div className="grid items-center px-4 py-3 gap-2"
        style={{ gridTemplateColumns: "90px 1fr 100px 120px 120px 80px 80px 120px 80px 60px 80px 60px", background: bg }}>
        {/* Criticality */}
        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase w-fit"
          style={{ color: CRIT_COLORS[a.business_criticality], background: CRIT_BG[a.business_criticality] }}>
          {a.business_criticality}
        </span>
        {/* Asset name */}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate font-mono">{a.name}</p>
          {a.team && <p className="text-[10px] text-slate-500">{a.description?.slice(0, 40) || a.tech_stack?.slice(0, 40)}</p>}
        </div>
        {/* Type */}
        <span className="text-xs text-slate-400">{ASSET_ICONS[a.asset_type] || "📄"} {a.asset_type}</span>
        {/* Team */}
        <span className="text-[10px] font-mono text-violet-300 truncate">{a.team || "—"}</span>
        {/* Owner */}
        <span className="text-[10px] font-mono text-slate-500 truncate">{a.owner || "—"}</span>
        {/* Internet Facing */}
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded w-fit ${a.internet_facing ? "text-red-400 bg-red-500/10" : "text-slate-500 bg-slate-800/50"}`}>
          {a.internet_facing ? "🌐 Yes" : "🔒 No"}
        </span>
        {/* Env */}
        <span className="text-[10px] font-mono text-slate-500 capitalize">{a.environment || "—"}</span>
        {/* Scanners */}
        <div className="flex flex-wrap gap-1">
          {scanners.slice(0, 3).map(s => (
            <span key={s} className="text-[9px] font-mono font-bold px-1 py-0.5 rounded"
              style={{ color: scannerColors[s] || "#64748b", background: `${scannerColors[s] || "#64748b"}18` }}>
              {s.slice(0, 4)}
            </span>
          ))}
          {scanners.length > 3 && <span className="text-[9px] font-mono text-slate-600">+{scanners.length-3}</span>}
        </div>
        {/* Total Findings */}
        <span className="text-sm font-bold font-mono text-slate-300">{a.total_findings || 0}</span>
        {/* Critical */}
        <span className="text-sm font-black font-mono" style={{ color: (a.critical_count || 0) > 0 ? "#ef4444" : "#374151" }}>{a.critical_count || 0}</span>
        {/* Risk */}
        <RiskGauge score={a.risk_score || 0} />
        {/* SLA */}
        <span className={`text-xs font-mono font-bold ${(a.sla_breached_count || 0) > 0 ? "text-red-400" : "text-slate-600"}`}>
          {a.sla_breached_count || 0}
        </span>
      </div>
    </Link>
  );
}