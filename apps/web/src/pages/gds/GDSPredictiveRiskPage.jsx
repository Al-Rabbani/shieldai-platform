import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG, SevBadge, Card, KpiCard } from "@/components/gds/GDSOSShared";

const TIER_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW, minimal: MUTED };

function EPSSBar({ value }) {
  const pct = Math.min(Math.round((value || 0) * 100), 100);
  const color = pct >= 70 ? DANGER : pct >= 40 ? HIGH : pct >= 10 ? MEDIUM : LOW;
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-black font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
}

function PredictionRow({ f }) {
  const [open, setOpen] = useState(false);
  const tc = TIER_COLORS[f.risk_tier] || MUTED;
  return (
    <>
      <tr style={{ borderBottom: `1px solid ${BORDER}20`, background: CARD }}>
        <td className="px-4 py-2 text-xs text-white truncate max-w-[180px]">{f.title}</td>
        <td className="px-4 py-2"><SevBadge sev={f.severity} /></td>
        <td className="px-4 py-2"><EPSSBar value={f.epss_score} /></td>
        <td className="px-4 py-2">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase" style={{ color: tc, background: `${tc}15` }}>{f.risk_tier}</span>
        </td>
        <td className="px-4 py-2 text-xs font-mono" style={{ color: f.predicted_days <= 7 ? DANGER : MUTED }}>
          {f.predicted_days != null ? `${f.predicted_days}d` : "—"}
        </td>
        <td className="px-4 py-2 text-xs font-black font-mono" style={{ color: CYAN }}>{f.priority_score ?? "—"}</td>
        <td className="px-4 py-2">
          {f.reasoning && <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-xs" style={{ color: CYAN }}>
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>}
        </td>
      </tr>
      {open && f.reasoning && (
        <tr style={{ borderBottom: `1px solid ${BORDER}20` }}>
          <td colSpan={7} className="px-4 py-2">
            <div className="p-2 rounded-lg text-[10px]" style={{ background: `${CYAN}08`, color: MUTED }}>{f.reasoning}</div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function GDSPredictiveRiskPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { data: triaged = [] } = useQuery({ queryKey: ["pred-triaged"], queryFn: () => base44.entities.TriagedFinding.filter({ status: "open" }).catch(() => []) });
  const { data: cloudFindings = [] } = useQuery({ queryKey: ["pred-cloud"], queryFn: () => base44.entities.CloudFinding.list("-detected_at", 50).catch(() => []) });

  const run = async (findings) => {
    setLoading(true); setError(null);
    const payload = findings || [...triaged, ...cloudFindings].map(f => ({
      ...f, normalized_severity: f.normalized_severity || f.severity,
    }));
    try {
      const res = await base44.functions.invoke("gdsPredictiveRisk", { action: "predict_all", save_to_db: false, findings: payload });
      if (res.data?.predictions?.length) setResult(res.data);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  // Auto-run when entity data is ready
  useEffect(() => {
    if ((triaged.length > 0 || cloudFindings.length > 0) && !result && !loading) {
      run([...triaged, ...cloudFindings].map(f => ({ ...f, normalized_severity: f.normalized_severity || f.severity })));
    }
  }, [triaged, cloudFindings]);

  const predictions = result?.predictions || [];
  const topTen = [...predictions].sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0)).slice(0, 10);
  const kevFindings = predictions.filter(f => f.in_kev);

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">🔮</span>
        <div>
          <h1 className="text-2xl font-black text-white">Predictive Risk Engine</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>EPSS v3 + CISA KEV + CVSS + Asset Context — predicts which vulnerabilities will be exploited BEFORE they hit the news</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => run()} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Predicting…" : "Refresh Predictions"}
        </button>
        <span className="text-[10px] px-3 py-1.5 rounded-xl" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}20`, color: CYAN }}>
          📊 Powered by FIRST.org EPSS v3 API — 22x more accurate than CVSS-only prioritization
        </span>
        {error && <p className="text-sm" style={{ color: DANGER }}>{error}</p>}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Findings Analyzed" value={result.findings_analyzed ?? predictions.length} color={CYAN} icon={TrendingUp} />
            <KpiCard label="Immediate Threats" value={result.immediate_threats ?? 0} color={DANGER} icon={TrendingUp} pulse />
            <KpiCard label="In CISA KEV" value={result.in_kev_count ?? kevFindings.length} color={DANGER} icon={TrendingUp} pulse />
            <KpiCard label="Exploit w/in 7d" value={result.exploit_within_7_days ?? 0} color={HIGH} icon={TrendingUp} />
          </div>

          {result.cvss_miss_count > 0 && (
            <Card className="p-4 flex items-center gap-3" style={{ border: `1px solid ${MEDIUM}30` }}>
              <span className="text-xl">📉</span>
              <p className="text-sm" style={{ color: TEXT }}>
                <span className="font-black text-white">CVSS-only would miss: </span>
                <span style={{ color: DANGER }}>{result.cvss_miss_count} findings</span>
                <span style={{ color: MUTED }}> — EPSS v3 catches them early before exploitation</span>
              </p>
            </Card>
          )}

          {kevFindings.length > 0 && (
            <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: `${DANGER}12`, border: `2px solid ${DANGER}40` }}>
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-black text-white">CISA KEV Alert — {kevFindings.length} exploited-in-wild CVE(s)</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {kevFindings.slice(0, 6).map((f, i) => (
                    <span key={i} className="text-[10px] font-mono font-black px-2 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}20` }}>
                      {f.cve_id || f.title?.slice(0, 20)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {topTen.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                <h3 className="font-bold text-white">Top 10 Predictions by Priority</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Title", "Severity", "EPSS %", "Risk Tier", "Days to Exploit", "Priority Score", ""].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topTen.map((f, i) => <PredictionRow key={i} f={f} />)}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}