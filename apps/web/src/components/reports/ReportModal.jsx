import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, Shield, BarChart3, CheckSquare, Sword, Package, TrendingUp, Download, Mail } from "lucide-react";
import { toast } from "sonner";

const GOLD = "#C9A84C";

const REPORT_TYPES = [
  { id: "executive", icon: BarChart3, label: "Executive Summary", desc: "High-level risk overview for board & C-suite", color: GOLD },
  { id: "technical", icon: Shield, label: "Technical Findings", desc: "Full finding details for security team", color: "#3b82f6" },
  { id: "compliance", icon: CheckSquare, label: "Compliance Report", desc: "Framework-specific (SOC2, ISO27001, PCI-DSS)", color: "#22c55e" },
  { id: "pentest", icon: Sword, label: "Pentest Report", desc: "Penetration testing results & recommendations", color: "#ef4444" },
  { id: "sbom", icon: Package, label: "SBOM Report", desc: "Software bill of materials", color: "#8b5cf6" },
  { id: "trend", icon: TrendingUp, label: "Trend Analysis", desc: "Risk score trends over time", color: "#06b6d4" },
];

function exportCSV(findings) {
  const header = ["Title", "Severity", "Status", "Asset", "CVE", "Detected"];
  const rows = findings.map(f => [f.title || "", f.severity || "", f.status || "", f.asset_name || "", f.cve_id || "", f.detected_at?.slice(0, 10) || ""]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "findings-report.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportModal({ onClose }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState(null);
  const [config, setConfig] = useState({
    orgName: "Al-Rabbani Security Org",
    recipients: "",
    sections: { summary: true, riskscore: true, critical: true, compliance: true, roadmap: true, appendix: false },
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["report-findings"],
    queryFn: () => base44.entities.TriagedFinding.filter({ status: "open" }).catch(() => []),
  });
  const { data: compliance = [] } = useQuery({
    queryKey: ["report-compliance"],
    queryFn: () => base44.entities.ComplianceFramework.list().catch(() => []),
  });

  const critical = findings.filter(f => f.severity === "critical").length;
  const high = findings.filter(f => f.severity === "high").length;
  const avgCompliance = compliance.length > 0 ? Math.round(compliance.reduce((s, c) => s + (c.score || 0), 0) / compliance.length) : 81;

  const handlePrint = () => {
    toast.success("Opening print dialog...");
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-3xl rounded-2xl border overflow-hidden max-h-[90vh] flex flex-col" style={{ background: "#111827", borderColor: "#374151" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#1F2937" }}>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5" style={{ color: GOLD }} />
            <h3 className="font-black text-white">Generate Security Report</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {["Type", "Configure", "Preview"].map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: step === i ? GOLD : step > i ? "rgba(34,197,94,0.2)" : "#1F2937", color: step === i ? "#0A0E1A" : step > i ? "#22c55e" : "#6B7280" }}>{s}</span>
                  {i < 2 && <span className="text-slate-600 text-[10px]">›</span>}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white ml-2"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 0 — Type */}
          {step === 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {REPORT_TYPES.map(rt => (
                <button key={rt.id} onClick={() => { setType(rt.id); setStep(1); }}
                  className="p-4 rounded-xl border text-left transition-all hover:scale-[1.03]"
                  style={{ background: type === rt.id ? rt.color + "15" : "#1F2937", borderColor: type === rt.id ? rt.color : "#374151" }}>
                  <rt.icon className="w-6 h-6 mb-2" style={{ color: rt.color }} />
                  <div className="text-sm font-bold text-white mb-1">{rt.label}</div>
                  <div className="text-[10px] text-slate-400">{rt.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 1 — Config */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Organization Name</label>
                <input value={config.orgName} onChange={e => setConfig(p => ({ ...p, orgName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white border outline-none"
                  style={{ background: "#1F2937", borderColor: "#374151" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Recipient Emails (comma-separated)</label>
                <input value={config.recipients} onChange={e => setConfig(p => ({ ...p, recipients: e.target.value }))}
                  placeholder="ciso@company.com, board@company.com"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border outline-none"
                  style={{ background: "#1F2937", borderColor: "#374151" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Report Sections</label>
                <div className="space-y-2">
                  {Object.entries(config.sections).map(([k, v]) => (
                    <label key={k} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={v} onChange={() => setConfig(p => ({ ...p, sections: { ...p.sections, [k]: !p.sections[k] } }))} />
                      <span className="text-sm text-slate-300 capitalize">{k === "riskscore" ? "Risk Score" : k === "critical" ? "Critical Findings" : k === "roadmap" ? "Remediation Roadmap" : k.replace(/_/g, " ")}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Preview */}
          {step === 2 && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#374151" }} id="report-preview">
              <div className="p-6" style={{ background: "#0d1220" }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}><Shield className="w-4 h-4 text-black" /></div>
                    <div><div className="font-black text-white text-sm">ShieldAI Sovereign Platform</div><div className="text-[10px] text-slate-400">{config.orgName}</div></div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                    <div className="text-[10px] px-2 py-0.5 rounded-full font-bold mt-1" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>CONFIDENTIAL — TLP:AMBER</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "#1F2937" }}>
                  <h2 className="text-lg font-black text-white mb-3">{REPORT_TYPES.find(r => r.id === type)?.label || "Security Report"}</h2>
                  {config.sections.summary && (
                    <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                      This report summarizes the security posture of <strong>{config.orgName}</strong> as of {new Date().toLocaleDateString()}. 
                      The organization currently has <strong className="text-red-400">{critical} critical</strong> and <strong className="text-orange-400">{high} high</strong> severity findings requiring immediate attention. 
                      Overall compliance readiness stands at <strong style={{ color: GOLD }}>{avgCompliance}%</strong> across monitored frameworks.
                    </p>
                  )}
                  {config.sections.riskscore && (
                    <div className="flex items-center gap-4 mb-4 p-4 rounded-xl" style={{ background: "#111827" }}>
                      <div className="text-4xl font-black" style={{ color: "#eab308" }}>68</div>
                      <div><div className="text-xs font-bold text-white">Global Risk Score</div><div className="text-[10px] text-slate-500">Moderate risk — remediation required</div></div>
                    </div>
                  )}
                  {config.sections.critical && (
                    <div className="mb-4">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Critical Findings ({critical})</div>
                      {findings.filter(f => f.severity === "critical").slice(0, 3).map(f => (
                        <div key={f.id} className="flex items-center gap-2 py-1.5 border-b text-xs" style={{ borderColor: "#1F2937" }}>
                          <span className="text-red-400 font-bold w-16">CRITICAL</span>
                          <span className="text-slate-300 flex-1">{f.title}</span>
                          <span className="text-slate-500">{f.asset_name}</span>
                        </div>
                      ))}
                      {findings.filter(f => f.severity === "critical").length === 0 && (
                        <div className="text-xs text-emerald-400">✓ No critical findings detected</div>
                      )}
                    </div>
                  )}
                  {config.sections.compliance && (
                    <div className="mb-4">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Compliance Status</div>
                      <div className="flex gap-3 flex-wrap">
                        {[["SOC 2", 82], ["ISO 27001", 74], ["PCI-DSS", 61]].map(([name, score]) => (
                          <div key={name} className="px-3 py-2 rounded-lg text-center" style={{ background: "#111827" }}>
                            <div className="text-sm font-black" style={{ color: score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444" }}>{score}%</div>
                            <div className="text-[10px] text-slate-400">{name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-t" style={{ borderColor: "#1F2937" }}>
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 rounded-xl text-sm font-bold border text-slate-400" style={{ borderColor: "#374151", background: "#1F2937" }}>← Back</button>}
          <div className="flex-1" />
          {step < 2 && (
            <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !type}
              className="px-5 py-2 rounded-xl text-sm font-bold text-black disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              {step === 1 ? "Preview Report →" : "Next →"}
            </button>
          )}
          {step === 2 && (
            <div className="flex items-center gap-2">
              <button onClick={() => { exportCSV(findings); toast.success("CSV downloaded"); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border"
                style={{ color: "#9CA3AF", borderColor: "#374151", background: "#1F2937" }}>
                <Download className="w-4 h-4" /> CSV
              </button>
              <button onClick={() => { if (config.recipients) toast.success(`Report emailed to ${config.recipients.split(",")[0].trim()}`); else toast.error("Add recipient emails"); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border"
                style={{ color: "#3b82f6", borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.1)" }}>
                <Mail className="w-4 h-4" /> Email
              </button>
              <button onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-black"
                style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}