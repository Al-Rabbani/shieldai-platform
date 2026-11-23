import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AgentHealthCard from "@/components/code/AgentHealthCard";
import SeverityPill from "@/components/code/SeverityPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Zap, Package, AlertTriangle, Play, Download, Shield, Flame } from "lucide-react";

const ecosystemBadge = { npm: "bg-red-500/15 text-red-400", pypi: "bg-blue-500/15 text-blue-400", maven: "bg-orange-500/15 text-orange-400", go: "bg-teal-500/15 text-teal-400", ruby: "bg-pink-500/15 text-pink-400", nuget: "bg-purple-500/15 text-purple-400" };
const licenseRiskColor = { ok: "text-emerald-400", restricted: "text-red-400", copyleft: "text-orange-400", unknown: "text-[#64748b]" };

export default function SCAPage() {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [ecoFilter, setEcoFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("vulns");
  const qc = useQueryClient();

  const { data: findings = [] } = useQuery({ queryKey: ["sca"], queryFn: () => base44.entities.SCAFinding.list("-created_date", 100) });
  const { data: sboms = [] } = useQuery({ queryKey: ["sboms"], queryFn: () => base44.entities.SBOM.list("-created_date", 10) });

  const updateFinding = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SCAFinding.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sca"] }),
  });

  const filtered = findings.filter(f => {
    const matchSearch = !search || f.package_name?.includes(search) || f.cve_id?.includes(search);
    const matchSev = sevFilter === "all" || f.severity === sevFilter;
    const matchEco = ecoFilter === "all" || f.ecosystem === ecoFilter;
    return matchSearch && matchSev && matchEco;
  });

  const licenseRisks = findings.filter(f => f.license_risk && f.license_risk !== "ok");
  const stats = {
    total: findings.length,
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    fixable: findings.filter(f => f.autofix_available).length,
  };

  return (
    <div className="space-y-6 bg-[#0A0E1A] min-h-screen -m-6 p-6">
      {/* Header — Canonical: 38 SCA vulns, 2 critical, 891 theoretical filtered */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">SCA — Dependencies & CVEs</h1>
          <p className="text-sm text-[#64748b] mt-0.5">38 dependency vulnerabilities · 2 critical · 891 theoretical filtered</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-[#1e293b] text-[#94a3b8] hover:text-[#e2e8f0] gap-2">
            <Zap className="w-4 h-4 text-[#C9A84C]" /> Upgrade All
          </Button>
          <Button className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold gap-2">
            <Play className="w-4 h-4" /> Scan Dependencies
          </Button>
        </div>
      </div>

      <AgentHealthCard name="SCAAgent-v1" health={99} status="online" tasksToday={31} type="executor" />

      {/* Stats — Canonical: 38 total, 2 critical, ecosystem breakdown npm:22 pip:8 maven:5 go:3 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Vulns", value: "38", color: "text-[#e2e8f0]" },
          { label: "Critical", value: "2", color: "text-red-400" },
          { label: "High", value: "12", color: "text-orange-400" },
          { label: "Auto-Fixable", value: "19", color: "text-[#C9A84C]" },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111827] border border-[#1e293b] rounded-xl p-1 w-fit">
        {[["vulns", "Vulnerabilities"], ["license", "License Risk"], ["sbom", "SBOMs"]].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === k ? "bg-[#C9A84C] text-black" : "text-[#64748b] hover:text-[#e2e8f0]"}`}>{v}</button>
        ))}
      </div>

      {tab === "vulns" && (
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1e293b] flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search packages, CVEs..." className="pl-9 bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0] text-sm h-9" />
            </div>
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="w-32 bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0] h-9 text-sm"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent className="bg-[#111827] border-[#1e293b]">
                {["all", "critical", "high", "medium", "low"].map(s => <SelectItem key={s} value={s} className="text-[#e2e8f0] capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ecoFilter} onValueChange={setEcoFilter}>
              <SelectTrigger className="w-32 bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0] h-9 text-sm"><SelectValue placeholder="Ecosystem" /></SelectTrigger>
              <SelectContent className="bg-[#111827] border-[#1e293b]">
                {["all", "npm", "pypi", "maven", "go", "ruby", "nuget"].map(e => <SelectItem key={e} value={e} className="text-[#e2e8f0]">{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e293b]">
                {["Package", "Version → Fix", "CVE", "CVSS", "Severity", "Ecosystem", "Type", "AutoFix"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} onClick={() => setSelected(f)} className="border-b border-[#1e293b] hover:bg-[#1e293b]/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-[#e2e8f0]">{f.package_name}</td>
                  <td className="px-4 py-3 text-xs font-mono"><span className="text-red-400">{f.package_version}</span> {f.fixed_version && <><span className="text-[#64748b]"> → </span><span className="text-emerald-400">{f.fixed_version}</span></>}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[#94a3b8]">{f.cve_id || "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono font-bold"><span className={f.cvss_score >= 9 ? "text-red-400" : f.cvss_score >= 7 ? "text-orange-400" : f.cvss_score >= 4 ? "text-yellow-400" : "text-blue-400"}>{f.cvss_score ?? "—"}</span></td>
                  <td className="px-4 py-3"><SeverityPill severity={f.severity} /></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${ecosystemBadge[f.ecosystem] || "bg-muted text-muted-foreground"}`}>{f.ecosystem}</span></td>
                  <td className="px-4 py-3 text-xs text-[#64748b]">{f.is_direct ? "direct" : "transitive"}</td>
                  <td className="px-4 py-3">{f.autofix_available ? <span className="text-[11px] px-2 py-0.5 rounded border text-[#C9A84C] border-[#C9A84C]/30 bg-[#C9A84C]/10">Available</span> : <span className="text-[#64748b] text-xs">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "license" && (
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e293b] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-[#e2e8f0]">License Risk Findings ({licenseRisks.length})</h3>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-[#1e293b]">{["Package", "License", "Risk Level", "Repository", "Dependency"].map(h => <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody>
              {licenseRisks.map(f => (
                <tr key={f.id} className="border-b border-[#1e293b] hover:bg-[#1e293b]/40 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-[#e2e8f0]">{f.package_name}</td>
                  <td className="px-4 py-3 text-sm text-[#94a3b8]">{f.license}</td>
                  <td className="px-4 py-3"><span className={`text-sm font-semibold capitalize ${licenseRiskColor[f.license_risk]}`}>{f.license_risk}</span></td>
                  <td className="px-4 py-3 text-xs text-[#64748b]">{f.repo_name}</td>
                  <td className="px-4 py-3 text-xs text-[#64748b]">{f.is_direct ? "direct" : "transitive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "sbom" && (
        <div className="space-y-4">
          {sboms.map(s => (
            <div key={s.id} className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-[#e2e8f0]">{s.repo_name}</p>
                  <p className="text-xs text-[#64748b]">{s.format?.toUpperCase()} v{s.version} · Generated {new Date(s.generated_at).toLocaleDateString()}</p>
                </div>
                <Button variant="outline" className="border-[#1e293b] text-[#94a3b8] hover:text-[#e2e8f0] gap-2"><Download className="w-4 h-4" /> Download</Button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[["Total Packages", s.total_packages], ["Direct", s.direct_packages], ["Transitive", s.transitive_packages], ["Vulnerable", s.vulnerable_packages]].map(([l, v]) => (
                  <div key={l} className="bg-[#0A0E1A] rounded-lg p-3 text-center">
                    <p className="text-[10px] text-[#64748b] uppercase tracking-wider">{l}</p>
                    <p className="text-xl font-bold font-mono text-[#e2e8f0] mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CVE detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-[#111827] border-[#1e293b] text-[#e2e8f0] max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SeverityPill severity={selected?.severity} />
              <span className="text-sm">{selected?.package_name} — {selected?.cve_id || "License Issue"}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#0A0E1A] rounded-lg p-3"><p className="text-[#64748b] mb-1">Current Version</p><p className="text-red-400 font-mono">{selected.package_version}</p></div>
                <div className="bg-[#0A0E1A] rounded-lg p-3"><p className="text-[#64748b] mb-1">Fixed Version</p><p className="text-emerald-400 font-mono">{selected.fixed_version || "No patch yet"}</p></div>
                <div className="bg-[#0A0E1A] rounded-lg p-3"><p className="text-[#64748b] mb-1">CVSS Score</p><p className="text-[#e2e8f0] font-mono font-bold">{selected.cvss_score ?? "—"}</p></div>
                <div className="bg-[#0A0E1A] rounded-lg p-3"><p className="text-[#64748b] mb-1">EPSS</p><div className="flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-[#1e293b] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${selected.epss_score ? Math.round(selected.epss_score * 100) : 0}%`, background: selected.epss_score > 0.7 ? "#ef4444" : "#f97316" }} /></div><span className="text-xs font-mono font-bold" style={{ color: selected.epss_score > 0.7 ? "#ef4444" : "#f97316" }}>{selected.epss_score ? Math.round(selected.epss_score * 100) : 0}%</span></div></div>
                <div className="bg-[#0A0E1A] rounded-lg p-3"><p className="text-[#64748b] mb-1">Ecosystem</p><p className="text-[#e2e8f0]">{selected.ecosystem}</p></div>
                <div className="bg-[#0A0E1A] rounded-lg p-3"><p className="text-[#64748b] mb-1">Source</p><div className="flex items-center gap-2"><span className="text-xs text-[#94a3b8]">{selected.source || "OSV.dev"}</span>{selected.cisa_kev && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1" style={{ color: "#ef4444", background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444" }}><Flame className="w-2.5 h-2.5" /> CISA KEV</span>}</div></div>
              </div>
              <div><p className="text-xs text-[#64748b] mb-2 uppercase tracking-wider">Description</p><p className="text-sm text-[#94a3b8] leading-relaxed">{selected.description}</p></div>
              <div><p className="text-xs text-[#64748b] mb-2 uppercase tracking-wider">Remediation</p><p className="text-sm text-[#94a3b8] leading-relaxed">{selected.remediation}</p></div>
              {selected.autofix_available && (
                <Button className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold gap-2">
                  <Zap className="w-4 h-4" /> Generate Upgrade PR
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}