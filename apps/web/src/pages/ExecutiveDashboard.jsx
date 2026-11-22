import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Shield, ShieldAlert, Flame, CheckCircle, Loader2 } from "lucide-react";

const GOLD = "#C9A84C";
const SEVERITY_COLOUR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e", info: "#06b6d4" };

/**
 * Executive view, rebuilt on measured data.
 *
 * The page this replaces carried nineteen hardcoded "canonical" metrics (3,891 assets protected, 2,847
 * threats blocked in 24 hours, 97.1% SOC automation, $4.2M financial risk, 4.2 minute MTTD), a
 * thirty-day risk trend generated from a sine wave plus random jitter, four compliance scores labelled
 * canonical, and a "recent activity" feed of events that never happened, including a breach of
 * CVE-2024-1234. All of it rendered beside real queries for findings, assets and compliance that the
 * page fetched and then ignored.
 *
 * This version shows the four things the platform can actually evidence: open findings by severity,
 * how many are on the CISA KEV list, the real compliance framework scores, and findings detected per
 * day. Anything the platform does not measure is absent and named as absent at the foot of the page,
 * because a placeholder zero in an executive view is read as a measured zero.
 */

function Kpi({ label, value, note, colour, Icon, loading }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: colour + "33" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color: colour }} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-black text-white">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: colour }} /> : value}
      </div>
      {note && <div className="text-[10px] text-slate-500 mt-1">{note}</div>}
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-500 mb-3">{subtitle}</p>}
      {children}
    </div>
  );
}

const countBy = (rows, key, value) =>
  rows.filter((r) => String(r[key] || "").toLowerCase() === value).length;

export default function ExecutiveDashboard() {
  const { data: findings = [], isLoading: lF } = useQuery({
    queryKey: ["exec-findings"],
    queryFn: () => base44.entities.TriagedFinding.filter({ status: "open" }).catch(() => []),
  });
  const { data: assets = [], isLoading: lA } = useQuery({
    queryKey: ["exec-assets"],
    queryFn: () => base44.entities.ASPMAsset.list().catch(() => []),
  });
  const { data: compliance = [], isLoading: lC } = useQuery({
    queryKey: ["exec-compliance"],
    queryFn: () => base44.entities.ComplianceFramework.list().catch(() => []),
  });

  const open = Array.isArray(findings) ? findings : [];
  const critical = countBy(open, "normalized_severity", "critical");
  const high = countBy(open, "normalized_severity", "high");
  const kev = open.filter((f) => f.exploited_in_wild === true).length;
  const slaBreached = open.filter((f) => f.sla_breached === true).length;

  const severitySeries = ["critical", "high", "medium", "low", "info"]
    .map((sev) => ({ severity: sev, count: countBy(open, "normalized_severity", sev) }))
    .filter((row) => row.count > 0);

  const complianceRows = (Array.isArray(compliance) ? compliance : [])
    .map((f) => ({
      name: f.name || f.framework || "unnamed",
      score: Number.isFinite(Number(f.score)) ? Math.round(Number(f.score)) : null,
    }))
    .filter((row) => row.score !== null);

  const complianceAverage = complianceRows.length
    ? Math.round(complianceRows.reduce((sum, r) => sum + r.score, 0) / complianceRows.length)
    : null;

  const trend = Object.entries(
    open.reduce((acc, f) => {
      const raw = f.first_detected || f.detected_at || f.created_at;
      if (!raw) return acc;
      const day = String(raw).slice(0, 10);
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-30);

  const worst = [...open]
    .filter((f) => ["critical", "high"].includes(String(f.normalized_severity || "").toLowerCase()))
    .sort((a, b) => Number(b.cvss_score || 0) - Number(a.cvss_score || 0))
    .slice(0, 5);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Shield className="w-3.5 h-3.5" /><span>Dashboards</span><span>/</span>
          <span style={{ color: GOLD }}>Executive Dashboard</span>
        </div>
        <h1 className="text-2xl font-black text-white">Executive Dashboard</h1>
        <p className="text-slate-400 text-sm">
          Every figure below is counted from this tenant&apos;s own records on this page load.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Open findings" value={open.length.toLocaleString()} note="status open" colour="#6366f1" Icon={Shield} loading={lF} />
        <Kpi label="Critical" value={critical.toLocaleString()} note="open, severity critical" colour="#ef4444" Icon={Flame} loading={lF} />
        <Kpi label="High" value={high.toLocaleString()} note="open, severity high" colour="#f97316" Icon={ShieldAlert} loading={lF} />
        <Kpi label="On the KEV list" value={kev.toLocaleString()} note="known exploited" colour="#a855f7" Icon={ShieldAlert} loading={lF} />
        <Kpi
          label="Compliance average"
          value={complianceAverage === null ? "—" : `${complianceAverage}%`}
          note={complianceRows.length ? `across ${complianceRows.length} frameworks` : "no framework carries a score"}
          colour={GOLD}
          Icon={CheckCircle}
          loading={lC}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Open findings by severity" subtitle="Counted from findings whose status is open.">
          {severitySeries.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">No open finding carries a severity.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={severitySeries}>
                <CartesianGrid stroke="#1F2937" vertical={false} />
                <XAxis dataKey="severity" tick={{ fill: "#6B7280", fontSize: 11 }} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: 8, color: "#F9FAFB", fontSize: 11 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {severitySeries.map((row) => (
                    <Cell key={row.severity} fill={SEVERITY_COLOUR[row.severity] || GOLD} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Compliance readiness" subtitle="Each framework's own recorded score.">
          {complianceRows.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">
              No compliance framework has been assessed, so no score exists.
            </p>
          ) : (
            <div className="space-y-3">
              {complianceRows.map((row) => (
                <div key={row.name} className="flex items-center gap-4">
                  <span className="text-xs text-slate-400 w-24 flex-shrink-0 truncate">{row.name}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[#1F2937] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${row.score}%`,
                        background: row.score >= 80 ? "#22c55e" : row.score >= 60 ? "#eab308" : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-white w-9 text-right">{row.score}%</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Open findings detected per day"
        subtitle="Grouped by the day each still-open finding was first seen. Days with nothing detected are absent, not zero."
      >
        {trend.length === 0 ? (
          <p className="text-xs text-slate-500 py-10 text-center">No open finding carries a detection date.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend}>
              <CartesianGrid stroke="#1F2937" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#6B7280", fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: 8, color: "#F9FAFB", fontSize: 11 }} />
              <Line type="monotone" dataKey="count" stroke={GOLD} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title="Worst open findings" subtitle="Highest CVSS among open critical and high findings.">
        {worst.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">No open critical or high finding is recorded.</p>
        ) : (
          <div className="space-y-2">
            {worst.map((f) => (
              <div key={f.id} className="flex items-center gap-3 text-xs py-1.5 border-b" style={{ borderColor: "#1F2937" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SEVERITY_COLOUR[String(f.normalized_severity || "").toLowerCase()] || GOLD }} />
                <span className="text-white flex-1 truncate">{f.title || "untitled"}</span>
                <span className="text-slate-500 w-32 truncate">{f.asset_name || "—"}</span>
                <span className="text-slate-400 w-14 text-right">{f.cve_id || "no CVE"}</span>
                <span className="font-bold w-10 text-right" style={{ color: GOLD }}>{f.cvss_score ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
        <h3 className="text-sm font-bold text-white mb-2">Deliberately not shown</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The previous version reported threats blocked in 24 hours, SOC automation rate, financial risk
          exposure, mean time to detect and mean time to repair, plus a 30-day risk score trend and a
          live activity feed. This platform measures none of those, so they are absent rather than
          estimated. Two further figures are genuinely available but not counted here because the
          current queries do not return them: {slaBreached} open findings carry an SLA breach flag, and{" "}
          {Array.isArray(assets) ? assets.length : 0} assets are registered{lA ? " (still loading)" : ""}.
        </p>
      </div>
    </div>
  );
}
