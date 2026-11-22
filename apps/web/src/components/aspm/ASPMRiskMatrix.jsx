const ASSET_ICONS = { repository: "📦", vm: "🖥️", cloud: "☁️", api: "🔌", container: "🐳", domain: "🌐" };
const CRIT_ROWS = ["critical", "high", "medium", "low"];

export default function ASPMRiskMatrix({ assets }) {
  const COLS = ["internet-facing", "internal"];

  const getBubbleColor = (score) => {
    if (score >= 70) return "#ef4444";
    if (score >= 40) return "#f97316";
    return "#10b981";
  };

  const getBubbleSize = (totalFindings) => {
    if (totalFindings >= 20) return 52;
    if (totalFindings >= 10) return 40;
    if (totalFindings >= 5) return 32;
    return 24;
  };

  return (
    <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(139,92,246,0.2)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">ASPM Risk Matrix</h3>
          <p className="text-xs text-slate-500 mt-0.5">Business Criticality × Internet Exposure. Bubble size = total findings. Color = risk score.</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500/60" />Risk &gt;70</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500/60" />Risk 40-70</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500/60" />Risk &lt;40</span>
        </div>
      </div>

      {/* Matrix */}
      <div className="grid gap-0" style={{ gridTemplateColumns: "90px 1fr 1fr" }}>
        {/* Header */}
        <div />
        <div className="text-center pb-2 text-[10px] font-mono font-semibold text-slate-400 border-b border-slate-700/50">🌐 Internet Facing</div>
        <div className="text-center pb-2 text-[10px] font-mono font-semibold text-slate-400 border-b border-slate-700/50">🔒 Internal</div>

        {/* Rows */}
        {CRIT_ROWS.map((crit, ri) => (
          <>
            <div key={`label-${crit}`} className="flex items-center justify-end pr-3 py-2 text-[10px] font-mono font-bold uppercase"
              style={{ color: crit === "critical" ? "#ef4444" : crit === "high" ? "#f97316" : crit === "medium" ? "#eab308" : "#64748b",
                borderTop: ri > 0 ? "1px solid rgba(30,58,95,0.3)" : undefined }}>
              {crit}
            </div>
            {COLS.map((col, ci) => {
              const isFacing = col === "internet-facing";
              const cellAssets = assets.filter(a =>
                a.business_criticality === crit && a.internet_facing === isFacing
              );
              return (
                <div key={`${crit}-${col}`} className="relative min-h-[80px] flex flex-wrap items-center gap-2 p-3"
                  style={{
                    borderTop: ri > 0 ? "1px solid rgba(30,58,95,0.3)" : undefined,
                    borderLeft: ci === 0 ? "1px solid rgba(30,58,95,0.3)" : undefined,
                    background: crit === "critical" && isFacing ? "rgba(239,68,68,0.04)" : "transparent"
                  }}>
                  {cellAssets.map(a => {
                    const size = getBubbleSize(a.total_findings || 0);
                    const color = getBubbleColor(a.risk_score || 0);
                    return (
                      <div key={a.id} className="relative group cursor-pointer flex-shrink-0"
                        style={{ width: size, height: size }}>
                        <div className="w-full h-full rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                          style={{ background: `${color}20`, border: `2px solid ${color}60`, boxShadow: `0 0 8px ${color}30` }}>
                          <span style={{ fontSize: size > 36 ? "14px" : "10px" }}>{ASSET_ICONS[a.asset_type] || "📄"}</span>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-44 rounded-lg p-2.5"
                          style={{ background: "#0f172a", border: "1px solid rgba(139,92,246,0.4)", boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
                          <p className="text-xs font-bold text-white truncate">{a.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{a.team}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-mono" style={{ color }}>Risk: {a.risk_score}</span>
                            <span className="text-[10px] font-mono text-red-400">Crit: {a.critical_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {cellAssets.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[10px] text-slate-800 font-mono">—</span>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}