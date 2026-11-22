import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DashboardPage, StatTile, SectionCard, SeverityBadge, StatusBadge, LoadingSpinner, EmptyState, Tag } from "@/components/dashboards/DashboardShared";
import { KeyRound, FileLock, AlertCircle, ShieldCheck } from "lucide-react";

export default function SecretsKeyManagementPage() {
  const [secrets, setSecrets] = useState([]);
  const [certs, setCerts] = useState([]);
  const [leaks, setLeaks] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.SecretReference.list().catch(() => []),
      base44.entities.CertificateRecord.list().catch(() => []),
      base44.entities.SecretLeakageAlert.list("-detected_at", 20).catch(() => []),
      base44.entities.SecretAccessPolicy.list().catch(() => []),
    ]).then(([s, c, l, p]) => {
      setSecrets(s); setCerts(c); setLeaks(l); setPolicies(p); setLoading(false);
    });
  }, []);

  if (loading) return <DashboardPage title="Secrets & Key Management" badge="EDP-016"><LoadingSpinner /></DashboardPage>;

  const certColor = (days) => days < 30 ? "#ef4444" : days < 60 ? "#f59e0b" : "#10b981";

  return (
    <DashboardPage title="Secrets & Key Management" badge="EDP-016" subtitle="Track secret references, certificates, leakage alerts, and access policies">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={KeyRound} label="Secret References" value={secrets.length} sublabel={`${secrets.filter(s => s.rotation_required).length} need rotation`} accent="#3b82f6" />
        <StatTile icon={FileLock} label="Certificates" value={certs.length} sublabel={`${certs.filter(c => c.days_until_expiry < 30).length} expiring`} accent="#f59e0b" />
        <StatTile icon={AlertCircle} label="Leakage Alerts" value={leaks.length} sublabel={`${leaks.filter(l => l.status === "open").length} open`} accent="#ef4444" />
        <StatTile icon={ShieldCheck} label="Access Policies" value={policies.length} sublabel={`${policies.filter(p => p.is_active).length} active`} accent="#10b981" />
      </div>

      <SectionCard title="Secret References">
        {secrets.length === 0 ? <EmptyState message="No secrets registered" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-2 px-3">Name</th><th className="text-left py-2 px-3">Category</th><th className="text-left py-2 px-3">Environment</th><th className="text-left py-2 px-3">Service</th><th className="text-left py-2 px-3">Hint</th><th className="text-left py-2 px-3">Rotation</th><th className="text-left py-2 px-3">Expiry</th><th className="text-left py-2 px-3">Status</th>
              </tr></thead>
              <tbody>
                {secrets.map(s => (
                  <tr key={s.id} className="border-b border-slate-800 hover:bg-blue-500/5">
                    <td className="py-2 px-3 text-white font-medium">{s.name}</td>
                    <td className="py-2 px-3"><Tag>{s.category}</Tag></td>
                    <td className="py-2 px-3 text-slate-400">{s.environment}</td>
                    <td className="py-2 px-3 text-slate-400">{s.service_name}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono">{s.secret_hint || "••••••••"}</td>
                    <td className="py-2 px-3">{s.rotation_required ? <span className="text-amber-400 font-medium">Required</span> : <span className="text-slate-500">No</span>}</td>
                    <td className="py-2 px-3" style={{ color: s.expiry_days < 30 ? "#ef4444" : "#94a3b8" }}>{s.expiry_days != null ? `${s.expiry_days}d` : "—"}</td>
                    <td className="py-2 px-3"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Certificates">
          {certs.length === 0 ? <EmptyState message="No certificates tracked" /> : (
            <div className="space-y-2">
              {certs.map(c => (
                <div key={c.id} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <FileLock size={16} style={{ color: certColor(c.days_until_expiry) }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{c.name}</p>
                    <p className="text-[10px] text-slate-500">Issuer: {c.issuer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: certColor(c.days_until_expiry) }}>{c.days_until_expiry != null ? `${c.days_until_expiry}d` : "—"}</p>
                    <p className="text-[9px] text-slate-600">until expiry</p>
                  </div>
                  {c.auto_renew && <Tag>Auto-renew</Tag>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Leakage Alerts">
          {leaks.length === 0 ? <EmptyState message="No leakage alerts" /> : (
            <div className="space-y-2">
              {leaks.map(l => (
                <div key={l.id} className="rounded-lg p-3 flex items-start gap-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <SeverityBadge severity={l.severity} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{l.detected_pattern}</p>
                    <p className="text-[10px] text-slate-500">Source: {l.source} · {l.match_count} matches</p>
                    <p className="text-[10px] text-slate-600">{l.detected_at ? new Date(l.detected_at).toLocaleString() : ""}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Access Policies">
        {policies.length === 0 ? <EmptyState message="No access policies configured" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {policies.map(p => (
              <div key={p.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <p className="text-sm font-semibold text-white flex-1">{p.policy_name}</p>
                  <span className={`w-2 h-2 rounded-full ${p.is_active ? "bg-emerald-500" : "bg-slate-600"}`} />
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(p.allowed_actors || []).map((a, i) => <Tag key={i}>{a}</Tag>)}
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                  <span>MFA: {p.require_mfa ? "✓" : "✗"}</span>
                  <span>Max/hr: {p.max_resolutions_per_hour}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </DashboardPage>
  );
}