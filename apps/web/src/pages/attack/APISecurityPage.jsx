import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Shield, Zap, AlertTriangle, Plus, Search, Play,
  Activity, CheckCircle2, Loader2, Clock, ChevronDown, ChevronUp, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

const STATUS_STYLE = {
  idle:     { color: "#64748b", bg: "rgba(100,116,139,0.1)", label: "IDLE" },
  scanning: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "SCANNING", pulse: true },
  complete: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "COMPLETE" },
  failed:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "FAILED" },
};

const SEV_STYLE = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.25)" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.1)",   border: "rgba(234,179,8,0.25)" },
  low:      { color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.25)" },
};

const VULN_TYPES = [
  "Broken Object Level Authorization",
  "Broken Authentication",
  "Excessive Data Exposure",
  "Lack of Resources & Rate Limiting",
  "Broken Function Level Authorization",
  "Mass Assignment",
  "Security Misconfiguration",
  "Injection",
  "Improper Assets Management",
  "Insufficient Logging & Monitoring",
];

function ScanDetailDrawer({ scan, onClose }) {
  if (!scan) return null;
  const critCount = scan.critical_count || 0;
  const highCount = scan.high_count || 0;
  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="ml-auto w-full max-w-xl h-full overflow-y-auto p-6 space-y-5 animate-slide-in-right"
        style={{ background: "#0d1117", borderLeft: "1px solid rgba(59,130,246,0.2)" }}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-mono">{scan.name || scan.target_url}</h3>
            <p className="text-[11px] text-slate-500 mt-1">{scan.target_url}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            ["Endpoints", scan.endpoint_count || 0],
            ["Spec Type", scan.spec_type?.toUpperCase()],
            ["Auth Method", scan.auth_method || "None"],
            ["Agent", scan.agent_name || "API-SCAN-001"],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">{k}</p>
              <p className="text-xs text-white font-mono">{v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Critical", val: critCount, color: "#ef4444" },
            { label: "High",     val: highCount, color: "#f97316" },
            { label: "Medium",   val: scan.medium_count || 0, color: "#eab308" },
            { label: "Low",      val: scan.low_count || 0, color: "#3b82f6" },
          ].map(({ label, val, color }) => (
            <div key={label} className="p-3 rounded-xl" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-lg font-black font-mono" style={{ color }}>{val}</p>
              <p className="text-[10px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Simulated OWASP findings */}
        {(critCount + highCount > 0) && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-mono mb-3">OWASP API Top 10 Findings</p>
            <div className="space-y-2">
              {VULN_TYPES.slice(0, critCount + highCount).map((vuln, i) => {
                const sev = i < critCount ? "critical" : "high";
                const s = SEV_STYLE[sev];
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#161b22", border: `1px solid ${s.border}` }}>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase flex-shrink-0" style={{ color: s.color, background: s.bg }}>{sev}</span>
                    <p className="text-xs text-slate-300">{vuln}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Link to="/attack/api-fuzzer"
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-center transition-all hover:opacity-90"
            style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)", color: "#06b6d4" }}>
            Run API Fuzzer
          </Link>
          <Link to="/attack/dast"
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-center transition-all hover:opacity-90"
            style={{ background: "#161b22", border: "1px solid #30363d", color: "#94a3b8" }}>
            DAST Scan
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function APISecurityPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ name: "", target_url: "", spec_type: "openapi" });
  const qc = useQueryClient();

  const { data: scans = [], isLoading } = useQuery({
    queryKey: ["api-scans"],
    queryFn: () => base44.entities.APIScan.list("-created_date", 50),
    refetchInterval: 15000,
  });

  const createScan = useMutation({
    mutationFn: () => base44.entities.APIScan.create({
      ...form,
      status: "scanning",
      agent_name: "API-SCAN-001",
      last_scanned: new Date().toISOString(),
      endpoint_count: Math.floor(Math.random() * 40) + 5,
      critical_count: 0, high_count: 0, medium_count: 0, low_count: 0,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["api-scans"] }); setNewOpen(false); setForm({ name: "", target_url: "", spec_type: "openapi" }); },
  });

  const filtered = scans.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.target_url?.includes(search));

  const totalCritical = scans.reduce((s, sc) => s + (sc.critical_count || 0), 0);
  const totalHigh = scans.reduce((s, sc) => s + (sc.high_count || 0), 0);
  const scanning = scans.filter(s => s.status === "scanning").length;
  const complete = scans.filter(s => s.status === "complete").length;

  return (
    <div className="min-h-screen -m-6" style={{ background: "#030712" }}>
      {selected && <ScanDetailDrawer scan={selected} onClose={() => setSelected(null)} />}

      {/* Hero */}
      <div className="relative overflow-hidden px-6 py-10 mb-6"
        style={{ background: "linear-gradient(135deg, #030a1a 0%, #050f1f 50%, #030a1a 100%)", borderBottom: "1px solid rgba(59,130,246,0.15)" }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #06b6d4 0%, transparent 40%)" }} />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] px-2.5 py-1 rounded font-bold font-mono tracking-widest"
              style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa" }}>
              ◈ API SECURITY ENGINE
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">API Security Scanner</h1>
          <p className="text-slate-400 text-sm mb-5">Automated OWASP API Top 10 scanning · OpenAPI / GraphQL / gRPC · Auth bypass detection</p>
          <div className="flex flex-wrap gap-2">
            {["✓ OWASP API Top 10", "✓ Auth Bypass Detection", "✓ Rate Limit Testing", "✓ Schema Validation"].map(t => (
              <span key={t} className="text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#93c5fd" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-10 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Scans",    val: scans.length, color: "#e2e8f0", bg: "rgba(255,255,255,0.04)" },
            { label: "Critical Issues", val: totalCritical, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
            { label: "High Issues",    val: totalHigh, color: "#f97316", bg: "rgba(249,115,22,0.08)" },
            { label: "Active Scans",   val: scanning, color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
          ].map(({ label, val, color, bg }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: bg, border: `1px solid ${color}20` }}>
              <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search APIs..." className="pl-9 text-sm h-9" style={{ background: "#0a0f1e", border: "1px solid #1e293b", color: "#e2e8f0" }} />
          </div>
          <div className="flex gap-2">
            <Link to="/attack/api-fuzzer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", color: "#06b6d4" }}>
              <Zap className="w-3.5 h-3.5" /> API Fuzzer
            </Link>
            <button onClick={() => setNewOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa" }}>
              <Plus className="w-3.5 h-3.5" /> New Scan
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid #1e293b" }}>
          <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #1e293b" }}>
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">API Scans</h3>
            {scanning > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-blue-400" />
                <span className="text-[10px] font-mono text-blue-400">{scanning} scanning</span>
              </div>
            )}
          </div>

          <table className="w-full">
            <thead>
              <tr style={{ background: "#030712", borderBottom: "1px solid #1e293b" }}>
                {["Name / URL", "Spec", "Endpoints", "Critical", "High", "Status", "Last Scanned", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && Array(4).fill(0).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td colSpan={8} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: "#1e293b" }} /></td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-slate-500 text-sm">No API scans yet</p>
                    <button onClick={() => setNewOpen(true)} className="text-blue-400 text-xs mt-2 hover:underline">Add your first API →</button>
                  </td>
                </tr>
              )}
              {filtered.map((sc, i) => {
                const st = STATUS_STYLE[sc.status] || STATUS_STYLE.idle;
                return (
                  <tr key={sc.id} onClick={() => setSelected(sc)}
                    className="cursor-pointer transition-all hover:bg-blue-500/5"
                    style={{ borderBottom: "1px solid #1e293b", borderLeft: `3px solid ${(sc.critical_count || 0) > 0 ? "#ef4444" : "#1e293b"}` }}>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-white truncate max-w-[180px]">{sc.name || "—"}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate max-w-[180px]">{sc.target_url}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
                        style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}>
                        {sc.spec_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">{sc.endpoint_count || 0}</td>
                    <td className="px-4 py-3">
                      {(sc.critical_count || 0) > 0
                        ? <span className="text-sm font-black font-mono text-red-400">{sc.critical_count}</span>
                        : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {(sc.high_count || 0) > 0
                        ? <span className="text-sm font-bold font-mono text-orange-400">{sc.high_count}</span>
                        : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {st.pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: st.color }} />}
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {sc.last_scanned ? formatDistanceToNow(new Date(sc.last_scanned), { addSuffix: true }) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-[10px] px-2 py-1 rounded transition-all hover:text-white"
                        style={{ background: "#161b22", border: "1px solid #30363d", color: "#64748b" }}>
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* OWASP Coverage */}
        <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid #1e293b" }}>
          <h3 className="text-sm font-semibold text-white mb-4">OWASP API Top 10 Coverage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {VULN_TYPES.map((vuln, i) => {
              const checked = complete > 0;
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: "#0d1117", border: "1px solid #1e293b" }}>
                  <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: checked ? "rgba(16,185,129,0.15)" : "#1e293b", border: `1px solid ${checked ? "#10b981" : "#30363d"}` }}>
                    {checked && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <span className="text-[11px] font-mono" style={{ color: checked ? "#94a3b8" : "#475569" }}>
                    API{i + 1}: {vuln}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Scan Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md" style={{ background: "#0d1117", border: "1px solid #1e293b" }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" /> New API Scan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1.5">API Name</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Payment API" style={{ background: "#050810", borderColor: "#1e293b", color: "#e2e8f0" }} />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1.5">Target URL</label>
              <Input value={form.target_url} onChange={e => setForm({ ...form, target_url: e.target.value })} placeholder="https://api.example.com" style={{ background: "#050810", borderColor: "#1e293b", color: "#e2e8f0" }} />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1.5">Spec Type</label>
              <Select value={form.spec_type} onValueChange={v => setForm({ ...form, spec_type: v })}>
                <SelectTrigger style={{ background: "#050810", borderColor: "#1e293b", color: "#e2e8f0" }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: "#111827", borderColor: "#1e293b" }}>
                  {[["openapi","OpenAPI / Swagger"],["graphql","GraphQL"],["grpc","gRPC"],["soap","SOAP"],["rest","REST (Manual)"]].map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-slate-200">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createScan.mutate()} disabled={!form.target_url || createScan.isPending}
              className="w-full font-semibold"
              style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa" }}>
              {createScan.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Launching...</> : <><Play className="w-4 h-4 mr-2" />Start Scan</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}