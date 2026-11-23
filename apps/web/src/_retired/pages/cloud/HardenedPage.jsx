import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AgentHealthCard from "@/components/code/AgentHealthCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, Zap, Download, CheckCircle2, Loader2, Package } from "lucide-react";

const standardBadge = { cis: "bg-blue-500/15 text-blue-400 border-blue-500/30", nist: "bg-purple-500/15 text-purple-400 border-purple-500/30", disa: "bg-teal-500/15 text-teal-400 border-teal-500/30" };
const statusStyle = { available: "text-emerald-400", building: "text-yellow-400", failed: "text-red-400" };
const BUILD_STEPS = ["Pulling base image", "Auditing installed packages", "Removing unnecessary packages", "Applying security policies", "Configuring sysctl hardening", "Running CIS benchmark scan", "Generating compliance report", "Publishing hardened image"];

export default function HardenedPage() {
  const [buildOpen, setBuildOpen] = useState(false);
  const [buildForm, setBuildForm] = useState({ base_image: "", hardening_standard: "cis", os_type: "" });
  const [buildProgress, setBuildProgress] = useState(null);
  const [compareImg, setCompareImg] = useState(null);
  const qc = useQueryClient();

  const { data: images = [] } = useQuery({ queryKey: ["hardened-images"], queryFn: () => base44.entities.HardenedImage.list("-published_at", 20) });
  const { data: containerImages = [] } = useQuery({ queryKey: ["containers"], queryFn: () => base44.entities.ContainerImage.list("-created_date", 20) });

  const generateImage = useMutation({
    mutationFn: async () => {
      const baseImg = buildForm.base_image;
      const standard = buildForm.hardening_standard;
      // Simulate build progress
      setBuildProgress(0);
      for (let i = 1; i <= BUILD_STEPS.length; i++) {
        await new Promise(r => setTimeout(r, 400));
        setBuildProgress(i);
      }
      return base44.entities.HardenedImage.create({
        name: `shieldai/${baseImg.replace(/[:/]/g, "-")}-hardened:latest`,
        base_image: baseImg, hardening_standard: standard, os_type: buildForm.os_type || "Linux",
        version: "1.0.0", compliance_score: Math.floor(88 + Math.random() * 12),
        vulnerabilities_removed: Math.floor(30 + Math.random() * 100),
        packages_removed: Math.floor(100 + Math.random() * 500),
        size_reduction_mb: Math.floor(50 + Math.random() * 200),
        status: "available", published_at: new Date().toISOString(), agent_name: "HardeningAgent-v1",
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hardened-images"] }); setBuildOpen(false); setBuildProgress(null); },
  });

  // Compare: find non-hardened base
  const originalImage = compareImg ? containerImages.find(c => c.os_base === compareImg.base_image) : null;

  return (
    <div className="space-y-6 bg-[#0A0E1A] min-h-screen -m-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Hardened Images</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Powered by HardeningAgent-v1 · CIS Level 1/2, NIST, DISA STIG baselines</p>
        </div>
        <Button onClick={() => setBuildOpen(true)} className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold gap-2">
          <Zap className="w-4 h-4" /> Generate Hardened Image
        </Button>
      </div>

      <AgentHealthCard name="HardeningAgent-v1" health={99} status="online" tasksToday={6} type="executor" />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Available Images", value: images.filter(i => i.status === "available").length, color: "text-emerald-400" },
          { label: "Avg Compliance", value: `${Math.round(images.reduce((s, i) => s + (i.compliance_score || 0), 0) / (images.length || 1))}%`, color: "text-[#C9A84C]" },
          { label: "Total Packages Removed", value: images.reduce((s, i) => s + (i.packages_removed || 0), 0).toLocaleString(), color: "text-blue-400" },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Available Hardened Images</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e293b]">
              {["Image", "Base", "Standard", "Compliance", "Packages Removed", "CVEs Removed", "Size Reduction", "Status", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {images.map(img => (
              <tr key={img.id} className="border-b border-[#1e293b] hover:bg-[#1e293b]/40 transition-colors">
                <td className="px-4 py-3 font-mono text-sm font-medium text-[#e2e8f0]">{img.name}</td>
                <td className="px-4 py-3 text-xs font-mono text-[#64748b]">{img.base_image}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded uppercase font-bold border ${standardBadge[img.hardening_standard]}`}>{img.hardening_standard?.toUpperCase()}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${img.compliance_score}%` }} />
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">{img.compliance_score}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-mono font-bold text-[#C9A84C]">{img.packages_removed?.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs font-mono font-bold text-emerald-400">-{img.vulnerabilities_removed}</td>
                <td className="px-4 py-3 text-xs font-mono text-[#64748b]">-{img.size_reduction_mb} MB</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {img.status === "building" ? <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" /> : img.status === "available" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : null}
                    <span className={`text-xs capitalize ${statusStyle[img.status]}`}>{img.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setCompareImg(img)} className="text-[11px] px-2 py-1 rounded bg-[#1e293b] text-[#94a3b8] border border-[#1e293b] hover:text-[#e2e8f0] transition-colors">Compare</button>
                    <button className="text-[11px] px-2 py-1 rounded bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/20 transition-colors flex items-center gap-1"><Download className="w-3 h-3" /> Use</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Build modal */}
      <Dialog open={buildOpen} onOpenChange={v => { if (!generateImage.isPending) { setBuildOpen(v); setBuildProgress(null); } }}>
        <DialogContent className="bg-[#111827] border-[#1e293b] text-[#e2e8f0]">
          <DialogHeader><DialogTitle className="text-[#e2e8f0]">Generate Hardened Image</DialogTitle></DialogHeader>
          {buildProgress === null ? (
            <div className="space-y-4 pt-2">
              {[["base_image", "Base Image", "e.g. ubuntu:22.04"], ["os_type", "OS Type", "e.g. Ubuntu 22.04 LTS"]].map(([k, l, p]) => (
                <div key={k}>
                  <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">{l}</label>
                  <Input value={buildForm[k]} onChange={e => setBuildForm({ ...buildForm, [k]: e.target.value })} placeholder={p} className="bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0]" />
                </div>
              ))}
              <div>
                <label className="text-xs text-[#94a3b8] mb-1.5 block uppercase tracking-wider">Hardening Standard</label>
                <Select value={buildForm.hardening_standard} onValueChange={v => setBuildForm({ ...buildForm, hardening_standard: v })}>
                  <SelectTrigger className="bg-[#0A0E1A] border-[#1e293b] text-[#e2e8f0]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111827] border-[#1e293b]">
                    {[["cis", "CIS Benchmark"], ["nist", "NIST 800-53"], ["disa", "DISA STIG"]].map(([v, l]) => <SelectItem key={v} value={v} className="text-[#e2e8f0]">{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => generateImage.mutate()} disabled={!buildForm.base_image} className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold">Start Build</Button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-[#94a3b8]">Building hardened image...</p>
              <div className="space-y-2">
                {BUILD_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {i < buildProgress ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : i === buildProgress ? <Loader2 className="w-4 h-4 text-[#C9A84C] animate-spin flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border border-[#1e293b] flex-shrink-0" />}
                    <span className={`text-xs ${i < buildProgress ? "text-emerald-400" : i === buildProgress ? "text-[#C9A84C]" : "text-[#64748b]"}`}>{step}</span>
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden mt-2">
                <div className="h-full bg-[#C9A84C] rounded-full transition-all" style={{ width: `${(buildProgress / BUILD_STEPS.length) * 100}%` }} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare modal */}
      <Dialog open={!!compareImg} onOpenChange={() => setCompareImg(null)}>
        <DialogContent className="bg-[#111827] border-[#1e293b] text-[#e2e8f0] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0]">Image Comparison: Original vs Hardened</DialogTitle></DialogHeader>
          {compareImg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-xs text-red-400 font-semibold uppercase mb-3">Original: {compareImg.base_image}</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-[#94a3b8]">Packages</span><span className="text-red-400 font-mono">~{(compareImg.packages_removed || 0) + 80} installed</span></div>
                    <div className="flex justify-between"><span className="text-[#94a3b8]">CVEs</span><span className="text-red-400 font-mono">~{compareImg.vulnerabilities_removed + 12} known</span></div>
                    <div className="flex justify-between"><span className="text-[#94a3b8]">Compliance</span><span className="text-red-400 font-mono">~40%</span></div>
                    <div className="flex justify-between"><span className="text-[#94a3b8]">Attack Surface</span><span className="text-red-400 font-mono">Large</span></div>
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-xs text-emerald-400 font-semibold uppercase mb-3">Hardened: {compareImg.name}</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-[#94a3b8]">Packages</span><span className="text-emerald-400 font-mono">~80 (minimal)</span></div>
                    <div className="flex justify-between"><span className="text-[#94a3b8]">CVEs</span><span className="text-emerald-400 font-mono">0 critical/high</span></div>
                    <div className="flex justify-between"><span className="text-[#94a3b8]">Compliance</span><span className="text-emerald-400 font-mono">{compareImg.compliance_score}%</span></div>
                    <div className="flex justify-between"><span className="text-[#94a3b8]">Attack Surface</span><span className="text-emerald-400 font-mono">Minimal</span></div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[["Packages Removed", compareImg.packages_removed?.toLocaleString(), "text-[#C9A84C]"], ["CVEs Eliminated", compareImg.vulnerabilities_removed, "text-emerald-400"], ["Size Reduction", `${compareImg.size_reduction_mb} MB`, "text-blue-400"]].map(([l, v, c]) => (
                  <div key={l} className="bg-[#0A0E1A] rounded-lg p-3">
                    <p className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1">{l}</p>
                    <p className={`text-xl font-bold font-mono ${c}`}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}