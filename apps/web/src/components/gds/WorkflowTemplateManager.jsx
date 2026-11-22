import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Save, FolderOpen, Trash2, Copy, Download, Upload, X, Plus, Star } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState } from "@/components/gds/GDSOSShared";

export default function WorkflowTemplateManager({ onLoadTemplate }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: templates } = useQuery({
    queryKey: ["workflow-templates"],
    queryFn: () => base44.entities.WorkflowTemplate.list("-created_date", 50).catch(() => []),
  });

  const saveMutation = useMutation({
    mutationFn: async (templateData) => {
      return await base44.entities.WorkflowTemplate.create(templateData);
    },
    onSuccess: () => {
      qc.invalidateQueries(["workflow-templates"]);
      setShowModal(false);
      setTemplateName("");
      setTemplateDescription("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId) => {
      await base44.entities.WorkflowTemplate.delete(templateId);
    },
    onSuccess: () => {
      qc.invalidateQueries(["workflow-templates"]);
      setSelectedTemplate(null);
    },
  });

  const loadTemplate = (template) => {
    if (template.steps && template.steps.length > 0) {
      onLoadTemplate?.({
        name: template.template_name,
        description: template.description,
        steps: template.steps,
        workflow_type: template.workflow_type,
        metadata: template.metadata
      });
      setShowModal(false);
    }
  };

  const exportTemplate = (template) => {
    const exportData = {
      template_name: template.template_name,
      description: template.description,
      workflow_type: template.workflow_type,
      steps: template.steps,
      metadata: template.metadata,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workflow-template-${template.template_name?.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredTemplates = templates?.filter(t => {
    if (filter === "all") return true;
    if (filter === "favorites") return t.is_favorite;
    return t.workflow_type === filter;
  }) || [];

  const workflowTypes = [...new Set(templates?.map(t => t.workflow_type).filter(Boolean) || [])];

  return (
    <>
      {/* Template Button */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
          <FolderOpen className="w-4 h-4" />
          Templates
        </button>
      </div>

      {/* Template Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-5xl rounded-2xl p-6 space-y-6" style={{ background: CARD, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflow: "auto" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Workflow Templates</h2>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Save and reuse common workflow configurations</p>
              </div>
              <button onClick={() => setShowModal(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: BORDER }}>
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${filter === "all" ? "text-cyan-400" : "text-slate-500"}`}
                style={{ background: filter === "all" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${filter === "all" ? CYAN + "40" : BORDER}` }}>
                All Templates
              </button>
              <button
                onClick={() => setFilter("favorites")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${filter === "favorites" ? "text-cyan-400" : "text-slate-500"}`}
                style={{ background: filter === "favorites" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${filter === "favorites" ? CYAN + "40" : BORDER}` }}>
                <Star className="w-3 h-3 inline mr-1" />
                Favorites
              </button>
              {workflowTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${filter === type ? "text-cyan-400" : "text-slate-500"}`}
                  style={{ background: filter === type ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${filter === type ? CYAN + "40" : BORDER}` }}>
                  {type}
                </button>
              ))}
            </div>

            {/* Templates Grid */}
            {filteredTemplates.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No templates"
                description="Save your first workflow as a template to reuse it later"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template, idx) => (
                  <div
                    key={template.id || idx}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedTemplate?.id === template.id ? "scale-[1.02]" : ""}`}
                    style={{
                      background: selectedTemplate?.id === template.id ? `${CYAN}10` : "rgba(255,255,255,0.02)",
                      borderColor: selectedTemplate?.id === template.id ? CYAN + "40" : BORDER
                    }}
                    onClick={() => setSelectedTemplate(template)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{template.template_name || "Untitled"}</h4>
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: MUTED }}>{template.description || "No description"}</p>
                      </div>
                      {template.is_favorite && <Star className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: HIGH }} />}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] mb-3">
                      <span className="px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>
                        {template.workflow_type || "general"}
                      </span>
                      <span style={{ color: MUTED }}>{template.steps?.length || 0} steps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); loadTemplate(template); }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                        style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                        <Download className="w-3 h-3" />
                        Load
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); exportTemplate(template); }}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        style={{ color: MUTED }}>
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(template.id); }}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        style={{ color: DANGER }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Template Preview */}
            {selectedTemplate && (
              <div className="p-4 rounded-lg border-t" style={{ borderColor: BORDER, background: "rgba(0,0,0,0.2)" }}>
                <h3 className="text-sm font-bold text-white mb-3">Template Preview</h3>
                <div className="space-y-2">
                  {selectedTemplate.steps?.slice(0, 5).map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>
                        Step {step.step_number || idx + 1}
                      </span>
                      <span className="text-xs text-white flex-1">{step.step_name || "Untitled"}</span>
                      <span className="text-[10px] font-mono" style={{ color: MUTED }}>{step.fn || "—"}</span>
                    </div>
                  ))}
                  {selectedTemplate.steps?.length > 5 && (
                    <p className="text-[10px]" style={{ color: MUTED }}>+{selectedTemplate.steps.length - 5} more steps</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}