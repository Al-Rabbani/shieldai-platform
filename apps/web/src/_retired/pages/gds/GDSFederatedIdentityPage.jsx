import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Shield, Key, AlertTriangle, CheckCircle, RefreshCw, X } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, PAGE_BG
} from "@/components/gds/GDSOSShared";

const STATIC_IDPS = [
  { name: "AWS IAM", status: "connected", users: 12, mfa_pct: 67, enforcement: "partial" },
  { name: "GitHub", status: "connected", users: 8, mfa_pct: 100, enforcement: "enforced" },
  { name: "Google Workspace", status: "not_connected", users: 0, mfa_pct: 0, enforcement: "none" },
  { name: "Okta", status: "not_connected", users: 0, mfa_pct: 0, enforcement: "none" },
];

function MFAGauge({ pct, size = 64 }) {
  const r = size / 2 - 6;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(pct, 100) / 100;
  const color = pct >= 90 ? LOW : pct >= 60 ? MEDIUM : DANGER;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${fill * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x={cx} y={cy + 4} fill={color} fontSize={size * 0.22} textAnchor="middle" fontWeight="900" fontFamily="monospace">{pct}%</text>
    </svg>
  );
}

function IDPCard({ idp }) {
  const connected = idp.status === "connected";
  const enfColor = idp.enforcement === "enforced" ? LOW : idp.enforcement === "partial" ? MEDIUM : MUTED;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-base font-bold text-white">{idp.name}</p>
          <StatusBadge status={connected ? "connected" : "inactive"} />
        </div>
        <MFAGauge pct={idp.mfa_pct} />
      </div>
      {connected && (
        <div className="flex items-center justify-between text-[11px] mt-2">
          <span style={{ color: MUTED }}>{idp.users} users</span>
          <span className="font-bold px-2 py-0.5 rounded capitalize"
            style={{ color: enfColor, background: `${enfColor}15` }}>
            MFA {idp.enforcement}
          </span>
        </div>
      )}
      {!connected && (
        <p className="text-xs mt-2" style={{ color: MUTED }}>Not connected — configure in Integrations</p>
      )}
    </Card>
  );
}

export default function GDSFederatedIdentityPage() {
  const [tab, setTab] = useState("mfa");
  const [mfaData, setMfaData] = useState(null);
  const [oauthData, setOauthData] = useState(null);
  const [ssoData, setSsoData] = useState(null);
  const [loading, setLoading] = useState({});
  const [revoking, setRevoking] = useState(null);
  const [revokeConfirm, setRevokeConfirm] = useState(null);

  const load = async (action, setter) => {
    setLoading(p => ({ ...p, [action]: true }));
    try {
      const res = await base44.functions.invoke("gdsFederatedIdentity", { action });
      if (res.data) setter(res.data);
    } catch {}
    finally { setLoading(p => ({ ...p, [action]: false })); }
  };

  useEffect(() => {
    load("mfa_audit", setMfaData);
    load("oauth_apps", setOauthData);
    load("sso_health", setSsoData);
  }, []);

  const connectedCount = STATIC_IDPS.filter(i => i.status === "connected").length;
  const totalUsers = STATIC_IDPS.reduce((s, i) => s + i.users, 0);
  const avgMFA = Math.round(STATIC_IDPS.filter(i => i.status === "connected").reduce((s, i) => s + i.mfa_pct, 0) / (connectedCount || 1));
  const highRiskApps = (oauthData?.apps || []).filter(a => a.risk === "high" || a.risk === "critical").length;

  const handleRevoke = async (app) => {
    setRevoking(app.name);
    try {
      await base44.functions.invoke("gdsFederatedIdentity", { action: "revoke_app", app_name: app.name });
      load("oauth_apps", setOauthData);
    } catch {}
    finally { setRevoking(null); setRevokeConfirm(null); }
  };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Federated Identity" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Federated Identity</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>IDP status, MFA coverage, OAuth app risk, and SSO health</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Connected IDPs" value={connectedCount} color={CYAN} icon={Shield} />
        <KpiCard label="Total Users" value={totalUsers} color={LOW} icon={Users} />
        <KpiCard label="MFA Coverage" value={`${avgMFA}%`} color={avgMFA >= 80 ? LOW : DANGER} icon={Key} />
        <KpiCard label="High-Risk OAuth Apps" value={highRiskApps} color={DANGER} icon={AlertTriangle} pulse={highRiskApps > 0} />
      </div>

      {/* IDP Cards */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Identity Providers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATIC_IDPS.map(idp => <IDPCard key={idp.name} idp={idp} />)}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["mfa", "MFA Audit"], ["oauth", "OAuth Apps"], ["sso", "SSO Health"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: tab === k ? `${CYAN}20` : "transparent", border: `1px solid ${tab === k ? CYAN + "60" : BORDER}`, color: tab === k ? CYAN : MUTED }}>
            {l}
          </button>
        ))}
      </div>

      {/* MFA Audit */}
      {tab === "mfa" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="font-bold text-white">MFA Audit by Provider</h3>
          </div>
          {loading.mfa_audit ? <Skeleton /> : !mfaData?.providers?.length ? (
            <EmptyState icon={Key} title="No MFA data" description="Connect IDPs to see MFA audit" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Provider","Total Users","MFA Enabled","MFA Disabled","Coverage","Enforcement","Risk"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mfaData.providers.map((p, i) => {
                    const pct = p.coverage_pct ?? Math.round((p.mfa_enabled / (p.total_users || 1)) * 100);
                    const barColor = pct >= 90 ? LOW : pct >= 60 ? MEDIUM : DANGER;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                        <td className="px-4 py-3 text-xs font-bold text-white">{p.provider}</td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{p.total_users}</td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: LOW }}>{p.mfa_enabled}</td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: DANGER }}>{p.mfa_disabled}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: barColor }}>{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize"
                            style={{ color: p.enforcement === "enforced" ? LOW : p.enforcement === "partial" ? MEDIUM : MUTED, background: "rgba(255,255,255,0.05)" }}>
                            {p.enforcement || "none"}
                          </span>
                        </td>
                        <td className="px-4 py-3"><SevBadge sev={p.risk || (pct < 60 ? "high" : pct < 90 ? "medium" : "low")} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* OAuth Apps */}
      {tab === "oauth" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="font-bold text-white">OAuth App Inventory</h3>
          </div>
          {loading.oauth_apps ? <Skeleton /> : !oauthData?.apps?.length ? (
            <EmptyState icon={Shield} title="No OAuth apps" description="No third-party OAuth apps detected" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["App","Scopes","Risk","Last Used","Revocable","Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {oauthData.apps.map((app, i) => {
                    const riskColor = app.risk === "high" || app.risk === "critical" ? DANGER : app.risk === "medium" ? MEDIUM : LOW;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                        <td className="px-4 py-3 text-xs font-bold text-white">{app.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(app.scopes || []).slice(0, 3).map(s => (
                              <span key={s} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: `${CYAN}10`, color: CYAN, border: `1px solid ${CYAN}20` }}>{s}</span>
                            ))}
                            {(app.scopes || []).length > 3 && <span className="text-[9px]" style={{ color: MUTED }}>+{app.scopes.length - 3}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3"><SevBadge sev={app.risk || "low"} /></td>
                        <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{app.last_used || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold" style={{ color: app.revocable ? LOW : MUTED }}>{app.revocable ? "Yes" : "No"}</span>
                        </td>
                        <td className="px-4 py-3">
                          {app.revocable && (
                            revokeConfirm === app.name ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleRevoke(app)} disabled={revoking === app.name}
                                  className="text-[10px] px-2 py-1 rounded font-bold"
                                  style={{ background: `${DANGER}20`, color: DANGER }}>
                                  {revoking === app.name ? "..." : "Confirm"}
                                </button>
                                <button onClick={() => setRevokeConfirm(null)} className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED }}>
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setRevokeConfirm(app.name)}
                                className="text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all hover:opacity-80"
                                style={{ background: `${DANGER}15`, color: DANGER, border: `1px solid ${DANGER}30` }}>
                                Revoke
                              </button>
                            )
                          )}
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

      {/* SSO Health */}
      {tab === "sso" && (
        <div className="space-y-4">
          {loading.sso_health ? <Skeleton lines={3} /> : !ssoData ? (
            <EmptyState icon={Shield} title="No SSO data" description="SSO health data unavailable" />
          ) : (
            <>
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  {ssoData.status === "healthy"
                    ? <CheckCircle className="w-5 h-5" style={{ color: LOW }} />
                    : <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />}
                  <h3 className="font-bold text-white">SSO Status: <span style={{ color: ssoData.status === "healthy" ? LOW : DANGER }}>{ssoData.status || "unknown"}</span></h3>
                </div>
                {ssoData.metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    {Object.entries(ssoData.metrics).map(([k, v]) => (
                      <div key={k} className="p-3 rounded-xl" style={{ background: `${CYAN}08`, border: `1px solid ${BORDER}` }}>
                        <p className="text-lg font-black font-mono" style={{ color: CYAN }}>{v}</p>
                        <p className="text-[10px] capitalize" style={{ color: MUTED }}>{k.replace(/_/g, " ")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              {ssoData.recommendations?.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-bold text-white mb-3">Recommendations</h3>
                  <div className="space-y-2">
                    {ssoData.recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: `${CYAN}06`, border: `1px solid ${BORDER}` }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5"
                          style={{ background: `${CYAN}20`, color: CYAN }}>{i + 1}</span>
                        <p className="text-xs text-white">{r.recommendation || r}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}