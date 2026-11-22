import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Filter, Info } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SEV_COLOR, SevBadge, StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, PAGE_BG
} from "@/components/gds/GDSOSShared";
import FindingsBulkTable from "@/components/gds/FindingsBulkTable";

// ─── Constants ────────────────────────────────────────────────────────────────
const CRITICALITY_LEVELS = ["critical", "high", "medium", "low"];
const SEVERITY_LEVELS    = ["critical", "high", "medium", "low"];

const SEV_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

// Cell risk = combination of asset criticality + vuln severity
const RISK_MATRIX = {
  "critical-critical": { label: "Extreme",  color: "#ff1a1a", bg: "rgba(255,26,26,0.18)"  },
  "critical-high":     { label: "Critical", color: DANGER,    bg: "rgba(255,59,59,0.14)"  },
  "critical-medium":   { label: "High",     color: HIGH,      bg: "rgba(255,140,0,0.14)"  },
  "critical-low":      { label: "Elevated", color: MEDIUM,    bg: "rgba(255,215,0,0.12)"  },
  "high-critical":     { label: "Critical", color: DANGER,    bg: "rgba(255,59,59,0.14)"  },
  "high-high":         { label: "High",     color: HIGH,      bg: "rgba(255,140,0,0.14)"  },
  "high-medium":       { label: "Elevated", color: MEDIUM,    bg: "rgba(255,215,0,0.12)"  },
  "high-low":          { label: "Moderate", color: "#60a5fa", bg: "rgba(96,165,250,0.10)" },
  "medium-critical":   { label: "High",     color: HIGH,      bg: "rgba(255,140,0,0.14)"  },
  "medium-high":       { label: "Elevated", color: MEDIUM,    bg: "rgba(255,215,0,0.12)"  },
  "medium-medium":     { label: "Moderate", color: "#60a5fa", bg: "rgba(96,165,250,0.10)" },
  "medium-low":        { label: "Low",      color: LOW,       bg: "rgba(0,255,136,0.08)"  },
  "low-critical":      { label: "Elevated", color: MEDIUM,    bg: "rgba(255,215,0,0.12)"  },
  "low-high":          { label: "Moderate", color: "#60a5fa", bg: "rgba(96,165,250,0.10)" },
  "low-medium":        { label: "Low",      color: LOW,       bg: "rgba(0,255,136,0.08)"  },
  "low-low":           { label: "Minimal",  color: MUTED,     bg: "rgba(100,116,139,0.08)"},
};

function riskKey(criticality, severity) {
  return `${criticality}-${severity}`;
}

// Infer asset criticality from a finding
function inferCriticality(f) {
  if (f.asset_criticality) return f.asset_criticality.toLowerCase();
  // Fallback: infer from asset name keywords
  const name = (f.asset_name || "").toLowerCase();
  if (name.includes("prod") || name.includes("payment") || name.includes("auth") || name.includes("db") || name.includes("database")) return "critical";
  if (name.includes("stag") || name.includes("api") || name.includes("gateway")) return "high";
  if (name.includes("dev") || name.includes("test")) return "low";
  return "medium";
}

// ─── Heatmap Cell ─────────────────────────────────────────────────────────────
function HeatCell({ criticality, severity, count, selected, onClick }) {
  const key = riskKey(criticality, severity);
  const risk = RISK_MATRIX[key] || { label: "—", color: MUTED, bg: "transparent" };
  const isEmpty = count === 0;
  return (
    <button
      onClick={() => !isEmpty && onClick(criticality, severity)}
      disabled={isEmpty}
      className="relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 aspect-square"
      style={{
        background: selected ? `${risk.color}30` : isEmpty ? "rgba(255,255,255,0.02)" : risk.bg,
        border: selected ? `2px solid ${risk.color}` : `1px solid ${isEmpty ? BORDER + "40" : risk.color + "40"}`,
        boxShadow: selected ? `0 0 16px ${risk.color}44` : "none",
        cursor: isEmpty ? "default" : "pointer",
        minHeight: 64,
      }}>
      {!isEmpty && (
        <>
          <span className="text-xl font-black font-mono leading-none" style={{ color: risk.color }}>{count}</span>
          <span className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: risk.color + "cc" }}>{risk.label}</span>
        </>
      )}
      {isEmpty && <span className="text-[10px]" style={{ color: MUTED + "55" }}>—</span>}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GDSRiskHeatmapPage() {
  const qc = useQueryClient();
  const [activeCell, setActiveCell] = useState(null); // { criticality, severity }
  const [sevFilter, setSevFilter] = useState("all");
  const [cloudFilter, setCloudFilter] = useState("all");
  const [assetClassFilter, setAssetClassFilter] = useState("all");

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["heatmap-findings"],
    queryFn: () => base44.entities.TriagedFinding.filter({}).catch(() => []),
  });
  const { data: cloudFindings = [] } = useQuery({
    queryKey: ["heatmap-cloud"],
    queryFn: () => base44.entities.CloudFinding.list("-detected_at", 200).catch(() => []),
  });

  // Derive available cloud providers and asset classes from data
  const cloudProviders = useMemo(() => {
    const providers = new Set();
    [...findings, ...cloudFindings].forEach(f => {
      const p = f.cloud_provider || f.provider || "";
      if (p) providers.add(p.toLowerCase());
    });
    return ["all", ...Array.from(providers).sort()];
  }, [findings, cloudFindings]);

  const assetClasses = useMemo(() => {
    const classes = new Set();
    [...findings, ...cloudFindings].forEach(f => {
      const c = f.asset_type || f.resource_type || f.asset_class || "";
      if (c) classes.add(c.toLowerCase());
    });
    return ["all", ...Array.from(classes).sort()];
  }, [findings, cloudFindings]);

  // Normalise all open findings into a unified list with criticality
  const allOpen = useMemo(() => {
    const tf = findings.filter(f => f.status === "open").map(f => ({
      ...f,
      _sev: (f.normalized_severity || f.severity || "low").toLowerCase(),
      _crit: inferCriticality(f),
      _source: "TriagedFinding",
      _provider: (f.cloud_provider || f.provider || "").toLowerCase(),
      _assetClass: (f.asset_type || f.resource_type || f.asset_class || "").toLowerCase(),
    }));
    const cf = cloudFindings.filter(f => f.status === "open").map(f => ({
      ...f,
      _sev: (f.severity || "low").toLowerCase(),
      _crit: inferCriticality(f),
      _source: "CloudFinding",
      _provider: (f.cloud_provider || f.provider || "").toLowerCase(),
      _assetClass: (f.asset_type || f.resource_type || f.asset_class || "").toLowerCase(),
    }));
    return [...tf, ...cf];
  }, [findings, cloudFindings]);

  // Count per cell
  const matrix = useMemo(() => {
    const m = {};
    CRITICALITY_LEVELS.forEach(c => {
      SEVERITY_LEVELS.forEach(s => { m[riskKey(c, s)] = 0; });
    });
    allOpen.forEach(f => {
      const k = riskKey(f._crit, f._sev);
      if (m[k] !== undefined) m[k]++;
    });
    return m;
  }, [allOpen]);

  // Apply all filters
  const filteredOpen = useMemo(() => {
    return allOpen.filter(f => {
      if (cloudFilter !== "all" && f._provider !== cloudFilter) return false;
      if (assetClassFilter !== "all" && f._assetClass !== assetClassFilter) return false;
      return true;
    });
  }, [allOpen, cloudFilter, assetClassFilter]);

  // Filtered table findings
  const tablefindings = useMemo(() => {
    let list = activeCell
      ? filteredOpen.filter(f => f._crit === activeCell.criticality && f._sev === activeCell.severity)
      : filteredOpen;
    if (sevFilter !== "all") list = list.filter(f => f._sev === sevFilter);
    return list;
  }, [filteredOpen, activeCell, sevFilter]);

  // Matrix based on filtered data
  const filteredMatrix = useMemo(() => {
    const m = {};
    CRITICALITY_LEVELS.forEach(c => SEVERITY_LEVELS.forEach(s => { m[`${c}-${s}`] = 0; }));
    filteredOpen.forEach(f => { const k = `${f._crit}-${f._sev}`; if (m[k] !== undefined) m[k]++; });
    return m;
  }, [filteredOpen]);

  const totalOpen = filteredOpen.length;
  const extremeCount = filteredMatrix["critical-critical"] || 0;
  const criticalCount = (filteredMatrix["critical-high"] || 0) + (filteredMatrix["high-critical"] || 0);
  const activeFiltersCount = [cloudFilter !== "all", assetClassFilter !== "all"].filter(Boolean).length;

  const handleCellClick = (criticality, severity) => {
    setActiveCell(prev =>
      prev?.criticality === criticality && prev?.severity === severity ? null : { criticality, severity }
    );
  };

  const activeCellRisk = activeCell ? RISK_MATRIX[riskKey(activeCell.criticality, activeCell.severity)] : null;

  const tableColumns = [
    { key: "title",      label: "Finding",   render: f => <span className="text-xs font-semibold text-white truncate max-w-xs block">{f.title || "Untitled"}</span> },
    { key: "_sev",       label: "Severity",  render: f => <SevBadge sev={f._sev} /> },
    { key: "_crit",      label: "Asset Crit",render: f => <SevBadge sev={f._crit} /> },
    { key: "asset_name", label: "Asset",     render: f => <span className="text-xs font-mono truncate max-w-[140px] block" style={{ color: MUTED }}>{f.asset_name || "—"}</span> },
    { key: "cve_id",     label: "CVE",       render: f => <span className="text-xs font-mono" style={{ color: f.cve_id ? HIGH : MUTED }}>{f.cve_id || "—"}</span> },
    { key: "status",     label: "Status",    render: f => <StatusBadge status={f.status} /> },
  ];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Risk Heatmap" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Risk Heatmap</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Asset criticality × vulnerability severity — click any cell to drill into findings</p>
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="px-3 py-1.5 rounded-xl font-bold" style={{ background: `${DANGER}15`, color: DANGER, border: `1px solid ${DANGER}30` }}>
            {extremeCount} Extreme
          </span>
          <span className="px-3 py-1.5 rounded-xl font-bold" style={{ background: `${HIGH}15`, color: HIGH, border: `1px solid ${HIGH}30` }}>
            {criticalCount} Critical
          </span>
          <span className="px-3 py-1.5 rounded-xl font-bold" style={{ background: `${CYAN}10`, color: CYAN, border: `1px solid ${CYAN}30` }}>
            {totalOpen} Total Open
          </span>
        </div>
      </div>

      {/* Heatmap grid */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <h3 className="text-sm font-bold text-white">Asset Criticality × Vulnerability Severity</h3>
          <div className="relative group">
            <Info className="w-3.5 h-3.5 cursor-help" style={{ color: MUTED }} />
            <div className="absolute left-6 top-0 w-56 text-[10px] rounded-xl p-3 z-10 hidden group-hover:block"
              style={{ background: "#0a1628", border: `1px solid ${BORDER}`, color: MUTED }}>
              Asset criticality is derived from asset tags and naming conventions. Rows = asset criticality, Columns = vulnerability severity.
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: 400 }}>
            {/* Column headers — severity */}
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "100px repeat(4, 1fr)" }}>
              <div className="text-[10px] font-bold uppercase tracking-widest flex items-end pb-1" style={{ color: MUTED }}>
                <span>Asset Crit ↓<br/>Vuln Sev →</span>
              </div>
              {SEVERITY_LEVELS.map(s => (
                <div key={s} className="text-center text-[10px] font-black uppercase tracking-widest pb-1"
                  style={{ color: SEV_COLOR[s] }}>{SEV_LABEL[s]}</div>
              ))}
            </div>

            {/* Rows — criticality */}
            {CRITICALITY_LEVELS.map(crit => (
              <div key={crit} className="grid gap-2 mb-2" style={{ gridTemplateColumns: "100px repeat(4, 1fr)" }}>
                <div className="flex items-center text-[11px] font-black uppercase tracking-wider pr-2"
                  style={{ color: SEV_COLOR[crit] }}>
                  {SEV_LABEL[crit]}
                </div>
                {SEVERITY_LEVELS.map(sev => (
                 <HeatCell
                   key={sev}
                   criticality={crit}
                   severity={sev}
                   count={filteredMatrix[riskKey(crit, sev)] || 0}
                   selected={activeCell?.criticality === crit && activeCell?.severity === sev}
                   onClick={handleCellClick}
                 />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t" style={{ borderColor: BORDER }}>
          {[["#ff1a1a","Extreme"],["#ff3b3b","Critical"],["#ff8c00","High"],["#ffd700","Elevated"],["#60a5fa","Moderate"],[LOW,"Low"],[MUTED,"Minimal"]].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5 text-[10px]">
              <span className="w-3 h-3 rounded-sm" style={{ background: c + "40", border: `1px solid ${c}` }} />
              <span style={{ color: MUTED }}>{l}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* Active cell info banner */}
      {activeCell && activeCellRisk && (
        <div className="flex items-center gap-3 p-4 rounded-2xl"
          style={{ background: activeCellRisk.bg, border: `1px solid ${activeCellRisk.color}50` }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: activeCellRisk.color }} />
          <p className="text-sm font-bold" style={{ color: activeCellRisk.color }}>
            {activeCellRisk.label} Risk —
          </p>
          <p className="text-sm" style={{ color: TEXT }}>
            <strong>{SEV_LABEL[activeCell.criticality]}</strong> criticality assets with
            <strong> {SEV_LABEL[activeCell.severity]}</strong> severity vulnerabilities
            · <strong>{matrix[riskKey(activeCell.criticality, activeCell.severity)]}</strong> findings
          </p>
          <button onClick={() => setActiveCell(null)} className="ml-auto text-xs hover:opacity-80 font-bold" style={{ color: MUTED }}>
            Clear ×
          </button>
        </div>
      )}

      {/* Advanced Filter Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: MUTED }}>
            <Filter className="w-3.5 h-3.5" /> Advanced Filters
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full font-black text-[10px]" style={{ background: `${CYAN}20`, color: CYAN }}>{activeFiltersCount} active</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: MUTED }}>Cloud Provider:</span>
            <select value={cloudFilter} onChange={e => setCloudFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs outline-none capitalize"
              style={{ background: "#050e1f", border: `1px solid ${cloudFilter !== "all" ? CYAN : BORDER}`, color: cloudFilter !== "all" ? CYAN : MUTED }}>
              {cloudProviders.map(p => <option key={p} value={p}>{p === "all" ? "All Providers" : p.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: MUTED }}>Asset Class:</span>
            <select value={assetClassFilter} onChange={e => setAssetClassFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs outline-none capitalize"
              style={{ background: "#050e1f", border: `1px solid ${assetClassFilter !== "all" ? CYAN : BORDER}`, color: assetClassFilter !== "all" ? CYAN : MUTED }}>
              {assetClasses.map(c => <option key={c} value={c}>{c === "all" ? "All Asset Classes" : c}</option>)}
            </select>
          </div>
          {activeFiltersCount > 0 && (
            <button onClick={() => { setCloudFilter("all"); setAssetClassFilter("all"); }}
              className="text-xs px-3 py-1.5 rounded-xl font-semibold"
              style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30`, color: DANGER }}>
              Clear Filters ×
            </button>
          )}
          <span className="ml-auto text-xs font-bold" style={{ color: MUTED }}>{totalOpen} findings shown</span>
        </div>
      </Card>

      {/* Findings table with bulk actions */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-5 border-b" style={{ borderColor: BORDER }}>
          <div>
            <h3 className="text-sm font-bold text-white">
              {activeCell
                ? `Findings — ${SEV_LABEL[activeCell.criticality]} Assets / ${SEV_LABEL[activeCell.severity]} Severity`
                : "All Open Findings"}
            </h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
              Select rows to bulk update status — Resolve or Accept Risk
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs outline-none"
              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: MUTED }}>
              <option value="all">All Severities</option>
              {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{SEV_LABEL[s]}</option>)}
            </select>
          </div>
        </div>
        <div className="p-4">
          <FindingsBulkTable
            findings={tablefindings}
            isLoading={isLoading}
            queryKey="heatmap-findings"
            entityName="TriagedFinding"
            columns={tableColumns}
            emptyTitle={activeCell ? "No findings in this risk cell" : "No open findings"}
          />
        </div>
      </Card>
    </div>
  );
}