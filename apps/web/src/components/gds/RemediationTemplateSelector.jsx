import React, { useState } from "react";
import { BookOpen, Copy, CheckCircle, Code, Link } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

export default function RemediationTemplateSelector({ templates, onApply, selectedFinding }) {
  const [selectedTemplate, setSelectedTemplate] = React.useState(null);
  const [copied, setCopied] = React.useState(null);

  const filteredTemplates = templates.filter(t => {
    if (!selectedFinding) return true;
    const matchesSeverity = !t.severity || t.severity === selectedFinding.severity;
    const matchesType = !t.vulnerability_type || 
      selectedFinding.title?.toLowerCase().includes(t.vulnerability_type.toLowerCase()) ||
      selectedFinding.cve_id?.toLowerCase().includes(t.vulnerability_type.toLowerCase());
    return matchesSeverity || matchesType;
  });

  const handleCopy = async (text, type) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleApply = () => {
    if (selectedTemplate) {
      onApply(selectedTemplate);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4" style={{ color: CYAN }} />
        <h4 className="text-sm font-bold text-white">Remediation Templates</h4>
        <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(0,212,255,0.1)", color: CYAN, border: `1px solid ${CYAN}30` }}>
          {filteredTemplates.length} available
        </span>
      </div>

      {filteredTemplates.length === 0 ? (
        <p className="text-xs" style={{ color: MUTED }}>No matching templates. Create one in the Fix Templates library.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(selectedTemplate?.id === template.id ? null : template)}
              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                selectedTemplate?.id === template.id 
                  ? 'bg-cyan-500/10 border-cyan-400/40' 
                  : 'bg-white/2 border-white/5 hover:border-white/10'
              }`}
              style={{ 
                background: selectedTemplate?.id === template.id ? `${CYAN}10` : "rgba(255,255,255,0.02)",
                border: selectedTemplate?.id === template.id ? `1px solid ${CYAN}40` : `1px solid ${BORDER}`
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="text-xs font-bold text-white">{template.template_name}</h5>
                    {template.severity && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase" 
                        style={{ 
                          background: template.severity === 'critical' ? `${DANGER}15` :
                            template.severity === 'high' ? `${HIGH}15` :
                              template.severity === 'medium' ? `${MEDIUM}15` : `${LOW}15`,
                          color: template.severity === 'critical' ? DANGER :
                            template.severity === 'high' ? HIGH :
                              template.severity === 'medium' ? MEDIUM : LOW,
                          border: `1px solid ${template.severity === 'critical' ? DANGER + '30' :
                            template.severity === 'high' ? HIGH + '30' :
                              template.severity === 'medium' ? MEDIUM + '30' : LOW + '30'}`
                        }}>
                        {template.severity}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px]" style={{ color: MUTED }}>{template.description}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: MUTED }}>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {template.usage_count || 0}
                  </span>
                </div>
              </div>

              {selectedTemplate?.id === template.id && (
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Remediation Steps</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(template.remediation_steps, 'steps')}
                        className="h-5 px-2 text-[9px]"
                        style={{ color: CYAN }}
                      >
                        {copied === 'steps' ? 'Copied!' : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                      </Button>
                    </div>
                    <div className="p-2 rounded text-xs" style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}` }}>
                      <ReactMarkdown className="prose prose-sm max-w-none" style={{ color: TEXT }}>
                        {template.remediation_steps}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {template.code_example && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Code Example</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(template.code_example, 'code')}
                          className="h-5 px-2 text-[9px]"
                          style={{ color: CYAN }}
                        >
                          {copied === 'code' ? 'Copied!' : <><Code className="w-3 h-3 mr-1" /> Copy</>}
                        </Button>
                      </div>
                      <pre className="p-2 rounded text-[10px] overflow-x-auto" style={{ background: "#0a0e1a", border: `1px solid ${BORDER}`, color: TEXT, fontFamily: 'monospace' }}>
                        <code>{template.code_example}</code>
                      </pre>
                    </div>
                  )}

                  {template.testing_guidance && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Testing</p>
                      <p className="text-xs" style={{ color: TEXT }}>{template.testing_guidance}</p>
                    </div>
                  )}

                  {(template.references || []).length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {template.references.map((ref, i) => (
                        <a
                          key={i}
                          href={ref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] flex items-center gap-1 hover:underline"
                          style={{ color: CYAN }}
                        >
                          <Link className="w-3 h-3" />
                          Reference {i + 1}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      onClick={handleApply}
                      size="sm"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: CYAN, color: "#020817" }}
                    >
                      <CheckCircle className="w-3 h-3 mr-1.5" />
                      Apply to Finding
                    </Button>
                    <Button
                      onClick={() => setSelectedTemplate(null)}
                      variant="ghost"
                      size="sm"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ color: MUTED }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}