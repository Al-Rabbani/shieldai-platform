import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Download, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle, MinusCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const FRAMEWORKS = ["SOC2", "ISO27001", "NIST_CSF", "CIS_Benchmark", "PCI_DSS", "GDPR"];
const FRAMEWORK_LABELS = { SOC2: "SOC 2", ISO27001: "ISO 27001", NIST_CSF: "NIST CSF", CIS_Benchmark: "CIS", PCI_DSS: "PCI DSS", GDPR: "GDPR" };
const STATUS_ICON = {
  passing: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  failing: <XCircle className="w-4 h-4 text-red-400" />,
  partial: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  not_applicable: <MinusCircle className="w-4 h-4 text-[#475569]" />,
  not_tested: <HelpCircle className="w-4 h-4 text-[#64748b]" />,
};
const RISK_STYLE = { critical: "text-red-400", high: "text-orange-400", medium: "text-yellow-400", low: "text-blue-400" };

function ScoreGauge({ score, size = 100 }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">{score}%</text>
    </svg>
  );
}

function ControlRow({ control }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#1e293b]/50">
      <div onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-[#1e293b]/30 cursor-pointer">
        <div className="flex-shrink-0">{STATUS_ICON[control.status]}</div>
        <span className="text-[10px] font-mono text-[#64748b] w-20 flex-shrink-0">{control.control_id}</span>
        <span className="flex-1 text-xs text-[#e2e8f0]">{control.title}</span>
        <span className={`text-[10px] flex-shrink-0 ${RISK_STYLE[control.risk_level]}`}>{control.risk_level}</span>
        {control.automated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-shrink-0">AUTO</span>}
        <span className="text-[11px] text-[#64748b] flex-shrink-0">{control.evidence_count} evidence</span>
        {open ? <ChevronUp className="w-3 h-3 text-[#64748b]" /> : <ChevronDown className="w-3 h-3 text-[#64748b]" />}
      </div>
      {open && (
        <div className="px-12 pb-4 bg-[#0a0f1e] space-y-2">
          <p className="text-xs text-[#64748b] leading-relaxed">{control.description}</p>
          <div className="flex gap-4 text-[11px] text-[#64748b] flex-wrap">
            {control.assigned_to && <span>👤 {control.assigned_to}</span>}
            {control.last_tested && <span>🕐 Last tested: {new Date(control.last_tested).toLocaleDateString()}</span>}
          </div>
          {control.remediation_notes && (
            <p className="text-xs text-amber-400/80 bg-amber-500/5 rounded p-2 border border-amber-500/15">{control.remediation_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ComplianceDashboard() {
  const [fw, setFw] = useState("SOC2");

  const { data: controls = [] } = useQuery({
    queryKey: ["compliance-controls"],
    queryFn: () => base44.entities.ComplianceControl.list("-created_date", 50),
  });

  const fwControls = controls.filter(c => c.framework === fw);
  const passing = fwControls.filter(c => c.status === "passing").length;
  const total = fwControls.filter(c => c.status !== "not_applicable").length;
  const fwScore = total > 0 ? Math.round((passing / total) * 100) : 0;

  // Overall score across all frameworks
  const allPassing = controls.filter(c => c.status === "passing").length;
  const allTotal = controls.filter(c => c.status !== "not_applicable").length;
  const overallScore = allTotal > 0 ? Math.round((allPassing / allTotal) * 100) : 0;

  const statusCounts = {
    passing: fwControls.filter(c => c.status === "passing").length,
    failing: fwControls.filter(c => c.status === "failing").length,
    partial: fwControls.filter(c => c.status === "partial").length,
    not_tested: fwControls.filter(c => c.status === "not_tested").length,
  };

  return (
    <div className="bg-[#0a0f1e] min-h-screen -m-6 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" /> Compliance Posture
          </h1>
          <p className="text-sm text-[#64748b] mt-0.5">Multi-framework compliance monitoring and evidence tracking</p>
        </div>
        <Button className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 gap-2">
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>

      {/* Overall posture */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex items-center gap-8">
        <ScoreGauge score={overallScore} size={120} />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">Overall Compliance Score</h3>
          <p className="text-xs text-[#64748b] mb-3">{allPassing} of {allTotal} controls passing across {FRAMEWORKS.length} frameworks</p>
          <div className="flex gap-4 flex-wrap">
            {FRAMEWORKS.map(f => {
              const fc = controls.filter(c => c.framework === f);
              const fp = fc.filter(c => c.status === "passing").length;
              const ft = fc.filter(c => c.status !== "not_applicable").length;
              const score = ft > 0 ? Math.round((fp / ft) * 100) : 0;
              return (
                <div key={f} onClick={() => setFw(f)} className="cursor-pointer text-center">
                  <p className={`text-xs font-mono font-bold ${score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"}`}>{score}%</p>
                  <p className="text-[10px] text-[#64748b]">{FRAMEWORK_LABELS[f]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Framework tabs + detail */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e293b] flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1">
            {FRAMEWORKS.map(f => (
              <button key={f} onClick={() => setFw(f)}
                className={`px-3 py-1.5 rounded text-[11px] font-semibold transition-colors ${fw === f ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-[#64748b] hover:text-[#94a3b8]"}`}>
                {FRAMEWORK_LABELS[f]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <ScoreGauge score={fwScore} size={56} />
            <div className="flex gap-3 text-[11px]">
              <span className="text-emerald-400">✅ {statusCounts.passing}</span>
              <span className="text-red-400">❌ {statusCounts.failing}</span>
              <span className="text-amber-400">⚠️ {statusCounts.partial}</span>
              <span className="text-[#64748b]">❓ {statusCounts.not_tested}</span>
            </div>
          </div>
        </div>
        <div>
          {fwControls.length === 0 ? (
            <div className="p-8 text-center text-[#64748b] text-sm">No controls for this framework</div>
          ) : (
            fwControls.map(c => <ControlRow key={c.id} control={c} />)
          )}
        </div>
      </div>
    </div>
  );
}