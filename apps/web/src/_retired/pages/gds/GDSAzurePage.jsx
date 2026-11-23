import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cloud, RefreshCw, AlertTriangle, Shield } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG, SevBadge, StatusBadge, Card, KpiCard, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

export default function GDSAzurePage() {
  const [form, setForm] = useState({ subscription_id: "", bearer_token: "", nickname: "" });
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);

  const { data: accounts = [], isLoading: loadAccounts } = useQuery({
    queryKey: ["azure-accounts"],
    queryFn: () => base44.entities.CloudAccount.filter({ provider: "azure" }).catch(() => []),
  });
  const { data: findings = [], isLoading: loadFindings, refetch } = useQuery({
    queryKey: ["azure-findings"],
    queryFn: () => base44.entities.CloudFinding.filter({ provider: "azure" }).catch(() => []),
  });

  const critical = findings.filter(f => f.severity === "critical").length;
  const high = findings.filter(f => f.severity === "high").length;

  const scan = async () => {
    if (!form.subscription_id || !form.bearer_token) return;
    setScanning(true); setScanError(null); setScanResult(null);
    try {
      const res = await base44.functions.invoke("gdsAzureScan", { ...form });
      setScanResult(res.data);
      refetch();
    } catch (e) {
      setScanError(e.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.4)" }}>
          <Cloud className="w-5 h-5" style={{ color: "#0078d4" }} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Azure Security</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>CIS benchmark scanning for Azure subscriptions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Azure Accounts" value={accounts.length} color="#0078d4" icon={Cloud} />
        <KpiCard label="Total Findings" value={findings.length} color={HIGH} icon={AlertTriangle} />
        <KpiCard label="Critical" value={critical} color={DANGER} icon={AlertTriangle} pulse />
        <KpiCard label="High" value={high} color={HIGH} icon={Shield} />
      </div>

      {/* Connect Form */}
      <Card className="p-5">
        <h3 className="font-bold text-white mb-4">Connect & Scan Azure Subscription</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            { label: "Subscription ID", key: "subscription_id", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
            { label: "Bearer Token", key: "bearer_token", placeholder: "eyJ0eXAiOiJKV1QiLCJhbGci..." },
            { label: "Nickname", key: "nickname", placeholder: "Production" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: MUTED }}>{f.label}</label>
              <input
                type={f.key === "bearer_token" ? "password" : "text"}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>
          ))}
        </div>
        <button onClick={scan} disabled={scanning || !form.subscription_id || !form.bearer_token}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.4)", color: "#0078d4" }}>
          {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
          {scanning ? "Scanning…" : "Connect & Scan"}
        </button>
        {scanError && <p className="text-sm mt-3" style={{ color: DANGER }}>{scanError}</p>}
      </Card>

      {/* Scan Result */}
      {scanResult && (
        <Card className="p-5" style={{ border: `1px solid ${LOW}30` }}>
          <p className="text-sm font-bold mb-2" style={{ color: LOW }}>✅ Scan complete</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[["Resources Scanned", scanResult.resources_scanned], ["Findings", scanResult.findings_count || scanResult.total_findings], ["Critical", scanResult.critical_count]].map(([l, v]) => (
              <div key={l} className="p-3 rounded-xl" style={{ background: `${CYAN}08`, border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>{l}</p>
                <p className="text-xl font-black font-mono text-white">{v ?? "—"}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Historical Findings */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">Azure Findings ({findings.length})</h3>
        </div>
        {loadFindings ? <Skeleton /> : findings.length === 0
          ? <EmptyState icon={Cloud} title="No Azure findings" description="Connect an Azure subscription to start scanning" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Severity", "Service", "Resource", "CIS Control", "Status", "Remediation"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {findings.slice(0, 100).map((f, i) => (
                    <tr key={f.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3"><SevBadge sev={f.severity} /></td>
                      <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(0,120,212,0.15)", color: "#0078d4" }}>{f.service || "—"}</span></td>
                      <td className="px-4 py-3 text-xs font-mono truncate max-w-[160px]" style={{ color: MUTED }}>{f.resource_id || f.asset_name || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{f.cis_control || f.compliance_control || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                      <td className="px-4 py-3 text-xs truncate max-w-xs" style={{ color: MUTED }}>{f.remediation || "—"}</td>
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