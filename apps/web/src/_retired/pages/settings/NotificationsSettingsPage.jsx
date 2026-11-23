import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Bell, Search, CheckCheck, AlertTriangle } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";
const TYPE_COLOR = {
  alert: DANGER, warning: "#ffb83b", info: C, success: SUCCESS,
  critical: DANGER, finding: "#ff7b3b",
};

export default function NotificationsSettingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sev, setSev] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["notifications-feed"],
    queryFn: () => base44.entities.Notification.list("-created_date", 500).catch(() => []),
    initialData: [], refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-feed"] }),
  });

  const filtered = notifs.filter(n => {
    if (sev !== "all" && n.severity !== sev) return false;
    if (readFilter === "unread" && n.is_read) return false;
    if (readFilter === "read" && !n.is_read) return false;
    if (search && !n.title?.toLowerCase().includes(search.toLowerCase()) && !n.message?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const unread = notifs.filter(n => !n.is_read).length;

  const rows = filtered.slice(0, 300).map((n, i) => {
    const tc = TYPE_COLOR[n.type] || "#64748b";
    return {
      _key: n.id || i,
      _cells: [
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: tc, background: `${tc}18` }}>{n.type || "—"}</span>,
        <div className="flex items-center gap-1.5">
          {!n.is_read && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: C }} />}
          <span className={`text-[10px] font-semibold ${n.is_read ? "text-slate-400" : "text-white"}`}>{n.title || "—"}</span>
        </div>,
        <span className="text-[9px] text-slate-400 truncate max-w-48 block">{n.message || "—"}</span>,
        <SevBadge sev={n.severity} />,
        <span className="text-[9px] text-slate-400 capitalize">{n.resource_type || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-500 truncate max-w-24 block">{n.resource_id || "—"}</span>,
        <span className="text-[9px] font-bold capitalize" style={{ color: n.channel === "slack" ? SUCCESS : n.channel === "email" ? C : "#a78bfa" }}>{n.channel || "in-app"}</span>,
        <span className="text-[9px]" style={{ color: n.is_read ? "#64748b" : SUCCESS }}>{n.is_read ? "Read" : "Unread"}</span>,
        <span className="text-[9px] text-slate-500">{n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : "—"}</span>,
        !n.is_read ? (
          <button onClick={() => markRead.mutate(n.id)} className="text-[9px] font-bold px-2 py-0.5 rounded transition-colors hover:text-white" style={{ color: C, border: `1px solid rgba(0,217,255,0.3)` }}>
            Mark Read
          </button>
        ) : <span className="text-[9px] text-slate-700">—</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Settings", path: "/settings" }, { label: "Notifications" }]}
      title="Notifications" subtitle="ALERTS · FINDINGS · SYSTEM EVENTS · ALL CHANNELS"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications…" className="w-36 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          <select value={readFilter} onChange={e => setReadFilter(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <select value={sev} onChange={e => setSev(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Severity</option>
            {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={notifs.length} color={C} icon={Bell} />
        <StatCard label="Unread" value={unread} color={DANGER} icon={Bell} />
        <StatCard label="Critical" value={notifs.filter(n => n.severity === "critical").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Read" value={notifs.length - unread} color={SUCCESS} icon={CheckCheck} />
      </div>

      <GDSTable
        columns={["Type","Title","Message","Severity","Resource Type","Resource ID","Channel","Status","Date","Action"]}
        rows={rows}
        isLoading={isLoading}
        emptyText="No notifications yet"
      />
    </GDSPageShell>
  );
}