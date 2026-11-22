import React, { useState, useEffect } from "react";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, CheckCircle, AlertTriangle, X } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG, CARD
} from "@/components/gds/GDSOSShared";

const CHECK_COLOR = { PASS: LOW, NEEDS_REVIEW: MEDIUM, UNKNOWN: MUTED };

function AppCard({ app, onAssess }) {
  const connected = app.status === "connected";
  return (
    <Card glow className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{app.icon}</span>
          <div>
            <p className="text-sm font-bold text-white">{app.name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}12` }}>{app.category}</span>
          </div>
        </div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: connected ? LOW : MUTED, background: connected ? `${LOW}15` : "rgba(100,116,139,0.12)" }}>
          {connected ? "Connected" : "Not Connected"}
        </span>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs" style={{ color: MUTED }}>{app.checks_total} checks · {app.risk_factors_count} risk factors</div>
        <button onClick={() => onAssess(app)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          Assess
        </button>
      </div>
    </Card>
  );
}

function AssessPanel({ app, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  React.useEffect(() => {
    base44.functions.invoke("gdsSAASSecurityPosture", { action: "assess", app_id: app.id })
      .then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [app.id]);
  const gradeColor = { A: LOW, B: CYAN, C: MEDIUM, D: DANGER }[data?.grade] || MUTED;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto p-6 space-y-4" style={{ background: "#050e1f", borderLeft: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="text-2xl">{app.icon}</span><h2 className="text-lg font-black text-white">{app.name}</h2></div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5"><X className="w-4 h-4" style={{ color: MUTED }} /></button>
        </div>
        {loading ? <Skeleton lines={5} /> : data ? (
          <>
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${gradeColor}08`, border: `1px solid ${gradeColor}30` }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${gradeColor}15`, border: `2px solid ${gradeColor}60` }}>
                <span className="text-2xl font-black" style={{ color: gradeColor }}>{data.grade}</span>
              </div>
              <div>
                <p className="text-3xl font-black font-mono" style={{ color: gradeColor }}>{data.score}<span className="text-lg" style={{ color: MUTED }}>/100</span></p>
                <p className="text-xs" style={{ color: MUTED }}>Security Score</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Security Checks</p>
              {data.checks?.map((c, i) => {
                const cc = CHECK_COLOR[c.status] || MUTED;
                return (
                  <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span style={{ color: cc }}>{c.status === "PASS" ? "✓" : c.status === "NEEDS_REVIEW" ? "⚠" : "?"}</span>
                    <span className="flex-1 text-white">{c.name}</span>
                    <span className="text-[10px] font-bold" style={{ color: cc }}>{c.status.replace(/_/g, " ")}</span>
                  </div>
                );
              })}
            </div>
            {data.risk_factors?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Risk Factors</p>
                {data.risk_factors.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs mb-1.5" style={{ color: DANGER }}>
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{r}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : <p className="text-xs" style={{ color: MUTED }}>Failed to load assessment.</p>}
      </div>
    </div>
  );
}

export default function GDSSAASSecurityPage() {
  const [activeTab, setActiveTab] = useState("apps");
  const [selectedApp, setSelectedApp] = useState(null);
  const [oauthData, setOauthData] = useState(null);
  const [benchData, setBenchData] = useState(null);
  const [tabLoading, setTabLoading] = useState({});

  const { data: discoverData, isLoading } = useQuery({
    queryKey: ["gds-saas-discover"],
    queryFn: () => base44.functions.invoke("gdsSAASSecurityPosture", { action: "discover" }).then(r => r.data),
  });

  const load = async (tab, act, setter) => {
    setTabLoading(p => ({ ...p, [tab]: true }));
    try { const r = await base44.functions.invoke("gdsSAASSecurityPosture", { action: act }); setter(r.data); }
    catch (e) { console.error(e); } finally { setTabLoading(p => ({ ...p, [tab]: false })); }
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    if (tab === "oauth" && !oauthData) load("oauth", "oauth_audit", setOauthData);
    if (tab === "benchmark" && !benchData) load("benchmark", "benchmark", setBenchData);
  };

  const apps = discoverData?.apps || [];
  const RISK_COLOR = { high: DANGER, medium: MEDIUM, low: LOW };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "SaaS Security" }]} />
      <div>
        <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-white">SaaS Security Posture</h1><LiveDataBadge /></div>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Connected SaaS application security assessment, OAuth audit, and benchmarking</p>
      </div>

      <div className="flex border-b" style={{ borderColor: BORDER }}>
        {[["apps", "App Inventory"], ["oauth", "OAuth Audit"], ["benchmark", "Benchmark"]].map(([id, label]) => (
          <button key={id} onClick={() => handleTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "apps" && (
        isLoading ? <Skeleton lines={3} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app, i) => <AppCard key={i} app={app} onAssess={setSelectedApp} />)}
          </div>
        )
      )}

      {activeTab === "oauth" && (
        tabLoading.oauth ? <Skeleton lines={4} /> : !oauthData ? <div /> : (
          <Card className="overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">OAuth Token Audit</h3></div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["App", "Scopes", "Risk", "Last Used", "Active", "Action"].map(h => (
                    <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {oauthData.apps?.map((a, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-4 text-white font-medium">{a.app}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">{a.scopes?.map(s => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ color: MUTED, background: "rgba(255,255,255,0.05)" }}>{s}</span>)}</div>
                    </td>
                    <td className="py-3 px-4"><SevBadge sev={a.risk} /></td>
                    <td className="py-3 px-4 text-[10px] font-mono" style={{ color: MUTED }}>{new Date(a.last_used).toLocaleDateString()}</td>
                    <td className="py-3 px-4"><span style={{ color: a.active ? LOW : MUTED }}>{a.active ? "Active" : "Inactive"}</span></td>
                    <td className="py-3 px-4 max-w-xs" style={{ color: a.recommendation ? DANGER : MUTED }}>{a.recommendation || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {activeTab === "benchmark" && (
        tabLoading.benchmark ? <Skeleton lines={3} /> : !benchData ? <div /> : (
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-4">SaaS Coverage Benchmark</h3>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">Connection Coverage</span>
                <span className="text-sm font-black font-mono" style={{ color: benchData.connection_coverage >= 70 ? LOW : MEDIUM }}>{benchData.connection_coverage}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${benchData.connection_coverage}%`, background: CYAN }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {benchData.connected_apps?.map(a => <span key={a} className="text-xs px-2 py-0.5 rounded" style={{ color: LOW, background: `${LOW}12` }}>{a}</span>)}
            </div>
            <div className="p-3 rounded-xl" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}20` }}>
              <p className="text-xs" style={{ color: TEXT }}>{benchData.recommendation}</p>
            </div>
          </Card>
        )
      )}

      {selectedApp && <AssessPanel app={selectedApp} onClose={() => setSelectedApp(null)} />}
    </div>
  );
}