import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Database, RefreshCw, AlertTriangle, Loader2, X, Search, Lock } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const GOLD = "#C9A84C";
const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const CLASSIFICATION_CONFIG = {
  public:           { color: "#22c55e", label: "Public" },
  internal:         { color: "#3b82f6", label: "Internal" },
  confidential:     { color: "#eab308", label: "Confidential" },
  restricted:       { color: "#f97316", label: "Restricted" },
  highly_restricted:{ color: "#ef4444", label: "Highly Restricted" },
};
const FINDING_TYPE_CONFIG = {
  pii_exposed:         { icon: "👤", label: "PII Exposed", color: "#ef4444" },
  pci_exposed:         { icon: "💳", label: "PCI Exposed", color: "#ef4444" },
  phi_exposed:         { icon: "🏥", label: "PHI Exposed", color: "#ef4444" },
  credentials_in_data: { icon: "🔑", label: "Credentials Found", color: "#ef4444" },
  unencrypted_sensitive:{ icon: "🔓", label: "Unencrypted", color: "#f97316" },
  public_sensitive_data:{ icon: "🌐", label: "Public + Sensitive", color: "#ef4444" },
  over_retained:       { icon: "📅", label: "Over-retained", color: "#eab308" },
  no_access_logging:   { icon: "📋", label: "No Access Logging", color: "#eab308" },
};
const PROVIDER_COLOR = { aws: "#f97316", gcp: "#3b82f6", azure: "#0ea5e9" };
const REGULATIONS = ["GDPR", "PCI-DSS", "HIPAA", "SOC2", "CCPA", "ISO27001"];
const ASSET_TYPES = ["s3_bucket", "rds_database", "gcs_bucket", "azure_blob", "bigquery_dataset", "dynamodb_table"];

function StatusDropdown({ finding, onUpdate }) {
  const statuses = ["open", "in_remediation", "resolved", "accepted_risk"];
  const colors = { open: "#ef4444", in_remediation: "#3b82f6", resolved: "#10b981", accepted_risk: "#64748b" };
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="text-[10px] px-2 py-0.5 rounded capitalize font-medium"
        style={{ color: colors[finding.status] || "#64748b", background: `${colors[finding.status] || "#64748b"}15`, border: `1px solid ${colors[finding.status] || "#64748b"}40` }}>
        {(finding.status || "open").replace(/_/g, " ")} ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 rounded-lg overflow-hidden shadow-xl min-w-32" style={{ background: "#111827", border: "1px solid #374151" }}>
          {statuses.map(s => (
            <button key={s} onClick={e => { e.stopPropagation(); onUpdate(s); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-slate-700 capitalize" style={{ color: colors[s] }}>
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassifyModal({ onClose }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleClassify = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("shieldDSPM", { action: "classify_text", text_to_classify: text });
      setResult(res?.data);
    } catch {
      toast.error("Classification failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg" style={{ background: "#0d1117", border: "1px solid #30363d" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#30363d" }}>
          <h3 className="text-sm font-bold text-white">Classify Text</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
        </div>
        <div className="p-5 space-y-4">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
            placeholder="Paste text or data sample to classify for PII, PCI, PHI content…"
            className="w-full px-3 py-2 rounded-lg text-xs text-white placeholder-slate-500 resize-none bg-slate-900 border border-slate-700 outline-none focus:border-indigo-500" />
          {result && (
            <div className="p-3 rounded-lg" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-xs font-bold text-white mb-2">Classification Result:</p>
              <div className="flex flex-wrap gap-2">
                {result.classifications?.map(c => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)" }}>{c}</span>
                ))}
              </div>
              {result.sensitivity_score !== undefined && (
                <p className="text-xs text-slate-400 mt-2">Sensitivity Score: <span className="font-bold text-white">{result.sensitivity_score}/100</span></p>
              )}
            </div>
          )}
          <button onClick={handleClassify} disabled={loading || !text.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-black disabled:opacity-50"
            style={{ background: GOLD }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Classify Text"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DSPMPage() {
  const [filterProvider, setFilterProvider] = useState("all");
  const [expandedAsset, setExpandedAsset] = useState(null);
  const [showClassify, setShowClassify] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [remediating, setRemediating] = useState(null);
  const qc = useQueryClient();

  const { data: assets = [], isLoading: loadAssets } = useQuery({
    queryKey: ["dspm-assets"],
    queryFn: () => base44.entities.DSPMAsset.filter({}).catch(() => []),
    initialData: [],
    refetchInterval: 60000,
  });

  const { data: dspFindings = [], isLoading: loadFindings } = useQuery({
    queryKey: ["dspm-findings"],
    queryFn: () => base44.entities.DSPMFinding.filter({}).catch(() => []),
    initialData: [],
    refetchInterval: 60000,
  });

  const updateFinding = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DSPMFinding.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dspm-findings"] }),
  });

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("shieldDSPM", { action: "scan", save_to_db: true });
      toast.success(`Data scan complete — ${res?.data?.assets_discovered || 0} assets`);
      qc.invalidateQueries({ queryKey: ["dspm-assets"] });
      qc.invalidateQueries({ queryKey: ["dspm-findings"] });
    } catch {
      toast.error("Data scan failed — check DSPM backend function");
    } finally { setScanning(false); }
  };

  // Stats
  const piiDetected = assets.filter(a => a.pii_detected).length;
  const unencrypted = assets.filter(a => a.encryption_at_rest === false).length;
  const publicSensitive = assets.filter(a => a.public_access && a.sensitivity_score > 30).length;

  // Classification donut
  const classificationData = useMemo(() => {
    const counts = {};
    assets.forEach(a => { counts[a.classification || "internal"] = (counts[a.classification || "internal"] || 0) + 1; });
    return Object.entries(counts).map(([cls, value]) => ({
      name: CLASSIFICATION_CONFIG[cls]?.label || cls,
      value,
      color: CLASSIFICATION_CONFIG[cls]?.color || "#64748b",
    }));
  }, [assets]);

  // Regulatory coverage heatmap
  const regHeatmap = useMemo(() => {
    const grid = {};
    ASSET_TYPES.forEach(at => REGULATIONS.forEach(reg => grid[`${at}|${reg}`] = 0));
    dspFindings.forEach(f => {
      const asset = assets.find(a => a.asset_name === f.asset_name);
      if (!asset) return;
      const regs = (f.regulation || "").split(",").map(r => r.trim());
      regs.forEach(reg => {
        const key = `${asset.asset_type}|${reg}`;
        if (key in grid) grid[key]++;
      });
    });
    return grid;
  }, [assets, dspFindings]);

  // Sorted assets
  const sortedAssets = useMemo(() =>
    [...assets]
      .filter(a => filterProvider === "all" || a.provider === filterProvider)
      .sort((a, b) => (b.sensitivity_score || 0) - (a.sensitivity_score || 0)),
    [assets, filterProvider]
  );

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ background: "#0d1117" }}>
      {showClassify && <ClassifyModal onClose={() => setShowClassify(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.3)" }}>
            <Database className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Data Security Posture Management</h1>
            <p className="text-xs text-slate-500">Data discovery · classification · exposure management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowClassify(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all">
            <Search className="w-3.5 h-3.5" /> Classify Text
          </button>
          <button onClick={() => qc.invalidateQueries()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-slate-700 text-slate-400 hover:text-white transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleScan} disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-black disabled:opacity-60 transition-all hover:opacity-90"
            style={{ background: GOLD }}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            {scanning ? "Scanning…" : "Scan Data Stores"}
          </button>
        </div>
      </div>

      {/* Critical alert banner */}
      {publicSensitive > 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "2px solid rgba(239,68,68,0.3)", borderLeft: "4px solid #ef4444" }}>
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-400">🔴 CRITICAL: {publicSensitive} sensitive data store{publicSensitive > 1 ? "s" : ""} publicly accessible</p>
            <p className="text-xs text-red-300 mt-0.5">Sensitive data is exposed to the internet. Restrict access immediately.</p>
          </div>
          <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0 ml-auto" style={{ background: "#ef4444" }}>
            View Assets
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Data Assets", value: assets.length, color: "#6366f1" },
          { label: "PII Detected", value: piiDetected, color: "#f97316", pulse: piiDetected > 0 },
          { label: "Unencrypted", value: unencrypted, color: "#ef4444", pulse: unencrypted > 0 },
          { label: "Public + Sensitive", value: publicSensitive, color: "#ef4444", pulse: publicSensitive > 0 },
          { label: "Total Findings", value: dspFindings.length, color: "#eab308" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            {s.pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse mb-1.5" style={{ background: s.color }} />}
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Classification Donut */}
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Data Classification</h3>
          {loadAssets ? (
            <div className="h-48 animate-pulse bg-slate-800 rounded" />
          ) : classificationData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data assets</div>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={classificationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {classificationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 11 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-base font-black text-white">{assets.length}</p>
                  <p className="text-[9px] text-slate-500">Assets</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Regulatory Coverage Heatmap */}
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Regulatory Coverage</h3>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-1.5 text-slate-500 text-[9px] text-left w-24">Asset Type</th>
                  {REGULATIONS.map(r => (
                    <th key={r} className="p-1.5 text-[9px] font-bold text-slate-400 text-center">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ASSET_TYPES.map(at => (
                  <tr key={at}>
                    <td className="p-1.5 text-[9px] text-slate-400 whitespace-nowrap">{at.replace(/_/g, " ")}</td>
                    {REGULATIONS.map(reg => {
                      const count = regHeatmap[`${at}|${reg}`] || 0;
                      return (
                        <td key={reg} className="p-1.5 text-center rounded"
                          style={{ background: count > 0 ? `rgba(239,68,68,${Math.min(0.1 + count * 0.15, 0.6)})` : "#0d1117", minWidth: 44 }}>
                          {count > 0 ? <span className="font-black text-xs text-red-300">{count}</span> : <span className="text-slate-800">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <h3 className="text-sm font-semibold text-white">Data Assets</h3>
          <div className="flex-1" />
          {["all", "aws", "gcp", "azure"].map(p => (
            <button key={p} onClick={() => setFilterProvider(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filterProvider === p ? "text-white" : "text-slate-500"}`}
              style={filterProvider === p ? { background: (PROVIDER_COLOR[p] || "#374151") + "30", border: `1px solid ${PROVIDER_COLOR[p] || "#374151"}` } : { background: "#161b22", border: "1px solid #30363d" }}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                {["Asset", "Type", "Provider", "Classification", "Sensitivity", "PII", "PCI", "Public", "Encrypted", "Size (GB)", "Risk", "Scanned"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadAssets ? (
                [...Array(4)].map((_, i) => <tr key={i}>{[...Array(12)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>)}</tr>)
              ) : sortedAssets.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <Database className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm text-slate-500">No data assets discovered — run a scan</p>
                  </td>
                </tr>
              ) : (
                sortedAssets.map((a, i) => {
                  const clsCfg = CLASSIFICATION_CONFIG[a.classification] || { color: "#64748b", label: a.classification };
                  const riskColor = a.risk_score >= 70 ? "#ef4444" : a.risk_score >= 40 ? "#f97316" : "#22c55e";
                  const sensColor = a.sensitivity_score >= 70 ? "#ef4444" : a.sensitivity_score >= 40 ? "#f97316" : "#22c55e";
                  const piiTypes = (a.pii_types || "").split(",").filter(Boolean);
                  const assetFindings = dspFindings.filter(f => f.asset_name === a.asset_name);
                  const isExpanded = expandedAsset === a.id;
                  return (
                    <React.Fragment key={a.id}>
                      <tr style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: isExpanded ? "none" : "1px solid rgba(48,54,61,0.5)" }}
                        className="hover:bg-white/2 transition-colors cursor-pointer"
                        onClick={() => setExpandedAsset(isExpanded ? null : a.id)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-white">{a.asset_name}</span>
                            {assetFindings.length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-red-400 bg-red-400/10">{assetFindings.length}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">{a.asset_type?.replace(/_/g, " ")}</span></td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: PROVIDER_COLOR[a.provider], background: `${PROVIDER_COLOR[a.provider] || "#64748b"}20` }}>
                            {a.provider || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: clsCfg.color, background: `${clsCfg.color}20` }}>{clsCfg.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-slate-800">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(a.sensitivity_score || 0, 100)}%`, background: sensColor }} />
                            </div>
                            <span className="text-[10px] font-mono font-bold" style={{ color: sensColor }}>{a.sensitivity_score || 0}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a.pii_detected ? (
                            <span title={piiTypes.join(", ")} className="cursor-help">🔴</span>
                          ) : <span>✅</span>}
                        </td>
                        <td className="px-4 py-3 text-center">{a.pci_data ? "🔴" : "✅"}</td>
                        <td className="px-4 py-3 text-center">{a.public_access ? "🔴" : "✅"}</td>
                        <td className="px-4 py-3 text-center">{a.encryption_at_rest !== false ? "🔐" : "⚠️"}</td>
                        <td className="px-4 py-3 text-[10px] font-mono text-slate-400">{a.data_size_gb ? a.data_size_gb.toFixed(1) : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-slate-800">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(a.risk_score || 0, 100)}%`, background: riskColor }} />
                            </div>
                            <span className="text-[10px] font-mono font-bold" style={{ color: riskColor }}>{a.risk_score || 0}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-slate-500">
                          {a.scanned_at ? formatDistanceToNow(new Date(a.scanned_at), { addSuffix: true }) : "—"}
                        </td>
                      </tr>
                      {/* Expanded findings row */}
                      {isExpanded && (
                        <tr style={{ background: "#0a0e1a", borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
                          <td colSpan={12} className="px-6 py-4">
                            {assetFindings.length === 0 ? (
                              <p className="text-xs text-emerald-400">✅ No findings for this asset</p>
                            ) : (
                              <div className="space-y-2">
                                {assetFindings.map((f, j) => {
                                  const ftCfg = FINDING_TYPE_CONFIG[f.finding_type] || { icon: "⚠️", label: f.finding_type, color: "#64748b" };
                                  return (
                                    <div key={f.id || j} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: "#161b22", border: "1px solid #30363d" }}>
                                      <span className="text-base">{ftCfg.icon}</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: ftCfg.color, background: `${ftCfg.color}15` }}>{ftCfg.label}</span>
                                          <span className="text-xs text-white">{f.title}</span>
                                        </div>
                                        {f.regulation && <p className="text-[9px] text-slate-500 mt-0.5">Regulation: {f.regulation}</p>}
                                      </div>
                                      {f.sample_count > 0 && <span className="text-[10px] text-slate-400 font-mono">{f.sample_count} samples</span>}
                                      <StatusDropdown finding={f} onUpdate={status => updateFinding.mutate({ id: f.id, data: { status } })} />
                                      <button onClick={() => setRemediating(f)}
                                        className="text-[9px] px-2 py-1 rounded font-bold text-black" style={{ background: GOLD }}>
                                        Fix
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Findings Table */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">All Data Findings</h3>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                {["Finding", "Severity", "Type", "Asset", "Data Type", "Regulation", "Status", "Samples", "Detected", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadFindings ? (
                [...Array(3)].map((_, i) => <tr key={i}>{[...Array(10)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>)}</tr>)
              ) : dspFindings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <Lock className="w-8 h-8 mx-auto mb-3 text-emerald-500/40" />
                    <p className="text-sm text-slate-500">No data findings — run a scan</p>
                  </td>
                </tr>
              ) : (
                dspFindings.map((f, i) => {
                  const ftCfg = FINDING_TYPE_CONFIG[f.finding_type] || { icon: "⚠️", label: f.finding_type, color: "#64748b" };
                  const sevColor = SEV_COLOR[f.severity] || "#64748b";
                  return (
                    <tr key={f.id} style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                      className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3"><span className="text-xs text-white">{f.title}</span></td>
                      <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: sevColor, background: `${sevColor}20` }}>{f.severity}</span></td>
                      <td className="px-4 py-3">
                        <span className="text-base mr-1">{ftCfg.icon}</span>
                        <span className="text-[10px]" style={{ color: ftCfg.color }}>{ftCfg.label}</span>
                      </td>
                      <td className="px-4 py-3"><span className="text-[10px] text-blue-400 font-mono">{f.asset_name}</span></td>
                      <td className="px-4 py-3"><span className="text-[10px] text-slate-400">{f.data_type || "—"}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(f.regulation || "").split(",").filter(Boolean).map(r => (
                            <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{r.trim()}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusDropdown finding={f} onUpdate={status => updateFinding.mutate({ id: f.id, data: { status } })} /></td>
                      <td className="px-4 py-3 text-[10px] font-mono text-slate-400">{f.sample_count || "—"}</td>
                      <td className="px-4 py-3 text-[10px] text-slate-500">
                        {f.detected_at ? formatDistanceToNow(new Date(f.detected_at), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setRemediating(f)}
                          className="text-[9px] px-2.5 py-1 rounded font-bold text-black" style={{ background: GOLD }}>
                          Remediate
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remediation modal */}
      {remediating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setRemediating(null)}>
          <div className="rounded-2xl w-full max-w-lg" style={{ background: "#0d1117", border: "1px solid #30363d" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#30363d" }}>
              <h3 className="text-sm font-bold text-white">{remediating.title}</h3>
              <button onClick={() => setRemediating(null)}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
            </div>
            <div className="p-5 space-y-4">
              {remediating.description && <p className="text-sm text-slate-400">{remediating.description}</p>}
              {remediating.remediation ? (
                <div className="p-3 rounded-lg font-mono text-xs text-emerald-400" style={{ background: "#0a0e1a", border: "1px solid #1e293b" }}>
                  {remediating.remediation}
                </div>
              ) : <p className="text-sm text-slate-500">No remediation guidance available.</p>}
              <button onClick={async () => {
                try {
                  await base44.functions.invoke("shieldJiraIntegration", {
                    action: "create", title: remediating.title, severity: remediating.severity,
                    description: remediating.remediation || remediating.description || "",
                  });
                  toast.success("Jira ticket created");
                  setRemediating(null);
                } catch { toast.error("Jira not configured"); }
              }} className="w-full py-2.5 rounded-lg text-sm font-bold text-black" style={{ background: GOLD }}>
                📋 Create Jira Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}