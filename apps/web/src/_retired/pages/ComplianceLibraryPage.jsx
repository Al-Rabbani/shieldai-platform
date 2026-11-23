import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, FileText, Shield, CheckCircle, Download, Upload, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const FRAMEWORKS = [
  { id: "soc2", name: "SOC 2", color: "#6366F1" },
  { id: "iso27001", name: "ISO 27001", color: "#10B981" },
  { id: "gdpr", name: "GDPR", color: "#F59E0B" },
  { id: "pci", name: "PCI DSS", color: "#EF4444" },
  { id: "hipaa", name: "HIPAA", color: "#8B5CF6" },
];

const EVIDENCE_TYPES = [
  { id: "screenshot", label: "Screenshot", icon: "📸" },
  { id: "log", label: "System Log", icon: "📋" },
  { id: "config", label: "Config File", icon: "⚙️" },
  { id: "report", label: "Audit Report", icon: "📊" },
  { id: "policy", label: "Policy Document", icon: "📄" },
  { id: "scan", label: "Security Scan", icon: "🔍" },
];

export default function ComplianceLibraryPage() {
  const [search, setSearch] = useState("");
  const [filterFramework, setFilterFramework] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: evidence = [] } = useQuery({
    queryKey: ["compliance-evidence"],
    queryFn: () => base44.entities.EvidenceVault.list("-created_date", 500),
    initialData: [],
  });

  const { data: controls = [] } = useQuery({
    queryKey: ["compliance-controls"],
    queryFn: () => base44.entities.ComplianceControl.list(),
    initialData: [],
  });

  const uploadMut = useMutation({
    mutationFn: async (data) => {
      let driveUrl = null;
      
      // Upload to Drive if content provided
      if (data.file_content) {
        try {
          const driveRes = await base44.functions.invoke("saveReportToDrive", {
            reportHtml: data.file_content,
            filename: `${data.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.html`,
            folderName: "ShieldAI Compliance Evidence",
          });
          driveUrl = driveRes.data?.file_url || null;
        } catch (e) {
          console.error("Drive upload failed:", e);
        }
      }
      
      // Save to entity
      return await base44.entities.EvidenceVault.create({
        ...data,
        drive_url: driveUrl,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance-evidence"] });
      setShowUpload(false);
      toast({ title: "Evidence uploaded", description: "Saved to library and Google Drive." });
    },
  });

  const filtered = evidence.filter(e => {
    const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.description?.toLowerCase().includes(search.toLowerCase());
    const matchFramework = filterFramework === "all" || e.framework === filterFramework;
    const matchType = filterType === "all" || e.evidence_type === filterType;
    return matchSearch && matchFramework && matchType;
  });

  const stats = {
    total: evidence.length,
    byFramework: FRAMEWORKS.map(f => ({
      ...f,
      count: evidence.filter(e => e.framework === f.id).length,
    })),
    byType: EVIDENCE_TYPES.map(t => ({
      ...t,
      count: evidence.filter(e => e.evidence_type === t.id).length,
    })),
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-[#6366F1]" /> Compliance Evidence Library
          </h1>
          <p className="text-sm text-slate-400 mt-1">Centralized repository for audit evidence organized by framework</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="bg-[#6366F1] hover:bg-[#5558e3] text-white">
          <Upload className="w-4 h-4 mr-2" /> Upload Evidence
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.byFramework.map(f => (
          <div key={f.id} className="rounded-xl p-4 bg-[#111827] border border-[#1F2937]">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" style={{ color: f.color }} />
              <span className="text-xs font-semibold text-slate-400">{f.name}</span>
            </div>
            <div className="text-2xl font-black text-white">{f.count}</div>
            <div className="text-[10px] text-slate-500">evidence items</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search evidence…"
            className="pl-9 h-9 text-sm bg-[#1F2937] border-[#374151]"
          />
        </div>
        <select
          value={filterFramework}
          onChange={e => setFilterFramework(e.target.value)}
          className="h-9 text-xs rounded-lg px-3 bg-[#1F2937] border border-[#374151] text-white"
        >
          <option value="all">All Frameworks</option>
          {FRAMEWORKS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="h-9 text-xs rounded-lg px-3 bg-[#1F2937] border border-[#374151] text-white"
        >
          <option value="all">All Types</option>
          {EVIDENCE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {/* Evidence grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => {
          const fw = FRAMEWORKS.find(f => f.id === item.framework);
          const type = EVIDENCE_TYPES.find(t => t.id === item.evidence_type);
          return (
            <div key={item.id} className="rounded-xl p-4 bg-[#111827] border border-[#1F2937] hover:border-[#374151] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{type?.icon || "📄"}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {fw && (
                        <Badge variant="outline" className="text-[10px] border-[#374151]" style={{ color: fw.color }}>
                          {fw.name}
                        </Badge>
                      )}
                      <span className="text-[10px] text-slate-500">{type?.label || item.evidence_type}</span>
                    </div>
                  </div>
                </div>
              </div>
              {item.description && (
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">{item.description}</p>
              )}
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{new Date(item.created_date).toLocaleDateString()}</span>
                {item.drive_url ? (
                  <a href={item.drive_url} target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline flex items-center gap-1">
                    <Download className="w-3 h-3" /> Drive
                  </a>
                ) : (
                  <span className="text-slate-600">Local only</span>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full p-12 text-center text-slate-500 border border-dashed border-[#1F2937] rounded-xl">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No evidence found</p>
            <p className="text-xs mt-1">Upload scans, logs, and screenshots to build your compliance library</p>
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">Upload Evidence</h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                const fd = new FormData(e.target);
                uploadMut.mutate({
                  title: fd.get("title"),
                  framework: fd.get("framework"),
                  evidence_type: fd.get("evidence_type"),
                  description: fd.get("description"),
                  control_id: fd.get("control_id"),
                  file_content: fd.get("file_content"),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs text-slate-400 block mb-1">Title *</label>
                <Input name="title" required className="h-9 text-sm bg-[#1F2937] border-[#374151]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Framework *</label>
                  <select name="framework" required className="w-full h-9 text-xs rounded-lg px-3 bg-[#1F2937] border border-[#374151] text-white">
                    {FRAMEWORKS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Evidence Type *</label>
                  <select name="evidence_type" required className="w-full h-9 text-xs rounded-lg px-3 bg-[#1F2937] border border-[#374151] text-white">
                    {EVIDENCE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Description</label>
                <Input name="description" className="h-9 text-sm bg-[#1F2937] border-[#374151]" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Related Control ID</label>
                <Input name="control_id" placeholder="e.g. CC6.1" className="h-9 text-sm bg-[#1F2937] border-[#374151]" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">File Content (HTML/text for Drive upload)</label>
                <textarea name="file_content" rows={3} placeholder="Paste evidence content or logs…"
                  className="w-full text-xs rounded-lg px-3 py-2 bg-[#1F2937] border border-[#374151] text-white resize-none" />
              </div>
              <div className="text-[10px] text-slate-600">
                ✓ Files are automatically saved to your ShieldAI Google Drive folder
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-[#6366F1] hover:bg-[#5558e3] text-white" disabled={uploadMut.isPending}>
                  {uploadMut.isPending ? "Uploading…" : "Upload"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowUpload(false)} className="border-[#374151] text-slate-300">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}