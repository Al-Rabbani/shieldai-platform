import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Code2, GitPullRequest, Package } from "lucide-react";

const CARD = { background: "#111827", border: "1px solid #1F2937" };
const CODE_ASSET_TYPES = ["repository", "api", "container"];

export default function DeveloperDashboardView({ findings }) {
  const codeFindings = useMemo(
    () => findings.filter((finding) => CODE_ASSET_TYPES.includes(finding.asset_type) || Boolean(finding.cve_id)),
    [findings]
  );

  const autofix = codeFindings.filter((finding) => finding.autofix_available);
  const tiles = [
    { label: "Code findings", value: codeFindings.length, color: "#3b82f6" },
    { label: "Fixes ready", value: autofix.length, color: "#22c55e" },
    { label: "Exploited in wild", value: codeFindings.filter((f) => f.exploited_in_wild).length, color: "#ef4444" },
    { label: "Packages affected", value: new Set(codeFindings.map((f) => f.package_name).filter(Boolean)).size, color: "#a855f7" },
  ];

  const byClass = useMemo(() => {
    const counts = {};
    codeFindings.forEach((finding) => {
      const key = finding.cwe_id || finding.cve_id || "Unclassified";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [codeFindings]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl p-3" style={{ ...CARD, borderLeft: `3px solid ${tile.color}` }}>
            <p className="text-lg font-bold font-mono text-white">{tile.value}</p>
            <p className="text-[10px] text-slate-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={CARD}>
          <div className="flex items-center gap-1.5 mb-2">
            <GitPullRequest size={13} className="text-emerald-400" />
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Fixes ready to merge</p>
            <Link to="/vulnerability-fixes" className="ml-auto text-[10px] font-bold text-blue-400 hover:text-blue-300">All fixes →</Link>
          </div>
          {autofix.length === 0 ? (
            <p className="text-[11px] text-slate-600">No automated fixes pending in your code paths.</p>
          ) : (
            <div className="space-y-1.5">
              {autofix.slice(0, 6).map((finding) => (
                <div key={finding.id} className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-200 truncate">{finding.title}</span>
                  {finding.fixed_version && <span className="text-[9px] font-mono text-emerald-400">→ {finding.fixed_version}</span>}
                  {finding.autofix_pr_url ? (
                    <a
                      href={finding.autofix_pr_url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-[10px] font-bold text-blue-400 hover:text-blue-300 flex-shrink-0"
                    >
                      Pull request
                    </a>
                  ) : (
                    <span className="ml-auto text-[10px] text-slate-500">code ready</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl p-3" style={CARD}>
          <div className="flex items-center gap-1.5 mb-2">
            <Package size={13} className="text-purple-400" />
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Top vulnerability classes</p>
            <Link to="/code/sbom" className="ml-auto text-[10px] font-bold text-blue-400 hover:text-blue-300">SBOM →</Link>
          </div>
          {byClass.length === 0 ? (
            <p className="text-[11px] text-slate-600">No code findings to group.</p>
          ) : (
            <div className="space-y-1.5">
              {byClass.map(([label, count]) => (
                <div key={label} className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono text-slate-300">{label}</span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#1F2937" }}>
                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (count / codeFindings.length) * 100)}%` }} />
                  </div>
                  <span className="font-mono text-white w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: "1px solid #1F2937" }}>
            <Link to="/code" className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200"><Code2 size={10} /> Code security</Link>
            <Link to="/fix-library" className="text-[10px] font-bold text-slate-400 hover:text-slate-200">Fix library</Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3" style={CARD}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Your repositories under pressure</p>
        {codeFindings.length === 0 ? (
          <p className="text-[11px] text-slate-600">No repository findings right now.</p>
        ) : (
          [...codeFindings]
            .sort((a, b) => (b.cvss_score || 0) - (a.cvss_score || 0))
            .slice(0, 6)
            .map((finding) => (
              <div key={finding.id} className="flex items-center gap-2 text-[11px] py-0.5">
                <span className="font-mono text-white w-10">{finding.cvss_score ?? "—"}</span>
                <span className="text-slate-200 truncate">{finding.asset_name || finding.title}</span>
                <span className="ml-auto text-[10px] text-slate-500 truncate">{finding.package_name || finding.cwe_id || ""}</span>
              </div>
            ))
        )}
      </div>

      <p className="text-[10px] text-slate-600">Developer view — code findings, ready fixes and the packages behind them.</p>
    </div>
  );
}