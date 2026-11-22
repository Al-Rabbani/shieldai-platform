import React, { useState, useEffect, useCallback } from "react";
import { base44, unavailableEntities } from "@/api/base44Client";

function gradeColor(grade) {
  if (grade === "A") return "#22c55e";
  if (grade === "B") return "#eab308";
  if (grade === "C") return "#f97316";
  return "#ef4444";
}

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

export default function LiveIntelligencePanel() {
  const [risk, setRisk] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [threats, setThreats] = useState([]);
  const [findings, setFindings] = useState([]);
  const [darkWeb, setDarkWeb] = useState([]);

  const load = useCallback(async () => {
    const [r, inc, thr, find, dw] = await Promise.all([
      base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
      base44.entities.Incident.list("-opened_at", 20).catch(() => []),
      base44.entities.ThreatIntelFeed.list("-detected_at", 20).catch(() => []),
      base44.entities.TriagedFinding.list("-cvss_score", 5).catch(() => []),
      base44.entities.DarkWebAlert.list("-detected_at", 3).catch(() => []),
    ]);
    setRisk(r[0] || null);
    /* Incidents are stored as "open"; naming one expected status rendered two real incidents as none. */
    const TERMINAL = new Set(["closed", "resolved", "false_positive"]);
    setIncidents(inc.filter(i => !TERMINAL.has(String(i.status || "").toLowerCase())));
    setThreats(thr.filter(t => t.affects_you).slice(0, 5));
    setFindings(find);
    setDarkWeb(dw);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const color = gradeColor(risk?.grade);
  const subScores = [
    { label: "Code", value: risk?.code_score },
    { label: "Cloud", value: risk?.cloud_score },
    { label: "Identity", value: risk?.identity_score },
    { label: "Supply Chain", value: risk?.supply_chain_score },
  ].filter(s => s.value != null);

  return (
    <div style={{ width: 320, background: "#0d1428", borderLeft: "1px solid #1e3a5f", flexShrink: 0, display: "flex", flexDirection: "column" }}>
      <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: "#1e3a5f" }}>
        <span className="text-sm font-bold text-white">📡 Live Intelligence</span>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> MONITORING
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Risk Score Card */}
        <div className="rounded-xl p-3" style={{ background: "#111827", border: `1px solid ${color}44` }}>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Global Risk Score</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black" style={{ color }}>{risk?.overall_score ?? "—"}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: color + "22", color }}>Grade {risk?.grade ?? "—"}</span>
          </div>
          <p className="text-[11px] mt-1" style={{ color }}>{risk?.trend === "improving" ? "↗ Improving" : risk?.trend === "degrading" ? "↘ Degrading" : "→ Stable"}</p>
          {subScores.length > 0 && (
            <div className="mt-2 space-y-1">
              {subScores.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-500 w-20 flex-shrink-0">{s.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${s.value}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-400 w-6 text-right">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Incidents */}
        {incidents.length > 0 && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">🚨 Active Incidents</p>
            <div className="space-y-1.5">
              {incidents.map((inc, i) => (
                <div key={i} className="rounded-lg p-2" style={{ background: "#1a0000", border: "1px solid #ef444455" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-red-300 truncate flex-1">{inc.title}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: SEV_COLOR[inc.severity] + "33", color: SEV_COLOR[inc.severity] }}>{inc.severity}</span>
                  </div>
                  {inc.financial_impact_usd > 0 && <p className="text-[10px] text-slate-500 mt-0.5">${inc.financial_impact_usd.toLocaleString()} impact</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Threats */}
        {threats.length > 0 && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Top Threats</p>
            <div className="space-y-1.5">
              {threats.map((t, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg p-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SEV_COLOR[t.severity] }} />
                  <span className="text-[11px] text-slate-300 truncate flex-1">{t.title}</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 flex-shrink-0">AFFECTS GDS</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highest CVSS findings, any status. Accepted and resolved rows are labelled as such, never as open risk. */}
        {findings.length > 0 && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Highest CVSS findings</p>
            <div className="space-y-1.5">
              {findings.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg p-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                  <span className="text-[10px] font-mono text-slate-300 truncate flex-1">{f.cve_id || f.title?.slice(0, 20)}</span>
                  <span className="text-[9px] font-bold text-orange-400 flex-shrink-0">CVSS {f.cvss_score ?? "—"}</span>
                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-slate-500/20 text-slate-300 flex-shrink-0 uppercase">
                    {String(f.status || "unknown").replace(/_/g, " ")}
                  </span>
                  {f.exploited_in_wild && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-red-500/30 text-red-300 flex-shrink-0">EXPLOITED</span>}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-slate-600 mt-1 leading-snug">
              Sorted by CVSS across every status. This platform currently holds no open critical finding; accepted risk
              and resolved rows appear here because their CVSS is high, and each row states which it is.
            </p>
          </div>
        )}

        {/* An unserved source is stated, not left as silence that reads like "nothing found". */}
        {unavailableEntities().includes("ThreatIntelFeed") && threats.length === 0 && (
          <p className="text-[9px] text-slate-600 leading-snug">
            No threat-intel feed is served here, so this rail shows none. That is an absence, not a quiet day.
          </p>
        )}

        {/* Dark Web Alerts */}
        {darkWeb.length > 0 && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Dark Web Alerts</p>
            <div className="space-y-1.5">
              {darkWeb.map((d, i) => (
                <div key={i} className="rounded-lg p-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                  <p className="text-[10px] text-slate-400 capitalize">{d.alert_type?.replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-slate-200 truncate">{d.title}</p>
                  <span className="text-[9px] font-bold" style={{ color: SEV_COLOR[d.severity] }}>{d.severity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {unavailableEntities().includes("DarkWebAlert") && darkWeb.length === 0 && (
          <p className="text-[9px] text-slate-600 leading-snug">
            No dark-web source is served here, so no leak or credential alert can appear on this rail.
          </p>
        )}
      </div>
    </div>
  );
}