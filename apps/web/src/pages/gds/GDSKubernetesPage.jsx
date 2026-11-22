import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Container, RefreshCw, AlertTriangle, Shield } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Card, KpiCard, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";

const CATEGORIES = ["Pod Security", "RBAC", "Network", "Secrets", "Images"];

export default function GDSKubernetesPage() {
  const qc = useQueryClient();
  const [sev, setSev] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState(null);

  const { data: scans = [], isLoading: loadScans } = useQuery({
    queryKey: ["k8s-scans"],
    queryFn: () => base44.entities.K8sScan.list("-created_date", 10).catch(() => []),
  });
  const { data: findings = [], isLoading: loadFindings } = useQuery({
    queryKey: ["k8s-findings"],
    queryFn: () => base44.entities.K8sFinding.list("-created_date", 100).catch(() => []),
  });

  const filtered = sev === "all" ? findings : findings.filter(f => f.severity === sev);
  const critical = findings.filter(f => f.severity === "critical").length;
  const high = findings.filter(f => f.severity === "high").length;

  const handleScan = async () => {
    setScanning(true);
    setScanMsg(null);
    try {
      const res = await base44.functions.invoke("gdsK8sScan", {
        action: "scan_repo",
        repo_full_name: "Al-Rabbani/gds-os",
      });
      setScanMsg(`Scan complete — ${res.data?.findings_count ?? 0} findings.`);
      qc.invalidateQueries(["k8s-scans"]);
      qc.invalidateQueries(["k8s-findings"]);
    } catch (e) {
      setScanMsg("Scan failed: " + (e.message || "unknown error"));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-widest" style={{ color: CYAN }}>KUBERNETES SECURITY</h1>
          <p className="text-[10px] font-bold tracking-[0.2em] mt-0.5 uppercase" style={{ color: MUTED }}>GDS OS · K8s Misconfiguration &amp; Policy Scanner</p>
        </div>
        <button onClick={handleScan} disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning..." : "Scan Repo"}
        </button>
      </div>

      {scanMsg && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}30`, color: CYAN }}>{scanMsg}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Findings" value={findings.length} color={DANGER} icon={AlertTriangle} />
        <KpiCard label="Critical" value={critical} color={DANGER} icon={Shield} pulse />
        <KpiCard label="High" value={high} color={HIGH} icon={AlertTriangle} />
        <KpiCard label="Scans Run" value={scans.length} color={CYAN} icon={Container} />
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {CATEGORIES.map(cat => {
          const count = findings.filter(f => f.category === cat || (f.title || "").includes(cat)).length;
          return (
            <Card key={cat} className="p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: MUTED }}>{cat}</p>
              <p className="text-2xl font-black font-mono" style={{ color: count > 0 ? DANGER : LOW }}>{count}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white">K8s Findings</h3>
          <SevFilterBar value={sev} onChange={setSev} />
        </div>
        {loadFindings ? <Skeleton lines={5} /> : filtered.length === 0
          ? <EmptyState icon={Container} title="No findings" description="Run a scan to detect Kubernetes misconfigurations." />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Severity", "Title", "Resource", "Namespace", "CIS Control", "Remediation"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-semibold" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f, i) => (
                    <tr key={f.id || i} className="transition-colors hover:bg-white/5" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3"><SevBadge sev={f.severity} /></td>
                      <td className="py-2 px-3 font-medium text-white max-w-[180px] truncate">{f.title || "—"}</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: CYAN }}>{f.resource_name || f.resource || "—"}</td>
                      <td className="py-2 px-3" style={{ color: MUTED }}>{f.namespace || "—"}</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MEDIUM }}>{f.cis_control || "—"}</td>
                      <td className="py-2 px-3 max-w-[160px] truncate" style={{ color: MUTED }}>{f.remediation || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* Scan history */}
      {scans.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-3">Scan History</h3>
          <div className="space-y-2">
            {scans.map((s, i) => (
              <div key={s.id || i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}` }}>
                <span className="text-xs font-mono" style={{ color: TEXT }}>{s.cluster_name || s.repo || "scan"}</span>
                <span className="text-[10px]" style={{ color: MUTED }}>{timeAgo(s.scanned_at || s.created_date)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}