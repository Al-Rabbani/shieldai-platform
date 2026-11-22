import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, AlertTriangle, Globe, Shield, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, PAGE_BG
} from "@/components/gds/GDSOSShared";

const OWASP_NAMES = {
  "API1": "Broken Object Level Authorization",
  "API2": "Broken Authentication",
  "API3": "Broken Object Property Level Authorization",
  "API4": "Unrestricted Resource Consumption",
  "API5": "Broken Function Level Authorization",
  "API6": "Unrestricted Access to Sensitive Business Flows",
  "API7": "Server Side Request Forgery",
  "API8": "Security Misconfiguration",
  "API9": "Improper Inventory Management",
  "API10": "Unsafe Consumption of APIs",
};

function OWASPCard({ id, check, expanded, onToggle }) {
  const statusColor = check.status === "VULNERABLE" ? DANGER : check.status === "NEEDS_TESTING" ? MEDIUM : LOW;
  const name = OWASP_NAMES[id] || check.name || id;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${statusColor}30`, background: CARD }}>
      <div className="p-4 cursor-pointer" onClick={() => onToggle(id)}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-black px-2 py-0.5 rounded flex-shrink-0"
            style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{id}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{name}</p>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{check.findings_count || 0} finding{check.findings_count !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase"
              style={{ color: statusColor, background: `${statusColor}15` }}>{check.status || "NOT_TESTED"}</span>
            <SevBadge sev={check.severity || "info"} />
          </div>
        </div>
      </div>
      {expanded && check.findings?.length > 0 && (
        <div className="border-t px-4 pb-3 space-y-2" style={{ borderColor: BORDER }}>
          {check.findings.map((f, i) => (
            <div key={i} className="text-xs p-2 rounded-lg mt-2" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}15` }}>
              <p className="font-semibold text-white">{f.title || f.description || f}</p>
              {f.endpoint && <p className="font-mono text-[10px] mt-1" style={{ color: CYAN }}>{f.endpoint}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GDSAPISecurityPage() {
  const [inventoryData, setInventoryData] = useState(null);
  const [owaspData, setOwaspData] = useState(null);
  const [authData, setAuthData] = useState(null);
  const [loading, setLoading] = useState({});
  const [expanded, setExpanded] = useState({});

  const load = async (action, setter) => {
    setLoading(p => ({ ...p, [action]: true }));
    try {
      const res = await base44.functions.invoke("gdsAPISecurityGateway", { action });
      if (res.data) setter(res.data);
    } catch {}
    finally { setLoading(p => ({ ...p, [action]: false })); }
  };

  useEffect(() => {
    load("inventory", setInventoryData);
    load("owasp_scan", setOwaspData);
    load("auth_audit", setAuthData);
  }, []);

  const endpoints = inventoryData?.endpoints || [];
  const owaspChecks = owaspData?.checks || {};
  const owaspScore = owaspData?.owasp_score ?? owaspData?.score ?? null;
  const vulnerableCount = Object.values(owaspChecks).filter(c => c.status === "VULNERABLE").length;
  const dastScans = inventoryData?.dast_scans ?? 0;
  const scanned = inventoryData?.endpoints_scanned ?? endpoints.length;
  const criticalApiFindings = Object.values(owaspChecks).reduce((s, c) => s + (c.severity === "critical" ? (c.findings_count || 0) : 0), 0);

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "API Security" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">API Security</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>OWASP API Top 10, auth audit, and endpoint inventory</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="API Endpoints" value={endpoints.length} color={CYAN} icon={Globe} />
        <KpiCard label="DAST Scans" value={dastScans} color={LOW} icon={Zap} />
        <KpiCard label="Endpoints Scanned" value={scanned} color={MEDIUM} icon={Shield} />
        <KpiCard label="Critical API Findings" value={criticalApiFindings} color={DANGER} icon={AlertTriangle} pulse={criticalApiFindings > 0} />
      </div>

      {/* OWASP Top 10 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-white">OWASP API Top 10</h3>
            {owaspScore != null && (
              <span className="text-lg font-black font-mono px-3 py-1 rounded-xl"
                style={{ color: owaspScore >= 70 ? LOW : owaspScore >= 40 ? MEDIUM : DANGER, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                Score: {owaspScore}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: DANGER }} /><span style={{ color: MUTED }}>Vulnerable ({vulnerableCount})</span></span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: MEDIUM }} /><span style={{ color: MUTED }}>Needs Testing</span></span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: LOW }} /><span style={{ color: MUTED }}>Not Detected</span></span>
          </div>
        </div>
        {loading.owasp_scan ? <Skeleton lines={5} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.keys(OWASP_NAMES).map(id => (
              <OWASPCard key={id} id={id}
                check={owaspChecks[id] || { status: "NOT_TESTED", findings_count: 0 }}
                expanded={expanded[id]}
                onToggle={toggleExpand} />
            ))}
          </div>
        )}
      </Card>

      {/* Auth Audit */}
      {authData && (
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-4 h-4" style={{ color: CYAN }} />
            <h3 className="font-bold text-white">Auth Security Audit</h3>
            {authData.auth_findings != null && (
              <span className="text-xs font-black px-2 py-0.5 rounded"
                style={{ color: authData.auth_findings > 0 ? DANGER : LOW, background: authData.auth_findings > 0 ? `${DANGER}15` : `${LOW}15` }}>
                {authData.auth_findings} auth finding{authData.auth_findings !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {authData.recommendations?.length > 0 && (
            <div className="space-y-2">
              {authData.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: `${CYAN}06`, border: `1px solid ${BORDER}` }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                    style={{ background: `${CYAN}20`, color: CYAN }}>{i + 1}</span>
                  <p className="text-xs text-white">{r.recommendation || r}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Endpoint Inventory */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">Endpoint Inventory</h3>
        </div>
        {loading.inventory ? <Skeleton /> : endpoints.length === 0 ? (
          <EmptyState icon={Globe} title="No endpoints" description="Run an inventory scan to populate endpoints" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["Method","Path","Auth","Risk","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {endpoints.slice(0, 100).map((ep, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded"
                        style={{ color: ep.method === "GET" ? CYAN : ep.method === "POST" ? LOW : HIGH, background: "rgba(255,255,255,0.05)" }}>
                        {ep.method || "GET"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-white truncate max-w-xs">{ep.path || ep.url || "—"}</td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: ep.auth_required ? LOW : DANGER }}>
                      {ep.auth_required ? "Required" : "None"}
                    </td>
                    <td className="px-4 py-3"><SevBadge sev={ep.risk || "info"} /></td>
                    <td className="px-4 py-3"><StatusBadge status={ep.status || "active"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}