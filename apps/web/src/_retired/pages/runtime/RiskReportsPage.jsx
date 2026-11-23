import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Plus, Download, Send, ChevronDown, ChevronUp, Loader2, Share2, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const TYPE_STYLE = { executive_summary: "text-purple-400 bg-purple-500/15 border-purple-500/30", technical_deep_dive: "text-blue-400 bg-blue-500/15 border-blue-500/30", compliance_posture: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30", weekly_digest: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30", incident_report: "text-orange-400 bg-orange-500/15 border-orange-500/30" };
const STATUS_STYLE = { generating: "text-amber-400", ready: "text-emerald-400", sent: "text-blue-400", archived: "text-[#64748b]" };

function RiskGauge({ score }) {
  if (score == null) return <div className="w-20 h-20 rounded-full border-4 border-[#1e293b] flex items-center justify-center text-[#475569] text-xs">—</div>;
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  const r = 32; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
      <text x="40" y="44" textAnchor="middle" fill={color} fontSize="13" fontWeight="bold">{score}</text>
    </svg>
  );
}

function ReportRow({ report }) {
  const [expanded, setExpanded] = useState(false);
  const risks = (() => { try { return JSON.parse(report.top_risks || "[]"); } catch { return []; } })();
  const recs = (() => { try { return JSON.parse(report.recommendations || "[]"); } catch { return []; } })();
  return (
    <div className="border-b border-[#1e293b]">
      <div className="px-5 py-4 flex items-center gap-4 hover:bg-[#1e293b]/30 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <RiskGauge score={report.overall_risk_score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${TYPE_STYLE[report.report_type]}`}>{report.report_type?.replace(/_/g, " ")}</span>
            <span className={`text-[11px] font-semibold capitalize ${STATUS_STYLE[report.status]}`}>
              {report.status === "generating" && <Loader2 className="w-3 h-3 inline animate-spin mr-1" />}{report.status}
            </span>
          </div>
          <p className="text-sm font-semibold text-[#e2e8f0]">{report.title}</p>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-[#64748b]">
            {report.critical_issues != null && <span className="text-red-400 font-bold">{report.critical_issues} critical</span>}
            {report.high_issues != null && <span className="text-orange-400">{report.high_issues} high</span>}
            {report.total_findings != null && <span>{report.total_findings} total findings</span>}
            {report.generated_by && <span>{report.generated_by}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {report.status === "ready" && <><Button size="sm" className="h-7 px-2 text-[11px] bg-[#1e293b] text-[#94a3b8] border border-[#334155] hover:text-[#e2e8f0]"><Download className="w-3 h-3 mr-1" /> PDF</Button><Button size="sm" className="h-7 px-2 text-[11px] bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25"><Send className="w-3 h-3 mr-1" /> Send</Button></>}
          {expanded ? <ChevronUp className="w-4 h-4 text-[#64748b]" /> : <ChevronDown className="w-4 h-4 text-[#64748b]" />}
        </div>
      </div>
      {expanded && (risks.length > 0 || recs.length > 0) && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-4 bg-[#0a0f1e]">
          {risks.length > 0 && <div><p className="text-[10px] text-[#64748b] uppercase tracking-wider mb-2">Top Risks</p><div className="space-y-1">{risks.map((r, i) => <div key={i} className="flex gap-2 text-xs text-[#94a3b8]"><span className="text-red-400 flex-shrink-0">!</span>{r}</div>)}</div></div>}
          {recs.length > 0 && <div><p className="text-[10px] text-[#64748b] uppercase tracking-wider mb-2">Recommendations</p><div className="space-y-1">{recs.map((r, i) => <div key={i} className="flex gap-2 text-xs text-[#94a3b8]"><span className="text-emerald-400 flex-shrink-0">→</span>{r.replace(/^\w+:\s*/, "")}</div>)}</div></div>}
        </div>
      )}
    </div>
  );
}

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function RiskReportsPage() {
  const qc = useQueryClient();
  const [shareReport, setShareReport] = useState(null);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const { data: reports = [] } = useQuery({ queryKey: ["risk-reports"], queryFn: () => base44.entities.RiskReport.list("-created_date", 20) });

  const shareAndPublish = useMutation({
    mutationFn: async (report) => {
      const token = generateToken();
      await base44.entities.RiskReport.update(report.id, { pdf_generated: true, share_token: token, is_public: true });
      return token;
    },
    onSuccess: (token, report) => {
      const link = `${window.location.origin}/reports/view?token=${token}`;
      setShareLink(link);
      qc.invalidateQueries({ queryKey: ["risk-reports"] });
    },
  });

  const generate = useMutation({
    mutationFn: () => base44.entities.RiskReport.create({ title: `Executive Summary — ${new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`, report_type: "executive_summary", status: "generating", generated_by: "ShieldAI Risk Engine v2.4", period_start: new Date(Date.now() - 7 * 86400000).toISOString(), period_end: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risk-reports"] }),
  });

  const latestReady = reports.find(r => r.status === "ready");
  const avgScore = Math.round(reports.filter(r => r.overall_risk_score).reduce((a, b) => a + b.overall_risk_score, 0) / (reports.filter(r => r.overall_risk_score).length || 1));

  return (
    <div className="bg-[#0a0f1e] min-h-screen -m-6 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] flex items-center gap-2"><FileText className="w-6 h-6 text-cyan-400" /> Executive Risk Reports</h1>
          <p className="text-sm text-[#64748b] mt-0.5">AI-generated security posture reports for executive and technical stakeholders</p>
        </div>
        <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 gap-2"><Plus className="w-4 h-4" />{generate.isPending ? "Generating..." : "Generate Report"}</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex items-center gap-5">
          <RiskGauge score={latestReady?.overall_risk_score || avgScore} />
          <div>
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider">Current Risk Score</p>
            <p className="text-3xl font-black font-mono text-red-400 mt-1">{latestReady?.overall_risk_score || avgScore}</p>
            <p className="text-[11px] text-[#64748b] mt-0.5">{(latestReady?.overall_risk_score || avgScore) >= 70 ? "⬆ High Risk" : (latestReady?.overall_risk_score || avgScore) >= 40 ? "➡ Medium Risk" : "⬇ Low Risk"}</p>
          </div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
          <p className="text-[11px] text-[#64748b] uppercase tracking-wider mb-2">Top 3 Risks</p>
          {latestReady && (() => { try { return JSON.parse(latestReady.top_risks || "[]").slice(0, 3).map((r, i) => <div key={i} className="flex gap-2 text-xs text-[#94a3b8] mb-1"><span className="text-red-400">!</span><span className="truncate">{r}</span></div>); } catch { return null; } })()}
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 grid grid-cols-2 gap-3">
          {[["Reports Ready", reports.filter(r => r.status === "ready").length, "text-emerald-400"], ["Generating", reports.filter(r => r.status === "generating").length, "text-amber-400"], ["Total Reports", reports.length, "text-[#e2e8f0]"], ["Reports Sent", reports.filter(r => r.status === "sent").length, "text-blue-400"]].map(([l, v, c]) => (
            <div key={l}><p className="text-[10px] text-[#64748b]">{l}</p><p className={`text-lg font-bold font-mono ${c}`}>{v}</p></div>
          ))}
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Reports</h3>
          <p className="text-[11px] text-[#64748b]">Click any report row to expand details. Use "Share" to get a public link.</p>
        </div>
        {reports.map(r => (
          <div key={r.id} className="relative">
            <ReportRow report={r} />
            {r.status === "ready" && (
              <div className="absolute top-3 right-24">
                <Button size="sm" onClick={() => { setShareReport(r); setShareLink(""); }}
                  className="h-7 px-2 text-[11px] bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 gap-1">
                  <Share2 className="w-3 h-3" /> Share
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Share Modal */}
      <Dialog open={!!shareReport} onOpenChange={(o) => { if (!o) { setShareReport(null); setShareLink(""); } }}>
        <DialogContent className="bg-[#111827] border-[#1e293b] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0]">Generate & Share Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-[#0a0f1e] border border-[#1e293b] rounded-lg">
              <p className="text-xs text-[#64748b] mb-1">Report</p>
              <p className="text-sm font-semibold">{shareReport?.title}</p>
            </div>
            {!shareLink ? (
              <Button onClick={() => shareAndPublish.mutate(shareReport)}
                disabled={shareAndPublish.isPending}
                className="w-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 gap-2">
                <Share2 className="w-4 h-4" />
                {shareAndPublish.isPending ? "Generating link..." : "Generate Shareable Link"}
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Public link generated!</p>
                <div className="flex gap-2">
                  <Input value={shareLink} readOnly className="bg-[#0a0f1e] border-[#1e293b] text-[#94a3b8] text-xs font-mono" />
                  <Button size="sm" onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="flex-shrink-0 bg-[#1e293b] text-[#94a3b8] border-[#334155] hover:text-white">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <a href={shareLink} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-violet-400 hover:underline block">Open report →</a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}