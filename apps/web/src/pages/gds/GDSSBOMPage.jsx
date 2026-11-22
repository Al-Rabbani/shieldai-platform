import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, Download, RefreshCw, AlertTriangle } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Card, KpiCard, PAGE_BG
} from "@/components/gds/GDSOSShared";

const FORMATS = ["CycloneDX", "SPDX", "CSV"];

export default function GDSSBOMPage() {
  const qc = useQueryClient();
  const [repo, setRepo] = useState("Al-Rabbani/gds-os");
  const [format, setFormat] = useState("CycloneDX");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["sbom-licenses"],
    queryFn: () => base44.entities.LicenseRisk.list("-created_date", 100).catch(() => []),
  });

  const ecosystems = licenses.reduce((acc, l) => {
    const eco = l.ecosystem || l.package_manager || "Other";
    acc[eco] = (acc[eco] || 0) + 1;
    return acc;
  }, {});

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke("gdsSBOM", { repo_full_name: repo, format });
      setResult(res.data);
      qc.invalidateQueries(["sbom-licenses"]);
    } catch (e) {
      setError(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sbom-${repo.replace("/", "-")}-${format.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <div>
        <h1 className="text-2xl font-black tracking-widest" style={{ color: CYAN }}>SBOM GENERATOR</h1>
        <p className="text-[10px] font-bold tracking-[0.2em] mt-0.5 uppercase" style={{ color: MUTED }}>GDS OS · Software Bill of Materials</p>
      </div>

      {/* Generator controls */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Generate SBOM</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] uppercase tracking-widest font-semibold block mb-1" style={{ color: MUTED }}>Repository</label>
            <input value={repo} onChange={e => setRepo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-semibold block mb-1" style={{ color: MUTED }}>Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "#0a1628", border: `1px solid ${BORDER}`, color: TEXT }}>
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Generate SBOM"}
          </button>
          {result && (
            <button onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
              style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
              <Download className="w-4 h-4" /> Download
            </button>
          )}
        </div>
        {error && <p className="mt-3 text-xs" style={{ color: DANGER }}>{error}</p>}
        {result && (
          <p className="mt-3 text-xs" style={{ color: LOW }}>
            Generated {result.total_components ?? "?"} components ({result.vulnerable_components ?? 0} vulnerable).
          </p>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total Components" value={result?.total_components ?? licenses.length} color={CYAN} icon={Package} />
        <KpiCard label="Vulnerable" value={result?.vulnerable_components ?? licenses.filter(l => l.risk_level === "high" || l.risk_level === "critical").length} color={DANGER} icon={AlertTriangle} />
        <KpiCard label="Ecosystems" value={Object.keys(ecosystems).length} color={MEDIUM} icon={Package} />
      </div>

      {/* Ecosystems breakdown */}
      {Object.keys(ecosystems).length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-3">Ecosystems Breakdown</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(ecosystems).map(([eco, count]) => (
              <div key={eco} className="p-3 rounded-xl text-center" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>{eco}</p>
                <p className="text-2xl font-black font-mono mt-1" style={{ color: CYAN }}>{count}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* License risk table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">License Risk Records</h3>
        {isLoading ? <Skeleton lines={5} /> : licenses.length === 0
          ? <EmptyState icon={Package} title="No license data" description="Generate an SBOM to populate this table." />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Package", "Version", "License", "Risk", "Ecosystem"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-semibold" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((l, i) => (
                    <tr key={l.id || i} className="hover:bg-white/5 transition-colors" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{l.package_name || "—"}</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{l.version || "—"}</td>
                      <td className="py-2 px-3" style={{ color: CYAN }}>{l.license_type || l.spdx_id || "—"}</td>
                      <td className="py-2 px-3"><SevBadge sev={l.risk_level} /></td>
                      <td className="py-2 px-3" style={{ color: MUTED }}>{l.ecosystem || l.package_manager || "—"}</td>
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