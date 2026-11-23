import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileJson, Download, Clipboard, ChevronDown, ChevronRight, Loader2, Package, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import SeverityBadge from "@/components/shared/SeverityBadge";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const ECO_COLORS = {
  npm: "#cb3837", PyPI: "#3776ab", Go: "#00add8", Maven: "#c71a36",
  NuGet: "#004880", RubyGems: "#e9573f", cargo: "#f74c00", other: "#64748b",
};

export default function SBOMPage() {
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [format, setFormat] = useState("cyclonedx");
  const [enrichVulns, setEnrichVulns] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sbomResult, setSbomResult] = useState(null);
  const [showAllComponents, setShowAllComponents] = useState(false);

  const { data: repos = [] } = useQuery({
    queryKey: ["sbom-repos"],
    queryFn: () => base44.entities.CodeRepository.list().catch(() => []),
    initialData: [],
  });

  const handleGenerate = async () => {
    if (!repo.trim()) { toast.error("Enter a GitHub repository"); return; }
    setGenerating(true);
    setSbomResult(null);
    try {
      const res = await base44.functions.invoke("shieldGenerateSBOM", {
        repo_full_name: repo.trim(),
        github_token: token.trim() || undefined,
        format,
        enrich_vulns: enrichVulns,
      });
      const data = res?.data || res;
      setSbomResult(data);
      toast.success(`SBOM generated — ${data?.components?.length || 0} components found`);
    } catch (err) {
      toast.error("SBOM generation failed — check repository access and GitHub token");
    } finally { setGenerating(false); }
  };

  const handleDownload = (fmt) => {
    if (!sbomResult) return;
    const data = JSON.stringify(sbomResult, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sbom-${repo.replace("/", "-")}-${fmt}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SBOM downloaded");
  };

  const handleCopy = () => {
    if (!sbomResult) return;
    navigator.clipboard.writeText(JSON.stringify(sbomResult, null, 2));
    toast.success("SBOM copied to clipboard");
  };

  const components = sbomResult?.components || [];
  const vulnComponents = components.filter(c => c.vulnerabilities?.length > 0 || c.vuln_count > 0)
    .sort((a, b) => (SEV_ORDER[a.worst_severity] ?? 9) - (SEV_ORDER[b.worst_severity] ?? 9));
  const ecosystems = [...new Set(components.map(c => c.ecosystem || c.type).filter(Boolean))];
  const totalVulns = sbomResult?.total_vulnerabilities ?? vulnComponents.reduce((s, c) => s + (c.vulnerabilities?.length || c.vuln_count || 0), 0);
  const criticalVulns = components.filter(c => c.worst_severity === "critical").length;
  const kevMatches = components.filter(c => c.cisa_kev || c.kev).length;
  const highVulns = components.filter(c => c.worst_severity === "high").length;

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)" }}>
          <FileJson className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Software Bill of Materials</h1>
          <p className="text-xs text-slate-500">CycloneDX 1.5 & SPDX 2.3 · NTIA minimum elements · Vulnerability enrichment</p>
        </div>
      </div>

      {/* Generate Panel */}
      <div className="rounded-2xl p-6" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-400" /> Generate SBOM
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">GitHub Repository</label>
            <input value={repo} onChange={e => setRepo(e.target.value)}
              placeholder="owner/repo-name"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-slate-900 border border-slate-700 outline-none focus:border-blue-500 placeholder-slate-600"
              list="repo-list" />
            <datalist id="repo-list">
              {repos.map(r => <option key={r.id} value={r.full_name} />)}
            </datalist>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">GitHub Token (optional)</label>
            <input value={token} onChange={e => setToken(e.target.value)}
              type="password" placeholder="ghp_xxxxxxxxxxxx"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-slate-900 border border-slate-700 outline-none focus:border-blue-500 placeholder-slate-600" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-5">
          {/* Format toggle */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Format</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              {["cyclonedx", "spdx"].map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className="px-4 py-2 text-xs font-bold transition-all"
                  style={{ background: format === f ? "#3b82f6" : "#0d1117", color: format === f ? "#fff" : "#64748b" }}>
                  {f === "cyclonedx" ? "CycloneDX 1.5" : "SPDX 2.3"}
                </button>
              ))}
            </div>
          </div>

          {/* Enrich toggle */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Vuln Enrichment</label>
            <button onClick={() => setEnrichVulns(v => !v)}
              className="relative w-12 h-6 rounded-full transition-all"
              style={{ background: enrichVulns ? "#3b82f6" : "#374151" }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: enrichVulns ? "calc(100% - 22px)" : "2px" }} />
            </button>
          </div>
        </div>

        <button onClick={handleGenerate} disabled={generating || !repo.trim()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)" }}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
          {generating ? "Generating SBOM…" : "Generate SBOM"}
        </button>
      </div>

      {/* Results */}
      {sbomResult && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-2xl font-black font-mono text-blue-400">{components.length}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Total Components</p>
            </div>
            <div className="rounded-xl p-4 col-span-2" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Ecosystems</p>
              <div className="flex flex-wrap gap-1">
                {ecosystems.slice(0, 8).map(eco => (
                  <span key={eco} className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: ECO_COLORS[eco] || "#64748b", background: `${ECO_COLORS[eco] || "#64748b"}20` }}>{eco}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-2xl font-black font-mono text-orange-400">{totalVulns}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Total Vulns</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid rgba(239,68,68,0.4)" }}>
              {kevMatches > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mb-1" />}
              <p className="text-2xl font-black font-mono text-red-400">{criticalVulns}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Critical · {kevMatches} KEV</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-2xl font-black font-mono text-orange-400">{highVulns}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">High Vulns</p>
            </div>
          </div>

          {/* Download buttons */}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => handleDownload("cyclonedx")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-all">
              <Download className="w-3.5 h-3.5" /> Download CycloneDX JSON
            </button>
            <button onClick={() => handleDownload("spdx")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 transition-all">
              <Download className="w-3.5 h-3.5" /> Download SPDX JSON
            </button>
            <button onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-slate-600 text-slate-400 hover:text-white transition-all">
              <Clipboard className="w-3.5 h-3.5" /> Copy to Clipboard
            </button>
          </div>

          {/* Vulnerable components */}
          {vulnComponents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                Vulnerable Components ({vulnComponents.length})
              </h3>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                      {["Package", "Version", "Ecosystem", "Vulns", "Worst Severity", "CISA KEV", "EPSS%", "Fix Available"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vulnComponents.map((c, i) => {
                      const sevColor = SEV_COLOR[c.worst_severity] || "#64748b";
                      const isKEV = c.cisa_kev || c.kev;
                      const ecoColor = ECO_COLORS[c.ecosystem || c.type] || "#64748b";
                      return (
                        <tr key={c.purl || c.name || i}
                          style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                          className="hover:bg-white/2 transition-colors">
                          <td className="px-4 py-3"><span className="text-xs font-mono font-medium text-white">{c.name}</span></td>
                          <td className="px-4 py-3"><span className="text-[10px] font-mono text-slate-400">{c.version || "—"}</span></td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: ecoColor, background: `${ecoColor}20` }}>
                              {c.ecosystem || c.type || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-black font-mono" style={{ color: sevColor }}>{c.vulnerabilities?.length || c.vuln_count || 0}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: sevColor, background: `${sevColor}20` }}>
                              {c.worst_severity || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isKEV ? <span className="text-red-400 font-bold text-[10px] animate-pulse">🔴 KEV</span> : <span className="text-slate-700 text-[10px]">—</span>}
                          </td>
                          <td className="px-4 py-3 text-[10px] font-mono">
                            {c.epss != null ? (
                              <span style={{ color: c.epss > 0.5 ? "#ef4444" : c.epss > 0.2 ? "#f97316" : "#64748b" }}>
                                {(c.epss * 100).toFixed(1)}%
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {c.fix_available ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <span className="text-slate-600 text-[10px]">❌</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All components (collapsed by default) */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
            <button onClick={() => setShowAllComponents(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
              style={{ background: "#161b22" }}>
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                All Components ({components.length})
              </span>
              {showAllComponents ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {showAllComponents && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                      {["Name", "Version", "PURL", "Ecosystem", "Scope"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((c, i) => {
                      const ecoColor = ECO_COLORS[c.ecosystem || c.type] || "#64748b";
                      return (
                        <tr key={c.purl || i}
                          style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
                          <td className="px-4 py-2 text-xs font-mono text-white">{c.name}</td>
                          <td className="px-4 py-2 text-[10px] font-mono text-slate-400">{c.version || "—"}</td>
                          <td className="px-4 py-2">
                            <span className="text-[9px] font-mono text-slate-500 truncate max-w-56 block">{c.purl || "—"}</span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: ecoColor, background: `${ecoColor}20` }}>{c.ecosystem || c.type || "—"}</span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-[10px] px-2 py-0.5 rounded capitalize" style={{ color: c.scope === "required" ? "#22c55e" : "#64748b", background: c.scope === "required" ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)" }}>
                              {c.scope || "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* History */}
      {repos.filter(r => r.sbom_generated_at).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">Recent SBOM History</h3>
          <div className="space-y-2">
            {repos.filter(r => r.sbom_generated_at).slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#161b22", border: "1px solid #30363d" }}>
                <div className="flex items-center gap-3">
                  <FileJson className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs font-medium text-white">{r.full_name}</p>
                    <p className="text-[10px] text-slate-500">{r.total_packages || 0} packages · {r.sbom_format || "CycloneDX"}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">{r.sbom_generated_at ? new Date(r.sbom_generated_at).toLocaleDateString() : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!sbomResult && !generating && (
        <div className="rounded-2xl p-16 text-center" style={{ background: "#161b22", border: "1px dashed #30363d" }}>
          <FileJson className="w-14 h-14 text-slate-700 mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-400 mb-1">No SBOM generated yet</p>
          <p className="text-xs text-slate-600">Enter a GitHub repository above and click Generate SBOM</p>
        </div>
      )}
    </div>
  );
}