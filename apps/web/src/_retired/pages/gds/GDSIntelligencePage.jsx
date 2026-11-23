import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, AlertTriangle, Globe, Package, Search } from "lucide-react";
import ThreatIntelHub from "@/components/gds/ThreatIntelHub";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, Skeleton, EmptyState, Card, KpiCard, Breadcrumb, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const RISK_COLOR = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

function RiskLevelBadge({ level }) {
  const color = RISK_COLOR[level?.toLowerCase()] || MUTED;
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {level || "—"}
    </span>
  );
}

function ScoreBar({ value, max = 100 }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 70 ? DANGER : pct >= 40 ? HIGH : MEDIUM;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-black font-mono w-6 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

export default function GDSIntelligencePage() {
  // ── Geopolitical Risk ──
  const [geo, setGeo] = useState(null);
  const [geoLoading, setGeoLoading] = useState(true);

  const loadGeo = async () => {
    setGeoLoading(true);
    try {
      const r = await base44.functions.invoke("gdsGeopoliticalRisk", { action: "assess" });
      if (r.data) setGeo(r.data);
    } catch (e) { console.error(e); }
    finally { setGeoLoading(false); }
  };

  // ── Zero-Day Watch ──
  const [zdw, setZdw] = useState(null);
  const [zdwLoading, setZdwLoading] = useState(true);

  const loadZdw = async () => {
    setZdwLoading(true);
    try {
      const r = await base44.functions.invoke("gdsZeroDayWatch", { action: "scan" });
      if (r.data) setZdw(r.data);
    } catch (e) { console.error(e); }
    finally { setZdwLoading(false); }
  };

  // ── Supply Chain Trust ──
  const [sct, setSct] = useState(null);
  const [sctLoading, setSctLoading] = useState(true);
  const [pkgQuery, setPkgQuery] = useState("");
  const [pkgResult, setPkgResult] = useState(null);
  const [pkgLoading, setPkgLoading] = useState(false);

  const loadSct = async () => {
    setSctLoading(true);
    try {
      const r = await base44.functions.invoke("gdsSupplyChainTrust", { action: "analyze" });
      if (r.data) setSct(r.data);
    } catch (e) { console.error(e); }
    finally { setSctLoading(false); }
  };

  const checkPackage = async () => {
    if (!pkgQuery.trim()) return;
    setPkgLoading(true); setPkgResult(null);
    try {
      const r = await base44.functions.invoke("gdsSupplyChainTrust", { action: "check_package", package: pkgQuery });
      setPkgResult(r.data);
    } catch (e) { console.error(e); }
    finally { setPkgLoading(false); }
  };

  useEffect(() => {
    loadGeo();
    loadZdw();
    loadSct();
  }, []);

  const geoScore = geo?.geopolitical_risk_score ?? geo?.risk_score ?? 0;
  const geoLevel = geo?.risk_level || (geoScore >= 70 ? "critical" : geoScore >= 50 ? "high" : geoScore >= 30 ? "medium" : "low");
  const geoColor = RISK_COLOR[geoLevel?.toLowerCase()] || MUTED;
  const events = geo?.correlated_events || geo?.events || [];
  const packages = sct?.packages || sct?.package_results || [];

  return (
    <div className="space-y-8" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Intelligence Command" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Intelligence Command</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Geopolitical risk, zero-day watch, and supply chain trust intelligence</p>
      </div>

      {/* ── Section 1: Geopolitical Risk ─────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Globe className="w-4 h-4" style={{ color: CYAN }} /> Geopolitical Risk Assessment
          </h2>
          <button onClick={loadGeo} disabled={geoLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <RefreshCw className={`w-3.5 h-3.5 ${geoLoading ? "animate-spin" : ""}`} />
            {geoLoading ? "Assessing…" : "Re-Assess Now"}
          </button>
        </div>

        {geoLoading ? <Skeleton lines={3} /> : !geo ? (
          <EmptyState icon={Globe} title="No assessment data" description="Click Re-Assess Now to load geopolitical intelligence" />
        ) : (
          <>
            {/* Hero Score + Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-1 p-6 flex flex-col items-center justify-center text-center"
                style={{ border: `1px solid ${geoColor}30` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Geopolitical Risk Score</p>
                <p className="text-5xl font-black font-mono mb-2" style={{ color: geoColor }}>{geoScore}</p>
                <RiskLevelBadge level={geoLevel} />
              </Card>
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Events Monitored</p>
                  <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{geo.events_monitored ?? events.length ?? 5}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>APT Groups Active</p>
                  <p className="text-3xl font-black font-mono" style={{ color: DANGER }}>
                    {geo.apt_groups_active ?? events.reduce((a, e) => a + (e.apt_groups?.length || 0), 0) ?? 0}
                  </p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Stack Overlaps</p>
                  <p className="text-3xl font-black font-mono" style={{ color: HIGH }}>
                    {events.filter(e => e.tech_overlap).length}
                  </p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Regions Affected</p>
                  <p className="text-3xl font-black font-mono" style={{ color: MEDIUM }}>
                    {new Set(events.map(e => e.region).filter(Boolean)).size || geo.regions_affected || "—"}
                  </p>
                </Card>
              </div>
            </div>

            {/* Immediate Actions */}
            {geo.immediate_actions?.length > 0 && (
              <div className="p-4 rounded-xl space-y-2" style={{ background: `${DANGER}10`, border: `2px solid ${DANGER}40` }}>
                <p className="text-xs font-black text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} /> Immediate Actions Required
                </p>
                {geo.immediate_actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs font-black flex-shrink-0" style={{ color: DANGER }}>{i + 1}.</span>
                    <p className="text-xs text-white">{a}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Correlated Events */}
            {events.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((ev, i) => (
                  <Card key={i} className="p-4"
                    style={{ border: `1px solid ${ev.tech_overlap ? DANGER + "40" : BORDER}` }}>
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ev.region && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: CYAN, background: `${CYAN}15` }}>{ev.region}</span>
                        )}
                        <RiskLevelBadge level={ev.threat_level || ev.severity} />
                        {ev.tech_overlap && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded animate-pulse"
                            style={{ color: DANGER, background: `${DANGER}18`, border: `1px solid ${DANGER}40` }}>
                            ⚠ YOUR STACK AT RISK
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-white mb-2">{ev.summary || ev.event_summary || ev.description}</p>
                    {ev.apt_groups?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {ev.apt_groups.map(g => (
                          <span key={g} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ color: HIGH, background: `${HIGH}15` }}>{g}</span>
                        ))}
                      </div>
                    )}
                    {ev.relevance_score != null && (
                      <div className="mb-2">
                        <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: MUTED }}>Relevance</p>
                        <ScoreBar value={ev.relevance_score} />
                      </div>
                    )}
                    {ev.recommendation && (
                      <p className="text-[10px] italic mt-1" style={{ color: MUTED }}>{ev.recommendation}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Section 2: Zero-Day Watch ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} /> Zero-Day Watch
          </h2>
          <button onClick={loadZdw} disabled={zdwLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${DANGER}12`, border: `1px solid ${DANGER}30`, color: DANGER }}>
            <RefreshCw className={`w-3.5 h-3.5 ${zdwLoading ? "animate-spin" : ""}`} />
            {zdwLoading ? "Scanning…" : "Scan Now"}
          </button>
        </div>

        {zdwLoading ? <Skeleton lines={3} /> : !zdw ? (
          <EmptyState icon={AlertTriangle} title="No scan data" description="Click Scan Now to check for new zero-days" />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Packages Scanned",     value: zdw.packages_scanned ?? zdw.scanned ?? "—", color: CYAN  },
                { label: "New Vulns Found",       value: zdw.new_vulnerabilities_found ?? zdw.new_vulns ?? 0, color: DANGER },
                { label: "CISA KEV Total",        value: zdw.cisa_kev_total ?? zdw.kev_total ?? "—", color: HIGH  },
                { label: "KEV Added (7d)",        value: zdw.kev_added_last_7_days ?? zdw.kev_new ?? 0, color: MEDIUM },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-4 text-center" style={{ border: `1px solid ${color}20` }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
                  <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
                </Card>
              ))}
            </div>

            {/* New Alerts Table */}
            {(zdw.new_alerts || zdw.alerts || []).length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                  <h3 className="font-bold text-white">New Vulnerability Alerts</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                        {["CVE ID", "Package", "Ecosystem", "Severity", "Summary", "Source"].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(zdw.new_alerts || zdw.alerts).map((a, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                          <td className="px-4 py-2">
                            <span className="text-[10px] font-mono font-bold" style={{ color: HIGH }}>{a.cve_id || "—"}</span>
                          </td>
                          <td className="px-4 py-2 text-xs font-mono text-white">{a.package || "—"}</td>
                          <td className="px-4 py-2 text-[10px]" style={{ color: MUTED }}>{a.ecosystem || "—"}</td>
                          <td className="px-4 py-2"><SevBadge sev={a.severity} /></td>
                          <td className="px-4 py-2 text-xs text-white max-w-[240px] truncate">{a.summary || "—"}</td>
                          <td className="px-4 py-2">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                              style={{ color: CYAN, background: `${CYAN}15` }}>{a.source || "OSV"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* CISA KEV Table */}
            {(zdw.cisa_kev || zdw.kev_entries || []).length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                  <h3 className="font-bold text-white">CISA KEV — Recent Entries</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                        {["CVE ID", "Product", "Vendor", "Date Added", "Due Date"].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(zdw.cisa_kev || zdw.kev_entries).slice(0, 15).map((k, i) => {
                        const isPast = k.due_date && new Date(k.due_date) < new Date();
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                            <td className="px-4 py-2 text-[10px] font-mono font-bold" style={{ color: HIGH }}>{k.cve_id || k.cveID}</td>
                            <td className="px-4 py-2 text-xs text-white">{k.product || k.vulnerabilityName}</td>
                            <td className="px-4 py-2 text-xs" style={{ color: MUTED }}>{k.vendor || k.vendorProject}</td>
                            <td className="px-4 py-2 text-xs font-mono" style={{ color: MUTED }}>{k.date_added || k.dateAdded}</td>
                            <td className="px-4 py-2 text-xs font-mono font-bold" style={{ color: isPast ? DANGER : LOW }}>
                              {k.due_date || k.dueDate || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </section>

      {/* ── Section 3: Threat Intelligence Hub ───────────────────────────── */}
      <section>
        <div className="border-t pt-6 mb-6" style={{ borderColor: "#1e3a5f" }} />
        <ThreatIntelHub />
      </section>

      {/* ── Section 4: Supply Chain Trust ────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: CYAN }} /> Supply Chain Trust
          </h2>
          <button onClick={loadSct} disabled={sctLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <RefreshCw className={`w-3.5 h-3.5 ${sctLoading ? "animate-spin" : ""}`} />
            {sctLoading ? "Analyzing…" : "Re-Analyze"}
          </button>
        </div>

        {sctLoading ? <Skeleton lines={3} /> : !sct ? (
          <EmptyState icon={Package} title="No trust data" description="Click Re-Analyze to load supply chain trust intelligence" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 flex flex-col items-center justify-center text-center"
                style={{ border: `1px solid ${CYAN}25` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Avg Trust Score</p>
                <p className="text-4xl font-black font-mono" style={{ color: (sct.average_trust_score ?? 0) >= 70 ? LOW : (sct.average_trust_score ?? 0) >= 40 ? MEDIUM : DANGER }}>
                  {sct.average_trust_score ?? sct.avg_trust_score ?? "—"}
                </p>
                <p className="text-[10px] mt-1" style={{ color: MUTED }}>/ 100</p>
              </Card>
              <Card className="p-4 text-center" style={{ border: `1px solid ${DANGER}20` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Packages</p>
                <p className="text-3xl font-black font-mono" style={{ color: DANGER }}>{sct.critical_packages ?? 0}</p>
              </Card>
              <Card className="p-4 text-center" style={{ border: `1px solid ${DANGER}20` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Malicious Packages</p>
                <p className="text-3xl font-black font-mono" style={{ color: DANGER }}>{sct.malicious_packages ?? 0}</p>
              </Card>
            </div>

            {/* Package Check Form */}
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3">Check Package</h3>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
                  <input value={pkgQuery} onChange={e => setPkgQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && checkPackage()}
                    placeholder="e.g. lodash, axios, express…"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
                </div>
                <button onClick={checkPackage} disabled={pkgLoading || !pkgQuery.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                  {pkgLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {pkgLoading ? "Checking…" : "Check"}
                </button>
              </div>
              {pkgResult && (
                <div className="mt-4 p-4 rounded-xl space-y-2" style={{ background: `${CYAN}06`, border: `1px solid ${CYAN}20` }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{pkgResult.package || pkgQuery}</p>
                    {pkgResult.trust_level && <RiskLevelBadge level={pkgResult.trust_level === "trusted" ? "low" : pkgResult.trust_level} />}
                    {pkgResult.is_malicious && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase"
                        style={{ color: DANGER, background: `${DANGER}20` }}>MALICIOUS</span>
                    )}
                  </div>
                  {pkgResult.trust_score != null && (
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: MUTED }}>Trust Score</p>
                      <ScoreBar value={pkgResult.trust_score} />
                    </div>
                  )}
                  {pkgResult.risk_flags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pkgResult.risk_flags.map(f => (
                        <span key={f} className="text-[9px] font-bold px-2 py-0.5 rounded"
                          style={{ color: HIGH, background: `${HIGH}15` }}>{f}</span>
                      ))}
                    </div>
                  )}
                  {pkgResult.recommendation && (
                    <p className="text-xs" style={{ color: MUTED }}>{pkgResult.recommendation}</p>
                  )}
                </div>
              )}
            </Card>

            {/* Packages Table */}
            {packages.length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                  <h3 className="font-bold text-white">Package Trust Analysis ({packages.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                        {["Package", "Ecosystem", "Trust Score", "Trust Level", "OSV Vulns", "Malicious", "Recommendation"].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {packages.map((p, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                          <td className="px-4 py-2 text-xs font-mono font-bold text-white">{p.name || p.package}</td>
                          <td className="px-4 py-2 text-[10px]" style={{ color: MUTED }}>{p.ecosystem || "—"}</td>
                          <td className="px-4 py-2 w-28"><ScoreBar value={p.trust_score ?? 0} /></td>
                          <td className="px-4 py-2"><RiskLevelBadge level={p.trust_level} /></td>
                          <td className="px-4 py-2 text-xs font-mono text-center"
                            style={{ color: (p.osv_vulnerabilities ?? 0) > 0 ? DANGER : LOW }}>
                            {p.osv_vulnerabilities ?? 0}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {p.is_malicious
                              ? <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}20` }}>YES</span>
                              : <span style={{ color: LOW }}>✓</span>}
                          </td>
                          <td className="px-4 py-2 text-[10px] max-w-[180px] truncate" style={{ color: MUTED }}>{p.recommendation || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </section>
    </div>
  );
}