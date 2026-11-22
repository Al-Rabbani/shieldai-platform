export default function VulnSummaryBar({ total, critical, high, kev, accepted }) {
  // Every figure here is the platform's own aggregate over the whole set, not the length of the page this tab
  // fetched. `null` renders "—": an unknown total must not look like a clean zero.
  //
  // Two tiles were removed rather than restyled, because the data behind them could not support the claim:
  // "Exploited in Wild" was fed by kev_listed (KEV-listed is weaker than exploited in the wild, so the tile now
  // says KEV Listed), and "SLA Breached" was fed by a field security_findings does not have, so it was always 0.
  const show = (value) => (value === null || value === undefined ? "—" : value);
  const items = [
    { label: "Open", value: show(total), color: "text-white" },
    { label: "Critical", value: show(critical), color: "text-red-400" },
    { label: "High", value: show(high), color: "text-orange-400" },
    { label: "KEV Listed", value: show(kev), color: "text-red-400", pulse: (kev ?? 0) > 0 },
    { label: "Accepted Risk", value: show(accepted), color: "text-amber-400" },
  ];
  return (
    <div className="grid grid-cols-5 gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-center gap-1.5">
            <p className={`text-2xl font-bold ${it.color} ${it.pulse ? "animate-pulse" : ""}`}>{it.value}</p>
            {it.pulse && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
