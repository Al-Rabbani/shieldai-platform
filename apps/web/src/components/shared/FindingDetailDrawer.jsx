import React, { useState } from "react";
import { X, Code, FileText, Wrench, History, MessageSquare, GitBranch, Clock, AlertCircle, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_COLORS = {
  critical: { bg: "bg-red-600", text: "text-white", border: "border-red-500" },
  high: { bg: "bg-orange-500", text: "text-white", border: "border-orange-400" },
  medium: { bg: "bg-yellow-500", text: "text-black", border: "border-yellow-400" },
  low: { bg: "bg-blue-500", text: "text-white", border: "border-blue-400" },
  info: { bg: "bg-gray-500", text: "text-white", border: "border-gray-400" },
};

const REACHABILITY_COLORS = {
  exploitable: { bg: "bg-red-900/50", text: "text-red-400", border: "border-red-700", label: "EXPLOITABLE" },
  likely: { bg: "bg-orange-900/50", text: "text-orange-400", border: "border-orange-700", label: "LIKELY" },
  conditional: { bg: "bg-yellow-900/50", text: "text-yellow-400", border: "border-yellow-700", label: "CONDITIONAL" },
  theoretical: { bg: "bg-gray-800", text: "text-gray-500", border: "border-gray-700", label: "THEORETICAL" },
};

const STATUS_COLORS = {
  open: { bg: "bg-slate-700", text: "text-white", border: "border-slate-600" },
  inProgress: { bg: "bg-blue-700", text: "text-white", border: "border-blue-600" },
  inRemediation: { bg: "bg-blue-700", text: "text-white", border: "border-blue-600" },
  fixed: { bg: "bg-green-700", text: "text-white", border: "border-green-600" },
  resolved: { bg: "bg-green-700", text: "text-white", border: "border-green-600" },
  acceptedRisk: { bg: "bg-gray-700", text: "text-white", border: "border-gray-600" },
  falsePositive: { bg: "bg-gray-700", text: "text-white", border: "border-gray-600" },
};

const SLA_DEADLINES = {
  critical: { label: "24h SLA" },
  high: { label: "72h SLA" },
  medium: { label: "7d SLA" },
  low: { label: "30d SLA" },
};

export function FindingDetailDrawer({
  finding,
  onClose,
  onStatusChange,
  onGenerateAutofix,
}) {
  const [activeTab, setActiveTab] = useState('overview');

  const severity = SEVERITY_COLORS[finding.severity];
  const reachability = finding.reachability ? REACHABILITY_COLORS[finding.reachability] : null;
  const status = STATUS_COLORS[finding.status];

  const getCVSSColor = (score) => {
    if (score >= 9) return '#ef4444';
    if (score >= 7) return '#f97316';
    if (score >= 4) return '#eab308';
    return '#3b82f6';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-[640px] h-full bg-[#111827] border-l border-slate-800 shadow-2xl flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-slate-800">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={cn("px-2.5 py-0.5 rounded text-[10px] font-black uppercase", severity.bg, severity.text)}>
                {finding.severity}
              </span>
              {reachability && (
                <span className={cn("px-2.5 py-0.5 rounded text-[10px] font-black uppercase border", reachability.bg, reachability.text, reachability.border)}>
                  {reachability.label}
                </span>
              )}
              <span className={cn("px-2.5 py-0.5 rounded text-[10px] font-bold border", status.bg, status.text, status.border)}>
                {finding.status.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{finding.title}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              {finding.asset && (
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5" />
                  {finding.asset}
                </span>
              )}
              {finding.detectedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Detected {new Date(finding.detectedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex border-b border-slate-800 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'evidence', label: 'Evidence', icon: Code },
            { id: 'remediation', label: 'Remediation', icon: Wrench },
            { id: 'history', label: 'History', icon: History },
            { id: 'discussion', label: 'Discussion', icon: MessageSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-[#C9A84C] text-[#C9A84C]"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* AutoFix PR Banner */}
          {finding.autofix_pr_url ? (
            <div className="mb-4 rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.35)" }}>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                AutoFix PR created — ready for review
              </div>
              <a href={finding.autofix_pr_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap"
                style={{ background: "#22c55e" }}>
                🔀 View AutoFix PR on GitHub <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : finding.autofix_available ? (
            <div className="mb-4 rounded-xl p-3 flex items-center gap-2" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)" }}>
              <span className="text-sm">⚡</span>
              <span className="text-xs text-yellow-400 font-semibold">AutoFix Available — PR pending...</span>
            </div>
          ) : null}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {finding.cvssScore && (
                <div className="rounded-xl border border-slate-800 p-5 bg-slate-900/50">
                  <div className="text-xs text-slate-500 mb-2">CVSS Score</div>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-black" style={{ color: getCVSSColor(finding.cvssScore) }}>
                      {finding.cvssScore}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${finding.cvssScore * 10}%`, background: getCVSSColor(finding.cvssScore) }}
                        />
                      </div>
                      {finding.cvssVector && (
                        <div className="text-[10px] text-slate-500 mt-2 font-mono">{finding.cvssVector}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {finding.cwe && (
                  <div className="rounded-lg border border-slate-800 p-4">
                    <div className="text-[10px] text-slate-500 mb-1">CWE</div>
                    <div className="text-sm font-bold text-white">{finding.cwe}</div>
                  </div>
                )}
                {finding.owasp && (
                  <div className="rounded-lg border border-slate-800 p-4">
                    <div className="text-[10px] text-slate-500 mb-1">OWASP</div>
                    <div className="text-sm font-bold text-white">{finding.owasp}</div>
                  </div>
                )}
                {finding.epssScore && (
                  <div className="rounded-lg border border-slate-800 p-4">
                    <div className="text-[10px] text-slate-500 mb-1">EPSS Score</div>
                    <div className="text-sm font-bold text-white">{finding.epssScore}th percentile</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {100 - finding.epssScore}% of CVEs are less likely to be exploited
                    </div>
                  </div>
                )}
                {finding.inCisaKev !== undefined && (
                  <div className="rounded-lg border border-slate-800 p-4">
                    <div className="text-[10px] text-slate-500 mb-1">CISA KEV</div>
                    <div className={cn("text-sm font-bold flex items-center gap-1", finding.inCisaKev ? "text-red-400" : "text-green-400")}>
                      {finding.inCisaKev ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      {finding.inCisaKev ? "YES - Known Exploited" : "Not in CISA KEV"}
                    </div>
                  </div>
                )}
              </div>

              {finding.slaDeadline && (
                <div className="rounded-xl border border-slate-800 p-5 bg-slate-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-slate-500">SLA Deadline</div>
                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold", severity.bg, severity.text)}>
                      {SLA_DEADLINES[finding.severity]?.label}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mb-2">{new Date(finding.slaDeadline).toLocaleDateString()}</div>
                  <div className="text-[10px] text-slate-500">
                    Time remaining: {Math.ceil((new Date(finding.slaDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                  </div>
                </div>
              )}

              {/* AutoFix & Remediation section */}
              {(finding.cve_id || finding.cve || finding.fixed_version || finding.autofix_pr_url || finding.epss_score || finding.exploited_in_wild) && (
                <div className="rounded-xl border border-slate-800 p-5 bg-slate-900/50 space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">AutoFix &amp; Remediation</div>
                  <div className="flex flex-wrap gap-2">
                    {(finding.cve_id || finding.cve) && (
                      <a href={`https://nvd.nist.gov/vuln/detail/${finding.cve_id || finding.cve}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-400 hover:underline font-mono px-2 py-1 rounded"
                        style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}>
                        {finding.cve_id || finding.cve} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {finding.fixed_version && (
                      <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: "#0d1220", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                        Fix: {finding.fixed_version}
                      </span>
                    )}
                    {finding.epss_score != null && (
                      <span className="text-xs px-2 py-1 rounded font-mono" style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }}>
                        EPSS: {(finding.epss_score * 100).toFixed(1)}%
                      </span>
                    )}
                    {finding.exploited_in_wild && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.35)" }}>
                        <AlertCircle className="w-3 h-3" /> Exploited in Wild (CISA KEV)
                      </span>
                    )}
                  </div>
                  {finding.autofix_pr_url && (
                    <a href={finding.autofix_pr_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-white w-fit"
                      style={{ background: "#22c55e" }}>
                      🔀 View AutoFix PR on GitHub <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {finding.codeSnippet ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-500">Vulnerable Code</div>
                    <button className="p-1.5 hover:bg-slate-800 rounded transition-colors">
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono p-4 rounded-lg bg-[#0d1220] text-slate-300 overflow-x-auto border border-slate-800">
                    <code>{finding.codeSnippet}</code>
                  </pre>
                </div>
              ) : finding.evidence ? (
                <>
                  {finding.evidence.request && (
                    <div>
                      <div className="text-xs text-slate-500 mb-2">HTTP Request</div>
                      <pre className="text-[10px] font-mono p-4 rounded-lg bg-[#0d1220] text-slate-300 overflow-x-auto border border-slate-800">
                        <code>{finding.evidence.request}</code>
                      </pre>
                    </div>
                  )}
                  {finding.evidence.response && (
                    <div>
                      <div className="text-xs text-slate-500 mb-2">HTTP Response</div>
                      <pre className="text-[10px] font-mono p-4 rounded-lg bg-[#0d1220] text-slate-300 overflow-x-auto border border-slate-800">
                        <code>{finding.evidence.response}</code>
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">No evidence available</div>
              )}
            </div>
          )}

          {activeTab === 'remediation' && (
            <div className="space-y-4">
              {finding.remediation && (
                <div>
                  <div className="text-sm font-bold text-white mb-3">Fix Instructions</div>
                  <div className="text-sm text-slate-300 whitespace-pre-line">{finding.remediation}</div>
                </div>
              )}
              <div className="rounded-xl border border-slate-800 p-5 bg-slate-900/50">
                <div className="text-xs text-slate-500 mb-3">Estimated Fix Time</div>
                <div className="text-lg font-bold text-white">~15 minutes</div>
              </div>
              {onGenerateAutofix && (
                <button
                  onClick={onGenerateAutofix}
                  className="w-full py-3 rounded-lg text-sm font-bold text-black transition-all hover:scale-[1.02]"
                  style={{ background: "#C9A84C" }}
                >
                  Generate AutoFix PR
                </button>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="text-center py-12 text-slate-500 text-sm">
              Timeline coming soon — track all status changes, assignments, and comments
            </div>
          )}

          {activeTab === 'discussion' && (
            <div className="text-center py-12 text-slate-500 text-sm">
              Discussion coming soon — collaborate with your team on this finding
            </div>
          )}
        </div>

        {onStatusChange && (
          <div className="p-6 border-t border-slate-800 bg-slate-900/50">
            <select
              value={finding.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            >
              <option value="open">Open</option>
              <option value="inProgress">In Progress</option>
              <option value="inRemediation">In Remediation</option>
              <option value="fixed">Fixed</option>
              <option value="resolved">Resolved</option>
              <option value="acceptedRisk">Accepted Risk</option>
              <option value="falsePositive">False Positive</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}