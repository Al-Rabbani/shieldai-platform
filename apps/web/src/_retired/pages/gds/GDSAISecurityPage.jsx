import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cpu, Play, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG, SevBadge, Card, KpiCard, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const OWASP_COLORS = {
  LLM01: DANGER, LLM02: HIGH, LLM03: HIGH, LLM04: MEDIUM,
  LLM05: MEDIUM, LLM06: LOW, LLM07: CYAN, LLM08: HIGH,
  LLM09: MEDIUM, LLM10: LOW,
};

function FindingRow({ f }) {
  const [expanded, setExpanded] = useState(false);
  const ruleColor = OWASP_COLORS[f.rule_id?.split(":")[0]] || CYAN;
  return (
    <>
      <tr style={{ borderBottom: `1px solid ${BORDER}20`, background: CARD }}>
        <td className="px-4 py-3">
          <span className="text-[10px] font-black px-2 py-0.5 rounded font-mono"
            style={{ color: ruleColor, background: `${ruleColor}15`, border: `1px solid ${ruleColor}30` }}>
            {f.rule_id || "—"}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-white max-w-xs">{f.title || f.message || "—"}</td>
        <td className="px-4 py-3"><SevBadge sev={f.severity || f.normalized_severity} /></td>
        <td className="px-4 py-3">
          {f.commit_url
            ? <a href={f.commit_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono hover:opacity-80 transition-opacity truncate max-w-[180px]"
              style={{ color: CYAN }}>
              {(f.file_path || f.asset_name || "view").split("/").slice(-2).join("/")}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
            : <span className="text-xs font-mono truncate block max-w-[180px]" style={{ color: MUTED }}>{f.file_path || f.asset_name || "—"}</span>}
        </td>
        <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{f.line_number || "—"}</td>
        <td className="px-4 py-3">
          {f.remediation && (
            <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity" style={{ color: CYAN }}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? "Hide" : "Show"}
            </button>
          )}
        </td>
      </tr>
      {expanded && f.remediation && (
        <tr style={{ borderBottom: `1px solid ${BORDER}20` }}>
          <td colSpan={6} className="px-4 py-3">
            <div className="p-3 rounded-xl text-xs" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}20`, color: TEXT }}>
              <span className="font-bold text-white">Remediation: </span>{f.remediation}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function GDSAISecurityPage() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  const { data: findings = [], isLoading, refetch } = useQuery({
    queryKey: ["ai-sast-findings"],
    queryFn: () => base44.entities.TriagedFinding.filter({ source_scanners: "ai_sast" }).catch(() =>
      base44.entities.SASTFinding.list("-created_date", 200).catch(() => [])
    ),
  });

  const aiFindings = findings.filter(f =>
    (f.source_scanners || f.scanner || "").toLowerCase().includes("ai")
    || (f.rule_id || "").startsWith("LLM")
    || (f.category || "").startsWith("LLM")
  );

  const displayFindings = aiFindings.length > 0 ? aiFindings : findings;

  const owaspCounts = displayFindings.reduce((acc, f) => {
    const cat = (f.rule_id || f.category || "").split(":")[0];
    if (cat.startsWith("LLM")) acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const fileCount = new Set(displayFindings.map(f => f.file_path || f.asset_name).filter(Boolean)).size;

  const scan = async () => {
    setScanning(true); setScanError(null);
    try {
      const res = await base44.functions.invoke("gdsAISAST", {
        repo_full_name: "Al-Rabbani/gds-os",
        save_to_db: true,
      });
      setScanResult(res.data);
      refetch();
    } catch (e) {
      setScanError(e.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const critical = displayFindings.filter(f => (f.severity || f.normalized_severity) === "critical").length;
  const high = displayFindings.filter(f => (f.severity || f.normalized_severity) === "high").length;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)" }}>
          <Cpu className="w-5 h-5" style={{ color: "#8B5CF6" }} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">AI Code Security</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>
            Detects prompt injection, hardcoded LLM keys, and insecure AI agent patterns — OWASP LLM Top 10 2025
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Files Scanned" value={scanResult?.files_scanned ?? fileCount} color={CYAN} icon={Cpu} />
        <KpiCard label="AI Findings" value={displayFindings.length} color={HIGH} icon={Cpu} />
        <KpiCard label="Critical" value={critical} color={DANGER} icon={Cpu} pulse />
        <KpiCard label="High" value={high} color={HIGH} icon={Cpu} />
      </div>

      {/* OWASP breakdown */}
      {Object.keys(owaspCounts).length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-white mb-3">OWASP LLM Top 10 Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(owaspCounts).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => {
              const color = OWASP_COLORS[cat] || CYAN;
              return (
                <div key={cat} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                  <span className="text-[11px] font-black font-mono" style={{ color }}>{cat}</span>
                  <span className="text-[11px] font-black" style={{ color }}>{cnt}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Scan button */}
      <div className="flex items-center gap-4">
        <button onClick={scan} disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", color: "#8B5CF6" }}>
          {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {scanning ? "Scanning…" : "Scan Now"}
        </button>
        {scanError && <p className="text-sm" style={{ color: DANGER }}>{scanError}</p>}
        {scanResult?.message && <p className="text-sm" style={{ color: LOW }}>{scanResult.message}</p>}
      </div>

      {/* Findings table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">AI Security Findings ({displayFindings.length})</h3>
        </div>
        {isLoading ? <Skeleton /> : displayFindings.length === 0
          ? <EmptyState icon={Cpu} title="No AI security findings" description="Run a scan to detect OWASP LLM Top 10 issues in your codebase" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Rule / OWASP", "Title", "Severity", "File", "Line", "Remediation"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayFindings.slice(0, 100).map((f, i) => <FindingRow key={f.id || i} f={f} />)}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  );
}