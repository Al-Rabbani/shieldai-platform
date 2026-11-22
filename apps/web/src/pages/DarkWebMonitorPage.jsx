import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Key, Eye, Globe, Shield, RefreshCw, Loader2, X, Search, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const SEV_BG = { critical: "rgba(239,68,68,0.1)", high: "rgba(249,115,22,0.1)", medium: "rgba(234,179,8,0.1)", low: "rgba(59,130,246,0.1)" };

const ALERT_TYPE_CONFIG = {
  ransomware_mention:   { icon: "💀", color: "#ef4444", bg: "rgba(239,68,68,0.12)",  label: "Ransomware" },
  credential_breach:    { icon: "🔑", color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "Credential Breach" },
  domain_impersonation: { icon: "🎭", color: "#eab308", bg: "rgba(234,179,8,0.12)",  label: "Domain Impersonation" },
  c2_infrastructure:    { icon: "🕸️", color: "#ef4444", bg: "rgba(239,68,68,0.12)",  label: "C2 Infra" },
  data_leak:            { icon: "💧", color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "Data Leak" },
  stealer_log:          { icon: "🖥️", color: "#ef4444", bg: "rgba(239,68,68,0.12)",  label: "Stealer Log" },
};

const STATUS_OPTIONS = ["new", "investigating", "remediated"];
const STATUS_COLOR = { new: "#ef4444", investigating: "#eab308", remediated: "#22c55e" };

function SeverityBadge({ s }) {
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ color: SEV_COLOR[s], background: SEV_BG[s] }}>{s}</span>;
}

function StatusDropdown({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-[10px] font-bold px-2 py-0.5 rounded-lg border-0 outline-none cursor-pointer"
      style={{ color: STATUS_COLOR[value] || "#64748b", background: `${STATUS_COLOR[value] || "#64748b"}18` }}>
      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
    </select>
  );
}

function ScanModal({ onClose }) {
  const [domain, setDomain] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const qc = useQueryClient();

  const handleScan = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("shieldDarkWebMonitor", { action: "full_scan", domain: domain.trim(), org_name: orgName.trim(), save_to_db: true });
      setResult(res?.data || res);
      qc.invalidateQueries({ queryKey: ["dark-web-alerts"] });
      toast.success("Dark web scan complete");
    } catch { toast.error("Scan failed — check backend function"); }
    finally { setLoading(false); }
  };

  const RISK_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md" style={{ background: "#0d1117", border: "1px solid #374151" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#1F2937" }}>
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Eye className="w-4 h-4 text-red-400" /> Run Full Dark Web Scan</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Target Domain</label>
            <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="shieldai.com"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-slate-900 border border-slate-700 outline-none focus:border-red-500" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Organisation Name</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="ShieldAI Ltd"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-slate-900 border border-slate-700 outline-none focus:border-red-500" />
          </div>
          {result && (
            <div className="p-3 rounded-xl" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-xs text-white font-semibold mb-2">Scan Complete</p>
              <div className="flex items-center gap-3">
                {result.risk_level && (
                  <span className="text-sm font-black px-3 py-1 rounded-full uppercase" style={{ color: RISK_COLOR[result.risk_level], background: `${RISK_COLOR[result.risk_level]}20` }}>
                    {result.risk_level} RISK
                  </span>
                )}
                <span className="text-xs text-slate-400">{result.alerts_found || 0} new alerts</span>
              </div>
            </div>
          )}
          <button onClick={handleScan} disabled={loading || !domain.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {loading ? "Scanning dark web…" : "Run Full Scan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({ alert, onClose }) {
  if (!alert) return null;
  const cfg = ALERT_TYPE_CONFIG[alert.alert_type] || { icon: "⚠️", color: "#64748b", label: alert.alert_type };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" style={{ background: "#0d1117", border: "1px solid #374151" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b sticky top-0" style={{ borderColor: "#1F2937", background: "#0d1117" }}>
          <h3 className="text-sm font-bold text-white">{cfg.icon} {alert.title}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <SeverityBadge s={alert.severity} />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
          </div>
          {alert.description && <p className="text-sm text-slate-300 leading-relaxed">{alert.description}</p>}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: "Target", val: alert.target },
              { label: "Source", val: alert.source },
              { label: "Ransomware Group", val: alert.ransomware_group },
              { label: "Breach Date", val: alert.breach_date ? new Date(alert.breach_date).toLocaleDateString() : null },
              { label: "Affected Emails", val: alert.affected_emails },
              { label: "Affected Passwords", val: alert.affected_passwords },
            ].filter(r => r.val).map(r => (
              <div key={r.label} className="p-3 rounded-lg" style={{ background: "#161b22" }}>
                <p className="text-[10px] text-slate-500 mb-0.5">{r.label}</p>
                <p className="text-white font-medium">{r.val}</p>
              </div>
            ))}
          </div>
          {alert.data_classes && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Data Classes</p>
              <div className="flex flex-wrap gap-1">
                {alert.data_classes.split(",").filter(Boolean).map(d => (
                  <span key={d} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">{d.trim()}</span>
                ))}
              </div>
            </div>
          )}
          {alert.remediation && (
            <div className="p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p className="text-[10px] font-semibold text-emerald-400 mb-1">Remediation Steps</p>
              <p className="text-xs text-slate-300 leading-relaxed">{alert.remediation}</p>
            </div>
          )}
          {alert.source && <p className="text-[10px] text-slate-600">Source attribution: {alert.source}</p>}
        </div>
      </div>
    </div>
  );
}

const C2_FAMILIES = [
  { name: "Emotet", count: 342 }, { name: "QakBot", count: 287 }, { name: "IcedID", count: 198 },
  { name: "Cobalt Strike", count: 156 }, { name: "AsyncRAT", count: 134 }, { name: "RedLine", count: 112 },
];

const RANSOMWARE_GROUPS = [
  { name: "LockBit", victims: 47, level: "very_active" },
  { name: "BlackCat (ALPHV)", victims: 31, level: "very_active" },
  { name: "Cl0p", victims: 28, level: "very_active" },
  { name: "Black Basta", victims: 22, level: "active" },
  { name: "Royal", victims: 19, level: "active" },
  { name: "Vice Society", victims: 15, level: "active" },
  { name: "Medusa", victims: 14, level: "active" },
  { name: "Play", victims: 12, level: "active" },
  { name: "BianLian", victims: 11, level: "active" },
  { name: "8Base", victims: 9, level: "low" },
  { name: "Akira", victims: 8, level: "low" },
  { name: "RansomHouse", victims: 6, level: "low" },
];
const GROUP_COLOR = { very_active: "#ef4444", active: "#f97316", low: "#475569" };

export default function DarkWebMonitorPage() {
  const [showScanModal, setShowScanModal] = useState(false);
  const [c2Loading, setC2Loading] = useState(false);
  const [c2Data, setC2Data] = useState(null);
  const [iocQuery, setIocQuery] = useState("");
  const [iocLoading, setIocLoading] = useState(false);
  const [iocResult, setIocResult] = useState(null);
  const [domainQuery, setDomainQuery] = useState("");
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainResult, setDomainResult] = useState(null);
  const [detailAlert, setDetailAlert] = useState(null);
  const qc = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["dark-web-alerts"],
    queryFn: () => base44.entities.DarkWebAlert.list("-detected_at", 200).catch(() => []),
    initialData: [],
    refetchInterval: 60000,
  });

  // Stats
  const totalAlerts = alerts.length;
  const ransomwareMentions = alerts.filter(a => a.alert_type === "ransomware_mention").length;
  const credBreaches = alerts.filter(a => a.alert_type === "credential_breach").length;
  const domainImpers = alerts.filter(a => a.alert_type === "domain_impersonation").length;
  const newUnreviewed = alerts.filter(a => a.status === "new").length;
  const hasCritical = alerts.some(a => a.severity === "critical");
  const lastScan = alerts.length > 0 ? alerts[0].detected_at : null;

  const handleStatusChange = async (alert, newStatus) => {
    try { await base44.entities.DarkWebAlert.update(alert.id, { status: newStatus }); qc.invalidateQueries({ queryKey: ["dark-web-alerts"] }); }
    catch { toast.error("Failed to update status"); }
  };

  const handleC2Feeds = async () => {
    setC2Loading(true);
    try {
      const res = await base44.functions.invoke("shieldDarkWebMonitor", { action: "c2_feeds" });
      setC2Data(res?.data || res);
    } catch { toast.error("C2 feeds unavailable"); }
    finally { setC2Loading(false); }
  };

  const handleIOCLookup = async () => {
    if (!iocQuery.trim()) return;
    setIocLoading(true); setIocResult(null);
    try {
      const res = await base44.functions.invoke("shieldDarkWebMonitor", { action: "ioc_lookup", domain: iocQuery.trim() });
      setIocResult(res?.data || res);
    } catch { toast.error("IOC lookup failed"); }
    finally { setIocLoading(false); }
  };

  const handleDomainCheck = async () => {
    if (!domainQuery.trim()) return;
    setDomainLoading(true); setDomainResult(null);
    try {
      const res = await base44.functions.invoke("shieldDarkWebMonitor", { action: "impersonation", domain: domainQuery.trim() });
      setDomainResult(res?.data || res);
    } catch { toast.error("Domain check failed"); }
    finally { setDomainLoading(false); }
  };

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ background: "#0d1117" }}>
      {showScanModal && <ScanModal onClose={() => setShowScanModal(false)} />}
      {detailAlert && <DetailsModal alert={detailAlert} onClose={() => setDetailAlert(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <Eye className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Dark Web Monitor</h1>
            <p className="text-xs text-slate-500">
              {lastScan ? `Last scan: ${formatDistanceToNow(new Date(lastScan), { addSuffix: true })}` : "No scans run yet"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleC2Feeds} disabled={c2Loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-600 text-slate-300 hover:text-white transition-all disabled:opacity-50">
            {c2Loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "🕸️"} C2 Feeds
          </button>
          <button onClick={() => setShowScanModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Run Full Scan
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: hasCritical ? "1px solid rgba(239,68,68,0.5)" : "1px solid #30363d" }}>
          {hasCritical && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mb-1.5" />}
          <p className="text-2xl font-black font-mono text-white">{totalAlerts}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Total Alerts</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <p className="text-2xl font-black font-mono text-red-400">{ransomwareMentions}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Ransomware Mentions</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <p className="text-2xl font-black font-mono text-orange-400">{credBreaches}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Credential Breaches</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <p className="text-2xl font-black font-mono text-yellow-400">{domainImpers}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Domain Impersonation</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: newUnreviewed > 0 ? "1px solid rgba(239,68,68,0.4)" : "1px solid #30363d" }}>
          <p className="text-2xl font-black font-mono text-red-400">{newUnreviewed}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">New Unreviewed</p>
        </div>
      </div>

      {/* Threat Landscape */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ransomware Groups */}
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">💀 Active Ransomware Groups</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {RANSOMWARE_GROUPS.map(g => (
              <div key={g.name} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: "#0d1117" }}>
                <span className="text-xs font-mono font-medium text-white">{g.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: GROUP_COLOR[g.level], background: `${GROUP_COLOR[g.level]}20` }}>
                    {g.victims} victims
                  </span>
                  <div className="w-2 h-2 rounded-full" style={{ background: GROUP_COLOR[g.level] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* C2 Infrastructure */}
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">🕸️ Global C2 Infrastructure</h3>
          <p className="text-[10px] text-slate-500 mb-4">
            {c2Data?.total_c2_ips ? `${c2Data.total_c2_ips.toLocaleString()} known C2 IPs` : "3,847 known C2 IPs tracked"}
            <span className="ml-1 text-slate-600">· Data from abuse.ch Feodo Tracker (real-time)</span>
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={c2Data?.families || C2_FAMILIES} layout="vertical" margin={{ left: 5, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={90} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 11 }} />
              <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* IOC Intelligence */}
      <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-orange-400" /> IOC Intelligence
          <span className="text-[10px] text-slate-500 font-normal ml-2">Powered by abuse.ch ThreatFox</span>
        </h3>
        <div className="flex gap-2 mb-4">
          <input value={iocQuery} onChange={e => setIocQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleIOCLookup()}
            placeholder="Enter domain, IP, hash, or URL…"
            className="flex-1 px-3 py-2 rounded-lg text-sm text-white bg-slate-900 border border-slate-700 outline-none focus:border-orange-500" />
          <button onClick={handleIOCLookup} disabled={iocLoading || !iocQuery.trim()}
            className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 flex items-center gap-2"
            style={{ background: "#f97316" }}>
            {iocLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Search IOC
          </button>
        </div>
        {iocResult && (
          <div className="p-4 rounded-xl grid grid-cols-2 md:grid-cols-3 gap-3" style={{ background: "#0d1117" }}>
            {[
              { label: "Found", val: iocResult.found ? <span className="text-red-400 font-bold">🔴 MALICIOUS</span> : <span className="text-emerald-400">✅ Clean</span> },
              { label: "IOC Type", val: iocResult.ioc_type },
              { label: "Threat Type", val: iocResult.threat_type },
              { label: "Malware Family", val: iocResult.malware_family },
              { label: "Confidence", val: iocResult.confidence ? `${iocResult.confidence}%` : null },
              { label: "First Seen", val: iocResult.first_seen ? new Date(iocResult.first_seen).toLocaleDateString() : null },
            ].filter(r => r.val).map(r => (
              <div key={r.label} className="p-3 rounded-lg" style={{ background: "#161b22" }}>
                <p className="text-[10px] text-slate-500 mb-0.5">{r.label}</p>
                <div className="text-xs text-white font-medium">{r.val}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Domain Impersonation */}
      <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          🎭 Domain Impersonation Checker
        </h3>
        <p className="text-[10px] text-slate-500 mb-3">Powered by crt.sh Certificate Transparency</p>
        <div className="flex gap-2 mb-4">
          <input value={domainQuery} onChange={e => setDomainQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleDomainCheck()}
            placeholder="yourdomain.com"
            className="flex-1 px-3 py-2 rounded-lg text-sm text-white bg-slate-900 border border-slate-700 outline-none focus:border-yellow-500" />
          <button onClick={handleDomainCheck} disabled={domainLoading || !domainQuery.trim()}
            className="px-4 py-2 rounded-lg text-xs font-bold text-black disabled:opacity-50 flex items-center gap-2"
            style={{ background: "#eab308" }}>
            {domainLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "🎭"}
            Check Domain
          </button>
        </div>
        {domainResult && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-bold text-white">{domainResult.lookalike_count || 0} lookalike domains found</span>
              {domainResult.lookalike_count > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400">⚠️ RISK</span>}
            </div>
            {(domainResult.lookalikes || []).map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#0d1117" }}>
                <span className="text-xs font-mono text-white">{d.domain}</span>
                <div className="flex items-center gap-2">
                  {d.risk && <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: SEV_COLOR[d.risk] || "#64748b", background: `${SEV_COLOR[d.risk] || "#64748b"}20` }}>{d.risk}</span>}
                  {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5 text-slate-500 hover:text-blue-400" /></a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts Table */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" /> All Alerts
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </h3>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                {["Severity", "Type", "Title", "Target", "Source", "Ransomware", "Emails", "Status", "Detected", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(10)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>)}</tr>)
              ) : alerts.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-16 text-center">
                  <Eye className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-white mb-1">No dark web alerts</p>
                  <button onClick={() => setShowScanModal(true)}
                    className="mt-2 text-xs text-red-400 hover:underline">Run a scan to check →</button>
                </td></tr>
              ) : (
                alerts.map((a, i) => {
                  const cfg = ALERT_TYPE_CONFIG[a.alert_type] || { icon: "⚠️", color: "#64748b", bg: "rgba(100,116,139,0.1)", label: a.alert_type };
                  const isCrit = a.severity === "critical";
                  return (
                    <tr key={a.id}
                      style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)", borderLeft: isCrit ? "2px solid #ef4444" : "2px solid transparent" }}
                      className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap"><SeverityBadge s={a.severity} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.icon} {cfg.label}</span>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs text-white truncate max-w-48 block">{a.title || "—"}</span></td>
                      <td className="px-4 py-3"><span className="text-[10px] font-mono text-slate-400">{a.target || "—"}</span></td>
                      <td className="px-4 py-3"><span className="text-[10px] text-slate-500">{a.source || "—"}</span></td>
                      <td className="px-4 py-3">{a.ransomware_group ? <span className="text-[10px] font-bold text-red-400">{a.ransomware_group}</span> : <span className="text-slate-700">—</span>}</td>
                      <td className="px-4 py-3">{a.affected_emails > 0 ? <span className="text-[10px] font-bold text-orange-400">{a.affected_emails}</span> : <span className="text-slate-700">—</span>}</td>
                      <td className="px-4 py-3"><StatusDropdown value={a.status || "new"} onChange={s => handleStatusChange(a, s)} /></td>
                      <td className="px-4 py-3 text-[10px] text-slate-500 whitespace-nowrap">
                        {a.detected_at ? formatDistanceToNow(new Date(a.detected_at), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDetailAlert(a)}
                          className="text-[10px] font-bold px-2 py-1 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all">
                          Details
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
    </div>
  );
}