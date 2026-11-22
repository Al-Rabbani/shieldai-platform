import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Cloud, RefreshCw, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, SevBadge, Card, Skeleton } from "@/components/gds/GDSOSShared";

const PROVIDER_META = {
  aws:   { label: "AWS",   color: "#ff9900", bg: "rgba(255,153,0,0.1)" },
  azure: { label: "Azure", color: "#0078d4", bg: "rgba(0,120,212,0.1)" },
  gcp:   { label: "GCP",  color: "#4285f4", bg: "rgba(66,133,244,0.1)" },
};

function ProviderCard({ provider, data, onScan, scanning }) {
  const meta = PROVIDER_META[provider];
  const credColor = data?.credential_status === "LIVE" ? LOW : MEDIUM;
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
            {meta.label.slice(0, 1)}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{meta.label}</p>
            <p className="text-[10px]" style={{ color: MUTED }}>{data?.account_count ?? "—"} accounts</p>
          </div>
        </div>
        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ color: credColor, background: `${credColor}15`, border: `1px solid ${credColor}30` }}>
          {data?.credential_status || "—"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Findings</p>
          <p className="text-xl font-black font-mono" style={{ color: DANGER }}>{data?.findings_count ?? "—"}</p>
        </div>
        <div className="p-2 rounded-lg text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Critical</p>
          <p className="text-xl font-black font-mono" style={{ color: DANGER }}>{data?.critical_count ?? "—"}</p>
        </div>
      </div>
      {data?.last_scanned && (
        <p className="text-[9px]" style={{ color: MUTED }}>Last scanned: {new Date(data.last_scanned).toLocaleTimeString()}</p>
      )}
      <button onClick={() => onScan(provider)} disabled={scanning}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
        style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30`, color: meta.color }}>
        {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
        {scanning ? `Scanning ${meta.label}…` : `Scan ${meta.label}`}
      </button>
    </Card>
  );
}

function FindingsTable({ findings, title }) {
  const [expanded, setExpanded] = useState({});
  if (!findings?.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white">{title}</h4>
      <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${BORDER}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
              {["ID", "Title", "Severity", "Service", "CIS Control", ""].map(h => (
                <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {findings.map((f, i) => (
              <React.Fragment key={f.id}>
                <tr style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{f.id}</td>
                  <td className="px-4 py-3 text-xs text-white max-w-xs">{f.title}</td>
                  <td className="px-4 py-3"><SevBadge sev={f.severity} /></td>
                  <td className="px-4 py-3"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${CYAN}12`, color: CYAN }}>{f.service}</span></td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{f.cis}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setExpanded(p => ({ ...p, [f.id]: !p[f.id] }))} style={{ color: MUTED }}>
                      {expanded[f.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
                {expanded[f.id] && (
                  <tr style={{ background: `${CYAN}05` }}>
                    <td colSpan={6} className="px-4 py-3">
                      <p className="text-xs" style={{ color: MUTED }}><span className="font-bold text-white">Remediation: </span>{f.remediation}</p>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MultiCloudScanner() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState({});
  const [scanAllLoading, setScanAllLoading] = useState(false);
  const [azureFindings, setAzureFindings] = useState(null);
  const [gcpFindings, setGcpFindings] = useState(null);

  useEffect(() => {
    base44.functions.invoke("gdsMultiCloudScanner", { action: "status" })
      .then(r => setStatus(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scanProvider = async (provider) => {
    setScanning(p => ({ ...p, [provider]: true }));
    try {
      const action = `scan_${provider}`;
      const res = await base44.functions.invoke("gdsMultiCloudScanner", { action });
      setStatus(prev => prev ? { ...prev, providers: { ...prev.providers, [provider]: res.data } } : null);
      if (provider === "azure") setAzureFindings(res.data?.findings);
      if (provider === "gcp") setGcpFindings(res.data?.findings);
    } catch (e) { console.error(e); }
    finally { setScanning(p => ({ ...p, [provider]: false })); }
  };

  const scanAll = async () => {
    setScanAllLoading(true);
    try {
      const res = await base44.functions.invoke("gdsMultiCloudScanner", { action: "scan_all" });
      setStatus(res.data);
    } catch (e) { console.error(e); }
    finally { setScanAllLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Multi-Cloud Scanner</h2>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>Unified security posture across AWS, Azure, and GCP</p>
        </div>
        {status && (
          <div className="flex items-center gap-4 text-[11px]">
            {[
              { label: "Total Accounts", value: status.total_accounts, color: CYAN },
              { label: "Total Findings", value: status.total_findings, color: DANGER },
              { label: "Total Critical", value: status.total_critical, color: DANGER },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-black font-mono" style={{ color }}>{value ?? "—"}</p>
                <p style={{ color: MUTED }}>{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? <Skeleton lines={3} /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["aws", "azure", "gcp"].map(p => (
              <ProviderCard key={p} provider={p} data={status?.providers?.[p]} onScan={scanProvider} scanning={!!scanning[p]} />
            ))}
          </div>

          <button onClick={scanAll} disabled={scanAllLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {scanAllLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            {scanAllLoading ? "Scanning All Providers…" : "Scan All Providers"}
          </button>

          <FindingsTable findings={azureFindings} title="Azure Findings" />
          <FindingsTable findings={gcpFindings} title="GCP Findings" />
        </>
      )}
    </div>
  );
}