import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Play, Shield, AlertTriangle, ChevronDown, ChevronRight, Info, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const severityColors = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "#ef444440" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "#f9731640" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "#eab30840" },
  low: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "#3b82f640" },
};

export default function ContainersPage() {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);
  const [tab, setTab] = useState("images");
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanForm, setScanForm] = useState({ image: "", tag: "latest", registry: "dockerhub", nickname: "" });
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [expandedFinding, setExpandedFinding] = useState(null);
  const qc = useQueryClient();

  const { data: images = [] } = useQuery({ queryKey: ["containers"], queryFn: () => base44.entities.ContainerImage.list("-risk_score", 50) });
  const { data: scans = [] } = useQuery({ queryKey: ["container-scans"], queryFn: () => base44.entities.ContainerScan.list("-created_date", 20) });
  const { data: vulns = [] } = useQuery({ queryKey: ["container-vulns"], queryFn: () => base44.entities.ContainerVulnerability.list("-created_date", 100) });

  const runRealScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch('/api/functions/shieldScanContainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: scanForm.image,
          tag: scanForm.tag,
          registry: scanForm.registry,
          nickname: scanForm.nickname
        })
      });
      const result = await response.json();
      
      if (result.success) {
        // Create scan record
        const scanRecord = await base44.entities.ContainerScan.create({
          image_name: result.image,
          nickname: result.nickname,
          registry: result.registry,
          status: "completed",
          total_findings: result.total_findings,
          critical_count: result.critical_count,
          high_count: result.high_count,
          medium_count: result.medium_count,
          low_count: result.low_count,
          risk_score: result.risk_score,
          layers_count: result.image_info.layers,
          size_mb: result.image_info.size_mb,
          os_base: result.image_info.os_base,
          data_sources: result.data_sources.join(" · "),
          completed_at: new Date().toISOString()
        });

        // Create findings
        for (const finding of result.findings) {
          await base44.entities.ContainerVulnerability.create({
            scan_id: scanRecord.id,
            image_name: result.image,
            image_tag: scanForm.tag,
            cve_id: finding.cve_id,
            title: finding.title,
            severity: finding.severity,
            cvss_score: finding.cvss_score,
            package_name: finding.package,
            package_version: finding.installed_version,
            fixed_version: finding.fixed_version,
            category: finding.category,
            description: finding.description,
            cwe: finding.cwe,
            status: "open",
            layer: `Layer ${finding.layer_index + 1}`
          }).catch(() => {});
        }

        setScanResults(result);
        qc.invalidateQueries({ queryKey: ["container-scans"] });
        qc.invalidateQueries({ queryKey: ["container-vulns"] });
        toast.success(`Scan complete: ${result.total_findings} findings`);
      } else {
        toast.error(result.error || "Scan failed");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const filteredVulns = vulns.filter(v => {
    const matchSearch = !search || v.image_name?.includes(search) || v.cve_id?.includes(search);
    const matchSev = sevFilter === "all" || v.severity === sevFilter;
    return matchSearch && matchSev;
  });

  const groupedFindings = scanResults ? {
    critical: scanResults.findings.filter(f => f.severity === "critical"),
    high: scanResults.findings.filter(f => f.severity === "high"),
    medium: scanResults.findings.filter(f => f.severity === "medium"),
    low: scanResults.findings.filter(f => f.severity === "low"),
  } : {};

  return (
    <div className="space-y-6 bg-[#0A0E1A] min-h-screen -m-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Container Security</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Real-time container image scanning with CVE detection</p>
        </div>
        <Button onClick={() => setScanModalOpen(true)} className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold gap-2">
          <Play className="w-4 h-4" /> Scan Image
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Images Scanned", value: scans.length, color: "text-[#e2e8f0]" },
          { label: "Critical Vulns", value: scans.reduce((s, i) => s + (i.critical_count || 0), 0), color: "text-red-400" },
          { label: "Total Findings", value: scans.reduce((s, i) => s + (i.total_findings || 0), 0), color: "text-orange-400" },
          { label: "Avg Risk Score", value: scans.length ? Math.round(scans.reduce((s, i) => s + (i.risk_score || 0), 0) / scans.length) : 0, color: "text-blue-400" },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111827] border border-[#1e293b] rounded-xl p-1 w-fit">
        {[["scans", "Scan History"], ["vulns", "Vulnerabilities"]].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === k ? "bg-[#C9A84C] text-black" : "text-[#64748b] hover:text-[#e2e8f0]"}`}>{v}</button>
        ))}
      </div>

      {tab === "scans" && (
        <div className="space-y-4">
          {/* Live Results Panel */}
          {scanResults && (
            <div className="rounded-xl overflow-hidden border" style={{ background: "#0f172a", borderColor: "#1e293b" }}>
              <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#e2e8f0]">Scan Results: {scanResults.image}</h3>
                    <p className="text-xs text-[#64748b]">{scanResults.image_info.layers} layers · {scanResults.image_info.size_mb} MB · Risk Score: {scanResults.risk_score}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setScanResults(null)}>Close</Button>
              </div>

              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {["critical", "high", "medium", "low"].map(sev => {
                  const sevFindings = groupedFindings[sev] || [];
                  if (sevFindings.length === 0) return null;
                  return (
                    <div key={sev}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase" style={{ color: severityColors[sev].color }}>{sev}</span>
                        <Badge style={{ background: severityColors[sev].bg, color: severityColors[sev].color, border: `1px solid ${severityColors[sev].border}` }}>{sevFindings.length} findings</Badge>
                      </div>
                      <div className="space-y-2">
                        {sevFindings.map((f, i) => (
                          <div key={i} className="rounded-lg border p-3" style={{ background: "#050810", borderColor: severityColors[sev].border }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]" style={{ borderColor: severityColors[sev].border, color: severityColors[sev].color }}>{f.category}</Badge>
                                <div>
                                  <p className="text-xs font-semibold text-[#e2e8f0]">{f.title}</p>
                                  {f.cve_id && (
                                    <a href={`https://nvd.nist.gov/vuln/detail/${f.cve_id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline flex items-center gap-1">
                                      {f.cve_id} <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                  {f.exploited_in_wild && (
                                    <Badge className="text-[9px] mt-1" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                                      ⚠️ EXPLOITED IN WILD
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-xs font-mono font-bold" style={{ color: severityColors[sev].color }}>CVSS {f.cvss_score}</p>
                                  {f.fixed_version && f.fixed_version !== "N/A" && f.fixed_version !== "upgrade" && (
                                    <Badge className="text-[9px] mt-1" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                                      ✓ Fix Available
                                    </Badge>
                                  )}
                                </div>
                                <button onClick={() => setExpandedFinding(expandedFinding === i ? null : i)} className="text-[10px] text-[#94a3b8] hover:text-[#e2e8f0]">
                                  {expandedFinding === i ? "Hide" : "Details"}
                                </button>
                              </div>
                            </div>
                            {expandedFinding === i && (
                              <div className="mt-3 pt-3 border-t border-[#1e293b] space-y-2">
                                <p className="text-xs text-[#94a3b8]">{f.description}</p>
                                <div>
                                  <p className="text-[10px] text-[#64748b] uppercase">Package</p>
                                  <p className="text-xs font-mono text-[#e2e8f0]">{f.package} {f.installed_version} → <span className="text-emerald-400">{f.fixed_version}</span></p>
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
              </div>

              <div className="px-5 py-3 border-t border-[#1e293b] bg-[#050810]">
                <p className="text-[10px] text-[#64748b]">Data sources: {scanResults.data_sources.join(" · ")}</p>
              </div>
            </div>
          )}

          {/* Scan History Table */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#e2e8f0]">Scan History</h3>
              <Shield className="w-4 h-4 text-[#64748b]" />
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  {["Image", "Registry", "Risk Score", "Findings", "Layers", "Size", "Data Sources", "Scanned"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.map(s => (
                  <tr key={s.id} className="border-b border-[#1e293b] hover:bg-[#1e293b]/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono text-[#e2e8f0]">{s.image_name}</p>
                      {s.nickname && <p className="text-[10px] text-[#64748b]">{s.nickname}</p>}
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{s.registry}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.risk_score >= 80 ? "bg-red-500" : s.risk_score >= 60 ? "bg-orange-500" : s.risk_score >= 40 ? "bg-yellow-500" : "bg-emerald-500"}`} style={{ width: `${s.risk_score}%` }} />
                        </div>
                        <span className="text-xs font-mono text-[#94a3b8]">{s.risk_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold ${s.critical_count > 0 ? "text-red-400" : "text-[#e2e8f0]"}`}>{s.total_findings}</span>
                        {s.critical_count > 0 && <span className="text-[10px] text-red-400">({s.critical_count}C)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#64748b]">{s.layers_count || 0}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[#64748b]">{s.size_mb} MB</td>
                    <td className="px-4 py-3 text-[10px] text-[#64748b] max-w-[180px] truncate">{s.data_sources}</td>
                    <td className="px-4 py-3 text-[10px] text-[#64748b]">{s.completed_at ? new Date(s.completed_at).toLocaleDateString() : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "vulns" && (
        <div className="space-y-3">
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#1e293b] flex gap-3">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search CVE, image..." className="pl-9 bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0] text-sm h-9" />
              </div>
              <Select value={sevFilter} onValueChange={setSevFilter}>
                <SelectTrigger className="w-32 bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111827] border-[#1e293b]">
                  {["all", "critical", "high", "medium", "low"].map(s => <SelectItem key={s} value={s} className="text-[#e2e8f0] capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e293b]">
                    {["Severity", "CVE", "Image", "Package", "Version → Fix", "CVSS", "Category", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredVulns.sort((a, b) => (b.cvss_score || 0) - (a.cvss_score || 0)).map(v => (
                    <tr key={v.id} className="border-b border-[#1e293b] hover:bg-[#1e293b]/40 transition-colors">
                      <td className="px-4 py-3">
                        <Badge style={{ background: severityColors[v.severity].bg, color: severityColors[v.severity].color, border: `1px solid ${severityColors[v.severity].border}` }}>{v.severity}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {v.cve_id ? (
                          <a href={`https://nvd.nist.gov/vuln/detail/${v.cve_id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-blue-400 hover:underline flex items-center gap-1">
                            {v.cve_id} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs font-mono text-[#94a3b8]">{v.title}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#e2e8f0]">{v.image_name}:{v.image_tag}</td>
                      <td className="px-4 py-3 text-xs font-mono text-[#94a3b8]">{v.package_name}</td>
                      <td className="px-4 py-3 text-xs font-mono"><span className="text-red-400">{v.package_version}</span> → <span className="text-emerald-400">{v.fixed_version}</span></td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: severityColors[v.severity].color }}>{v.cvss_score}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{v.category}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[11px] px-2 py-0.5 rounded border capitalize ${v.status === "patched" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>{v.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Scan Modal */}
      <Dialog open={scanModalOpen} onOpenChange={setScanModalOpen}>
        <DialogContent className="bg-[#0D1117] border-[#1e293b] text-[#e2e8f0] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0]">Scan Container Image</DialogTitle>
            <DialogDescription className="text-[#94a3b8]">Scan a container image for CVEs and misconfigurations</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Image Name *</label>
                <Input value={scanForm.image} onChange={e => setScanForm({ ...scanForm, image: e.target.value })} placeholder="node, nginx, python" className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]" />
              </div>
              <div>
                <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Tag</label>
                <Input value={scanForm.tag} onChange={e => setScanForm({ ...scanForm, tag: e.target.value })} placeholder="latest, 18-alpine" className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]" />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Registry</label>
              <Select value={scanForm.registry} onValueChange={v => setScanForm({ ...scanForm, registry: v })}>
                <SelectTrigger className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111827] border-[#1e293b]">
                  <SelectItem value="dockerhub" className="text-[#e2e8f0]">Docker Hub</SelectItem>
                  <SelectItem value="ecr" className="text-[#e2e8f0]">AWS ECR</SelectItem>
                  <SelectItem value="gcr" className="text-[#e2e8f0]">Google GCR</SelectItem>
                  <SelectItem value="acr" className="text-[#e2e8f0]">Azure ACR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Nickname (optional)</label>
              <Input value={scanForm.nickname} onChange={e => setScanForm({ ...scanForm, nickname: e.target.value })} placeholder="My App Image" className="bg-[#050810] border-[#1e293b] text-[#e2e8f0]" />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setScanModalOpen(false)} className="border-[#1e293b] text-[#94a3b8]">Cancel</Button>
              <Button onClick={runRealScan} disabled={!scanForm.image || isScanning} className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold">
                {isScanning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Scanning...</> : <><Play className="w-4 h-4 mr-2" /> Start Scan</>}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Data Sources Footer */}
      <div className="text-center pt-4 border-t border-[#1e293b]">
        <p className="text-xs text-[#64748b]">Findings powered by: Docker Registry API · OSV.dev · NVD NIST · CISA KEV</p>
      </div>
    </div>
  );
}