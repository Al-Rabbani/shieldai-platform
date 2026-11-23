import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Folder, FileText, Upload, Plus, Trash2, GripVertical, CheckCircle, AlertCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

const FRAMEWORKS = ["SOC2", "ISO27001"];

const CONTROLS = {
  SOC2: [
    { id: "CC1.1", name: "Control Environment" },
    { id: "CC2.1", name: "Communication & Information" },
    { id: "CC3.1", name: "Risk Assessment" },
    { id: "CC4.1", name: "Monitoring Activities" },
    { id: "CC5.1", name: "Control Activities" },
    { id: "CC6.1", name: "Logical & Physical Access" },
    { id: "CC7.1", name: "System Operations" },
    { id: "CC8.1", name: "Change Management" },
    { id: "CC9.1", name: "Risk Mitigation" },
  ],
  ISO27001: [
    { id: "A.5.1", name: "Information Security Policies" },
    { id: "A.5.2", name: "Organization of Information Security" },
    { id: "A.6.1", name: "Human Resource Security" },
    { id: "A.7.1", name: "Asset Management" },
    { id: "A.8.1", name: "Access Control" },
    { id: "A.9.1", name: "Cryptography" },
    { id: "A.10.1", name: "Physical & Environmental Security" },
    { id: "A.11.1", name: "Operations Security" },
    { id: "A.12.1", name: "Communications Security" },
    { id: "A.13.1", name: "System Acquisition & Development" },
    { id: "A.14.1", name: "Supplier Relationships" },
    { id: "A.15.1", name: "Incident Management" },
    { id: "A.16.1", name: "Business Continuity" },
    { id: "A.17.1", name: "Compliance" },
  ],
};

export default function GDSEvidenceMapPage() {
  const [selectedFramework, setSelectedFramework] = useState("SOC2");
  const [selectedControl, setSelectedControl] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [draggedFile, setDraggedFile] = useState(null);

  const { data: evidence = [], refetch } = useQuery({
    queryKey: ["evidence-library"],
    queryFn: () => base44.entities.EvidenceLibrary.list("-uploaded_at", 500).catch(() => []),
  });

  const { data: frameworks = [] } = useQuery({
    queryKey: ["compliance-frameworks-evidence"],
    queryFn: () => base44.entities.ComplianceFramework.list().catch(() => []),
  });

  const uploadMutation = useMutation({
    mutationFn: async (fileData) => {
      const response = await base44.functions.invoke("gdsEvidenceLocker", {
        action: "upload",
        file_url: fileData.file_url,
        title: fileData.title,
        frameworks: [selectedFramework],
        control_ids: selectedControl ? [selectedControl.id] : [],
        category: "compliance",
      });
      return response.data;
    },
    onSuccess: () => {
      refetch();
      setUploadingFile(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (evidenceId) => {
      await base44.entities.EvidenceLibrary.delete(evidenceId);
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      await uploadMutation.mutateAsync({
        file_url: uploadResponse.file_url,
        title: file.name,
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDragStart = (e, evidenceItem) => {
    setDraggedFile(evidenceItem);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (controlId) => {
    if (!draggedFile) return;
    
    try {
      await base44.entities.EvidenceLibrary.update(draggedFile.id, {
        control_ids: [...(draggedFile.control_ids || []), controlId],
      });
      refetch();
    } catch (error) {
      console.error("Update failed:", error);
    }
    setDraggedFile(null);
  };

  const getEvidenceForControl = (controlId) => {
    return evidence.filter(e => 
      e.control_ids?.includes(controlId) && 
      e.frameworks?.includes(selectedFramework)
    );
  };

  const getControlStatus = (controlId) => {
    const evidenceCount = getEvidenceForControl(controlId).length;
    if (evidenceCount === 0) return "missing";
    if (evidenceCount < 3) return "partial";
    return "complete";
  };

  const controls = CONTROLS[selectedFramework] || [];

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[
        { label: "Compliance", path: "/compliance" },
        { label: "Evidence Map" }
      ]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Evidence Map</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Organize compliance evidence for SOC 2 and ISO 27001 controls</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedFramework}
            onChange={(e) => {
              setSelectedFramework(e.target.value);
              setSelectedControl(null);
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-bold outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            {FRAMEWORKS.map(fw => (
              <option key={fw} value={fw}>{fw}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Upload className="w-4 h-4" />
            <span>{uploadingFile ? "Uploading..." : "Upload Evidence"}</span>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploadingFile}
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.csv"
            />
          </label>
        </div>
      </div>

      {/* Framework Overview */}
      <div className="grid grid-cols-3 gap-4">
        {controls.map(control => {
          const status = getControlStatus(control.id);
          const evidenceCount = getEvidenceForControl(control.id).length;
          return (
            <Card
              key={control.id}
              glow={selectedControl?.id === control.id}
              className="p-4 cursor-pointer transition-all hover:scale-[1.01]"
              onClick={() => setSelectedControl(selectedControl?.id === control.id ? null : control)}
              style={{
                border: `1px solid ${status === "complete" ? LOW : status === "partial" ? HIGH : DANGER}30`
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-white">{control.id}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{control.name}</p>
                </div>
                {status === "complete" ? (
                  <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
                ) : status === "partial" ? (
                  <AlertCircle className="w-4 h-4" style={{ color: HIGH }} />
                ) : (
                  <AlertCircle className="w-4 h-4" style={{ color: DANGER }} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(evidenceCount / 5 * 100, 100)}%`,
                      background: status === "complete" ? LOW : status === "partial" ? HIGH : DANGER
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono" style={{ color: MUTED }}>{evidenceCount} files</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Selected Control Detail */}
      {selectedControl && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">{selectedControl.id} — {selectedControl.name}</h3>
              <p className="text-xs mt-0.5" style={{ color: MUTED }}>Drag and drop evidence files into this control folder</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
              <Folder className="w-4 h-4" style={{ color: CYAN }} />
              <span className="text-xs font-bold" style={{ color: CYAN }}>Control Folder</span>
            </div>
          </div>

          <div
            className="min-h-[200px] p-4 rounded-xl border-2 border-dashed transition-all"
            style={{ 
              background: "rgba(0,212,255,0.02)",
              borderColor: draggedFile ? `${CYAN}60` : BORDER,
            }}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(selectedControl.id)}
          >
            {getEvidenceForControl(selectedControl.id).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Folder className="w-12 h-12 mb-3" style={{ color: MUTED }} />
                <p className="text-sm font-bold" style={{ color: MUTED }}>No evidence files</p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>Drag files here or upload new evidence</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getEvidenceForControl(selectedControl.id).map(evidenceItem => (
                  <div
                    key={evidenceItem.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, evidenceItem)}
                    className="p-3 rounded-lg border transition-all cursor-move hover:scale-[1.02]"
                    style={{ 
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" style={{ color: CYAN }} />
                        <span className="text-xs font-bold text-white truncate max-w-[150px]">{evidenceItem.title}</span>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(evidenceItem.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[9px]" style={{ color: MUTED }}>
                      <span>{evidenceItem.file_type}</span>
                      <span>•</span>
                      <span>{new Date(evidenceItem.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unassigned Evidence */}
          {evidence.filter(e => !e.control_ids?.includes(selectedControl.id) && e.frameworks?.includes(selectedFramework)).length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-bold mb-3" style={{ color: MUTED }}>Available Evidence (drag to assign)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {evidence
                  .filter(e => !e.control_ids?.includes(selectedControl.id) && e.frameworks?.includes(selectedFramework))
                  .map(evidenceItem => (
                    <div
                      key={evidenceItem.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, evidenceItem)}
                      className="p-3 rounded-lg border transition-all cursor-move hover:scale-[1.02] opacity-70 hover:opacity-100"
                      style={{ 
                        background: "rgba(255,255,255,0.02)",
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" style={{ color: MUTED }} />
                        <span className="text-xs font-bold text-white truncate max-w-[150px]">{evidenceItem.title}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* All Evidence Library */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">All Evidence Library</h3>
        {evidence.length === 0 ? (
          <div className="text-center py-12" style={{ color: MUTED }}>
            <FileText className="w-12 h-12 mx-auto mb-3" />
            <p>No evidence files uploaded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["Title", "Framework", "Controls", "Type", "Uploaded", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evidence.slice(0, 50).map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" style={{ color: CYAN }} />
                        <span className="text-xs text-white">{e.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {e.frameworks?.map(fw => (
                        <span key={fw} className="text-[9px] px-2 py-0.5 rounded font-bold"
                          style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
                          {fw}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      {e.control_ids?.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {e.control_ids.map(cid => (
                            <span key={cid} className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: `${LOW}15`, color: LOW }}>
                              {cid}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px]" style={{ color: MUTED }}>Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{e.file_type || "document"}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{new Date(e.uploaded_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteMutation.mutate(e.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}