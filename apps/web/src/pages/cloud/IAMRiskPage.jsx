import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ACCENT = "#8b5cf6";
const SEV_STYLE = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)" },
  low:      { color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)" },
};

function SevBadge({ severity }) {
  const s = SEV_STYLE[severity] || SEV_STYLE.low;
  return <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>{severity}</span>;
}

export default function IAMRiskPage() {
  const [iamSevFilter, setIamSevFilter] = useState("all");
  const [violSevFilter, setViolSevFilter] = useState("all");

  const { data: cloudFindings = [], isLoading: loadingCF } = useQuery({
    queryKey: ["cloud-findings-iam"],
    queryFn: () => base44.entities.CloudFinding.filter({ service: "IAM" }, "-created_date", 200),
  });
  const { data: policyViolations = [], isLoading: loadingPV } = useQuery({
    queryKey: ["policy-violations-iam"],
    queryFn: () => base44.entities.PolicyViolation.list("-detected_at", 100),
  });

  const iamViolations = policyViolations.filter(v =>
    v.resource?.toLowerCase().includes("iam") ||
    v.source === "cloud_scan"
  );

  const unusedCreds = cloudFindings.filter(f => f.title?.toLowerCase().includes("unused") || f.title?.toLowerCase().includes("stale")).length;
  const rootUsage = cloudFindings.filter(f => f.title?.toLowerCase().includes("root")).length;
  const mfaDisabled = cloudFindings.filter(f => f.title?.toLowerCase().includes("mfa")).length;
  const overPriv = cloudFindings.filter(f => f.severity === "critical" || f.severity === "high").length;

  const filteredCF = cloudFindings.filter(f => iamSevFilter === "all" || f.severity === iamSevFilter);
  const filteredPV = iamViolations.filter(v => violSevFilter === "all" || v.severity === violSevFilter);

  const FilterBtns = ({ current, set }) => (
    <div className="flex gap-1 flex-wrap">
      {["all","critical","high","medium","low"].map(s => (
        <button key={s} onClick={() => set(s)}
          className="text-[10px] px-2.5 py-1 rounded font-mono capitalize transition-all"
          style={{
            background: current === s ? (s === "all" ? `rgba(139,92,246,0.2)` : `${(SEV_STYLE[s]?.color || ACCENT)}20`) : "#1e293b",
            border: `1px solid ${current === s ? (s === "all" ? ACCENT : (SEV_STYLE[s]?.color || ACCENT)) : "#30363d"}`,
            color: current === s ? (s === "all" ? ACCENT : (SEV_STYLE[s]?.color || ACCENT)) : "#64748b"
          }}>
          {s === "all" ? "All" : s}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen -m-6" style={{ background: "#030712" }}>
      {/* Header */}
      <div className="px-6 py-8" style={{ background: "linear-gradient(135deg, #080614, #0f0a20)", borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-2.5 py-1 rounded font-bold font-mono tracking-widest" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: ACCENT }}>
            ◈ IAM RISK ANALYSIS
          </span>
        </div>
        <h1 className="text-2xl font-black text-white">IAM & Identity Risk</h1>
        <p className="text-slate-400 text-sm mt-1">Overprivileged roles, unused credentials, and access policy violations</p>
      </div>

      <div className="px-6 py-5 space-y-6 pb-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Overprivileged Roles", val: overPriv,     color: "#ef4444" },
            { label: "Unused Credentials",   val: unusedCreds,  color: "#f97316" },
            { label: "Root Account Usage",   val: rootUsage,    color: "#eab308" },
            { label: "MFA Disabled",          val: mfaDisabled, color: "#f59e0b" },
            { label: "Policy Violations",     val: iamViolations.filter(v => v.status === "open").length, color: ACCENT },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: `1px solid ${color}20` }}>
              <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* IAM Findings Table */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-white">IAM Security Findings</h2>
            <FilterBtns current={iamSevFilter} set={setIamSevFilter} />
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid #1e293b" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#030712", borderBottom: "1px solid #1e293b" }}>
                  {["Severity", "Title", "Resource", "Provider", "CIS Control", "Region", "Status", "Detected", "Assignee"].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingCF && [1,2,3].map(i => (
                  <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td colSpan={9} className="px-3 py-3"><div className="h-4 rounded animate-pulse" style={{ background: "#1e293b" }} /></td>
                  </tr>
                ))}
                {!loadingCF && filteredCF.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/30" />
                      <p className="text-slate-500 text-sm">No IAM findings detected. Your identity configuration is clean ✓</p>
                    </td>
                  </tr>
                )}
                {filteredCF.map(f => (
                  <tr key={f.id} className="hover:bg-purple-500/5 transition-all" style={{ borderBottom: "1px solid #1e293b" }}>
                    <td className="px-3 py-2.5"><SevBadge severity={f.severity} /></td>
                    <td className="px-3 py-2.5 max-w-[200px]"><p className="text-xs text-white truncate">{f.title}</p></td>
                    <td className="px-3 py-2.5"><p className="text-[11px] font-mono text-slate-400 truncate max-w-[140px]">{f.resource || "—"}</p></td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold uppercase" style={{ color: f.provider === "aws" ? "#f97316" : f.provider === "azure" ? "#3b82f6" : "#10b981" }}>{f.provider}</span>
                    </td>
                    <td className="px-3 py-2.5"><span className="text-[11px] font-mono text-slate-500">{f.cis_control || "—"}</span></td>
                    <td className="px-3 py-2.5"><span className="text-[11px] font-mono text-slate-500">{f.region || "—"}</span></td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded capitalize" style={{
                        background: f.status === "resolved" ? "rgba(16,185,129,0.1)" : "#1e293b",
                        color: f.status === "resolved" ? "#10b981" : "#64748b"
                      }}>{f.status || "open"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                        {f.detected_at ? formatDistanceToNow(new Date(f.detected_at), { addSuffix: true }) : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><span className="text-[11px] text-slate-500">{f.assignee || "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Policy Violations Table */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-white">Policy Violations — IAM</h2>
            <FilterBtns current={violSevFilter} set={setViolSevFilter} />
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid #1e293b" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#030712", borderBottom: "1px solid #1e293b" }}>
                  {["Severity", "Policy Name", "Framework", "Control ID", "Resource", "Status", "Description"].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingPV && [1,2,3].map(i => (
                  <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td colSpan={7} className="px-3 py-3"><div className="h-4 rounded animate-pulse" style={{ background: "#1e293b" }} /></td>
                  </tr>
                ))}
                {!loadingPV && filteredPV.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/30" />
                      <p className="text-slate-500 text-sm">No IAM policy violations detected. Your identity configuration is clean ✓</p>
                    </td>
                  </tr>
                )}
                {filteredPV.map(v => (
                  <tr key={v.id} className="hover:bg-purple-500/5 transition-all" style={{ borderBottom: "1px solid #1e293b" }}>
                    <td className="px-3 py-2.5"><SevBadge severity={v.severity} /></td>
                    <td className="px-3 py-2.5 max-w-[180px]"><p className="text-xs text-white truncate">{v.policy_name}</p></td>
                    <td className="px-3 py-2.5"><span className="text-[11px] font-mono text-slate-400">{v.framework || "—"}</span></td>
                    <td className="px-3 py-2.5"><span className="text-[11px] font-mono text-slate-400">{v.control_id || "—"}</span></td>
                    <td className="px-3 py-2.5 max-w-[140px]"><p className="text-[11px] font-mono text-slate-400 truncate">{v.resource || "—"}</p></td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded capitalize" style={{
                        background: v.status === "resolved" ? "rgba(16,185,129,0.1)" : "#1e293b",
                        color: v.status === "resolved" ? "#10b981" : "#64748b"
                      }}>{v.status}</span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[220px]"><p className="text-[11px] text-slate-400 truncate">{v.description || "—"}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}