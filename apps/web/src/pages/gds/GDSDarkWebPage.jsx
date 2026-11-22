import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Eye, AlertTriangle, Key, Database } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SEV_COLOR, SevBadge, StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function AlertTypeBadge({ type }) {
  const colors = { credential: DANGER, mention: HIGH, data_sale: DANGER, ransomware: DANGER, forum: MEDIUM };
  const color = colors[type?.toLowerCase()] || CYAN;
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {(type || "—").replace(/_/g," ")}
    </span>
  );
}

export default function GDSDarkWebPage() {
  const { data: alerts = [], isLoading: loadA } = useQuery({
    queryKey: ["gds-dw-alerts"],
    queryFn: () => base44.entities.DarkWebAlert.list("-detected_at", 100).catch(() => []),
  });
  const { data: leaks = [], isLoading: loadL } = useQuery({
    queryKey: ["gds-cred-leaks"],
    queryFn: () => base44.entities.CredentialLeak.list("-breach_date", 100).catch(() => []),
  });
  const { data: breaches = [], isLoading: loadB } = useQuery({
    queryKey: ["gds-breaches"],
    queryFn: () => base44.entities.BreachRecord.list("-breach_date", 50).catch(() => []),
  });

  const critAlerts = alerts.filter(a => a.severity === "critical").length;
  const activeLeaks = leaks.filter(l => l.status === "active").length;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Dark Web Monitor" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Dark Web Monitor</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Credential leaks, data breaches, and dark web mentions</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Alerts" value={alerts.length} color={DANGER} icon={Eye} pulse={critAlerts > 0} />
        <KpiCard label="Critical Alerts" value={critAlerts} color={DANGER} icon={AlertTriangle} pulse />
        <KpiCard label="Credential Leaks" value={leaks.length} color={HIGH} icon={Key} />
        <KpiCard label="Active Leaks" value={activeLeaks} color={DANGER} icon={Database} pulse />
      </div>

      {/* Dark Web Alerts */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: DANGER }} />
          Dark Web Alerts
        </h3>
        {loadA ? <Skeleton lines={4} /> : alerts.length === 0
          ? <EmptyState icon={Eye} title="No dark web alerts" description="No mentions of your organisation detected on dark web forums" />
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.slice(0, 20).map((a, i) => (
                <Card key={a.id || i} className="p-4" style={{ borderLeft: `3px solid ${SEV_COLOR[a.severity] || BORDER}` }}>
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTypeBadge type={a.alert_type} />
                    <SevBadge sev={a.severity} />
                    <span className="text-[10px] ml-auto" style={{ color: MUTED }}>{timeAgo(a.detected_at)}</span>
                  </div>
                  <p className="text-sm font-bold text-white mb-1">{a.title}</p>
                  {a.target && <p className="text-xs mb-1 font-mono" style={{ color: CYAN }}>{a.target}</p>}
                  {a.description && <p className="text-xs" style={{ color: MUTED }}>{a.description}</p>}
                  {a.source && <p className="text-[10px] mt-2" style={{ color: MUTED }}>Source: {a.source}</p>}
                </Card>
              ))}
            </div>
          )}
      </div>

      {/* Credential Leaks */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white flex items-center gap-2"><Key className="w-4 h-4" style={{ color: DANGER }} />Credential Leaks</h3>
        </div>
        {loadL ? <Skeleton /> : leaks.length === 0
          ? <EmptyState icon={Key} title="No credential leaks found" description="Your credentials have not appeared in known breach databases" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Email","Breach","Severity","Leaked Passwords","Status","Remediation"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaks.slice(0, 50).map((l, i) => (
                    <tr key={l.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3 text-xs font-mono text-white">{l.target_email || "—"}</td>
                      <td className="px-4 py-3 text-xs text-white">{l.breach_name || "—"}</td>
                      <td className="px-4 py-3"><SevBadge sev={l.severity} /></td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: l.leaked_passwords > 0 ? DANGER : MUTED }}>{l.leaked_passwords ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: MUTED }}>{l.remediation || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* Breach Records */}
      {breaches.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="font-bold text-white flex items-center gap-2"><Database className="w-4 h-4" style={{ color: HIGH }} />Data Breaches</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["Breach","Organization","Records","Attack Vector","Severity","Date"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {breaches.slice(0, 30).map((b, i) => (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <td className="px-4 py-3 text-xs text-white font-bold">{b.breach_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-white">{b.organization || "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: DANGER }}>{b.records_compromised?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: MUTED }}>{(b.attack_vector || "—").replace(/_/g," ")}</td>
                    <td className="px-4 py-3"><SevBadge sev={b.severity} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{timeAgo(b.breach_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}