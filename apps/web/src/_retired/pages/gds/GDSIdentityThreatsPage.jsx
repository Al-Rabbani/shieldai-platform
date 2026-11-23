import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Users, AlertTriangle, Globe, RefreshCw, Search } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SEV_COLOR, SevBadge, StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function RiskGauge({ score, size = 80 }) {
  const r = size / 2 - 6;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = score >= 70 ? DANGER : score >= 40 ? MEDIUM : LOW;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x={cx} y={cy + 4} fill={color} fontSize={size * 0.22} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

export default function GDSIdentityThreatsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("ciem");
  const [itData, setItData] = useState(null);
  const [itLoading, setItLoading] = useState(false);
  const [anomalyData, setAnomalyData] = useState(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [uebaIdentity, setUebaIdentity] = useState("");
  const [uebaData, setUebaData] = useState(null);
  const [uebaLoading, setUebaLoading] = useState(false);

  const { data: ciemFindings = [], isLoading: loadC } = useQuery({
    queryKey: ["gds-identity-ciem"],
    queryFn: () => base44.entities.CIEMFinding.list().catch(() => []),
  });
  const { data: threats = [], isLoading: loadT } = useQuery({
    queryKey: ["gds-identity-threats"],
    queryFn: () => base44.entities.IdentityThreat?.list("-detected_at", 50).catch(() => []),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CIEMFinding.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(["gds-identity-ciem"]),
  });

  const loadIT = async () => {
    setItLoading(true);
    try {
      const res = await base44.functions.invoke("gdsInsiderThreatAnalytics", { action: "analyze" });
      if (res.data) setItData(res.data);
    } catch {}
    finally { setItLoading(false); }
  };

  const loadAnomalies = async () => {
    setAnomalyLoading(true);
    try {
      const res = await base44.functions.invoke("gdsInsiderThreatAnalytics", { action: "anomalies" });
      if (res.data) setAnomalyData(res.data);
    } catch {}
    finally { setAnomalyLoading(false); }
  };

  const loadUEBA = async () => {
    if (!uebaIdentity) return;
    setUebaLoading(true);
    try {
      const res = await base44.functions.invoke("gdsInsiderThreatAnalytics", { action: "ueba_profile", identity_name: uebaIdentity });
      if (res.data) setUebaData(res.data);
    } catch {}
    finally { setUebaLoading(false); }
  };

  const critCount = ciemFindings.filter(f => f.severity === "critical").length;
  const adminCount = ciemFindings.filter(f => f.finding_type === "admin_access" || f.finding_type === "shadow_admin").length;
  const staleCount = ciemFindings.filter(f => f.finding_type === "stale_credential").length;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Identity & Insider Threats" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Identity & Insider Threats</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>CIEM findings, identity threats, and insider threat analytics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="CIEM Findings" value={ciemFindings.length} color={CYAN} icon={Users} />
        <KpiCard label="Critical" value={critCount} color={DANGER} icon={AlertTriangle} pulse />
        <KpiCard label="Admin Access" value={adminCount} color={HIGH} icon={Shield} />
        <KpiCard label="Stale Credentials" value={staleCount} color={MEDIUM} icon={Shield} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["ciem", "CIEM Findings"], ["threats", "Identity Threats"], ["insider", "Insider Threat"], ["anomalies", "Anomalies"], ["ueba", "UEBA Profile"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: tab === k ? `${CYAN}20` : "transparent", border: `1px solid ${tab === k ? CYAN + "60" : BORDER}`, color: tab === k ? CYAN : MUTED }}>
            {l}
          </button>
        ))}
      </div>

      {/* CIEM Tab */}
      {tab === "ciem" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="font-bold text-white flex items-center gap-2"><Users className="w-4 h-4" style={{ color: CYAN }} />CIEM Findings</h3>
          </div>
          {loadC ? <Skeleton /> : ciemFindings.length === 0
            ? <EmptyState icon={Users} title="No identity findings" description="Identity entitlements look clean" />
            : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Severity","Identity","Type","Finding","Blast Radius","Days Inactive","Status"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ciemFindings.slice(0, 100).map((f, i) => {
                      const blastColor = f.blast_radius === "full_account" ? DANGER : f.blast_radius === "service_wide" ? HIGH : MEDIUM;
                      return (
                        <tr key={f.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                          <td className="px-4 py-3"><SevBadge sev={f.severity} /></td>
                          <td className="px-4 py-3 text-xs text-white font-mono">{f.identity_name || "—"}</td>
                          <td className="px-4 py-3 text-xs capitalize" style={{ color: MUTED }}>{(f.identity_type || "—").replace(/_/g," ")}</td>
                          <td className="px-4 py-3 text-xs text-white max-w-xs truncate">{f.title}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                              style={{ color: blastColor, background: `${blastColor}15` }}>
                              {(f.blast_radius || "—").replace(/_/g," ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: f.days_inactive > 90 ? DANGER : MUTED }}>{f.days_inactive ?? "—"}</td>
                          <td className="px-4 py-3">
                            <select value={f.status || "open"} onChange={e => updateMutation.mutate({ id: f.id, status: e.target.value })}
                              className="px-2 py-0.5 rounded-lg text-[10px] outline-none cursor-pointer"
                              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
                              {["open","in_remediation","resolved","accepted_risk"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      )}

      {/* Identity Threats Tab */}
      {tab === "threats" && (
        <div>
          {loadT ? <Skeleton lines={3} /> : !threats?.length
            ? <EmptyState icon={Shield} title="No identity threats detected" description="Zero Trust monitoring is active" />
            : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {threats.slice(0, 12).map((t, i) => (
                  <Card key={t.id || i} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
                        style={{ color: DANGER, background: `${DANGER}15` }}>
                        {(t.threat_type || "unknown").replace(/_/g," ")}
                      </span>
                      <SevBadge sev={t.severity || t.risk_level} />
                    </div>
                    <p className="text-sm font-bold text-white mb-1">{t.identity_name || "Unknown Identity"}</p>
                    <div className="space-y-1 text-[10px]" style={{ color: MUTED }}>
                      {t.source_ip && <p>IP: <span className="font-mono text-white">{t.source_ip}</span></p>}
                      {t.country && <p>Country: <span className="text-white">{t.country}</span></p>}
                      {t.travel_km && <p>Impossible Travel: <span className="font-bold" style={{ color: DANGER }}>{t.travel_km} km</span></p>}
                      {t.zero_trust_score != null && <p>Zero Trust Score: <span className="font-mono" style={{ color: t.zero_trust_score < 50 ? DANGER : LOW }}>{t.zero_trust_score}</span></p>}
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: MUTED }}>{timeAgo(t.detected_at)}</p>
                  </Card>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Insider Threat Tab */}
      {tab === "insider" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={loadIT} disabled={itLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${DANGER}12`, border: `1px solid ${DANGER}30`, color: DANGER }}>
              {itLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {itLoading ? "Analyzing…" : "Analyze Insider Threats"}
            </button>
          </div>
          {itData ? (
            <>
              <div className="flex items-center gap-6 p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <RiskGauge score={itData.risk_score} size={80} />
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: MUTED }}>Insider Risk Score</p>
                  <span className="text-sm font-black px-3 py-1 rounded-full uppercase mt-1 inline-block"
                    style={{ color: itData.risk_score >= 70 ? DANGER : itData.risk_score >= 40 ? MEDIUM : LOW, background: "rgba(255,255,255,0.05)" }}>
                    {itData.risk_level || "LOW"}
                  </span>
                  <p className="text-xs mt-2" style={{ color: MUTED }}>
                    {itData.indicators_detected ?? 0} / {itData.indicators_monitored ?? 0} indicators detected
                  </p>
                </div>
              </div>
              {itData.indicators?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {itData.indicators.map((ind, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
                          style={{ color: CYAN, background: `${CYAN}10` }}>{ind.category}</span>
                        <span className="text-[10px] font-mono" style={{ color: ind.weight >= 0.7 ? DANGER : MEDIUM }}>weight: {ind.weight}</span>
                      </div>
                      <p className="text-xs font-bold text-white">{ind.name}</p>
                      {ind.mitre_technique && (
                        <p className="text-[10px] mt-1 font-mono" style={{ color: HIGH }}>{ind.mitre_technique}</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState icon={AlertTriangle} title="No analysis yet" description="Click 'Analyze Insider Threats' to run analysis" />
          )}
        </div>
      )}

      {/* Anomalies Tab */}
      {tab === "anomalies" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={loadAnomalies} disabled={anomalyLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
              {anomalyLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {anomalyLoading ? "Loading…" : "Load Anomalies"}
            </button>
          </div>
          {anomalyData ? (
            <div className="space-y-2">
              {[...(anomalyData.identity_threats || []), ...(anomalyData.ciem_anomalies || [])].map((item, i) => {
                const color = SEV_COLOR[item.severity] || CYAN;
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: `${color}06`, border: `1px solid ${color}20` }}>
                    <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{item.title || item.action || item.event || "Anomaly"}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{item.identity_name || item.actor || "—"} · {timeAgo(item.detected_at || item.timestamp || item.created_date)}</p>
                    </div>
                    <SevBadge sev={item.severity} />
                  </div>
                );
              })}
              {!anomalyData.identity_threats?.length && !anomalyData.ciem_anomalies?.length && (
                <EmptyState icon={Shield} title="No anomalies detected" description="Identity behavior looks normal" />
              )}
            </div>
          ) : (
            <EmptyState icon={Globe} title="No anomaly data" description="Click 'Load Anomalies' to fetch anomaly timeline" />
          )}
        </div>
      )}

      {/* UEBA Tab */}
      {tab === "ueba" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-white mb-3">UEBA Profile Lookup</h3>
            <div className="flex items-center gap-3">
              <input value={uebaIdentity} onChange={e => setUebaIdentity(e.target.value)}
                placeholder="Enter identity name or email…"
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
              <button onClick={loadUEBA} disabled={!uebaIdentity || uebaLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: `${CYAN}20`, border: `1px solid ${CYAN}50`, color: CYAN }}>
                {uebaLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                {uebaLoading ? "Loading…" : "Lookup"}
              </button>
            </div>
          </Card>
          {uebaData && (
            <Card className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <RiskGauge score={uebaData.risk_score} size={72} />
                <div>
                  <p className="text-base font-bold text-white">{uebaData.identity_name || uebaIdentity}</p>
                  <p className="text-xs" style={{ color: MUTED }}>Risk Score: <span className="font-mono" style={{ color: uebaData.risk_score >= 70 ? DANGER : MEDIUM }}>{uebaData.risk_score}</span></p>
                </div>
              </div>
              {uebaData.risk_factors?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white">Risk Factors</p>
                  {uebaData.risk_factors.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg"
                      style={{ background: `${DANGER}06`, border: `1px solid ${BORDER}` }}>
                      <p className="text-xs" style={{ color: MUTED }}>{f.factor || f.description || f}</p>
                      {f.weight && <span className="text-[10px] font-mono" style={{ color: DANGER }}>+{f.weight}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}