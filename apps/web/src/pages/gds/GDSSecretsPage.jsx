import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Key, RefreshCw, AlertTriangle, FileText, Link } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Card, KpiCard, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";
import SevFilterBar from "@/components/gds/SevFilterBar";

export default function GDSSecretsPage() {
  const qc = useQueryClient();
  const [sev, setSev] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState(null);

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["secrets-findings"],
    queryFn: () => base44.entities.TriagedFinding.filter({}).catch(() => []),
    select: (d) => d.filter(f => f.source_scanners && f.source_scanners.includes("secrets")),
  });

  const filtered = sev === "all" ? findings : findings.filter(f => (f.normalized_severity || f.severity) === sev);
  const critical = findings.filter(f => (f.normalized_severity || f.severity) === "critical").length;
  const byFile = new Set(findings.map(f => f.file_path).filter(Boolean)).size;

  const handleScan = async () => {
    setScanning(true);
    setScanMsg(null);
    try {
      const res = await base44.functions.invoke("gdsSecretsScanner", {
        repo_full_name: "Al-Rabbani/gds-os",
        save_to_db: true,
      });
      setScanMsg(`Scan complete — ${res.data?.findings_saved ?? 0} findings saved.`);
      qc.invalidateQueries(["secrets-findings"]);
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
          <h1 className="text-2xl font-black tracking-widest" style={{ color: CYAN }}>SECRETS DETECTION</h1>
          <p className="text-[10px] font-bold tracking-[0.2em] mt-0.5 uppercase" style={{ color: MUTED }}>GDS OS · Secrets &amp; Credentials Scanner</p>
        </div>
        <button onClick={handleScan} disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning..." : "Scan Now"}
        </button>
      </div>

      {scanMsg && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          {scanMsg}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total Secrets" value={findings.length} color={DANGER} icon={Key} />
        <KpiCard label="Critical" value={critical} color={DANGER} icon={AlertTriangle} pulse />
        <KpiCard label="Affected Files" value={byFile} color={MEDIUM} icon={FileText} />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white">Secret Findings</h3>
          <SevFilterBar value={sev} onChange={setSev} />
        </div>
        {isLoading ? <Skeleton lines={5} /> : filtered.length === 0
          ? <EmptyState icon={Key} title="No secrets found" description="Run a scan or adjust the severity filter." />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Severity", "Rule ID", "File Path", "Line", "Snippet", "Commit"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-semibold" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f, i) => (
                    <tr key={f.id || i} className="transition-colors hover:bg-white/5" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3"><SevBadge sev={f.normalized_severity || f.severity} /></td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: CYAN }}>{f.rule_id || f.scanner || "—"}</td>
                      <td className="py-2 px-3 font-mono text-[10px] max-w-[180px] truncate" style={{ color: TEXT }}>{f.file_path || "—"}</td>
                      <td className="py-2 px-3 font-mono" style={{ color: MUTED }}>{f.line_number || "—"}</td>
                      <td className="py-2 px-3 font-mono text-[10px] max-w-[140px] truncate" style={{ color: MEDIUM }}>
                        {f.snippet ? f.snippet.replace(/[a-zA-Z0-9]{6,}/g, s => s.slice(0, 3) + "***") : "—"}
                      </td>
                      <td className="py-2 px-3">
                        {f.commit_url ? (
                          <a href={f.commit_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80" style={{ color: CYAN }}>
                            <Link className="w-3 h-3" /> View
                          </a>
                        ) : <span style={{ color: MUTED }}>—</span>}
                      </td>
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