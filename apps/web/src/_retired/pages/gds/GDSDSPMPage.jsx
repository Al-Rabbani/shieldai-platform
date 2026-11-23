import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, RefreshCw, AlertTriangle, ShieldAlert } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Card, KpiCard, PAGE_BG
} from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";

const DATA_CATS = ["PII", "PCI", "PHI", "Credentials", "Financial"];

const CAT_COLORS = { PII: DANGER, PCI: HIGH, PHI: MEDIUM, Credentials: DANGER, Financial: HIGH };

function CatBadge({ cat }) {
  const color = CAT_COLORS[cat] || MUTED;
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {cat}
    </span>
  );
}

export default function GDSDSPMPage() {
  const qc = useQueryClient();
  const [sev, setSev] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState(null);

  const { data: violations = [], isLoading } = useQuery({
    queryKey: ["dspm-violations"],
    queryFn: () => base44.entities.PolicyViolation.filter({ source: "gds-dspm" }).catch(() => []),
  });

  const filtered = sev === "all" ? violations : violations.filter(v => v.severity === sev);
  const piiCount = violations.filter(v => v.category === "PII" || (v.title || "").includes("PII")).length;
  const pciCount = violations.filter(v => v.category === "PCI" || (v.title || "").includes("PCI")).length;
  const phiCount = violations.filter(v => v.category === "PHI" || (v.title || "").includes("PHI")).length;

  const handleScan = async () => {
    setScanning(true);
    setScanMsg(null);
    try {
      const res = await base44.functions.invoke("gdsDSPM", {
        action: "scan_repo",
        repo_full_name: "Al-Rabbani/gds-os",
      });
      setScanMsg(`Scan complete — ${res.data?.findings_saved ?? 0} findings.`);
      qc.invalidateQueries(["dspm-violations"]);
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
          <h1 className="text-2xl font-black tracking-widest" style={{ color: CYAN }}>DATA SECURITY (DSPM)</h1>
          <p className="text-[10px] font-bold tracking-[0.2em] mt-0.5 uppercase" style={{ color: MUTED }}>GDS OS · Data Security Posture Management</p>
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
        <KpiCard label="Total Findings" value={violations.length} color={DANGER} icon={AlertTriangle} />
        <KpiCard label="PII Exposures" value={piiCount} color={DANGER} icon={Database} pulse />
        <KpiCard label="PCI Exposures" value={pciCount} color={HIGH} icon={ShieldAlert} />
        <KpiCard label="PHI Exposures" value={phiCount} color={MEDIUM} icon={ShieldAlert} />
      </div>

      {/* Compliance impact */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-3">Data Category Impact</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {DATA_CATS.map(cat => {
            const count = violations.filter(v => v.category === cat || (v.title || "").includes(cat)).length;
            const color = CAT_COLORS[cat] || MUTED;
            return (
              <div key={cat} className="p-3 rounded-xl text-center" style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>{cat}</p>
                <p className="text-2xl font-black font-mono mt-1" style={{ color }}>{count}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white">DSPM Findings</h3>
          <SevFilterBar value={sev} onChange={setSev} />
        </div>
        {isLoading ? <Skeleton lines={5} /> : filtered.length === 0
          ? <EmptyState icon={Database} title="No DSPM findings" description="Run a scan to detect sensitive data exposures." />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Category", "Title", "Severity", "File", "Matches", "Remediation"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-semibold" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, i) => (
                    <tr key={v.id || i} className="hover:bg-white/5 transition-colors" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3"><CatBadge cat={v.category || "Other"} /></td>
                      <td className="py-2 px-3 font-medium text-white max-w-[180px] truncate">{v.title || "—"}</td>
                      <td className="py-2 px-3"><SevBadge sev={v.severity} /></td>
                      <td className="py-2 px-3 font-mono text-[10px] max-w-[140px] truncate" style={{ color: CYAN }}>{v.resource_name || v.file_path || "—"}</td>
                      <td className="py-2 px-3 font-mono" style={{ color: MEDIUM }}>{v.match_count ?? "—"}</td>
                      <td className="py-2 px-3 max-w-[160px] truncate" style={{ color: MUTED }}>{v.remediation || v.description || "—"}</td>
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