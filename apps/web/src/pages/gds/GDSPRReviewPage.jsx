import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { GitPullRequest, Play, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG,
  SevBadge, StatusBadge, Card, KpiCard, Skeleton, EmptyState, timeAgo
} from "@/components/gds/GDSOSShared";

const REVIEW_EVENT_COLORS = {
  APPROVED: LOW,
  COMMENT: CYAN,
  REQUEST_CHANGES: DANGER,
};

export default function GDSPRReviewPage() {
  const [form, setForm] = useState({ repo_full_name: "", pr_number: "", block_on_critical: false });
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  const { data: recentScans = [], isLoading, refetch } = useQuery({
    queryKey: ["pr-review-findings"],
    queryFn: () => base44.entities.TriagedFinding.list("-created_date", 50).catch(() => []),
  });

  const prFindings = recentScans.filter(f =>
    (f.source_scanners || f.scanner || "").toLowerCase().includes("pr_review")
  );

  const scan = async () => {
    if (!form.repo_full_name || !form.pr_number) return;
    setScanning(true); setScanError(null); setResult(null);
    try {
      const res = await base44.functions.invoke("gdsPRReview", {
        repo_full_name: form.repo_full_name,
        pr_number: parseInt(form.pr_number),
        post_review: true,
        block_on_critical: form.block_on_critical,
        save_to_db: true,
      });
      setResult(res.data);
      refetch();
    } catch (e) {
      setScanError(e.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const sevIcon = (sev) => sev === "critical" || sev === "high" ? "🔴" : sev === "medium" ? "🟠" : "🟡";

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
          <GitPullRequest className="w-5 h-5" style={{ color: CYAN }} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Pull Request Security Scanner</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>
            Post inline security comments directly on GitHub PRs — at the exact vulnerable line
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="PRs Scanned" value={new Set(prFindings.map(f => f.pr_number)).size || 0} color={CYAN} icon={GitPullRequest} />
        <KpiCard label="Total Findings" value={prFindings.length} color={HIGH} icon={GitPullRequest} />
        <KpiCard label="Critical" value={prFindings.filter(f => (f.severity || f.normalized_severity) === "critical").length} color={DANGER} icon={GitPullRequest} pulse />
        <KpiCard label="Reviews Posted" value={result ? 1 : 0} color={LOW} icon={CheckCircle} />
      </div>

      {/* Scan Form */}
      <Card className="p-5">
        <h3 className="font-bold text-white mb-4">Scan a Pull Request</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: MUTED }}>Repository (owner/repo)</label>
            <input
              value={form.repo_full_name}
              onChange={e => setForm(p => ({ ...p, repo_full_name: e.target.value }))}
              placeholder="Al-Rabbani/gds-os"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: MUTED }}>PR Number</label>
            <input
              type="number"
              value={form.pr_number}
              onChange={e => setForm(p => ({ ...p, pr_number: e.target.value }))}
              placeholder="42"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <div className="flex flex-col justify-end">
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: MUTED }}>Block on Critical</label>
            <div className="flex items-center gap-3 py-2">
              <button
                onClick={() => setForm(p => ({ ...p, block_on_critical: !p.block_on_critical }))}
                className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                style={{ background: form.block_on_critical ? DANGER : BORDER }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: form.block_on_critical ? "calc(100% - 18px)" : "2px" }} />
              </button>
              <span className="text-xs" style={{ color: form.block_on_critical ? DANGER : MUTED }}>
                {form.block_on_critical ? "Will request changes on critical" : "Comment only"}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={scan}
          disabled={scanning || !form.repo_full_name || !form.pr_number}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {scanning ? "Scanning…" : "Scan PR"}
        </button>
        {scanError && <p className="text-sm mt-3" style={{ color: DANGER }}>{scanError}</p>}
      </Card>

      {/* Results Panel */}
      {result && (
        <Card className="p-5 space-y-4" style={{ border: `1px solid ${LOW}30` }}>
          <h3 className="font-bold text-white">Scan Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["Files Scanned", result.files_scanned ?? "—", CYAN],
              ["Findings", result.findings_count ?? result.findings?.length ?? 0, HIGH],
              ["Review Posted", result.review_posted ? "Yes" : "No", result.review_posted ? LOW : MUTED],
              ["Review Event", result.review_event || "—", REVIEW_EVENT_COLORS[result.review_event] || CYAN],
            ].map(([label, value, color]) => (
              <div key={label} className="p-3 rounded-xl text-center" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: MUTED }}>{label}</p>
                {label === "Review Posted" ? (
                  <div className="flex justify-center">
                    {result.review_posted
                      ? <CheckCircle className="w-5 h-5" style={{ color: LOW }} />
                      : <XCircle className="w-5 h-5" style={{ color: MUTED }} />}
                  </div>
                ) : (
                  <p className="text-lg font-black font-mono" style={{ color }}>{value}</p>
                )}
              </div>
            ))}
          </div>

          {result.review_event && (
            <div className="px-4 py-2 rounded-xl inline-flex items-center gap-2"
              style={{ background: `${REVIEW_EVENT_COLORS[result.review_event] || CYAN}15`, border: `1px solid ${REVIEW_EVENT_COLORS[result.review_event] || CYAN}30` }}>
              <span className="text-xs font-black" style={{ color: REVIEW_EVENT_COLORS[result.review_event] || CYAN }}>
                Review: {result.review_event}
              </span>
              {result.review_url && (
                <a href={result.review_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs underline" style={{ color: CYAN }}>View on GitHub →</a>
              )}
            </div>
          )}

          {/* Inline findings from this scan */}
          {result.findings?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Sev", "Rule ID", "Name", "File", "Line", "Snippet"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.findings.map((f, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-3 py-2">{sevIcon(f.severity)} <SevBadge sev={f.severity} /></td>
                      <td className="px-3 py-2 text-[10px] font-mono" style={{ color: CYAN }}>{f.rule_id || "—"}</td>
                      <td className="px-3 py-2 text-xs text-white max-w-[140px] truncate">{f.name || f.title || "—"}</td>
                      <td className="px-3 py-2 text-[10px] font-mono truncate max-w-[120px]" style={{ color: MUTED }}>{f.file_path || f.path || "—"}</td>
                      <td className="px-3 py-2 text-xs font-mono" style={{ color: MUTED }}>{f.line_number ?? "—"}</td>
                      <td className="px-3 py-2">
                        {f.snippet && (
                          <code className="text-[9px] font-mono px-1.5 py-0.5 rounded block truncate max-w-[160px]"
                            style={{ background: "rgba(0,0,0,0.4)", color: MEDIUM }}>{f.snippet}</code>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Recent PR scans */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">Recent PR Scan Findings ({prFindings.length})</h3>
        </div>
        {isLoading ? <Skeleton /> : prFindings.length === 0
          ? <EmptyState icon={GitPullRequest} title="No PR scans yet" description="Scan a GitHub PR to see inline security findings here" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Severity", "Rule", "Title", "File", "Line", "Status", "Scanned"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prFindings.slice(0, 50).map((f, i) => (
                    <tr key={f.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3">{sevIcon(f.severity || f.normalized_severity)} <SevBadge sev={f.severity || f.normalized_severity} /></td>
                      <td className="px-4 py-3 text-[10px] font-mono" style={{ color: CYAN }}>{f.rule_id || "—"}</td>
                      <td className="px-4 py-3 text-xs text-white truncate max-w-[180px]">{f.title || "—"}</td>
                      <td className="px-4 py-3 text-[10px] font-mono truncate max-w-[140px]" style={{ color: MUTED }}>{f.file_path || f.asset_name || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{f.line_number ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                      <td className="px-4 py-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(f.detected_at || f.created_date)}</td>
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