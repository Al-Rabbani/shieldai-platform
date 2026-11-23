import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Key, AlertTriangle, Search } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard, YesNo } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";

export default function CredentialLeaksPage() {
  const [search, setSearch] = useState("");
  const [sev, setSev] = useState("all");
  const [status, setStatus] = useState("all");

  const { data: leaks = [], isLoading } = useQuery({
    queryKey: ["credential-leaks"],
    queryFn: () => base44.entities.CredentialLeak.list("-breach_date", 300).catch(() => []),
    initialData: [], refetchInterval: 60000,
  });

  const filtered = leaks.filter(l => {
    if (sev !== "all" && l.severity !== sev) return false;
    if (status !== "all" && l.status !== status) return false;
    if (search && !l.target_email?.toLowerCase().includes(search.toLowerCase()) && !l.breach_name?.toLowerCase().includes(search.toLowerCase()) && !l.target_domain?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rows = filtered.slice(0, 300).map((l, i) => ({
    _key: l.id || i,
    _cells: [
      <span className="text-[9px] font-mono text-white">{l.target_email || "—"}</span>,
      <span className="text-[9px] font-mono" style={{ color: C }}>{l.target_domain || "—"}</span>,
      <span className="text-[10px] font-semibold text-white line-clamp-1 max-w-36 block">{l.breach_name || "—"}</span>,
      <span className="text-[9px] text-slate-500">{l.breach_date ? formatDistanceToNow(new Date(l.breach_date), { addSuffix: true }) : "—"}</span>,
      <span className="text-[9px] text-slate-400">{l.source || "—"}</span>,
      <span className="text-[9px] font-mono" style={{ color: (l.leaked_passwords || 0) > 0 ? DANGER : "#64748b" }}>{l.leaked_passwords?.toLocaleString() ?? "0"}</span>,
      <span className="text-[9px] font-mono text-slate-400">{l.leaked_hashes?.toLocaleString() ?? "0"}</span>,
      <YesNo val={l.password_cracked} />,
      <YesNo val={l.credentials_reused} />,
      <SevBadge sev={l.severity} />,
      <StatusBadge status={l.status || "active"} />,
      <span className="text-[9px] text-slate-400 line-clamp-1 max-w-32 block">{l.remediation || "—"}</span>,
    ],
  }));

  return (
    <GDSPageShell breadcrumbs={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "Credential Leaks" }]}
      title="Credential Leaks" subtitle="DARK WEB BREACH MONITORING · PASSWORD EXPOSURE · ACCOUNT TAKEOVER RISK"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Email, domain, breach…" className="w-36 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          {[
            { val: sev, set: setSev, opts: ["all","critical","high","medium","low"], label: "Severity" },
            { val: status, set: setStatus, opts: ["all","active","contained","remediated"], label: "Status" },
          ].map(({ val, set, opts, label }) => (
            <select key={label} value={val} onChange={e => set(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
              <option value="all">All {label}</option>
              {opts.slice(1).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>
      }>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leaks" value={leaks.length} color={C} icon={Key} />
        <StatCard label="Critical" value={leaks.filter(l => l.severity === "critical").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Password Cracked" value={leaks.filter(l => l.password_cracked).length} color={DANGER} icon={Key} />
        <StatCard label="Credentials Reused" value={leaks.filter(l => l.credentials_reused).length} color="#ffb83b" icon={AlertTriangle} />
      </div>
      <GDSTable
        columns={["Target Email","Target Domain","Breach Name","Breach Date","Source","Leaked Passwords","Leaked Hashes","Password Cracked","Credentials Reused","Severity","Status","Remediation"]}
        rows={rows} isLoading={isLoading} emptyText="No credential leaks detected" />
    </GDSPageShell>
  );
}