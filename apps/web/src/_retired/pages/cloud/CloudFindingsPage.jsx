import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Copy, Check, ChevronDown } from "lucide-react";
import ProviderBadge from "@/components/cloud/ProviderBadge";
import CloudFindingDrawer from "@/components/cloud/CloudFindingDrawer";

const SEV_STYLE = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.3)" },
  low:      { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" },
};

const STATUS_COLORS = {
  open:       { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  in_review:  { color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  fixed:      { color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  suppressed: { color: "#475569", bg: "rgba(71,85,105,0.1)" },
};

function SevBadge({ sev }) {
  const s = SEV_STYLE[sev] || SEV_STYLE.low;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono"
    style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>{sev}</span>;
}

function CopyResource({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = e => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="text-xs text-slate-400 font-mono truncate max-w-[160px]">{text}</span>
      <button onClick={copy} className="text-slate-600 hover:text-slate-300 flex-shrink-0 transition-colors">
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="pl-3 pr-8 py-2 rounded-lg text-xs text-slate-300 outline-none appearance-none cursor-pointer font-mono"
        style={{ background: "#161b22", border: "1px solid rgba(30,58,95,0.5)" }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
    </div>
  );
}

export default function CloudFindingsPage() {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("");
  const [provFilter, setProvFilter] = useState("");
  const [svcFilter, setSvcFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: findings = [] } = useQuery({
    queryKey: ["cloud-findings"],
    queryFn: () => base44.entities.CloudFinding.list("-detected_at", 500),
    initialData: [],
  });

  const services = useMemo(() => [...new Set(findings.map(f => f.service).filter(Boolean))].sort(), [findings]);
  const providers = ["aws", "gcp", "azure"];

  const filtered = useMemo(() => findings.filter(f => {
    if (sevFilter && f.severity !== sevFilter) return false;
    if (provFilter && f.provider !== provFilter) return false;
    if (svcFilter && f.service !== svcFilter) return false;
    if (statusFilter && f.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return f.title?.toLowerCase().includes(q) || f.resource?.toLowerCase().includes(q) || f.cis_control?.toLowerCase().includes(q);
    }
    return true;
  }), [findings, sevFilter, provFilter, svcFilter, statusFilter, search]);

  // Canonical: 31 cloud findings, 3 critical
  const CANONICAL_CLOUD = {
    total: 31,
    critical: 3,
    high: 8,
    medium: 14,
    low: 6,
    accounts: {
      "ShieldAI Production (eu-west-1)": { findings: 8, critical: 2 },
      "aws-production": { findings: 7, critical: 1 },
      "Production Azure": { findings: 12, critical: 0 },
      "Production GCP": { findings: 4, critical: 0 },
    },
    realFindings: [
      { title: "S3 public bucket (corp-prod-backups)", severity: "critical", resource: "arn:aws:s3:::corp-prod-backups", provider: "aws", service: "S3" },
      { title: "Azure Blob public access", severity: "critical", resource: "storageaccountprod.blob.core.windows.net", provider: "azure", service: "Storage" },
      { title: "Hardcoded AWS credentials in Lambda", severity: "critical", resource: "arn:aws:lambda:eu-west-1:123456789:function:data-pipeline", provider: "aws", service: "Lambda" },
    ],
  };
  
  const counts = { critical: CANONICAL_CLOUD.critical, high: CANONICAL_CLOUD.high, total: CANONICAL_CLOUD.total };

  return (
    <div className="space-y-5">
      {selected && <CloudFindingDrawer finding={selected} onClose={() => setSelected(null)} onUpdate={() => { qc.invalidateQueries({queryKey:["cloud-findings"]}); setSelected(null); }} />}

      {/* Header — Canonical: 31 cloud findings, 3 critical, 4 accounts */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cloud Findings</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">31 findings across 4 accounts · 3 critical · All timestamps: June 9-16, 2026</p>
        </div>
      </div>

      {/* Account breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { name: "ShieldAI Production", region: "eu-west-1", findings: 8, critical: 2, provider: "aws" },
          { name: "aws-production", region: "us-east-1", findings: 7, critical: 1, provider: "aws" },
          { name: "Production Azure", region: "West Europe", findings: 12, critical: 0, provider: "azure" },
          { name: "Production GCP", region: "us-central1", findings: 4, critical: 0, provider: "gcp" },
        ].map(acc => (
          <div key={acc.name} className="rounded-xl p-4" style={{ background: "#0d1117", border: "1px solid rgba(30,58,95,0.4)" }}>
            <div className="text-xs font-semibold text-white mb-1">{acc.name}</div>
            <div className="text-[10px] text-slate-500 mb-2">{acc.region}</div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{acc.findings} findings</span>
              {acc.critical > 0 && <span className="text-red-400 font-bold">{acc.critical} critical</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap p-4 rounded-xl" style={{ background: "#0d1117", border: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search findings, resources, CIS…"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs text-slate-300 placeholder-slate-600 outline-none"
            style={{ background: "#161b22", border: "1px solid rgba(30,58,95,0.5)" }} />
        </div>
        <FilterSelect value={sevFilter} onChange={setSevFilter} options={["critical","high","medium","low"]} placeholder="Severity" />
        <FilterSelect value={provFilter} onChange={setProvFilter} options={providers} placeholder="Provider" />
        <FilterSelect value={svcFilter} onChange={setSvcFilter} options={services} placeholder="Service" />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} options={["open","in_review","fixed","suppressed"]} placeholder="Status" />
        {(sevFilter||provFilter||svcFilter||statusFilter||search) && (
          <button onClick={() => { setSevFilter(""); setProvFilter(""); setSvcFilter(""); setStatusFilter(""); setSearch(""); }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0d1117", border: "1px solid rgba(30,58,95,0.4)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(30,58,95,0.4)", background: "#161b22" }}>
              {["Severity","Provider","Service","Finding","CIS Control","Resource","Status","Detected"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f, i) => {
              const sc = STATUS_COLORS[f.status] || STATUS_COLORS.open;
              return (
                <tr key={f.id} onClick={() => setSelected(f)} className="cursor-pointer transition-all hover:bg-white/3"
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(30,58,95,0.2)" : "none" }}>
                  <td className="px-4 py-3"><SevBadge sev={f.severity} /></td>
                  <td className="px-4 py-3"><ProviderBadge provider={f.provider} /></td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-400 font-mono">{f.service || "—"}</span></td>
                  <td className="px-4 py-3 max-w-xs"><span className="text-xs text-white line-clamp-2">{f.title}</span></td>
                  <td className="px-4 py-3"><span className="text-[10px] text-blue-400 font-mono">{f.cis_control || "—"}</span></td>
                  <td className="px-4 py-3">{f.resource ? <CopyResource text={f.resource} /> : <span className="text-xs text-slate-600">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded capitalize"
                      style={{ color: sc.color, background: sc.bg }}>{f.status?.replace("_"," ")}</span>
                  </td>
                  <td className="px-4 py-3"><span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">{f.detected_at ? new Date(f.detected_at).toLocaleDateString() : "—"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500">No findings match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}