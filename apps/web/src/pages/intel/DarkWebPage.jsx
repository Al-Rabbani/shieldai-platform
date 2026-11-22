import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Eye, KeyRound, Skull, ChevronDown, ChevronRight } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const WARN = "#eab308"; const CYAN = "#00d4ff"; const CARD = "#111827"; const BORDER = "#1a1f2e";
const THREAT_COLOR = { critical: DANGER, high: "#f97316", medium: WARN, low: "#3b82f6" };

export default function DarkWebPage() {
  const [alertTypeF, setAlertTypeF] = useState("all");
  const [sevF,       setSevF]       = useState("all");
  const [statF,      setStatF]      = useState("all");
  const [ransomOpen, setRansomOpen] = useState(false);

  const { data: darkAlerts = [], isLoading: loadD } = useQuery({
    queryKey: ["dark-web-alerts"],
    queryFn: () => base44.entities.DarkWebEvent.list("-detected_at", 300).catch(() => []),
    initialData: [],
  });

  const { data: credLeaks = [], isLoading: loadC } = useQuery({
    queryKey: ["cred-leaks"],
    queryFn: () => base44.entities.CredentialLeak.list("-breach_date", 300).catch(() => []),
    initialData: [],
  });

  const { data: ransomGroups = [] } = useQuery({
    queryKey: ["ransomware-groups"],
    queryFn: () => base44.entities.RansomwareGroup.list("-victims_count", 50).catch(() => []),
    initialData: [],
  });

  const alertTypes = [...new Set(darkAlerts.map(a => a.alert_type || a.event_type).filter(Boolean))];

  const filterDark = darkAlerts.filter(a => {
    if (alertTypeF !== "all" && (a.alert_type||a.event_type) !== alertTypeF) return false;
    if (sevF  !== "all" && a.severity !== sevF)  return false;
    if (statF !== "all" && a.status   !== statF) return false;
    return true;
  });

  const alertRows = filterDark.map(a => ({
    _key: a.id,
    _cells: [
      <span className="text-[9px] font-bold capitalize px-2 py-0.5 rounded" style={{ color: DANGER, background: "rgba(239,68,68,0.1)" }}>{(a.alert_type||a.event_type||"—").replace(/_/g," ")}</span>,
      <SevBadge sev={a.severity} />,
      <StatusBadge status={a.status} />,
      <span className="text-[9px] text-slate-300">{a.target || "—"}</span>,
      <span className="text-[9px] capitalize text-slate-500">{a.target_type || "—"}</span>,
      <span className="text-[11px] font-semibold text-white truncate max-w-32 block">{a.title || "—"}</span>,
      <span className="text-[9px] text-slate-400 truncate max-w-28 block">{a.description || "—"}</span>,
      <span className="text-[9px] text-slate-400">{a.source || "—"}</span>,
      <span className="text-[9px] font-mono text-slate-500">{a.affected_emails || 0} emails</span>,
      <span className="text-[9px] text-slate-400">{a.ransomware_group || "—"}</span>,
      <span className="text-[9px] text-slate-400">{a.data_classes || "—"}</span>,
      <span className="text-[9px] text-slate-500">{a.detected_at ? formatDistanceToNow(new Date(a.detected_at), { addSuffix: true }) : "—"}</span>,
    ],
  }));

  const credRows = credLeaks.map(c => ({
    _key: c.id,
    _cells: [
      <span className="text-[10px] text-slate-300">{c.target_email || "—"}</span>,
      <span className="text-[9px] text-slate-400">{c.target_domain || "—"}</span>,
      <span className="text-[10px] font-semibold text-white">{c.breach_name || "—"}</span>,
      <span className="text-[9px] text-slate-400">{c.breach_date ? c.breach_date.slice(0,10) : "—"}</span>,
      <span className="text-[9px] text-slate-400">{c.source || "—"}</span>,
      <span className="text-[9px] font-mono" style={{ color: (c.leaked_passwords||0)>0 ? DANGER : "#64748b" }}>{c.leaked_passwords ?? 0}</span>,
      <span className="text-[9px] font-mono text-slate-400">{c.leaked_hashes ?? 0}</span>,
      <span className="text-[9px] font-bold" style={{ color: c.password_cracked ? DANGER : "#64748b" }}>{c.password_cracked ? "⚠ Yes" : "No"}</span>,
      <span className="text-[9px] font-bold" style={{ color: c.credentials_reused ? WARN : "#64748b" }}>{c.credentials_reused ? "⚠ Yes" : "No"}</span>,
      <SevBadge sev={c.severity} />,
      <StatusBadge status={c.status} />,
      <span className="text-[9px] text-slate-500">{c.breach_date ? formatDistanceToNow(new Date(c.breach_date), { addSuffix: true }) : "—"}</span>,
    ],
  }));

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "Dark Web & Breaches" }]}
      title="Dark Web & Breaches" subtitle="DARK WEB MONITORING · CREDENTIAL LEAKS · RANSOMWARE GROUPS"
      actions={
        <div className="flex items-center gap-2">
          {[["type", alertTypeF, setAlertTypeF, ["all",...alertTypes]], ["severity", sevF, setSevF, ["all","critical","high","medium","low"]], ["status", statF, setStatF, ["all","open","contained","remediated"]]].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o.replace(/_/g," ")}</option>)}
            </select>
          ))}
        </div>
      }>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Dark Web Alerts" value={darkAlerts.length} color={DANGER} icon={Eye} />
        <StatCard label="Credential Leaks" value={credLeaks.length} color={WARN} icon={KeyRound} />
        <StatCard label="Ransomware Groups" value={ransomGroups.length} color={DANGER} icon={Skull} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-white mb-3">Dark Web Alerts</h3>
        <GDSTable
          columns={["Alert Type","Severity","Status","Target","Target Type","Title","Description","Source","Affected","Ransomware Group","Data Classes","Detected"]}
          rows={alertRows} isLoading={loadD} emptyText="No dark web alerts" />
      </div>

      <div>
        <h3 className="text-sm font-bold text-white mb-3">Credential Leaks</h3>
        <GDSTable
          columns={["Email","Domain","Breach","Breach Date","Source","Passwords","Hashes","Cracked","Reused","Severity","Status","Age"]}
          rows={credRows} isLoading={loadC} emptyText="No credential leaks found" />
      </div>

      {/* Ransomware Groups Collapsible */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <button onClick={() => setRansomOpen(!ransomOpen)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/5"
          style={{ background: CARD }}>
          <div className="flex items-center gap-2">
            <Skull className="w-4 h-4" style={{ color: DANGER }} />
            Ransomware Groups ({ransomGroups.length})
          </div>
          {ransomOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </button>
        {ransomOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4" style={{ background: "#0f1623" }}>
            {ransomGroups.map(g => {
              const tc = THREAT_COLOR[g.threat_level] || "#64748b";
              return (
                <div key={g.id} className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${tc}25` }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold text-white">{g.group_name}</h4>
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: tc, background: `${tc}18` }}>{g.threat_level || "—"}</span>
                  </div>
                  {g.aliases && <p className="text-[8px] text-slate-600 mb-1">aka {g.aliases}</p>}
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-slate-500">{g.origin_country || "Unknown"} · {g.status || "active"}</span>
                    <span className="font-bold font-mono" style={{ color: DANGER }}>{g.victims_count || 0} victims</span>
                  </div>
                  <p className="text-[8px] text-slate-600 mt-1">{g.target_sectors || "—"}</p>
                </div>
              );
            })}
            {ransomGroups.length === 0 && <p className="text-xs text-slate-500 col-span-3 text-center py-6">No ransomware groups tracked</p>}
          </div>
        )}
      </div>
    </GDSPageShell>
  );
}