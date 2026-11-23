import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import TriagedFindingRow from "@/components/autotriage/TriagedFindingRow";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ASSET_ICONS = { repository: "📦", vm: "🖥️", cloud: "☁️", api: "🔌", container: "🐳", domain: "🌐" };
const CRIT_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
const SCANNER_COLORS = { SAST: "#3b82f6", SCA: "#10b981", DAST: "#f97316", Pentest: "#ef4444", VMScanner: "#8b5cf6", CloudScanner: "#06b6d4", License: "#eab308", EOL: "#64748b", Secrets: "#f59e0b" };

export default function ASPMDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);

  const { data: assets = [] } = useQuery({ queryKey: ["aspm-assets"], queryFn: () => base44.entities.ASPMAsset.list("-risk_score", 200), initialData: [] });
  const { data: findings = [] } = useQuery({ queryKey: ["triage-findings"], queryFn: () => base44.entities.TriagedFinding.list("-cvss_score", 500), initialData: [] });

  const asset = assets.find(a => a.id === id);
  const assetFindings = findings.filter(f => f.asset_name === asset?.name);

  const updateMut = useMutation({
    mutationFn: ({ fid, data }) => base44.entities.TriagedFinding.update(fid, data),
    onSuccess: () => { qc.invalidateQueries(["triage-findings"]); toast.success("Updated"); }
  });

  if (!asset) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const scanners = (asset.scanners_coverage || "").split(",").map(s => s.trim()).filter(Boolean);

  return (
    <div className="space-y-6 pb-12">
      <Link to="/aspm" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors font-mono">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to ASPM
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Asset info */}
        <div className="space-y-4">
          <div className="rounded-xl p-5 sticky top-4" style={{ background: "#0a0f1e", border: "1px solid rgba(139,92,246,0.3)" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{ASSET_ICONS[asset.asset_type] || "📄"}</span>
              <div>
                <h2 className="text-lg font-bold text-white font-mono">{asset.name}</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                  style={{ color: CRIT_COLORS[asset.business_criticality], background: `${CRIT_COLORS[asset.business_criticality]}18` }}>
                  {asset.business_criticality?.toUpperCase()} CRITICALITY
                </span>
              </div>
            </div>
            {[
              { label: "Type", value: asset.asset_type },
              { label: "Team", value: asset.team },
              { label: "Owner", value: asset.owner },
              { label: "Environment", value: asset.environment },
              { label: "Internet Facing", value: asset.internet_facing ? "Yes 🌐" : "No 🔒" },
              { label: "Tech Stack", value: asset.tech_stack },
              { label: "Tags", value: asset.tags },
            ].map(({ label, value }) => value ? (
              <div key={label} className="flex items-start justify-between py-2" style={{ borderBottom: "1px solid rgba(30,58,95,0.3)" }}>
                <span className="text-[10px] font-mono text-slate-500 uppercase">{label}</span>
                <span className="text-xs text-slate-300 font-mono text-right max-w-[60%] truncate">{value}</span>
              </div>
            ) : null)}
            {asset.linked_repo && (
              <button onClick={() => window.open(`https://${asset.linked_repo}`, "_blank")}
                className="mt-3 flex items-center gap-1.5 text-xs text-blue-400 hover:underline font-mono">
                <ExternalLink className="w-3 h-3" /> {asset.linked_repo}
              </button>
            )}
            {/* Scanners */}
            <div className="mt-4">
              <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">Scanner Coverage</p>
              <div className="flex flex-wrap gap-1.5">
                {scanners.map(s => (
                  <span key={s} className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                    style={{ color: SCANNER_COLORS[s] || "#64748b", background: `${SCANNER_COLORS[s] || "#64748b"}18`, border: `1px solid ${SCANNER_COLORS[s] || "#64748b"}30` }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {/* Risk Summary */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: "Risk", value: asset.risk_score, color: asset.risk_score >= 70 ? "#ef4444" : "#f97316" },
                { label: "Critical", value: asset.critical_count || 0, color: "#ef4444" },
                { label: "High", value: asset.high_count || 0, color: "#f97316" },
                { label: "SLA Breaches", value: asset.sla_breached_count || 0, color: "#ef4444" },
              ].map(m => (
                <div key={m.label} className="rounded-lg p-2 text-center" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.4)" }}>
                  <p className="text-lg font-black font-mono" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-[9px] font-mono text-slate-600">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: Findings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Findings for {asset.name}</h3>
            <span className="text-xs font-mono text-slate-500">{assetFindings.length} findings</span>
          </div>
          {assetFindings.length === 0 ? (
            <div className="rounded-xl py-12 text-center" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <p className="text-sm text-slate-600">No triaged findings for this asset yet.</p>
              <Link to="/autotriage" className="text-xs text-violet-400 hover:underline mt-2 inline-block">View AutoTriage</Link>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(30,58,95,0.5)" }}>
              <div className="grid text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5"
                style={{ background: "#070d14", borderBottom: "1px solid rgba(30,58,95,0.5)",
                  gridTemplateColumns: "20px 80px 1fr 120px 110px 100px 110px 60px 80px 100px 90px 100px" }}>
                <span/><span>Severity</span><span>Title / Asset</span><span>Team</span><span>Scanners</span>
                <span>Reachability</span><span>Exploitability</span><span>CVSS</span><span>EPSS</span>
                <span>SLA</span><span>AutoFix</span><span>Status</span>
              </div>
              {assetFindings.map((f, i) => (
                <TriagedFindingRow key={f.id} finding={f} index={i}
                  expanded={expandedId === f.id}
                  onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)}
                  onUpdate={(data) => updateMut.mutate({ fid: f.id, data })} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}