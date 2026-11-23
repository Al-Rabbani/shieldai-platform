import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Play, RefreshCw } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG, SevBadge, Card, KpiCard } from "@/components/gds/GDSOSShared";

const TIMELINE = [
  { year: "2024", event: "NIST FIPS 203/204/205 finalized (ML-KEM, ML-DSA, SLH-DSA)", color: LOW },
  { year: "2025", event: "CNSA 2.0 adoption deadline for National Security Systems", color: MEDIUM },
  { year: "2026", event: "NSA mandates PQC for all new systems", color: HIGH },
  { year: "2030", event: "RSA & ECC officially deprecated by NIST", color: DANGER },
];

export default function GDSQuantumSafePage() {
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const scan = async () => {
    setScanning(true); setError(null);
    try {
      const res = await base44.functions.invoke("gdsQuantumSafe", { action: "scan_repo", repo_full_name: "Al-Rabbani/gds-os", save_to_db: true });
      setResult(res.data);
    } catch (e) { setError(e.message); } finally { setScanning(false); }
  };

  const score = result?.pqc_migration_score ?? null;
  const scoreColor = score === null ? MUTED : score >= 80 ? LOW : score >= 60 ? HIGH : DANGER;
  const effortColor = { high: DANGER, medium: HIGH, low: LOW };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">⚛️</span>
        <div>
          <h1 className="text-2xl font-black text-white">Quantum-Safe Cryptography</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>Scan for RSA, ECC, DH and other quantum-vulnerable algorithms. NIST PQC FIPS 203/204/205.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={scan} disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {scanning ? "Scanning…" : "Scan Repository"}
        </button>
        {error && <p className="text-sm" style={{ color: DANGER }}>{error}</p>}
      </div>

      {/* PQC Score */}
      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="md:col-span-2 p-6 flex flex-col items-center justify-center" style={{ border: `1px solid ${scoreColor}30` }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>PQC Migration Score</p>
              <div className="text-7xl font-black font-mono" style={{ color: scoreColor }}>{score}</div>
              <div className="text-sm font-bold mt-2" style={{ color: scoreColor }}>/100</div>
              {result.migration_effort && (
                <span className="mt-3 text-[11px] font-black px-3 py-1 rounded-full uppercase"
                  style={{ color: effortColor[result.migration_effort] || MUTED, background: `${effortColor[result.migration_effort] || MUTED}15` }}>
                  Migration Effort: {result.migration_effort}
                </span>
              )}
            </Card>
            <div className="md:col-span-3 grid grid-cols-2 gap-3">
              <KpiCard label="Files Scanned" value={result.files_scanned ?? "—"} color={CYAN} icon={Play} />
              <KpiCard label="Total Findings" value={result.total_findings ?? result.findings?.length ?? 0} color={HIGH} icon={Play} />
              <KpiCard label="Critical" value={result.critical ?? 0} color={DANGER} icon={Play} pulse />
              <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Vulnerable Algos</p>
                <p className="text-xs font-mono" style={{ color: DANGER }}>{result.quantum_vulnerable_algorithms || "RSA, ECC, DH"}</p>
              </div>
            </div>
          </div>

          {/* Findings */}
          {result.findings?.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                <h3 className="font-bold text-white">Quantum-Vulnerable Findings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Rule", "Algorithm", "Severity", "File", "Line", "Recommendation", "CNSA 2.0 Replacement"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.findings.map((f, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                        <td className="px-3 py-2 text-[10px] font-mono font-black" style={{ color: CYAN }}>{f.rule_id}</td>
                        <td className="px-3 py-2 text-xs font-mono text-white">{f.algo_name || f.algorithm}</td>
                        <td className="px-3 py-2"><SevBadge sev={f.severity} /></td>
                        <td className="px-3 py-2 text-[10px] font-mono truncate max-w-[120px]" style={{ color: MUTED }}>{f.file_path}</td>
                        <td className="px-3 py-2 text-xs font-mono" style={{ color: MUTED }}>{f.line ?? "—"}</td>
                        <td className="px-3 py-2 text-xs truncate max-w-[160px]" style={{ color: MUTED }}>{f.recommendation}</td>
                        <td className="px-3 py-2 text-[10px] font-mono font-bold" style={{ color: LOW }}>{f.cnsa2_replacement || "ML-KEM-768"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* NIST Timeline */}
      <Card className="p-5">
        <h3 className="font-bold text-white mb-4">NIST PQC Migration Timeline</h3>
        <div className="space-y-3">
          {TIMELINE.map(t => (
            <div key={t.year} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: `${t.color}08`, border: `1px solid ${t.color}20` }}>
              <span className="text-lg font-black font-mono w-12 flex-shrink-0" style={{ color: t.color }}>{t.year}</span>
              <span className="text-xs" style={{ color: TEXT }}>{t.event}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}