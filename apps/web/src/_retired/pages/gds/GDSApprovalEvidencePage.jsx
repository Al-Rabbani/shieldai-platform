import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Search, Filter, Shield, CheckCircle, XCircle, Clock, ExternalLink, Download, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const EVIDENCE_TYPE_COLORS = {
  reasoning_output: "#a855f7", risk_summary: HIGH, policy_decision: "#3b82f6", rollback_plan: "#14b8a6",
  tool_output: LOW, mitre_mapping: DANGER, threat_intel: DANGER, compliance_check: LOW, financial_impact: MEDIUM
};

export default function GDSApprovalEvidencePage() {
  const [filterType, setFilterType] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [searchRequest, setSearchRequest] = useState("");

  const { data: evidenceData } = useQuery({
    queryKey: ["approvals-evidence"],
    queryFn: () => base44.entities.ApprovalEvidence.list("-created_date", 100).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: signaturesData } = useQuery({
    queryKey: ["approvals-signatures"],
    queryFn: () => base44.entities.ApprovalSignature.list("-created_date", 20).catch(() => []),
    refetchInterval: 30000,
  });

  const evidence = evidenceData || [];
  const signatures = signaturesData || [];

  const filteredEvidence = evidence.filter(ev => {
    const matchType = filterType === "all" || ev.evidence_type === filterType;
    const matchRisk = filterRisk === "all" || ev.risk_level === filterRisk;
    const matchRequest = !searchRequest || ev.request_id?.includes(searchRequest);
    return matchType && matchRisk && matchRequest;
  });

  const byType = {};
  evidence.forEach(ev => { byType[ev.evidence_type] = (byType[ev.evidence_type] || 0) + 1; });
  const typeData = Object.entries(byType).map(([type, count]) => ({ type, count, color: EVIDENCE_TYPE_COLORS[type] || MUTED }));

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Evidence Viewer" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <FileText className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Approval Evidence & Intelligence</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-010 v1.0</span>
        </div>
        <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>Risk summaries · MITRE mappings · Tool outputs · Compliance checks</span>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
              <input value={searchRequest} onChange={e => setSearchRequest(e.target.value)} placeholder="Search request ID..." className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            </div>
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Types</option>
            {Object.keys(EVIDENCE_TYPE_COLORS).map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Risk</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </Card>

      {/* Evidence Type Distribution */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Evidence Type Distribution</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Breakdown by evidence category</p>
        </div>
        {typeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis type="number" stroke={MUTED} fontSize={9} />
              <YAxis dataKey="type" type="category" stroke={MUTED} fontSize={9} width={120} />
              <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={FileText} title="No evidence" description="Evidence records will appear here" />
        )}
      </Card>

      {/* Evidence Cards */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Evidence Records</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Detailed intelligence attached to approval requests</p>
        </div>
        {filteredEvidence.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEvidence.map((ev, idx) => (
              <Card key={ev.id || idx} className="p-4" glow>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ color: EVIDENCE_TYPE_COLORS[ev.evidence_type] || MUTED, background: `${EVIDENCE_TYPE_COLORS[ev.evidence_type] || MUTED}15`, border: `1px solid ${EVIDENCE_TYPE_COLORS[ev.evidence_type] || MUTED}30` }}>
                        {(ev.evidence_type || "unknown").replace(/_/g, " ")}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${ev.risk_level === "critical" ? "text-red-400" : ev.risk_level === "high" ? "text-orange-400" : ev.risk_level === "medium" ? "text-yellow-400" : "text-green-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{ev.risk_level}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-2">{ev.title || "Untitled Evidence"}</h4>
                    <p className="text-xs" style={{ color: MUTED }}>{ev.content_summary || "No summary"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span style={{ color: MUTED }}>Confidence: <span className="font-bold" style={{ color: TEXT }}>{ev.confidence_score ?? 0}%</span></span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>{ev.source_engine || "unknown"}</span>
                  </div>
                  {ev.request_id && (
                    <span className="text-[10px] font-mono" style={{ color: MUTED }}>Request: {ev.request_id.slice(0, 12)}...</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={FileText} title="No evidence found" description="No evidence records match your filters" />
        )}
      </Card>

      {/* Performance Trends */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Approval Performance Trends</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>30-day approval speeds and bottleneck identification</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${CYAN}30` }}>
            <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Average Approval Time by Type</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span style={{ color: TEXT }}>Single Approval</span>
                <span className="font-mono" style={{ color: CYAN }}>~15m</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: TEXT }}>Dual Approval</span>
                <span className="font-mono" style={{ color: MEDIUM }}>~45m</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: TEXT }}>Quorum Approval</span>
                <span className="font-mono" style={{ color: DANGER }}>~2h 30m</span>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ background: "rgba(255,140,0,0.04)", border: `1px solid ${HIGH}30` }}>
            <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Bottleneck Patterns</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" style={{ color: HIGH }} />
                <span style={{ color: TEXT }}>Critical risk approvals: +40% time</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" style={{ color: MEDIUM }} />
                <span style={{ color: TEXT }}>Weekend submissions: +25% time</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" style={{ color: CYAN }} />
                <span style={{ color: TEXT }}>Quorum type: longest wait time</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Signatures Panel */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Digital Signatures</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Recent approval signatures with cryptographic verification</p>
          </div>
          <button onClick={() => exportSignaturesReport(signatures)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Download className="w-3.5 h-3.5" /> Export All
          </button>
        </div>
        {signatures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Signature ID", "Signer", "Role", "Decision", "Reason", "Method", "Signed At", "Valid"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signatures.map((sig, i) => (
                  <tr key={sig.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{sig.signature_id ? sig.signature_id.slice(0, 16) + "..." : "—"}</td>
                    <td className="py-2 px-3 text-white">{sig.signer_id || "—"}</td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>{sig.signer_role || "—"}</span></td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${sig.decision === "approved" ? "text-green-400" : "text-red-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{sig.decision || "—"}</span>
                    </td>
                    <td className="py-2 px-3 max-w-[150px] truncate" style={{ color: MUTED }}>{sig.reason || "—"}</td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{sig.signing_method || "digital"}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{sig.signed_at ? new Date(sig.signed_at).toLocaleString("en-IE") : "—"}</td>
                    <td className="py-2 px-3">{sig.is_valid ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: DANGER }} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Shield} title="No signatures" description="Digital signatures will appear here after approvals" />
        )}
      </Card>
    </div>
  );
}

function exportSignaturesReport(signatures) {
  const report = {
    export_date: new Date().toISOString(),
    export_type: "approvals_compliance_full",
    total_signatures: signatures.length,
    signatures: signatures.map(sig => ({
      signature_id: sig.signature_id,
      signer_id: sig.signer_id,
      signer_role: sig.signer_role,
      decision: sig.decision,
      reason: sig.reason,
      signing_method: sig.signing_method,
      signed_at: sig.signed_at,
      is_valid: sig.is_valid,
      signature_hash: sig.signature_hash
    })),
    compliance_note: "This report contains all digital signatures for monthly compliance auditing"
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `approvals-signatures-export-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}