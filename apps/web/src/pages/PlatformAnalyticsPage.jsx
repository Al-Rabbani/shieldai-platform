import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { Activity, ShieldAlert, ShieldCheck, Flame, Server, Loader2 } from "lucide-react";

const GOLD = "#C9A84C";
const SEVERITY_COLOURS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e", info: "#06b6d4" };

/**
 * Platform analytics, rebuilt on measured data.
 *
 * The page this replaces was entirely invented: thirty days of Math.random() scan and finding
 * series, a scanner table with hardcoded run counts, false-positive rates and uptimes, and an
 * integrations list that still advertised Jira (removed from this platform permanently) and GitLab
 * (no credential exists). None of it came from anywhere.
 *
 * What is shown now is derived from security_findings, the authoritative register. What the
 * platform genuinely does not measure is not drawn: there is no false-positive rate, no scanner
 * uptime and no credit ledger, so those panels are gone rather than faked. A chart of zeroes would
 * read as "we looked and found nothing", which is a claim this data cannot support.
 */

function StatCard({ label, value, note, colour, Icon }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: colour + "33" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color: colour }} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
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

export default function PlatformAnalyticsPage() {
  const [findings, setFindings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    base44.entities.TriagedFinding.list("-detected_at", 500)
      .then((rows) => { if (!cancelled) setFindings(Array.isArray(rows) ? rows : []); })
      .catch((err) => { if (!cancelled) setError(err?.message || "Findings could not be read."); });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    if (!findings) return null;
    const open = findings.filter((f) => String(f.status || "").toLowerCase() === "open");
    const bySeverity = ["critical", "high", "medium", "low", "info"].map((sev) => ({
      severity: sev,
      count: findings.filter((f) => String(f.normalized_severity || "").toLowerCase() === sev).length,
    })).filter((row) => row.count > 0);

    const bySource = Object.entries(
      findings.reduce((acc, f) => {
        const key = f.source || f.scanner || "unattributed";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 8);

    const byDay = Object.entries(
      findings.reduce((acc, f) => {
        const raw = f.first_detected || f.detected_at || f.created_at;
        if (!raw) return acc;
        const day = String(raw).slice(0, 10);
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {})
    ).map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)).slice(-30);

    const kev = findings.filter((f) => f.exploited_in_wild === true).length;
    const scored = findings.map((f) => Number(f.cvss_score)).filter((n) => Number.isFinite(n) && n > 0);
    const meanCvss = scored.length ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(2) : null;

    return { total: findings.length, open: open.length, bySeverity, bySource, byDay, kev, meanCvss, scored: scored.length };
  }, [findings]);

  if (error) {
    return (
      <div className="min-h-screen p-6" style={{ background: "#0A0E1A" }}>
        <h1 className="text-2xl font-black text-white mb-2">Platform Analytics</h1>
        <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
        <p className="text-xs text-slate-500 mt-2">Nothing is shown rather than showing a number this platform cannot measure.</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen p-6 flex items-center gap-3" style={{ background: "#0A0E1A" }}>
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />
        <span className="text-sm text-slate-400">Reading findings from the platform…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Activity className="w-3.5 h-3.5" /><span>Platform</span><span>/</span>
          <span style={{ color: GOLD }}>Platform Analytics</span>
        </div>
        <h1 className="text-2xl font-black text-white">Platform Analytics</h1>
        <p className="text-slate-400 text-sm">
          Counted from the {stats.total.toLocaleString()} findings this platform holds. Nothing here is sampled or estimated.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Findings held" value={stats.total.toLocaleString()} note="all statuses" colour="#6366f1" Icon={Server} />
        <StatCard label="Open" value={stats.open.toLocaleString()} note="status open" colour="#f97316" Icon={ShieldAlert} />
        <StatCard label="Critical" value={(stats.bySeverity.find((s) => s.severity === "critical")?.count || 0).toLocaleString()} note="any status" colour="#ef4444" Icon={Flame} />
        <StatCard label="On the KEV list" value={stats.kev.toLocaleString()} note="exploited in the wild" colour="#a855f7" Icon={ShieldAlert} />
        <StatCard
          label="Mean CVSS"
          value={stats.meanCvss ?? "—"}
          note={stats.meanCvss ? `across ${stats.scored.toLocaleString()} scored findings` : "no finding carries a score"}
          colour={GOLD}
          Icon={ShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Findings by severity" subtitle="Every finding the platform holds, whatever its status.">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.bySeverity}>
              <CartesianGrid stroke="#1F2937" vertical={false} />
              <XAxis dataKey="severity" tick={{ fill: "#6B7280", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: 8, color: "#F9FAFB", fontSize: 11 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.bySeverity.map((row) => (
                  <Cell key={row.severity} fill={SEVERITY_COLOURS[row.severity] || GOLD} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Findings by source" subtitle="The scanner that reported each finding.">
          {stats.bySource.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">No finding carries a source.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.bySource} dataKey="count" nameKey="source" outerRadius={80} label={(e) => e.source}>
                  {stats.bySource.map((row, i) => (
                    <Cell key={row.source} fill={["#C9A84C", "#6366f1", "#06b6d4", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#64748b"][i % 8]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: 8, color: "#F9FAFB", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <Panel title="Findings detected per day" subtitle="Grouped by the day each finding was first seen. Days with nothing detected are absent, not zero.">
        {stats.byDay.length === 0 ? (
          <p className="text-xs text-slate-500 py-10 text-center">No finding carries a detection date.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.byDay}>
              <CartesianGrid stroke="#1F2937" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#6B7280", fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: 8, color: "#F9FAFB", fontSize: 11 }} />
              <Line type="monotone" dataKey="count" stroke={GOLD} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
        <h3 className="text-sm font-bold text-white mb-2">Deliberately not shown</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The previous version of this page reported scanner uptime, false-positive rates, runs per day
          and a credit breakdown. This platform measures none of those, so they are absent rather than
          estimated. A zero in their place would be indistinguishable from a measured zero.
        </p>
      </div>
    </div>
  );
}
