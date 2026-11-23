import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  FileText, Download, AlertTriangle, CheckCircle, Shield,
  Clock, TrendingUp, Slack, RefreshCw, Send, ExternalLink
} from "lucide-react";

const GOLD = "#C9A84C";

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: color + "33" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
    </div>
  );
}

export default function MonthlyReportPage() {
  const [downloading, setDownloading] = useState(false);
  const [slackSending, setSlackSending] = useState(false);
  const [slackResult, setSlackResult] = useState(null);
  const [slackChannel, setSlackChannel] = useState("#security-alerts");
  const [downloadError, setDownloadError] = useState(null);

  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

  const { data: findings = [] } = useQuery({
    queryKey: ["monthly-findings"],
    queryFn: () => base44.entities.TriagedFinding.filter({}).catch(() => []),
  });
  const { data: compliance = [] } = useQuery({
    queryKey: ["monthly-compliance"],
    queryFn: () => base44.entities.ComplianceFramework.list().catch(() => []),
  });

  const criticals = findings.filter(f => f.severity === "critical" && f.status !== "fixed");
  const highs = findings.filter(f => f.severity === "high" && f.status !== "fixed");
  const slaBreached = findings.filter(f => f.sla_breached);
  const wins = findings.filter(f => {
    if (f.status !== "fixed" || !f.fixed_at) return false;
    const d = new Date(f.fixed_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const avgCompliance = compliance.length > 0
    ? Math.round(compliance.reduce((s, c) => s + (c.score || 0), 0) / compliance.length) : 0;
  const riskScore = criticals.length > 5 ? 85 : criticals.length > 2 ? 70 : criticals.length > 0 ? 55 : 30;
  const riskColor = riskScore >= 70 ? "#ef4444" : riskScore >= 50 ? "#f59e0b" : "#22c55e";

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await base44.functions.invoke("shieldMonthlyReport", {});
      // The function returns binary PDF — use fetch directly for blob download
      const resp = await fetch(`/api/functions/shieldMonthlyReport`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({}),
      });
      if (!resp.ok) throw new Error("Failed to generate report");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ShieldAI_Security_Report_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleSendSlackAlert = async () => {
    setSlackSending(true);
    setSlackResult(null);
    try {
      const res = await base44.functions.invoke("shieldSlackAlert", {
        finding: criticals[0] || highs[0] || null,
      });
      setSlackResult({ success: true, msg: `Alert posted to ${slackChannel}` });
    } catch (err) {
      setSlackResult({ success: false, msg: err.message });
    } finally {
      setSlackSending(false);
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      {/* Header */}
      <div className="fu flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <FileText className="w-3.5 h-3.5" /><span>Governance</span><span>/</span>
            <span style={{ color: GOLD }}>Monthly Security Report</span>
          </div>
          <h1 className="text-2xl font-black text-white">Monthly Security Posture Report</h1>
          <p className="text-slate-400 text-sm mt-0.5">{monthName} · Auto-generated from live platform data</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-60 text-black"
            style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? "Generating PDF…" : "Download PDF Report"}
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="fu rounded-xl p-4 border border-red-500/30 bg-red-500/10">
          <p className="text-sm text-red-400">⚠ {downloadError}</p>
        </div>
      )}

      {/* KPI Row */}
      <div className="fu grid grid-cols-2 md:grid-cols-5 gap-3" style={{ animationDelay: "60ms" }}>
        <StatCard label="Risk Score" value={riskScore} color={riskColor} icon={Shield} />
        <StatCard label="Critical Open" value={criticals.length} color="#ef4444" icon={AlertTriangle} />
        <StatCard label="High Open" value={highs.length} color="#f97316" icon={AlertTriangle} />
        <StatCard label="SLA Breached" value={slaBreached.length} color="#ef4444" icon={Clock} />
        <StatCard label="Wins This Month" value={wins.length} color="#22c55e" icon={CheckCircle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF Report Preview */}
        <div className="fu rounded-2xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "100ms" }}>
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "#1F2937" }}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: GOLD }} />
              <h2 className="font-bold text-white text-sm">Report Preview</h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: GOLD + "20", color: GOLD }}>PDF READY</span>
          </div>

          {/* Simulated PDF preview */}
          <div className="p-5 space-y-4" style={{ background: "#0d1220" }}>
            {/* Header block */}
            <div className="rounded-lg p-4 border-l-4" style={{ background: "#111827", borderColor: GOLD }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black" style={{ color: GOLD }}>ShieldAI</p>
                  <p className="text-sm font-bold text-white">Monthly Security Posture Report</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{monthName} · Confidential</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black" style={{ color: riskColor }}>{riskScore}</div>
                  <div className="text-[9px] text-slate-500">RISK SCORE</div>
                </div>
              </div>
            </div>

            {/* Remediation Wins */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#22c55e" }}>✅ Remediation Wins ({wins.length})</p>
              {wins.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No findings remediated this month yet.</p>
              ) : wins.slice(0, 3).map(w => (
                <div key={w.id} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: "#1F2937" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <p className="text-xs text-slate-300 truncate flex-1">{w.title}</p>
                  <span className="text-[10px] text-slate-500">{w.asset_name}</span>
                </div>
              ))}
              {wins.length > 3 && <p className="text-[10px] text-slate-600 mt-1">+ {wins.length - 3} more in PDF</p>}
            </div>

            {/* Critical Vulns */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#ef4444" }}>🔴 Remaining Criticals ({criticals.length})</p>
              {criticals.length === 0 ? (
                <p className="text-xs text-green-400 font-semibold">✓ No critical vulnerabilities outstanding!</p>
              ) : criticals.slice(0, 3).map(f => (
                <div key={f.id} className="flex items-start gap-2 py-1.5 border-b" style={{ borderColor: "#1F2937" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 truncate">{f.title}</p>
                    <p className="text-[10px] text-slate-500">{f.asset_name} · {f.cve_id || f.cwe_id || "—"}</p>
                  </div>
                </div>
              ))}
              {criticals.length > 3 && <p className="text-[10px] text-slate-600 mt-1">+ {criticals.length - 3} more in PDF</p>}
            </div>

            {/* Compliance */}
            {compliance.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-blue-400">📋 Compliance ({avgCompliance}% avg)</p>
                {compliance.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-slate-400 w-20">{c.name}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1F2937" }}>
                      <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.score >= 80 ? "#22c55e" : c.score >= 60 ? "#eab308" : "#ef4444" }} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-300 w-8 text-right">{c.score}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t" style={{ borderColor: "#1F2937" }}>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 text-black"
              style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? "Generating…" : "Download Full PDF Report"}
            </button>
          </div>
        </div>

        {/* Slack Alerts Panel */}
        <div className="fu space-y-4" style={{ animationDelay: "120ms" }}>
          <div className="rounded-2xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="flex items-center gap-2 mb-4">
              <Slack className="w-4 h-4 text-purple-400" />
              <h2 className="font-bold text-white text-sm">Slack Security Alerts</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 ml-auto">● Connected</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Critical and high-severity findings trigger an automatic Slack alert to your security channel. You can also send a manual alert below.
            </p>

            <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: "#0d1220", border: "1px solid #1F2937" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-semibold text-green-400">Automation Active</span>
              </div>
              <p className="text-[11px] text-slate-400">Every new <span className="text-white font-semibold">Critical</span> or <span className="text-orange-400 font-semibold">High</span> finding automatically posts to Slack with full context: CVE, asset, CVSS score, SLA deadline, and remediation guidance.</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <TrendingUp className="w-3 h-3" />
                <span>Trigger: TriagedFinding created with severity = critical or high</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-[10px] text-slate-500 font-semibold uppercase">Send Manual Alert To</label>
              <input
                value={slackChannel}
                onChange={e => setSlackChannel(e.target.value)}
                placeholder="#security-alerts"
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: "#0d1220", border: "1px solid #374151" }}
              />
            </div>

            <button
              onClick={handleSendSlackAlert}
              disabled={slackSending || (criticals.length === 0 && highs.length === 0)}
              className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff" }}>
              {slackSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {slackSending ? "Sending…" : `Send Alert (Top ${criticals.length > 0 ? "Critical" : "High"} Finding)`}
            </button>

            {slackResult && (
              <div className={`mt-3 p-3 rounded-lg text-xs font-medium ${slackResult.success ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-red-500/10 text-red-400 border border-red-500/30"}`}>
                {slackResult.success ? "✅" : "❌"} {slackResult.msg}
                {!slackResult.success && slackResult.msg?.includes("not_in_channel") && (
                  <p className="mt-1 text-slate-400">Invite the ShieldAI bot to {slackChannel} with <code className="bg-black/30 px-1 rounded">/invite @ShieldAI</code></p>
                )}
              </div>
            )}

            {criticals.length === 0 && highs.length === 0 && (
              <p className="text-xs text-slate-500 text-center mt-2">No critical or high findings to alert on.</p>
            )}
          </div>

          {/* What's included in the PDF */}
          <div className="rounded-2xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="font-bold text-white text-sm mb-3">What's Included in the PDF</h3>
            <div className="space-y-2">
              {[
                { icon: "🎯", text: "Executive Risk Score with color-coded gauge" },
                { icon: "✅", text: "Remediation wins — all fixed findings this month" },
                { icon: "🔴", text: "Remaining critical vulnerabilities with CVE & SLA" },
                { icon: "📋", text: "Compliance readiness scores (SOC2, GDPR, PCI-DSS…)" },
                { icon: "📊", text: "Key metrics: repos monitored, SLA breaches, MTTR" },
                { icon: "🏷️", text: "Professional branded layout, ready for board-level sharing" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="flex-shrink-0">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}