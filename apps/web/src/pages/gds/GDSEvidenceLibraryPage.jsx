import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  FolderOpen, Upload, FileText, Image, Shield, Calendar, Tag, Search, 
  Filter, Download, Eye, Trash2, Clock, CheckCircle, AlertCircle, Plus, X
} from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, timeAgo
} from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FRAMEWORK_COLORS = {
  soc2: "#00d4ff",
  iso27001: "#ff8c00",
  gdpr: "#a855f7",
  nist: "#10b981",
  "pci-dss": "#ef4444",
  hipaa: "#3b82f6",
};

const CATEGORY_ICONS = {
  access_control: Shield,
  incident_management: AlertCircle,
  risk_assessment: Filter,
  security_policy: FileText,
  operations: Clock,
  compliance: CheckCircle,
  audit: FolderOpen,
  other: FileText,
};

export default function GDSEvidenceLibraryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedFrameworks, setSelectedFrameworks] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    frameworks: [],
    control_ids: "",
    tags: "",
    category: "other",
    access_level: "internal",
    retention_years: 7,
  });

  const { data: evidence = [], isLoading } = useQuery({
    queryKey: ["evidence-library"],
    queryFn: () => base44.entities.EvidenceLibrary.list("-uploaded_at", 500).catch(() => []),
    refetchInterval: 30000,
  });

  const filteredEvidence = evidence.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
                         (e.description || "").toLowerCase().includes(search.toLowerCase()) ||
                         (e.control_ids || []).some(id => id.toLowerCase().includes(search.toLowerCase()));
    const matchesFramework = selectedFrameworks.length === 0 || 
                            (e.frameworks || []).some(f => selectedFrameworks.includes(f));
    const matchesCategory = !selectedCategory || e.category === selectedCategory;
    return matchesSearch && matchesFramework && matchesCategory;
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      // In real implementation, upload file first then create record
      return await base44.entities.EvidenceLibrary.create({
        ...data,
        control_ids: data.control_ids.split(",").map(s => s.trim()).filter(Boolean),
        tags: data.tags.split(",").map(s => s.trim()).filter(Boolean),
        uploaded_at: new Date().toISOString(),
        is_active: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(["evidence-library"]);
      setShowUploadModal(false);
      setUploadForm({
        title: "",
        description: "",
        frameworks: [],
        control_ids: "",
        tags: "",
        category: "other",
        access_level: "internal",
        retention_years: 7,
      });
    },
  });

  const handleUpload = () => {
    if (!uploadForm.title || uploadForm.frameworks.length === 0) return;
    uploadMutation.mutate(uploadForm);
  };

  const stats = {
    total: evidence.length,
    active: evidence.filter(e => e.is_active).length,
    soc2: evidence.filter(e => (e.frameworks || []).includes("soc2")).length,
    iso27001: evidence.filter(e => (e.frameworks || []).includes("iso27001")).length,
    expiring: evidence.filter(e => {
      if (!e.expiry_date) return false;
      const daysUntil = (new Date(e.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntil <= 30 && daysUntil > 0;
    }).length,
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Evidence Library" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
            <FolderOpen className="w-6 h-6" style={{ color: CYAN }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Evidence Library</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>Centralized repository for compliance artifacts and documentation</p>
          </div>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
        >
          <Upload className="w-4 h-4" />
          Upload Evidence
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Evidence</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.active}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>SOC 2</p>
          <p className="text-2xl font-black font-mono" style={{ color: FRAMEWORK_COLORS.soc2 }}>{stats.soc2}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>ISO 27001</p>
          <p className="text-2xl font-black font-mono" style={{ color: FRAMEWORK_COLORS.iso27001 }}>{stats.iso27001}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.expiring > 0 ? `${DANGER}08` : "transparent", border: stats.expiring > 0 ? `1px solid ${DANGER}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Expiring Soon</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.expiring > 0 ? DANGER : MUTED }}>{stats.expiring}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search evidence, control IDs..."
              className="w-full pl-10 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" style={{ color: MUTED }} />
            {["soc2", "iso27001"].map(fw => (
              <button
                key={fw}
                onClick={() => setSelectedFrameworks(prev => 
                  prev.includes(fw) ? prev.filter(f => f !== fw) : [...prev, fw]
                )}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFrameworks.includes(fw) ? "" : "opacity-50 hover:opacity-100"
                }`}
                style={{
                  background: selectedFrameworks.includes(fw) ? `${FRAMEWORK_COLORS[fw]}15` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${selectedFrameworks.includes(fw) ? FRAMEWORK_COLORS[fw] + "40" : BORDER}`,
                  color: selectedFrameworks.includes(fw) ? FRAMEWORK_COLORS[fw] : MUTED
                }}
              >
                {fw.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Evidence Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
          ))}
        </div>
      ) : filteredEvidence.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-4" style={{ color: MUTED }} />
            <p className="text-sm font-bold" style={{ color: MUTED }}>No evidence found</p>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>Upload your first compliance artifact</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvidence.map(item => {
            const CategoryIcon = CATEGORY_ICONS[item.category] || FileText;
            return (
              <Card key={item.id} className="p-4 cursor-pointer hover:scale-[1.01] transition-transform" style={{ border: `1px solid ${BORDER}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                      {item.file_type === "screenshot" ? <Image className="w-4 h-4" style={{ color: CYAN }} /> : <FileText className="w-4 h-4" style={{ color: CYAN }} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-[200px]">{item.title}</p>
                      <p className="text-[9px]" style={{ color: MUTED }}>{timeAgo(item.uploaded_at)}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${item.is_active ? 'bg-green-400/15 text-green-400' : 'bg-slate-400/15 text-slate-400'}`}>
                    {item.is_active ? 'Active' : 'Archived'}
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Frameworks */}
                  <div className="flex flex-wrap gap-1">
                    {(item.frameworks || []).map(fw => (
                      <span key={fw} className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{
                        background: `${FRAMEWORK_COLORS[fw] || MUTED}15`,
                        color: FRAMEWORK_COLORS[fw] || MUTED,
                        border: `1px solid ${FRAMEWORK_COLORS[fw] || MUTED}30`
                      }}>
                        {fw.toUpperCase()}
                      </span>
                    ))}
                  </div>

                  {/* Control IDs */}
                  {(item.control_ids || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(item.control_ids || []).slice(0, 3).map(id => (
                        <span key={id} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{
                          background: "rgba(255,255,255,0.05)",
                          color: MUTED,
                          border: `1px solid ${BORDER}`
                        }}>
                          {id}
                        </span>
                      ))}
                      {(item.control_ids || []).length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MUTED }}>+{item.control_ids.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Category */}
                  <div className="flex items-center gap-1.5 text-[10px]" style={{ color: MUTED }}>
                    <CategoryIcon className="w-3 h-3" />
                    <span className="capitalize">{item.category?.replace('_', ' ')}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: BORDER }}>
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all" style={{
                      background: `${CYAN}15`,
                      border: `1px solid ${CYAN}30`,
                      color: CYAN
                    }}>
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <button className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all" style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${BORDER}`,
                      color: MUTED
                    }}>
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-2xl p-6" style={{ background: "#0a1628" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Upload Evidence</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Title *</label>
                <input
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Frameworks *</label>
                <div className="flex flex-wrap gap-2">
                  {["soc2", "iso27001", "gdpr", "nist", "pci-dss", "hipaa"].map(fw => (
                    <button
                      key={fw}
                      onClick={() => setUploadForm(prev => ({
                        ...prev,
                        frameworks: prev.frameworks.includes(fw) 
                          ? prev.frameworks.filter(f => f !== fw)
                          : [...prev.frameworks, fw]
                      }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        uploadForm.frameworks.includes(fw) ? "" : "opacity-50 hover:opacity-100"
                      }`}
                      style={{
                        background: uploadForm.frameworks.includes(fw) ? `${FRAMEWORK_COLORS[fw]}15` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${uploadForm.frameworks.includes(fw) ? FRAMEWORK_COLORS[fw] + "40" : BORDER}`,
                        color: uploadForm.frameworks.includes(fw) ? FRAMEWORK_COLORS[fw] : MUTED
                      }}
                    >
                      {fw.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Control IDs</label>
                  <input
                    value={uploadForm.control_ids}
                    onChange={(e) => setUploadForm({...uploadForm, control_ids: e.target.value})}
                    placeholder="e.g., CC6.1, A.12.6.1"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Tags</label>
                  <input
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({...uploadForm, tags: e.target.value})}
                    placeholder="comma-separated"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Category</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({...uploadForm, category: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                  >
                    {Object.keys(CATEGORY_ICONS).map(cat => (
                      <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT }}>Access Level</label>
                  <select
                    value={uploadForm.access_level}
                    onChange={(e) => setUploadForm({...uploadForm, access_level: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                  >
                    {["public", "internal", "restricted", "confidential"].map(level => (
                      <option key={level} value={level}>{level.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending || !uploadForm.title || uploadForm.frameworks.length === 0}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: (uploadForm.title && uploadForm.frameworks.length > 0) ? `${CYAN}15` : "rgba(255,255,255,0.1)",
                    border: `1px solid ${CYAN}40`,
                    color: (uploadForm.title && uploadForm.frameworks.length > 0) ? CYAN : MUTED,
                    opacity: (uploadForm.title && uploadForm.frameworks.length > 0) ? 1 : 0.5
                  }}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: CYAN }} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Evidence
                    </>
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}