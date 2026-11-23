import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { GitBranch, Play, RefreshCw, CheckCircle, EyeOff } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG, SevBadge, Card, KpiCard, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

export default function GDSReachabilityPage() {
  const [tab, setTab] = useState("reachable");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  const { data: allFindings = [], isLoading, refetch } = useQuery({
    queryKey: ["reachability-findings"],
    queryFn: () => base44.entities.SCAFinding.list("-created_date", 300).catch(() =>
      base44.entities.TriagedFinding.filter({}).catch(() => [])
    ),
  });

  const reachable = allFindings.filter(f => f.reachable === true || f.reachability === "reachable" || f.reachability_status === "reachable");
  const unreachable = allFindings.filter(f => f.reachable === false || f.reachability === "unreachable" || f.reachability_status === "unreachable");
  const analyzed = scanResult?.findings_analyzed ?? allFindings.length;
  const reachableCount = scanResult?.reachable_count ?? reachable.length;
  const unreachableCount = scanResult?.unreachable_count ?? unreachable.length;
  const noisePct = analyzed > 0 ? Math.round((unreachableCount / analyzed) * 100) : 0;

  const analyze = async () => {
    setScanning(true); setScanError(null);
    try {
      const res = await base44.functions.invoke("gdsReachability", {
        repo_full_name: "Al-Rabbani/gds-os",
        auto_load_from_db: true,
        save_to_db: true,
      });
      setScanResult(res.data);
      refetch();
    } catch (e) {
      setScanError(e.message || "Analysis failed");
    } finally {
      setScanning(false);
    }
  };

  const displayFindings = tab === "reachable" ? (reachable.length ? reachable : allFindings.slice(0, 50)) : unreachable;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${LOW}15`, border: `1px solid ${LOW}30` }}>
          <GitBranch className="w-5 h-5" style={{ color: LOW }} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Reachability Analysis</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>Eliminate noise — only fix vulnerabilities that are actually reachable in your code</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Findings Analyzed" value={analyzed} color={CYAN} icon={GitBranch} />
        <KpiCard label="Reachable" value={reachableCount} color={DANGER} icon={CheckCircle} pulse />
        <KpiCard label="Unreachable" value={unreachableCount} color={LOW} icon={EyeOff} />
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Noise Eliminated</p>
          <p className="text-3xl font-black font-mono" style={{ color: LOW }}>{noisePct}%</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>unreachable deprioritized</p>
        </div>
      </div>

      {/* Analyze Button */}
      <div className="flex items-center gap-4">
        <button onClick={analyze} disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
          {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {scanning ? "Analyzing…" : "Analyze Now"}
        </button>
        {scanError && <p className="text-sm" style={{ color: DANGER }}>{scanError}</p>}
        {scanResult?.message && <p className="text-sm" style={{ color: LOW }}>{scanResult.message}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "reachable", label: `Reachable — fix now (${reachableCount})`, color: DANGER },
          { key: "unreachable", label: `Unreachable — deprioritized (${unreachableCount})`, color: LOW },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: tab === t.key ? `${t.color}15` : "transparent",
              border: `1px solid ${tab === t.key ? t.color + "50" : BORDER}`,
              color: tab === t.key ? t.color : MUTED,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Findings Table */}
      <Card className="overflow-hidden">
        {isLoading ? <Skeleton /> : displayFindings.length === 0
          ? <EmptyState icon={GitBranch} title={`No ${tab} findings`} description="Run an analysis to see results" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Package", "CVE ID", "Severity", "Called In Files", "Confidence", "Priority Adjustment"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayFindings.slice(0, 100).map((f, i) => {
                    const calledIn = f.called_in_files
                      ? (Array.isArray(f.called_in_files) ? f.called_in_files : f.called_in_files.split(","))
                      : [];
                    const confidence = f.confidence || f.reachability_confidence || (tab === "reachable" ? "high" : "medium");
                    const confColor = confidence === "high" ? DANGER : confidence === "medium" ? MEDIUM : LOW;
                    const priority = f.priority_adjustment || (tab === "unreachable" ? "deprioritized" : "fix-now");
                    const prioColor = priority === "fix-now" || priority === "critical" ? DANGER : priority === "deprioritized" ? MUTED : MEDIUM;
                    return (
                      <tr key={f.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                        <td className="px-4 py-3 text-xs font-mono text-white">{f.package_name || f.asset_name || "—"}</td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{f.cve_id || "—"}</td>
                        <td className="px-4 py-3"><SevBadge sev={f.severity || f.normalized_severity} /></td>
                        <td className="px-4 py-3">
                          {calledIn.length > 0
                            ? <div className="flex flex-wrap gap-1">{calledIn.slice(0, 3).map((file, j) => (
                              <span key={j} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>{String(file).split("/").pop()}</span>
                            ))}{calledIn.length > 3 && <span className="text-[9px]" style={{ color: MUTED }}>+{calledIn.length - 3}</span>}</div>
                            : <span className="text-[10px]" style={{ color: MUTED }}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                            style={{ color: confColor, background: `${confColor}15` }}>{confidence}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: prioColor, background: `${prioColor}15`, border: `1px solid ${prioColor}30` }}>
                            {priority}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  );
}