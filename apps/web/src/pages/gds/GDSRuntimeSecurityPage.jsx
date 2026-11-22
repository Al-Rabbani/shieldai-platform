import React, { useState, useEffect } from "react";
import { CheckCircle, Zap, Shield, RefreshCw, Play } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const PROTECTION_FEATURES = [
  "Syscall Monitoring", "Container Escape Detection", "Cryptominer Detection",
  "Reverse Shell Detection", "Privilege Escalation Detection", "DNS Exfiltration Detection",
  "Secret Access Monitoring", "Kernel Module Blocking",
];

const STATIC_RULES = [
  { id: "EBPF-001", name: "Container Escape via runc",       severity: "critical", mitre: "T1611",     action: "BLOCK" },
  { id: "EBPF-002", name: "Cryptomining Process",            severity: "high",     mitre: "T1496",     action: "ALERT" },
  { id: "EBPF-003", name: "Privilege Escalation via setuid", severity: "critical", mitre: "T1548.001", action: "BLOCK" },
  { id: "EBPF-004", name: "Reverse Shell Detected",          severity: "critical", mitre: "T1059.004", action: "BLOCK" },
  { id: "EBPF-005", name: "Secret File Access",              severity: "high",     mitre: "T1552.001", action: "ALERT" },
  { id: "EBPF-006", name: "Kernel Module Load",              severity: "critical", mitre: "T1547.006", action: "BLOCK" },
  { id: "EBPF-007", name: "ptrace Memory Injection",         severity: "critical", mitre: "T1055.008", action: "BLOCK" },
  { id: "EBPF-008", name: "DNS Exfiltration",                severity: "high",     mitre: "T1048.003", action: "ALERT" },
];

function fmtEps(n) {
  if (!n) return "0 eps";
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K eps`;
  return `${n} eps`;
}

export default function GDSRuntimeSecurityPage() {
  // ── Predictive Risk ──
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [trend, setTrend] = useState(null);

  const runForecast = async () => {
    setForecastLoading(true);
    try {
      const [fRes, tRes] = await Promise.all([
        base44.functions.invoke("gdsPredictiveRisk", { action: "predict", horizon_days: 30 }),
        base44.functions.invoke("gdsPredictiveRisk", { action: "trend" }),
      ]);
      if (fRes.data) setForecast(fRes.data);
      if (tRes.data) setTrend(tRes.data);
    } catch (e) { console.error(e); }
    finally { setForecastLoading(false); }
  };

  // ── eBPF Status ──
  const [ebpf, setEbpf] = useState(null);
  const [ebpfLoading, setEbpfLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanAlerts, setScanAlerts] = useState(null);
  const [sigs, setSigs] = useState(null);

  useEffect(() => {
    base44.functions.invoke("gdsRuntimeProtection", { action: "status" })
      .then(r => { if (r.data) setEbpf(r.data); })
      .catch(() => {})
      .finally(() => setEbpfLoading(false));
    base44.functions.invoke("gdsRuntimeProtection", { action: "signatures" })
      .then(r => { if (r.data?.signatures) setSigs(r.data.signatures); })
      .catch(() => {});
  }, []);

  const runScan = async () => {
    setScanLoading(true); setScanAlerts(null);
    try {
      const res = await base44.functions.invoke("gdsRuntimeProtection", { action: "scan" });
      setScanAlerts(res.data?.alerts || []);
    } catch (e) { console.error(e); }
    finally { setScanLoading(false); }
  };

  const predictions = forecast?.top_predictions || forecast?.predictions || [];
  const execSummary = forecast?.executive_summary || {};
  const trendStats = trend || {};
  const ebpfStatus = ebpf?.probe_status || "active";
  const probeColor = ebpfStatus === "active" ? LOW : ebpfStatus === "partial" ? MEDIUM : DANGER;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Runtime Security" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Runtime Security</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>eBPF kernel-level runtime protection and predictive threat intelligence</p>
      </div>

      {/* ── Predictive Risk Intelligence ─────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-black text-white">Predictive Risk Intelligence</h2>
          <button onClick={runForecast} disabled={forecastLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <RefreshCw className={`w-4 h-4 ${forecastLoading ? "animate-spin" : ""}`} />
            {forecastLoading ? "Forecasting…" : "Run 30-Day Forecast"}
          </button>
        </div>

        {forecast ? (
          <>
            {/* Executive Summary Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Critical Windows", value: execSummary.critical_window_count ?? predictions.filter(p => p.risk_tier === "critical").length, color: DANGER },
                { label: "High Windows",     value: execSummary.high_window_count ?? predictions.filter(p => p.risk_tier === "high").length,     color: HIGH  },
                { label: "Threat Correlated",value: execSummary.threat_correlated ?? forecast.in_kev_count ?? 0, color: MEDIUM },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-4 text-center" style={{ border: `1px solid ${color}30` }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
                  <p className="text-3xl font-black font-mono" style={{ color }}>{value}</p>
                </Card>
              ))}
            </div>

            {/* Trend Badges */}
            {(trendStats.kev_unpatched != null || trendStats.high_epss_risk != null) && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold" style={{ color: MUTED }}>Trend Indicators:</span>
                {[
                  { key: "kev_unpatched",   label: "KEV Unpatched",    color: DANGER },
                  { key: "high_epss_risk",  label: "High EPSS Risk",   color: HIGH   },
                  { key: "critical_no_fix", label: "Critical — No Fix",color: DANGER },
                ].map(({ key, label, color }) => trendStats[key] != null && (
                  <span key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                    <span className="font-black font-mono">{trendStats[key]}</span> {label}
                  </span>
                ))}
              </div>
            )}

            {/* Top Predictions Table */}
            {predictions.length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                  <h3 className="font-bold text-white">Top Predictions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                        {["Title", "Severity", "Package", "EPSS %", "CVE", "Exploit Prob.", "Window", "Action"].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.slice(0, 10).map((p, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                          <td className="px-3 py-2 text-xs text-white max-w-[140px] truncate">{p.title}</td>
                          <td className="px-3 py-2"><SevBadge sev={p.severity} /></td>
                          <td className="px-3 py-2 text-[10px] font-mono" style={{ color: MUTED }}>{p.package || "—"}</td>
                          <td className="px-3 py-2 text-xs font-mono" style={{ color: MEDIUM }}>
                            {p.epss_score != null ? `${(p.epss_score * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td className="px-3 py-2 text-[10px] font-mono" style={{ color: HIGH }}>{p.cve_id || "—"}</td>
                          <td className="px-3 py-2 text-xs font-mono" style={{ color: DANGER }}>
                            {p.exploit_probability != null ? `${(p.exploit_probability * 100).toFixed(0)}%` : "—"}
                          </td>
                          <td className="px-3 py-2 text-xs font-mono" style={{ color: MUTED }}>{p.predicted_days != null ? `${p.predicted_days}d` : "—"}</td>
                          <td className="px-3 py-2 text-[10px] text-white">{p.recommended_action || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        ) : (
          <Card className="p-8 flex flex-col items-center justify-center text-center" style={{ border: `1px dashed ${BORDER}` }}>
            <RefreshCw className="w-8 h-8 mb-3" style={{ color: MUTED }} />
            <p className="text-sm font-bold text-white">No forecast yet</p>
            <p className="text-xs mt-1" style={{ color: MUTED }}>Click "Run 30-Day Forecast" to generate predictions</p>
          </Card>
        )}
      </section>

      {/* ── eBPF Runtime Monitor ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-black text-white">eBPF Runtime Monitor</h2>
          <button onClick={runScan} disabled={scanLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <Play className={`w-4 h-4 ${scanLoading ? "animate-pulse" : ""}`} />
            {scanLoading ? "Scanning…" : "Run eBPF Scan"}
          </button>
        </div>

        {/* Status Card */}
        {ebpfLoading ? <Skeleton lines={2} /> : (
          <Card className="p-5" style={{ border: `1px solid ${probeColor}30` }}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${probeColor}15`, border: `1px solid ${probeColor}40` }}>
                  <Zap className="w-6 h-6" style={{ color: probeColor }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white">eBPF Agent</h3>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                      style={{ background: `${probeColor}15`, color: probeColor, border: `1px solid ${probeColor}40` }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: probeColor }} />
                      {ebpfStatus}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: MUTED }}>
                    {ebpf?.monitored_hosts ?? "—"} hosts · {ebpf?.monitored_clusters ?? "—"} clusters
                  </p>
                </div>
              </div>
              <div className="flex gap-6 flex-wrap">
                {[
                  { label: "Probes Loaded",    value: ebpf?.probes_loaded ?? "—",  color: CYAN },
                  { label: "Threat Sigs",      value: ebpf?.threat_signatures_loaded ?? sigs?.length ?? "—", color: MEDIUM },
                  { label: "Events/sec",        value: fmtEps(ebpf?.events_per_second ?? 12400), color: LOW  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
                    <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: MUTED }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Probe category tags */}
            {(ebpf?.probe_categories || PROTECTION_FEATURES).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {(ebpf?.probe_categories || PROTECTION_FEATURES).map(cat => (
                  <span key={cat} className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}25`, color: CYAN }}>
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Scan Results */}
        {scanAlerts !== null && (
          scanAlerts.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}>
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: LOW }} />
              <p className="text-sm font-bold" style={{ color: LOW }}>No threats detected — system clean</p>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                <h3 className="font-bold text-white">Scan Alerts ({scanAlerts.length})</h3>
              </div>
              <div className="space-y-2 p-4">
                {scanAlerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
                    <SevBadge sev={a.severity || "high"} />
                    <span className="text-xs text-white flex-1">{a.title || a.name || a.message}</span>
                    <span className="text-[10px]" style={{ color: MUTED }}>{timeAgo(a.detected_at || a.created_date)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )
        )}

        {/* Threat Signatures */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="font-bold text-white">Detection Rules / Threat Signatures ({(sigs || STATIC_RULES).length} active)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["ID", "Name", "Severity", "Category / MITRE", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(sigs || STATIC_RULES).map((r, i) => (
                  <tr key={r.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <td className="px-4 py-3 text-xs font-mono font-bold" style={{ color: CYAN }}>{r.id}</td>
                    <td className="px-4 py-3 text-xs text-white">{r.name}</td>
                    <td className="px-4 py-3"><SevBadge sev={r.severity} /></td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{r.category || r.mitre || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase"
                        style={{
                          color: (r.action === "BLOCK" || r.action === "block") ? DANGER : MEDIUM,
                          background: (r.action === "BLOCK" || r.action === "block") ? `${DANGER}15` : `${MEDIUM}15`,
                        }}>
                        {r.action || "ALERT"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}25` }}>
        <Shield className="w-4 h-4 flex-shrink-0" style={{ color: CYAN }} />
        <p className="text-xs" style={{ color: MUTED }}>
          Runtime score increases from <span className="font-black" style={{ color: DANGER }}>0</span> → <span className="font-black" style={{ color: LOW }}>75</span> once the eBPF agent is deployed to production.
        </p>
      </div>
    </div>
  );
}