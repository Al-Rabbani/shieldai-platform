import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Zap, GitPullRequest, Shield, AlertTriangle, Play, Copy, CheckCircle,
  Package, RefreshCw, ExternalLink, Clock, ChevronDown, ChevronUp
} from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SEV_COLOR, SevBadge, Skeleton, EmptyState, Breadcrumb, Card, KpiCard, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

function PRModal({ pr, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(pr.commit_message); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: "#050e1f", border: `1px solid ${CYAN}40` }}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white">{pr.title}</h3>
            <p className="text-xs mt-1 font-mono" style={{ color: CYAN }}>{pr.branch}</p>
          </div>
          <div className="flex items-center gap-2">
            {pr.live
              ? <span className="flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full" style={{ background: `${LOW}15`, color: LOW, border: `1px solid ${LOW}40` }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />PR CREATED ON GITHUB</span>
              : <span className="flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full" style={{ background: `${MEDIUM}15`, color: MEDIUM, border: `1px solid ${MEDIUM}40` }}>PR SIMULATED — ADD GITHUB_TOKEN</span>
            }
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Playbook: {pr.playbook_name}</p>
          <div className="space-y-1.5">
            {pr.playbook_steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5" style={{ background: `${CYAN}15`, color: CYAN }}>{i + 1}</span>
                <span className="text-xs" style={{ color: TEXT }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
          <span className="text-xs font-mono truncate mr-2" style={{ color: MUTED }}>{pr.commit_message}</span>
          <button onClick={copy} className="flex-shrink-0" style={{ color: copied ? LOW : MUTED }}>
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex gap-3">
          {pr.url && <a href={pr.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}><ExternalLink className="w-3.5 h-3.5" />Open on GitHub</a>}
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${BORDER}40`, color: MUTED }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PlaybookCard({ pb }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="p-4" glow>
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-bold text-white">{pb.name}</p>
        <button onClick={() => setExpanded(!expanded)} style={{ color: MUTED }}>{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {pb.applies_to.map(tag => (
          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: `${CYAN}12`, color: CYAN }}>{tag}</span>
        ))}
      </div>
      {expanded && (
        <div className="mt-2 space-y-1.5 border-t pt-2" style={{ borderColor: BORDER }}>
          {pb.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0" style={{ background: `${CYAN}15`, color: CYAN }}>{i + 1}</span>
              <span className="text-[11px]" style={{ color: MUTED }}>{step}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function GDSAutoRemediationPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prModal, setPrModal] = useState(null);
  const [prLoading, setPrLoading] = useState({});
  const [bulkSeverity, setBulkSeverity] = useState("critical");
  const [bulkLimit, setBulkLimit] = useState(3);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [cloudFix, setCloudFix] = useState(null);
  const [cloudFixLoading, setCloudFixLoading] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    base44.functions.invoke("gdsAutoRemediation", { action: "status" })
      .then(r => setStatus(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generatePR = async (findingId) => {
    setPrLoading(p => ({ ...p, [findingId]: true }));
    try {
      const res = await base44.functions.invoke("gdsAutoRemediation", { action: "generate_pr", finding_id: findingId });
      setPrModal(res.data?.pr);
    } catch (e) { console.error(e); }
    finally { setPrLoading(p => ({ ...p, [findingId]: false })); }
  };

  const runBulk = async () => {
    setBulkLoading(true); setBulkResult(null);
    try {
      const res = await base44.functions.invoke("gdsAutoRemediation", { action: "bulk_remediate", severity_filter: bulkSeverity, limit: bulkLimit });
      setBulkResult(res.data);
    } catch (e) { console.error(e); }
    finally { setBulkLoading(false); }
  };

  const getCloudFix = async () => {
    setCloudFixLoading(true); setCloudFix(null);
    try {
      const res = await base44.functions.invoke("gdsAutoRemediation", { action: "apply_cloud_fix" });
      setCloudFix(res.data);
    } catch (e) { console.error(e); }
    finally { setCloudFixLoading(false); }
  };

  const copyCommands = () => {
    if (cloudFix?.cli_commands) { navigator.clipboard.writeText(cloudFix.cli_commands.join("\n")); setCopiedCmd(true); setTimeout(() => setCopiedCmd(false), 2000); }
  };

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "Auto-Remediation" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Autonomous Auto-Remediation Engine</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>AI-driven fix generation, PR automation, and cloud playbooks</p>
      </div>

      {loading ? <Skeleton lines={3} /> : status && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Open Findings" value={status.open_findings} color={DANGER} icon={AlertTriangle} />
          <KpiCard label="AutoFix Eligible" value={status.autofix_eligible} color={CYAN} icon={Zap} />
          <KpiCard label="PRs Generated" value={status.prs_generated} color={LOW} icon={GitPullRequest} />
          <KpiCard label="KEV Findings" value={status.kev_findings} color={DANGER} icon={Shield} pulse />
          <KpiCard label="Playbooks" value={status.playbooks_available} color={MEDIUM} icon={Package} />
        </div>
      )}

      {/* Playbook Reference */}
      {status?.playbooks && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Playbook Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {status.playbooks.map(pb => <PlaybookCard key={pb.id} pb={pb} />)}
          </div>
        </div>
      )}

      {/* Top Candidates */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Top AutoFix Candidates</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>Click "Generate PR" to create an automated fix</span>
        </div>
        {!status?.top_candidates?.length
          ? <EmptyState icon={Zap} title="No AutoFix candidates" description="Run a scan to populate eligible findings" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Title", "Severity", "Package", "Fixed Version", "CVE", "", "Action"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {status.top_candidates.map((c, i) => (
                    <tr key={c.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3 text-xs text-white max-w-xs truncate">{c.title}</td>
                      <td className="px-4 py-3"><SevBadge sev={c.severity} /></td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{c.package}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: LOW }}>{c.fixed_version}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: HIGH }}>{c.cve_id || "—"}</td>
                      <td className="px-4 py-3">
                        {c.kev && <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: DANGER, background: `${DANGER}18` }}>KEV</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.pr_url
                          ? <a href={c.pr_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold" style={{ color: LOW }}><ExternalLink className="w-3 h-3" />View PR</a>
                          : (
                            <button onClick={() => generatePR(c.id)} disabled={prLoading[c.id]}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                              style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
                              {prLoading[c.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                              Generate PR
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* Bulk Remediation */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Bulk Remediation</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold" style={{ color: MUTED }}>Severity:</label>
            <select value={bulkSeverity} onChange={e => setBulkSeverity(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold" style={{ color: MUTED }}>Limit: {bulkLimit}</label>
            <input type="range" min={1} max={10} value={bulkLimit} onChange={e => setBulkLimit(Number(e.target.value))} className="w-24" />
          </div>
          <button onClick={runBulk} disabled={bulkLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            {bulkLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {bulkLoading ? "Queuing…" : "Queue Bulk Remediation"}
          </button>
        </div>
        {bulkResult?.queued?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["Title", "Severity", "Branch", "CVE", "Status"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bulkResult.queued.map((q, i) => (
                  <tr key={q.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <td className="px-4 py-2 text-xs text-white truncate max-w-xs">{q.title}</td>
                    <td className="px-4 py-2"><SevBadge sev={q.severity} /></td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: CYAN }}>{q.branch}</td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: HIGH }}>{q.cve_id || "—"}</td>
                    <td className="px-4 py-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${MEDIUM}15`, color: MEDIUM }}>queued</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs" style={{ color: MUTED }}>Total queued: {bulkResult.total_queued} fix{bulkResult.total_queued !== 1 ? "es" : ""}</p>
          </div>
        )}
      </Card>

      {/* Cloud Fix */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Cloud Fix Plan</h3>
          <button onClick={getCloudFix} disabled={cloudFixLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            {cloudFixLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {cloudFixLoading ? "Generating…" : "Generate Cloud Fix Plan"}
          </button>
        </div>
        {cloudFix && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-white">{cloudFix.playbook?.name}</p>
              {cloudFix.requires_approval && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color: MEDIUM, background: `${MEDIUM}15`, border: `1px solid ${MEDIUM}30` }}>REQUIRES HUMAN APPROVAL</span>
              )}
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#020817", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: BORDER }}>
                <span className="text-[10px] font-mono" style={{ color: MUTED }}>AWS CLI Commands</span>
                <button onClick={copyCommands} className="flex items-center gap-1 text-[10px]" style={{ color: copiedCmd ? LOW : MUTED }}>
                  {copiedCmd ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedCmd ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono overflow-x-auto" style={{ color: "#a8ff78", lineHeight: 1.7 }}>
                {cloudFix.cli_commands.join("\n")}
              </pre>
            </div>
          </div>
        )}
      </Card>

      {prModal && <PRModal pr={prModal} onClose={() => setPrModal(null)} />}
    </div>
  );
}