import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AgentHealthCard from "@/components/code/AgentHealthCard";
import SeverityPill from "@/components/code/SeverityPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Play, Plus, Activity, CheckCircle2, Loader2, Clock, ExternalLink, Target, Shield, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

const statusStyle = { completed: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", running: "text-amber-400 border-amber-500/30 bg-amber-500/10", queued: "text-blue-400 border-blue-500/30 bg-blue-500/10", failed: "text-red-400 border-red-500/30 bg-red-500/10" };
const authBadge = { none: "text-[#64748b]", basic: "text-blue-400", bearer: "text-cyan-400", oauth: "text-purple-400", cookie: "text-orange-400" };
const sevColors = { critical: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", border: "rgba(239,68,68,0.3)" }, high: { bg: "rgba(249,115,22,0.15)", color: "#f97316", border: "rgba(249,115,22,0.3)" }, medium: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "rgba(251,191,36,0.3)" }, low: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "rgba(59,130,246,0.3)" } };

export default function DASTPage() {
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ target_url: "", nickname: "", scan_type: "passive", auth_type: "none", auth_config: "", include_paths: "" });
  const [scanResults, setScanResults] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [expandedFinding, setExpandedFinding] = useState(null);
  const [scanningTarget, setScanningTarget] = useState("");
  const qc = useQueryClient();

  const { data: scans = [] } = useQuery({ queryKey: ["dast-scans"], queryFn: () => base44.entities.DASTScan.list("-created_date", 20) });
  const { data: findings = [] } = useQuery({ queryKey: ["dast-findings"], queryFn: () => base44.entities.DASTFinding.list("-created_date", 100) });

  const runRealScan = async () => {
    setIsScanning(true);
    setScanningTarget(form.target_url);
    try {
      const include_paths = form.include_paths.split('\n').filter(p => p.trim());
      const auth_config = form.auth_type !== "none" ? { token: form.auth_config, username: form.auth_config, password: form.auth_config, cookie: form.auth_config } : undefined;
      
      const res = await fetch('/api/functions/shieldDASTScan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_url: form.target_url,
          scan_type: form.scan_type,
          auth_type: form.auth_type,
          auth_config,
          nickname: form.nickname,
          include_paths
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      const scanEntity = await base44.entities.DASTScan.create({
        target_url: form.target_url,
        nickname: form.nickname || new URL(form.target_url).hostname,
        scan_type: form.scan_type,
        auth_type: form.auth_type,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        total_findings: result.total_findings,
        critical_count: result.critical_count,
        high_count: result.high_count,
        medium_count: result.medium_count,
        low_count: result.low_count,
        risk_score: result.risk_score,
        endpoints_tested: result.endpoints_tested,
        data_sources: result.data_sources.join(", ")
      });
      
      for (const finding of result.findings) {
        await base44.entities.DASTFinding.create({ scan_id: scanEntity.id, ...finding }).catch(() => {});
      }
      
      setScanResults(result);
      setShowResults(true);
      qc.invalidateQueries({ queryKey: ["dast-scans"] });
      toast.success(`Scan complete: ${result.total_findings} findings`);
      setNewOpen(false);
      setForm({ target_url: "", nickname: "", scan_type: "passive", auth_type: "none", auth_config: "", include_paths: "" });
    } catch (error) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const totals = {
    completed: scans.filter(s => s.status === "completed").length,
    vulns: scans.reduce((sum, s) => sum + (s.total_findings || 0), 0),
    endpoints: scans.reduce((sum, s) => sum + (s.endpoints_tested || 0), 0),
    critical: scans.reduce((sum, s) => sum + (s.critical_count || 0), 0),
  };

  const groupedFindings = scanResults?.findings?.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || []).concat(f);
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6 bg-[#050810] min-h-screen -m-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">DAST Scanner</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Dynamic Application Security Testing — Live HTTP Probing</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 gap-2">
          <Plus className="w-4 h-4" /> New DAST Scan
        </Button>
      </div>

      <AgentHealthCard name="DASTAgent-v1" health={94} status="online" tasksToday={12} type="executor" />

      <div className="grid grid-cols-4 gap-3">
        {[["Scans Completed", totals.completed, "text-emerald-400"], ["Vulnerabilities", totals.vulns, "text-orange-400"], ["Endpoints Tested", totals.endpoints, "text-blue-400"], ["Critical Found", totals.critical, "text-red-400"]].map(([l, v, c]) => (
          <div key={l} className="bg-[#0D1117] border border-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{l}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Scan Results Panel */}
      {showResults && scanResults && (
        <div className="bg-[#0D1117] border border-[#1e293b] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-semibold text-[#e2e8f0]">Scan Results: {scanResults.target_url}</h3>
                <p className="text-xs text-[#64748b]">{scanResults.endpoints_tested} endpoints tested · {scanResults.total_findings} findings</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowResults(false)}>Close</Button>
          </div>

          {["critical", "high", "medium", "low"].map(sev => {
            const sevFindings = groupedFindings[sev] || [];
            if (sevFindings.length === 0) return null;
            return (
              <div key={sev}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase" style={{ color: sevColors[sev].color }}>{sev}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: sevColors[sev].bg, color: sevColors[sev].color, border: `1px solid ${sevColors[sev].border}` }}>{sevFindings.length} findings</span>
                </div>
                <div className="space-y-2">
                  {sevFindings.map((f, i) => (
                    <div key={i} className="rounded-lg border p-3" style={{ background: "#0f172a", borderColor: sevColors[sev].border }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-[#e2e8f0]">{f.vulnerability_type}</p>
                          <p className="text-[10px] text-[#64748b] font-mono">{f.endpoint} · {f.cwe}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold" style={{ color: sevColors[sev].color }}>CVSS {f.cvss_score}</span>
                          <button onClick={() => setExpandedFinding(expandedFinding === i ? null : i)} className="text-[10px] text-[#94a3b8] hover:text-[#e2e8f0]">
                            {expandedFinding === i ? "Hide" : "Details"}
                          </button>
                        </div>
                      </div>
                      {expandedFinding === i && (
                        <div className="mt-3 pt-3 border-t border-[#1e293b] space-y-2">
                          <div>
                            <p className="text-[10px] text-[#64748b] uppercase">Evidence</p>
                            <pre className="text-[10px] font-mono text-[#94a3b8] bg-[#050810] p-2 rounded mt-1">{f.evidence}</pre>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#64748b] uppercase">Remediation</p>
                            <p className="text-xs text-[#e2e8f0] mt-1">{f.remediation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t border-[#1e293b]">
            <p className="text-[10px] text-[#64748b]">Data sources: {scanResults.data_sources.join(" · ")}</p>
          </div>
        </div>
      )}

      {/* Scan History Table */}
      <div className="bg-[#0D1117] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Scan History</h3>
          <Activity className="w-4 h-4 text-[#64748b]" />
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-[#1e293b]">{["Target","Type","Auth","Status","Findings","Endpoints","Data Sources"].map(h => <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {scans.map(s => (
              <tr key={s.id} className="border-b border-[#1e293b] hover:bg-[#1e293b]/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-xs font-mono text-[#94a3b8]">{s.target_url}</p>
                  {s.nickname && <p className="text-[10px] text-[#64748b]">{s.nickname}</p>}
                </td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] capitalize">{s.scan_type}</span></td>
                <td className="px-4 py-3"><span className={`text-[11px] font-bold capitalize ${authBadge[s.auth_type]}`}>{s.auth_type}</span></td>
                <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded border capitalize ${statusStyle[s.status]}`}>{s.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold ${s.critical_count > 0 ? "text-red-400" : "text-[#e2e8f0]"}`}>{s.total_findings}</span>
                    {s.critical_count > 0 && <span className="text-[10px] text-red-400">({s.critical_count}C)</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-[#64748b]">{s.endpoints_tested || 0}</td>
                <td className="px-4 py-3 text-[10px] text-[#64748b] max-w-[200px] truncate">{s.data_sources}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Scan Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-[#0D1117] border-[#1e293b] text-[#e2e8f0] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0]">New DAST Scan</DialogTitle>
            <DialogDescription className="text-[#94a3b8]">
              Scan a web application for security vulnerabilities
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Target URL *</label>
                <Input value={form.target_url} onChange={e => setForm({ ...form, target_url: e.target.value })} placeholder="https://app.example.com" className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]" />
              </div>
              <div>
                <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Nickname</label>
                <Input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="My App" className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Scan Type</label>
                <Select value={form.scan_type} onValueChange={v => setForm({ ...form, scan_type: v })}>
                  <SelectTrigger className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111827] border-[#1e293b]">
                    <SelectItem value="passive" className="text-[#e2e8f0]">Passive (Safe for Production)</SelectItem>
                    <SelectItem value="active" className="text-[#e2e8f0]">Active (Staging Only)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[#64748b] mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {form.scan_type === "passive" ? "Headers analysis only" : "Includes injection payloads"}
                </p>
              </div>
              <div>
                <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Auth Method</label>
                <Select value={form.auth_type} onValueChange={v => setForm({ ...form, auth_type: v })}>
                  <SelectTrigger className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111827] border-[#1e293b]">
                    <SelectItem value="none" className="text-[#e2e8f0]">None</SelectItem>
                    <SelectItem value="bearer" className="text-[#e2e8f0]">Bearer Token</SelectItem>
                    <SelectItem value="basic" className="text-[#e2e8f0]">Basic Auth</SelectItem>
                    <SelectItem value="cookie" className="text-[#e2e8f0]">Cookie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.auth_type !== "none" && (
              <div>
                <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Auth Config</label>
                <Input value={form.auth_config} onChange={e => setForm({ ...form, auth_config: e.target.value })} placeholder={form.auth_type === "bearer" ? "Bearer token" : form.auth_type === "basic" ? "username:password" : "session=abc123"} className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]" />
              </div>
            )}

            <div>
              <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Additional Paths</label>
              <Textarea value={form.include_paths} onChange={e => setForm({ ...form, include_paths: e.target.value })} placeholder="/api&#10;/admin&#10;/dashboard" className="bg-[#050810] border-[#1e293b] text-[#e2e8f0] h-20" />
              <p className="text-[10px] text-[#64748b] mt-1">One path per line (optional)</p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNewOpen(false)} className="border-[#1e293b] text-[#94a3b8]">Cancel</Button>
              <Button onClick={runRealScan} disabled={!form.target_url || isScanning} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold">
                {isScanning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Scanning {scanningTarget}...</> : <><Play className="w-4 h-4 mr-2" /> Start Scan</>}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Data Sources Footer */}
      <div className="text-center">
        <p className="text-xs text-[#64748b]">Findings powered by: Live HTTP Probing · Security Header Analysis · Injection Testing</p>
      </div>
    </div>
  );
}