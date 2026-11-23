import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Sparkles, Play, CheckCircle, X, Lock, AlertTriangle, Clock, Save } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";
import WorkflowTemplateManager from "@/components/gds/WorkflowTemplateManager";

const WORKFLOW_TYPES = [
  { value: "incident_response", label: "Incident Response", icon: "🔴" },
  { value: "vulnerability_remediation", label: "Vulnerability Remediation", icon: "🔧" },
  { value: "threat_hunting", label: "Threat Hunting", icon: "🕵️" },
  { value: "compliance_audit", label: "Compliance Audit", icon: "✅" },
  { value: "cloud_remediation", label: "Cloud Remediation", icon: "☁️" },
  { value: "executive_reporting", label: "Executive Reporting", icon: "📊" },
  { value: "security_assessment", label: "Security Assessment", icon: "🛡️" },
  { value: "devsecops_pipeline", label: "DevSecOps Pipeline", icon: "💻" },
  { value: "identity_access_review", label: "Identity Access Review", icon: "🔐" },
  { value: "mssp_client_onboarding", label: "MSSP Client Onboarding", icon: "🏢" }
];

const TRIGGER_TYPES = ["manual", "scheduled", "entity_event", "webhook", "ai_generated", "kernel_dispatch"];

const DEFAULT_SLA = {
  incident_response: 3600,
  vulnerability_remediation: 86400,
  threat_hunting: 14400,
  compliance_audit: 604800,
  cloud_remediation: 7200,
  executive_reporting: 172800,
  security_assessment: 43200,
  devsecops_pipeline: 3600,
  identity_access_review: 259200,
  mssp_client_onboarding: 86400
};

export default function GDSWorkflowBuilderPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("create");
  const [showResult, setShowResult] = useState(null);
  const [templateData, setTemplateData] = useState(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [saveTemplateDescription, setSaveTemplateDescription] = useState("");
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);

  // Create Workflow Form
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    workflow_type: "incident_response",
    trigger_type: "manual",
    sla_seconds: 3600,
    tags: "",
    linked_goal_id: ""
  });

  // AI Generate Form
  const [generateForm, setGenerateForm] = useState({
    goal: "",
    context: ""
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "create", ...data });
      return response.data;
    },
    onSuccess: (data) => {
      setShowResult(data);
      qc.invalidateQueries(["workflow-metrics"]);
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "generate", ...data });
      return response.data;
    },
    onSuccess: (data) => {
      setShowResult(data);
    }
  });

  const executeMutation = useMutation({
    mutationFn: async (workflowId) => {
      const response = await base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "execute", workflow_id: workflowId });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["workflow-metrics"]);
      qc.invalidateQueries(["workflow-recent-runs"]);
      setShowResult(null);
    }
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData) => {
      return await base44.entities.WorkflowTemplate.create(templateData);
    },
    onSuccess: () => {
      setShowSaveTemplate(false);
      setSaveTemplateName("");
      setSaveTemplateDescription("");
      qc.invalidateQueries(["workflow-templates"]);
    }
  });

  const handleSaveAsTemplate = () => {
    if (showResult?.workflow_id && showResult.steps) {
      setShowSaveTemplate(true);
    }
  };

  const handleCreateSubmit = () => {
    const payload = {
      ...createForm,
      tags: createForm.tags.split(",").map(t => t.trim()).filter(Boolean),
      sla_seconds: parseInt(createForm.sla_seconds) || DEFAULT_SLA[createForm.workflow_type] || 3600
    };
    createMutation.mutate(payload);
  };

  const handleGenerateSubmit = () => {
    generateMutation.mutate(generateForm);
  };

  const handleExecute = (workflowId) => {
    executeMutation.mutate(workflowId);
  };

  const inputStyle = {
    background: "#050e1f",
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    width: "100%",
    outline: "none"
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Workflow Studio</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Create, Generate & Execute Intelligent Security Workflows</p>
        </div>
      </div>

      {/* Template Manager */}
      <div className="flex items-center gap-2 mb-4">
        <WorkflowTemplateManager
          onLoadTemplate={(template) => {
            setTemplateData(template);
            setCreateForm({
              ...createForm,
              name: template.name || "",
              description: template.description || "",
              workflow_type: template.workflow_type || "incident_response",
              sla_seconds: DEFAULT_SLA[template.workflow_type] || 3600
            });
            setActiveTab("create");
          }}
        />
        <button
          onClick={() => setShowLoadTemplate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
          <FileText className="w-4 h-4" />
          Load Template
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b" style={{ borderColor: BORDER }}>
        <button
          onClick={() => { setActiveTab("create"); setShowResult(null); }}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px ${activeTab === "create" ? "text-cyan-400" : "text-slate-500"}`}
          style={{ borderBottomColor: activeTab === "create" ? CYAN : "transparent", background: activeTab === "create" ? `${CYAN}06` : "transparent" }}>
          <FileText className="w-3.5 h-3.5" />
          Create Workflow
        </button>
        <button
          onClick={() => { setActiveTab("generate"); setShowResult(null); }}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px ${activeTab === "generate" ? "text-cyan-400" : "text-slate-500"}`}
          style={{ borderBottomColor: activeTab === "generate" ? CYAN : "transparent", background: activeTab === "generate" ? `${CYAN}06` : "transparent" }}>
          <Sparkles className="w-3.5 h-3.5" />
          AI Generate
        </button>
      </div>

      {/* Result Card */}
      {showResult && (
        <Card className="p-5 border-l-4" style={{ borderLeftColor: showResult.workflow_id ? LOW : HIGH }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                {showResult.workflow_id ? "Workflow Created Successfully" : "Workflow Generated"}
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                {showResult.workflow_id ? `ID: ${showResult.workflow_id}` : "Review and execute your AI-generated workflow"}
              </p>
            </div>
            <button onClick={() => setShowResult(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: MUTED }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {showResult.steps && showResult.steps.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold mb-2" style={{ color: MUTED }}>Step Preview ({showResult.steps.length} steps)</h4>
              <div className="space-y-2">
                {showResult.steps.map((step, idx) => (
                  <div key={idx} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-white">Step {idx + 1}: {step.step_name || "Untitled"}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{step.type || "action"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {step.fn && (
                          <span className="text-[9px] px-2 py-0.5 rounded font-mono" style={{ color: TEXT, background: "rgba(255,255,255,0.04)" }}>
                            {step.fn}
                          </span>
                        )}
                        {step.requires_approval && <Lock className="w-3.5 h-3.5" style={{ color: HIGH }} />}
                        {step.on_failure && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15` }}>
                            on_failure: {step.on_failure}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {showResult.workflow_id && (
              <button
                onClick={() => handleExecute(showResult.workflow_id)}
                disabled={executeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
                <Play className="w-4 h-4" />
                {executeMutation.isPending ? "Executing..." : "Execute Now"}
              </button>
            )}
            {showResult?.workflow_id && showResult.steps && (
              <button
                onClick={handleSaveAsTemplate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
                <Save className="w-4 h-4" />
                Save as Template
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Tab Content */}
      {activeTab === "create" && (
        <Card className="p-6 max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Create New Workflow</h3>
            {templateData && (
              <span className="text-[10px] px-2 py-1 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>
                Loaded from template: {templateData.name}
              </span>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Workflow Name</label>
              <input
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Ransomware Incident Response"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Description</label>
              <textarea
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
                placeholder="Describe the workflow purpose..."
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Workflow Type</label>
                <select
                  value={createForm.workflow_type}
                  onChange={e => {
                    setCreateForm({ ...createForm, workflow_type: e.target.value, sla_seconds: DEFAULT_SLA[e.target.value] || 3600 });
                  }}
                  style={inputStyle}>
                  {WORKFLOW_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Trigger Type</label>
                <select
                  value={createForm.trigger_type}
                  onChange={e => setCreateForm({ ...createForm, trigger_type: e.target.value })}
                  style={inputStyle}>
                  {TRIGGER_TYPES.map(type => (
                    <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>SLA (seconds)</label>
                <input
                  type="number"
                  value={createForm.sla_seconds}
                  onChange={e => setCreateForm({ ...createForm, sla_seconds: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Linked Goal ID (optional)</label>
                <input
                  value={createForm.linked_goal_id}
                  onChange={e => setCreateForm({ ...createForm, linked_goal_id: e.target.value })}
                  placeholder="planning_goal_..."
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Tags (comma-separated)</label>
              <input
                value={createForm.tags}
                onChange={e => setCreateForm({ ...createForm, tags: e.target.value })}
                placeholder="incident, critical, cloud"
                style={inputStyle}
              />
            </div>

            <button
              onClick={handleCreateSubmit}
              disabled={createMutation.isPending || !createForm.name}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              {createMutation.isPending ? "Creating..." : "Create Workflow"}
            </button>
          </div>
        </Card>
      )}

      {activeTab === "generate" && (
        <Card className="p-6 max-w-3xl">
          <h3 className="text-sm font-bold text-white mb-4">AI-Generate Workflow</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Security Goal</label>
              <textarea
                value={generateForm.goal}
                onChange={e => setGenerateForm({ ...generateForm, goal: e.target.value })}
                rows={4}
                placeholder="Describe your security goal — e.g., 'Respond to ransomware attack on cloud infrastructure'"
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>

            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Context (optional)</label>
              <textarea
                value={generateForm.context}
                onChange={e => setGenerateForm({ ...generateForm, context: e.target.value })}
                rows={3}
                placeholder="Additional context about your environment, constraints, or requirements..."
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>

            <button
              onClick={handleGenerateSubmit}
              disabled={generateMutation.isPending || !generateForm.goal}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              {generateMutation.isPending ? "Generating..." : "Generate Workflow"}
            </button>
          </div>
        </Card>
      )}

      {/* Load Template Modal */}
      {showLoadTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflow: "auto" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Load Template</h2>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Select a template to populate workflow configuration</p>
              </div>
              <button onClick={() => setShowLoadTemplate(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templateData && (
                <div
                  className="p-4 rounded-lg border cursor-pointer transition-all"
                  style={{ background: `${CYAN}10`, borderColor: CYAN + "40" }}
                  onClick={() => {
                    setTemplateData(templateData);
                    setCreateForm({
                      ...createForm,
                      name: templateData.name || "",
                      description: templateData.description || "",
                      workflow_type: templateData.workflow_type || "incident_response",
                      sla_seconds: DEFAULT_SLA[templateData.workflow_type] || 3600
                    });
                    setShowLoadTemplate(false);
                    setActiveTab("create");
                  }}>
                  <h4 className="text-sm font-bold text-white mb-2">{templateData.name}</h4>
                  <p className="text-[10px]" style={{ color: MUTED }}>{templateData.description || "No description"}</p>
                  <p className="text-[9px] mt-2" style={{ color: CYAN }}>{templateData.steps?.length || 0} steps</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save as Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Save as Template</h2>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Save this workflow configuration for reuse</p>
              </div>
              <button onClick={() => setShowSaveTemplate(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Template Name</label>
                <input
                  value={saveTemplateName}
                  onChange={e => setSaveTemplateName(e.target.value)}
                  placeholder="e.g., Standard Incident Response"
                  style={{
                    background: "#050e1f",
                    border: `1px solid ${BORDER}`,
                    color: TEXT,
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 13,
                    width: "100%",
                    outline: "none"
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Description</label>
                <textarea
                  value={saveTemplateDescription}
                  onChange={e => setSaveTemplateDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe when to use this template..."
                  style={{
                    background: "#050e1f",
                    border: `1px solid ${BORDER}`,
                    color: TEXT,
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 13,
                    width: "100%",
                    resize: "none",
                    outline: "none"
                  }}
                />
              </div>
              <button
                onClick={() => {
                  saveTemplateMutation.mutate({
                    template_name: saveTemplateName,
                    description: saveTemplateDescription,
                    workflow_type: createForm.workflow_type,
                    steps: showResult.steps,
                    metadata: {
                      sla_seconds: createForm.sla_seconds,
                      trigger_type: createForm.trigger_type
                    }
                  });
                }}
                disabled={saveTemplateMutation.isPending || !saveTemplateName}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}