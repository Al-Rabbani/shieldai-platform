import React, { useState } from "react";
import { FileText, Download, Plus, Trash2, Eye, ToggleLeft, ToggleRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const ALL_SECTIONS = [
  { id: "exec_summary", label: "Executive Summary", category: "summary" },
  { id: "risk_score", label: "Global Risk Score & Grade", category: "summary" },
  { id: "pillar_scores", label: "Security Pillar Scores", category: "summary" },
  { id: "findings_overview", label: "Findings Overview (Critical/High/Medium/Low)", category: "findings" },
  { id: "new_resolved", label: "New vs Resolved Findings", category: "findings" },
  { id: "sla_breaches", label: "SLA Breach Summary", category: "findings" },
  { id: "top_vulns", label: "Top 10 Vulnerabilities", category: "findings" },
  { id: "risk_trend", label: "90-Day Risk Trend Chart", category: "charts" },
  { id: "score_trend", label: "30-Day Score Trend Chart", category: "charts" },
  { id: "asset_heatmap", label: "Asset Risk Heatmap", category: "charts" },
  { id: "vuln_by_severity", label: "Vulnerabilities by Severity Chart", category: "charts" },
  { id: "soc2_controls", label: "SOC 2 Controls Progress", category: "compliance" },
  { id: "iso27001_controls", label: "ISO 27001 Controls Progress", category: "compliance" },
  { id: "gdpr_controls", label: "GDPR Controls Progress", category: "compliance" },
  { id: "pci_controls", label: "PCI DSS Controls Progress", category: "compliance" },
  { id: "evidence_log", label: "Evidence Audit Log", category: "compliance" },
  { id: "pentest_summary", label: "Penetration Test Summary", category: "advanced" },
  { id: "cloud_posture", label: "Cloud Security Posture", category: "advanced" },
  { id: "supply_chain", label: "Supply Chain Risk", category: "advanced" },
  { id: "recommendations", label: "AI Recommendations", category: "advanced" },
];

const CATEGORY_LABELS = {
  summary: "📊 Summary",
  findings: "🔍 Findings",
  charts: "📈 Charts",
  compliance: "✅ Compliance",
  advanced: "🔬 Advanced",
};

const DEFAULT_TEMPLATES = [
  {
    id: "ciso",
    name: "CISO Board Report",
    audience: "Board / CISO",
    sections: ["exec_summary", "risk_score", "pillar_scores", "findings_overview", "risk_trend", "soc2_controls", "iso27001_controls", "recommendations"],
  },
  {
    id: "technical",
    name: "Technical Deep Dive",
    audience: "Security Team",
    sections: ["risk_score", "top_vulns", "sla_breaches", "new_resolved", "score_trend", "asset_heatmap", "pentest_summary", "cloud_posture", "supply_chain"],
  },
  {
    id: "compliance",
    name: "Compliance Audit",
    audience: "Auditors / Legal",
    sections: ["exec_summary", "soc2_controls", "iso27001_controls", "gdpr_controls", "pci_controls", "evidence_log", "findings_overview"],
  },
];

function TemplateCard({ tmpl, isActive, onClick, onDelete }) {
  return (
    <div onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${isActive ? "border-[#6366F1] bg-[#6366F1]/10" : "border-[#1F2937] bg-[#111827] hover:border-[#374151]"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-white">{tmpl.name}</span>
        {onDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(tmpl.id); }}
            className="text-slate-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="text-xs text-slate-500 mb-2">{tmpl.audience}</div>
      <div className="text-[10px] text-slate-600">{tmpl.sections.length} sections included</div>
    </div>
  );
}

export default function ReportTemplatePage() {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [activeId, setActiveId] = useState("ciso");
  const [newName, setNewName] = useState("");
  const { toast } = useToast();

  const active = templates.find(t => t.id === activeId);

  const toggleSection = (sectionId) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== activeId) return t;
      const has = t.sections.includes(sectionId);
      return { ...t, sections: has ? t.sections.filter(s => s !== sectionId) : [...t.sections, sectionId] };
    }));
  };

  const addTemplate = () => {
    if (!newName.trim()) return;
    const id = newName.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    setTemplates(prev => [...prev, { id, name: newName.trim(), audience: "Custom", sections: ["exec_summary", "risk_score"] }]);
    setActiveId(id);
    setNewName("");
  };

  const deleteTemplate = (id) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (activeId === id) setActiveId(templates[0]?.id);
  };

  const saveTemplate = () => {
    toast({ title: "Template saved", description: `"${active?.name}" has been saved.` });
  };

  const downloadPreview = () => {
    if (!active) return;
    const rows = active.sections.map(s => ALL_SECTIONS.find(a => a.id === s)?.label || s);
    const html = `<html><head><title>${active.name}</title>
    <style>body{font-family:Inter,sans-serif;padding:40px;color:#111}h1{color:#6366F1}ul{line-height:2}</style></head>
    <body><h1>${active.name}</h1><p>Audience: ${active.audience}</p>
    <h2>Included Sections</h2><ul>${rows.map(r => `<li>${r}</li>`).join("")}</ul>
    <p style="color:#888;font-size:12px">Generated by ShieldAI — ${new Date().toLocaleDateString()}</p></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${active.name.replace(/\s+/g, "_")}_template.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const grouped = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    cat, label, items: ALL_SECTIONS.filter(s => s.category === cat),
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#6366F1]" /> Report Template Builder
          </h1>
          <p className="text-sm text-slate-400 mt-1">Define which sections appear in weekly PDF reports per stakeholder</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-[#374151] text-slate-300" onClick={downloadPreview}>
            <Download className="w-4 h-4 mr-2" /> Preview HTML
          </Button>
          <Button className="bg-[#6366F1] hover:bg-[#5558e3] text-white" onClick={saveTemplate}>
            <Save className="w-4 h-4 mr-2" /> Save Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Template list */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Templates</div>
          {templates.map(t => (
            <TemplateCard key={t.id} tmpl={t} isActive={t.id === activeId}
              onClick={() => setActiveId(t.id)}
              onDelete={DEFAULT_TEMPLATES.find(d => d.id === t.id) ? undefined : deleteTemplate} />
          ))}
          <div className="flex gap-2 mt-3">
            <Input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="New template name…"
              className="h-8 text-xs bg-[#1F2937] border-[#374151]"
              onKeyDown={e => e.key === "Enter" && addTemplate()} />
            <Button size="sm" className="h-8 bg-[#6366F1]" onClick={addTemplate}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Section toggles */}
        <div className="col-span-3 space-y-6">
          {active && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">{active.name}</span>
                <span className="text-xs text-slate-500">— {active.audience}</span>
                <span className="ml-auto text-xs text-[#6366F1]">{active.sections.length} / {ALL_SECTIONS.length} sections</span>
              </div>
              {grouped.map(({ cat, label, items }) => (
                <div key={cat}>
                  <div className="text-xs font-semibold text-slate-400 mb-3">{label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map(section => {
                      const included = active.sections.includes(section.id);
                      return (
                        <button key={section.id} onClick={() => toggleSection(section.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${included ? "border-[#6366F1]/50 bg-[#6366F1]/10" : "border-[#1F2937] bg-[#111827] hover:border-[#374151]"}`}>
                          {included
                            ? <ToggleRight className="w-5 h-5 text-[#6366F1] flex-shrink-0" />
                            : <ToggleLeft className="w-5 h-5 text-slate-600 flex-shrink-0" />}
                          <span className={`text-xs font-medium ${included ? "text-white" : "text-slate-500"}`}>
                            {section.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}